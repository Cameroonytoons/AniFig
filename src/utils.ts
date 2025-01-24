import { AnimationPreset } from './types';

export function compareAnimations(a: AnimationPreset, b: AnimationPreset): boolean {
  if (a.type !== b.type || a.duration !== b.duration || a.easing !== b.easing) {
    return false;
  }

  const aProps = Object.entries(a.properties);
  const bProps = Object.entries(b.properties);

  if (aProps.length !== bProps.length) {
    return false;
  }

  return aProps.every(([key, value]: [string, { from: number; to: number }]) => {
    const bValue = b.properties[key];
    return bValue &&
           value.from === bValue.from &&
           value.to === bValue.to;
  });
}

export function generateAnimationCSS(animation: AnimationPreset): string {
  const { duration, easing, properties } = animation;
  const props = Object.entries(properties)
    .map(([key, value]: [string, { from: number; to: number }]) => `${key}: ${value.to}`)
    .join(';');

  return `
    transition: all ${duration}ms ${easing};
    ${props}
  `;
}