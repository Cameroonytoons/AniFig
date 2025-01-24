import { AnimationPreset } from './types';

export class Store {
  private animations: Map<string, AnimationPreset & { description?: string; group?: string }> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private INIT_TIMEOUT = 5000; // 5 seconds timeout

  async init() {
    if (this.initialized) {
      console.log('Store already initialized');
      return;
    }

    if (this.initializationPromise) {
      console.log('Store initialization already in progress');
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.initialized = false;
        reject(new Error('Store initialization timed out'));
      }, this.INIT_TIMEOUT);

      try {
        console.log('Initializing Store');
        // Add a small delay to ensure UI is responsive during initialization
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('Accessing client storage...');
        const stored = await figma.clientStorage.getAsync('animations');
        console.log('Retrieved stored animations:', stored ? 'Found' : 'None');

        if (stored) {
          console.log('Processing stored animations...');
          Object.entries(stored).forEach(([key, value]) => {
            console.log(`Loading animation: ${key}`);
            this.animations.set(key, value as AnimationPreset);
          });
          console.log(`Loaded ${this.animations.size} animations`);
        }

        this.initialized = true;
        clearTimeout(timeoutId);
        console.log('Store initialization completed successfully');
        resolve();
      } catch (error) {
        console.error('Error initializing store:', error);
        this.initialized = false;
        clearTimeout(timeoutId);
        reject(error);
      }
    });

    return this.initializationPromise;
  }

  getAnimation(name: string): AnimationPreset | undefined {
    this.checkInitialization();
    return this.animations.get(name);
  }

  setAnimation(name: string, preset: AnimationPreset & { description?: string; group?: string }) {
    this.checkInitialization();

    // Validate animation parameters
    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    // Check for existing animation
    if (this.animations.has(name)) {
      throw new Error(`Animation "${name}" already exists`);
    }

    this.animations.set(name, preset);
    this.persist().catch(error => {
      console.error('Failed to persist animation:', error);
      this.animations.delete(name);
      throw error;
    });
  }

  updateAnimation(name: string, preset: AnimationPreset) {
    this.checkInitialization();

    // Validate animation parameters
    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    // Check if animation exists
    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }

    const oldPreset = this.animations.get(name);
    this.animations.set(name, preset);

    this.persist().catch(error => {
      console.error('Failed to persist animation update:', error);
      if (oldPreset) {
        this.animations.set(name, oldPreset);
      }
      throw error;
    });
  }

  deleteAnimation(name: string) {
    this.checkInitialization();

    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }

    const oldPreset = this.animations.get(name);
    this.animations.delete(name);

    this.persist().catch(error => {
      console.error('Failed to persist animation deletion:', error);
      if (oldPreset) {
        this.animations.set(name, oldPreset);
      }
      throw error;
    });
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

    // Validate required fields
    if (!type || !duration || !easing || !properties) {
      console.warn('Missing required fields in animation preset');
      return false;
    }

    // Validate duration
    if (duration <= 0 || duration > 10000) {
      console.warn('Invalid duration:', duration);
      return false;
    }

    // Validate properties based on type
    switch (type) {
      case 'fade':
        if (!properties.opacity) {
          console.warn('Missing opacity property for fade animation');
          return false;
        }
        return properties.opacity.from >= 0 &&
               properties.opacity.to >= 0 &&
               properties.opacity.from <= 1 &&
               properties.opacity.to <= 1;

      case 'slide':
        return ('x' in properties || 'y' in properties) &&
               (properties.x?.from !== undefined || properties.y?.from !== undefined) &&
               (properties.x?.to !== undefined || properties.y?.to !== undefined);

      case 'scale':
        if (!properties.scale) {
          console.warn('Missing scale property for scale animation');
          return false;
        }
        return properties.scale.from > 0 &&
               properties.scale.to > 0;

      case 'rotate':
        return 'rotation' in properties &&
               properties.rotation !== undefined;

      default:
        console.warn('Invalid animation type:', type);
        return false;
    }
  }

  private async persist() {
    if (!this.initialized) {
      throw new Error('Cannot persist: Store not initialized');
    }

    try {
      console.log('Persisting animations to client storage...');
      const data = Object.fromEntries(this.animations);
      await figma.clientStorage.setAsync('animations', data);
      console.log('Successfully persisted animations');
    } catch (error) {
      console.error('Failed to persist animations:', error);
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