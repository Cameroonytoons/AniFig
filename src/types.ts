export interface AnimationPreset {
  type: string;
  duration: number;
  easing: string;
  properties: {
    [key: string]: {
      from: number;
      to: number;
    };
  };
}

export interface Message {
  type: string;
  animation?: {
    name: string;
    properties: AnimationPreset;
  };
  animationName?: string;
  newProperties?: AnimationPreset;
}
