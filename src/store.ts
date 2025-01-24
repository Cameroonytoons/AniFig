import { AnimationPreset } from './types';

export class Store {
  private animations: Map<string, AnimationPreset> = new Map();

  async init() {
    const stored = await figma.clientStorage.getAsync('animations');
    if (stored) {
      Object.entries(stored).forEach(([key, value]) => {
        this.animations.set(key, value as AnimationPreset);
      });
    }
  }

  getAnimation(name: string): AnimationPreset | undefined {
    return this.animations.get(name);
  }

  setAnimation(name: string, preset: AnimationPreset) {
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