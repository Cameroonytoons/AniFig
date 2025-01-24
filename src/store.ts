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
    this.animations.set(name, preset);
    this.persist();
  }

  private async persist() {
    const data = Object.fromEntries(this.animations);
    await figma.clientStorage.setAsync('animations', data);
  }

  getAllAnimations(): [string, AnimationPreset][] {
    return Array.from(this.animations.entries());
  }
}
