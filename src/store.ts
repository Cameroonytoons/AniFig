import { AnimationPreset } from './types';

export class Store {
  private animations: Map<string, AnimationPreset & { description?: string; group?: string }> = new Map();
  private initialized: boolean = false;
  private initializationPromise: Promise<void> | null = null;
  private INIT_TIMEOUT = 5000; // 5 seconds timeout

  async init() {
    if (this.initialized) {
      return;
    }

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.initialized = false;
        reject(new Error('Store initialization timed out'));
      }, this.INIT_TIMEOUT);

      try {
        const stored = await figma.clientStorage.getAsync('animations');
        if (stored) {
          Object.entries(stored).forEach(([key, value]) => {
            this.animations.set(key, value as AnimationPreset);
          });
        }

        this.initialized = true;
        clearTimeout(timeoutId);
        resolve();
      } catch (error) {
        clearTimeout(timeoutId);
        this.initialized = false;
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
      return false;
    }

    if (duration <= 0 || duration > 10000) {
      return false;
    }

    switch (type) {
      case 'fade':
        if (!properties.opacity) return false;
        return properties.opacity.from >= 0 &&
               properties.opacity.to >= 0 &&
               properties.opacity.from <= 1 &&
               properties.opacity.to <= 1;

      case 'slide':
        return ('x' in properties || 'y' in properties) &&
               (properties.x?.from !== undefined || properties.y?.from !== undefined) &&
               (properties.x?.to !== undefined || properties.y?.to !== undefined);

      case 'scale':
        if (!properties.scale) return false;
        return properties.scale.from > 0 &&
               properties.scale.to > 0;

      case 'rotate':
        return 'rotation' in properties &&
               properties.rotation !== undefined;

      default:
        return false;
    }
  }

  private async persist() {
    const data = Object.fromEntries(this.animations);
    await figma.clientStorage.setAsync('animations', data);
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