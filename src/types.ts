export interface AnimationPreset {
  type: 'fade' | 'slide' | 'scale' | 'rotate';
  duration: number;
  easing: 'ease' | 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  description?: string;
  group?: string;
  properties: {
    [key in 'opacity' | 'x' | 'y' | 'rotation' | 'scale']?: {
      from: number;
      to: number;
    };
  };
}

export interface Message {
  type: 'check-ready' | 'create-animation' | 'apply-animation' | 'find-similar' | 'modify-shared';
  animation?: {
    name: string;
    properties: AnimationPreset;
  };
  animationName?: string;
  newProperties?: AnimationPreset;
}

export interface AnimationGroup {
  name: string;
  nodes: Array<{
    id: string;
    name: string;
  }>;
}

export type SimilarAnimationsResponse = [string, Array<{ id: string; name: string }>][];