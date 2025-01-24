import { AnimationPreset } from './types';

export class Store {
  private animations: Map<string, AnimationPreset & { description?: string; group?: string }> = new Map();
  private initialized: boolean = false;

  async init() {
    if (this.initialized) {
      console.log('Store already initialized');
      return;
    }

    try {
      console.log('Initializing Store');
      const stored = await figma.clientStorage.getAsync('animations');
      console.log('Retrieved stored animations:', stored ? 'Found' : 'None');

      if (stored) {
        Object.entries(stored).forEach(([key, value]) => {
          console.log(`Loading animation: ${key}`);
          this.animations.set(key, value as AnimationPreset);
        });
      }

      this.initialized = true;
      console.log('Store initialization completed');
    } catch (error) {
      console.error('Error initializing store:', error);
      this.initialized = false;
      throw error;
    }
  }

  getAnimation(name: string): AnimationPreset | undefined {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }
    return this.animations.get(name);
  }

  setAnimation(name: string, preset: AnimationPreset & { description?: string; group?: string }) {
    if (!this.initialized) {
      throw new Error('Store not initialized');
    }

    // Validate animation parameters
    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    // Check for existing animation
    if (this.animations.has(name)) {
      throw new Error(`Animation "${name}" already exists`);
    }

    this.animations.set(name, preset);
    this.persist();
  }

  updateAnimation(name: string, preset: AnimationPreset) {
    // Validate animation parameters
    if (!this.validateAnimation(preset)) {
      throw new Error('Invalid animation preset');
    }

    // Check if animation exists
    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }

    this.animations.set(name, preset);
    this.persist();
  }

  deleteAnimation(name: string) {
    if (!this.animations.has(name)) {
      throw new Error(`Animation "${name}" does not exist`);
    }
    this.animations.delete(name);
    this.persist();
  }

  getAnimationsByGroup(group: string): [string, AnimationPreset][] {
    return Array.from(this.animations.entries())
      .filter(([_, preset]) => preset.group === group);
  }

  searchAnimations(query: string): [string, AnimationPreset][] {
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
      return false;
    }

    // Validate duration
    if (duration <= 0 || duration > 10000) {
      return false;
    }

    // Validate properties based on type
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

  getAllAnimations(): [string, AnimationPreset][] {
    return Array.from(this.animations.entries());
  }

  getAnimationCount(): number {
    return this.animations.size;
  }
}