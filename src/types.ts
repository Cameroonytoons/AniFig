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

export interface PluginReadyMessage {
  type: 'plugin-ready';
  state: {
    isInitialized: boolean;
  };
}

export interface InitializationErrorMessage {
  type: 'initialization-error';
  error: string;
}

export interface CreateAnimationMessage {
  type: 'create-animation';
  animation: {
    name: string;
    properties: AnimationPreset;
  };
}

export interface ApplyAnimationMessage {
  type: 'apply-animation';
  animationName: string;
}

export interface FindSimilarMessage {
  type: 'find-similar';
}

export interface ModifySharedMessage {
  type: 'modify-shared';
  animationName: string;
  newProperties: AnimationPreset;
}

export interface CheckReadyMessage {
  type: 'check-ready';
}

export type Message = 
  | PluginReadyMessage
  | InitializationErrorMessage
  | CreateAnimationMessage
  | ApplyAnimationMessage
  | FindSimilarMessage
  | ModifySharedMessage
  | CheckReadyMessage;

export interface AnimationGroup {
  name: string;
  nodes: Array<{
    id: string;
    name: string;
  }>;
}

export type SimilarAnimationsResponse = [string, Array<{ id: string; name: string }>][];

export interface ErrorState {
  message: string;
  details?: string;
  stack?: string;
}