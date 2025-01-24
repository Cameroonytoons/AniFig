import { AnimationPreset } from './types';

export class Store {
  private animations: Map<string, AnimationPreset & { description?: string; group?: string }> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private INIT_TIMEOUT = 5000; // 5 seconds timeout
  private cleanupHandlers: (() => void)[] = [];

  async init() {
    console.log('Store: Starting initialization');
    if (this.initialized) {
      console.log('Store: Already initialized');
      return;
    }

    if (this.initializationPromise) {
      console.log('Store: Using existing initialization promise');
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        console.error('Store: Initialization timed out');
        this.cleanup();
        this.initialized = false;
        reject(new Error('Store initialization timed out'));
      }, this.INIT_TIMEOUT);

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

        this.initialized = true;
        clearTimeout(timeoutId);
        console.log('Store: Initialization completed successfully');
        resolve();
      } catch (error) {
        console.error('Store: Initialization failed:', error);
        clearTimeout(timeoutId);
        this.cleanup();
        this.initialized = false;
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  private cleanup() {
    console.log('Store: Running cleanup');
    this.cleanupHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error('Store: Cleanup handler failed:', error);
      }
    });
    this.cleanupHandlers = [];
    this.animations.clear();
  }

  getAnimation(name: string): AnimationPreset | undefined {
    this.checkInitialization();
    return this.animations.get(name);
  }

  setAnimation(name: string, preset: AnimationPreset & { description?: string; group?: string }) {
    this.checkInitialization();

    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    if (this.animations.has(name)) {
      throw new Error(`Animation "${name}" already exists`);
    }

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
      console.error('Store: Attempted to use store before initialization');
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