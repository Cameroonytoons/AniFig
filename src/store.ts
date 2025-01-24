import { AnimationPreset } from './types';

export class Store {
  private animations: Map<string, AnimationPreset & { description?: string; group?: string }> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private INIT_TIMEOUT = 10000; // 10 seconds timeout
  private MAX_RETRIES = 3;
  private RETRY_DELAY = 1000;

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
    return this.initializationPromise;
  }

  private async initializeWithRetry(attempt: number = 1): Promise<void> {
    try {
      console.log(`Store: Initialization attempt ${attempt}/${this.MAX_RETRIES}`);

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Store initialization timed out')), this.INIT_TIMEOUT);
      });

      const initPromise = this.doInitialize();

      await Promise.race([initPromise, timeoutPromise]);
      this.initialized = true;
      console.log('Store: Initialization completed successfully');
    } catch (error) {
      console.error(`Store: Initialization attempt ${attempt} failed:`, error);

      if (attempt < this.MAX_RETRIES) {
        console.log(`Store: Retrying in ${this.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_DELAY));
        return this.initializeWithRetry(attempt + 1);
      }

      this.initialized = false;
      throw new Error(`Failed to initialize store after ${this.MAX_RETRIES} attempts`);
    }
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log('Store: Loading stored animations');
      const stored = await figma.clientStorage.getAsync('animations');

      if (stored) {
        console.log('Store: Processing stored animations');
        Object.entries(stored).forEach(([key, value]) => {
          this.animations.set(key, value as AnimationPreset);
        });
        console.log(`Store: Loaded ${this.animations.size} animations`);
      }
    } catch (error) {
      console.error('Store: Error during initialization:', error);
      throw error;
    }
  }

  getAnimation(name: string): AnimationPreset | undefined {
    this.checkInitialization();
    return this.animations.get(name);
  }

  setAnimation(name: string, preset: AnimationPreset & { description?: string; group?: string }) {
    this.checkInitialization();
    this.animations.set(name, preset);
    this.persist();
  }

  updateAnimation(name: string, preset: AnimationPreset) {
    this.checkInitialization();
    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }
    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }
    this.animations.set(name, preset);
    this.persist();
  }

  deleteAnimation(name: string) {
    this.checkInitialization();
    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }
    this.animations.delete(name);
    this.persist();
  }

  getAnimationsByGroup(group: string): [string, AnimationPreset][] {
    this.checkInitialization();
    return Array.from(this.animations.entries())
      .filter(([_, preset]) => preset.group === group);
  }

  searchAnimations(query: string): [string, AnimationPreset][] {
    this.checkInitialization();
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.animations.entries())
      .filter(([name, preset]) =>
        name.toLowerCase().includes(lowercaseQuery) ||
        preset.description?.toLowerCase().includes(lowercaseQuery) ||
        preset.group?.toLowerCase().includes(lowercaseQuery)
      );
  }

  private validateAnimation(preset: AnimationPreset): boolean {
    const { type, duration, easing, properties } = preset;

    if (!type || !duration || !easing || !properties) {
      console.warn('Store: Invalid animation - missing required fields');
      return false;
    }

    if (duration <= 0 || duration > 10000) {
      console.warn('Store: Invalid animation - duration out of range');
      return false;
    }

    switch (type) {
      case 'fade':
        if (!properties.opacity) {
          console.warn('Store: Invalid fade animation - missing opacity');
          return false;
        }
        return properties.opacity.from >= 0 &&
               properties.opacity.to >= 0 &&
               properties.opacity.from <= 1 &&
               properties.opacity.to <= 1;

      case 'slide':
        const hasValidPosition = ('x' in properties || 'y' in properties) &&
                               (properties.x?.from !== undefined || properties.y?.from !== undefined) &&
                               (properties.x?.to !== undefined || properties.y?.to !== undefined);
        if (!hasValidPosition) {
          console.warn('Store: Invalid slide animation - invalid position properties');
        }
        return hasValidPosition;

      case 'scale':
        if (!properties.scale) {
          console.warn('Store: Invalid scale animation - missing scale');
          return false;
        }
        return properties.scale.from > 0 &&
               properties.scale.to > 0;

      case 'rotate':
        const hasValidRotation = 'rotation' in properties &&
                                properties.rotation !== undefined;
        if (!hasValidRotation) {
          console.warn('Store: Invalid rotate animation - missing rotation');
        }
        return hasValidRotation;

      default:
        console.warn('Store: Invalid animation type:', type);
        return false;
    }
  }

  private async persist() {
    try {
      const data = Object.fromEntries(this.animations);
      await figma.clientStorage.setAsync('animations', data);
      console.log('Store: Successfully persisted animations');
    } catch (error) {
      console.error('Store: Failed to persist animations:', error);
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
}