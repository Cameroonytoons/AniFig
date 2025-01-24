import { AnimationPreset } from './types';

export class AnimationError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AnimationError';
  }
}

export class Store {
  private animations: Map<string, AnimationPreset & { description?: string; group?: string }> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private initTimeoutId: NodeJS.Timeout | null = null;
  private readonly INIT_TIMEOUT = 10000; // 10 seconds timeout
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY = 1000;
  private readonly MAX_ANIMATIONS = 1000;
  private readonly NAME_MAX_LENGTH = 100;

  async init() {
    if (this.initialized) {
      console.log('Store: Already initialized');
      return;
    }

    if (this.initializationPromise) {
      console.log('Store: Using existing initialization promise');
      return this.initializationPromise;
    }

    this.initializationPromise = this.initializeWithRetry();

    try {
      await this.initializationPromise;
    } catch (error) {
      this.initializationPromise = null;
      if (error instanceof AnimationError) {
        throw error;
      }
      throw new AnimationError(
        `Failed to initialize animation library: ${this.getErrorMessage(error)}`,
        'INIT_FAILED'
      );
    }

    return this.initializationPromise;
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    return 'An unexpected error occurred while initializing the animation library';
  }

  private async initializeWithRetry(attempt: number = 1): Promise<void> {
    try {
      console.log(`Store: Initialization attempt ${attempt}/${this.MAX_RETRIES}`);

      const initPromise = this.doInitialize();

      const timeoutPromise = new Promise<void>((_, reject) => {
        this.initTimeoutId = setTimeout(() => {
          reject(new AnimationError(
            'Animation library initialization timed out. Please try again.',
            'INIT_TIMEOUT'
          ));
        }, this.INIT_TIMEOUT);
      });

      await Promise.race([initPromise, timeoutPromise]);

      if (this.initTimeoutId) {
        clearTimeout(this.initTimeoutId);
        this.initTimeoutId = null;
      }

      this.initialized = true;
      console.log('Store: Initialization completed successfully');
    } catch (error) {
      console.error(`Store: Initialization attempt ${attempt} failed:`, error);

      if (this.initTimeoutId) {
        clearTimeout(this.initTimeoutId);
        this.initTimeoutId = null;
      }

      if (attempt < this.MAX_RETRIES) {
        console.log(`Store: Retrying in ${this.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.initializeWithRetry(attempt + 1);
      }

      this.initialized = false;
      if (error instanceof AnimationError) {
        throw error;
      }
      throw new AnimationError(
        `Failed to initialize animation library after ${this.MAX_RETRIES} attempts. Please check your connection and try again.`,
        'MAX_RETRIES_EXCEEDED'
      );
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('Store: Loading stored animations');
      const stored = await figma.clientStorage.getAsync('animations');

      if (!stored) {
        console.log('Store: No stored animations found, starting fresh');
        return;
      }

      if (typeof stored !== 'object' || stored === null) {
        throw new AnimationError(
          'Unable to load animations: Invalid data format detected',
          'INVALID_STORAGE_FORMAT'
        );
      }

      console.log('Store: Processing stored animations');
      Object.entries(stored).forEach(([key, value]) => {
        try {
          if (this.validateAnimationName(key) && this.validateAnimation(value as AnimationPreset)) {
            this.animations.set(key, value as AnimationPreset);
          } else {
            console.warn(`Store: Skipping invalid animation "${key}"`);
          }
        } catch (error) {
          console.warn(`Store: Error processing animation "${key}":`, error);
        }
      });

      console.log(`Store: Loaded ${this.animations.size} animations`);
    } catch (error) {
      console.error('Store: Error during initialization:', error);
      if (error instanceof AnimationError) {
        throw error;
      }
      throw new AnimationError(
        `Unable to load animations: ${this.getErrorMessage(error)}`,
        'STORAGE_ERROR'
      );
    }
  }

  private validateAnimationName(name: string): boolean {
    return typeof name === 'string' && 
           name.trim().length > 0 && 
           name.length <= this.NAME_MAX_LENGTH &&
           /^[\w\-\s]+$/.test(name);
  }

  getAnimation(name: string): AnimationPreset | undefined {
    this.checkInitialization();
    return this.animations.get(name);
  }

  setAnimation(name: string, preset: AnimationPreset & { description?: string; group?: string }) {
    this.checkInitialization();

    if (!this.validateAnimationName(name)) {
      throw new Error('Invalid animation name');
    }

    if (this.animations.size >= this.MAX_ANIMATIONS) {
      throw new Error(`Maximum number of animations (${this.MAX_ANIMATIONS}) reached`);
    }

    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    this.animations.set(name, preset);
    this.persistWithRetry();
  }

  updateAnimation(name: string, preset: AnimationPreset) {
    this.checkInitialization();

    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }

    const existing = this.animations.get(name);
    this.animations.set(name, { ...existing, ...preset });
    this.persistWithRetry();
  }

  deleteAnimation(name: string) {
    this.checkInitialization();
    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }
    this.animations.delete(name);
    this.persistWithRetry();
  }

  getAnimationsByGroup(group: string): [string, AnimationPreset][] {
    this.checkInitialization();
    if (!group) return [];

    return Array.from(this.animations.entries())
      .filter(([_, preset]) => preset.group === group);
  }

  searchAnimations(query: string): [string, AnimationPreset][] {
    this.checkInitialization();
    if (!query) return [];

    const lowercaseQuery = query.toLowerCase().trim();
    return Array.from(this.animations.entries())
      .filter(([name, preset]) =>
        name.toLowerCase().includes(lowercaseQuery) ||
        (preset.description && preset.description.toLowerCase().includes(lowercaseQuery)) ||
        (preset.group && preset.group.toLowerCase().includes(lowercaseQuery))
      );
  }

  private validateAnimation(preset: AnimationPreset): boolean {
    if (!preset || typeof preset !== 'object') {
      console.warn('Store: Invalid animation - not an object');
      return false;
    }

    const { type, duration, easing, properties } = preset;

    if (!type || !duration || !easing || !properties || typeof properties !== 'object') {
      console.warn('Store: Invalid animation - missing required fields');
      return false;
    }

    if (!Number.isFinite(duration) || duration <= 0 || duration > 10000) {
      console.warn('Store: Invalid animation - duration out of range');
      return false;
    }

    if (typeof easing !== 'string' || easing.trim().length === 0) {
      console.warn('Store: Invalid animation - invalid easing');
      return false;
    }

    switch (type) {
      case 'fade':
        if (!properties.opacity || 
            typeof properties.opacity.from !== 'number' || 
            typeof properties.opacity.to !== 'number') {
          console.warn('Store: Invalid fade animation - invalid opacity');
          return false;
        }
        return properties.opacity.from >= 0 &&
               properties.opacity.to >= 0 &&
               properties.opacity.from <= 1 &&
               properties.opacity.to <= 1;

      case 'slide':
        const hasValidX = !properties.x || (
          typeof properties.x.from === 'number' &&
          typeof properties.x.to === 'number'
        );
        const hasValidY = !properties.y || (
          typeof properties.y.from === 'number' &&
          typeof properties.y.to === 'number'
        );
        const hasPosition = properties.x || properties.y;

        if (!hasPosition || !hasValidX || !hasValidY) {
          console.warn('Store: Invalid slide animation - invalid position properties');
          return false;
        }
        return true;

      case 'scale':
        if (!properties.scale || 
            typeof properties.scale.from !== 'number' || 
            typeof properties.scale.to !== 'number') {
          console.warn('Store: Invalid scale animation - invalid scale');
          return false;
        }
        return properties.scale.from > 0 &&
               properties.scale.to > 0;

      case 'rotate':
        if (!properties.rotation || 
            typeof properties.rotation.from !== 'number' || 
            typeof properties.rotation.to !== 'number') {
          console.warn('Store: Invalid rotate animation - invalid rotation');
          return false;
        }
        return true;

      default:
        console.warn('Store: Invalid animation type:', type);
        return false;
    }
  }

  private async persistWithRetry(attempt: number = 1): Promise<void> {
    try {
      const data = Object.fromEntries(this.animations);
      await figma.clientStorage.setAsync('animations', data);
      console.log('Store: Successfully persisted animations');
    } catch (error) {
      console.error(`Store: Failed to persist animations (attempt ${attempt}/${this.MAX_RETRIES}):`, error);

      if (attempt < this.MAX_RETRIES) {
        console.log(`Store: Retrying persistence in ${this.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.persistWithRetry(attempt + 1);
      }

      throw error;
    }
  }

  private checkInitialization() {
    if (!this.initialized) {
      throw new Error('Store not initialized. Call init() first.');
    }
  }

  getAllAnimations(): [string, AnimationPreset][] {
    this.checkInitialization();
    return Array.from(this.animations.entries());
  }

  getAnimationCount(): number {
    this.checkInitialization();
    return this.animations.size;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  dispose() {
    if (this.initTimeoutId) {
      clearTimeout(this.initTimeoutId);
      this.initTimeoutId = null;
    }
    this.initialized = false;
    this.initializationPromise = null;
    this.animations.clear();
  }
}