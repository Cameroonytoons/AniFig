import { AnimationPreset, Message } from './src/types';

figma.showUI(__html__, { width: 320, height: 480 });

let animationStore: { [key: string]: AnimationPreset } = {};

figma.ui.onmessage = async (msg: Message) => {
  switch (msg.type) {
    case 'create-animation':
      if (msg.animation) {
        const { name, properties } = msg.animation;
        animationStore[name] = properties;
        await figma.clientStorage.setAsync('animations', animationStore);
      }
      break;

    case 'apply-animation':
      const selection = figma.currentPage.selection;
      if (selection.length === 0) {
        figma.notify('Please select an object first');
        return;
      }

      if (msg.animationName && animationStore[msg.animationName]) {
        const animation = animationStore[msg.animationName];
        selection.forEach(node => {
          if ('effects' in node) {
            node.setPluginData('animation', msg.animationName!);
            applyAnimation(node, animation);
          }
        });
      }
      break;

    case 'find-similar':
      const similar = findSimilarAnimations();
      figma.ui.postMessage({ type: 'similar-found', animations: similar });
      break;

    case 'modify-shared':
      if (msg.animationName && msg.newProperties) {
        animationStore[msg.animationName] = msg.newProperties;
        await figma.clientStorage.setAsync('animations', animationStore);
        updateSharedAnimations(msg.animationName, msg.newProperties);
      }
      break;
  }
};

function applyAnimation(node: SceneNode, animation: AnimationPreset) {
  if ('effects' in node) {
    const { duration, easing, properties } = animation;
    node.setPluginData('animationProps', JSON.stringify({
      duration,
      easing,
      properties
    }));
  }
}

function findSimilarAnimations(): [string, SceneNode[]][] {
  const nodes = figma.currentPage.findAll();
  const animationMap = new Map<string, SceneNode[]>();

  nodes.forEach(node => {
    if ('effects' in node) {
      const animationName = node.getPluginData('animation');
      if (animationName) {
        if (!animationMap.has(animationName)) {
          animationMap.set(animationName, []);
        }
        animationMap.get(animationName)!.push(node);
      }
    }
  });

  return Array.from(animationMap.entries())
    .filter(([_, nodes]) => nodes.length > 1);
}

function updateSharedAnimations(name: string, properties: AnimationPreset) {
  const nodes = figma.currentPage.findAll();
  nodes.forEach(node => {
    if ('effects' in node && node.getPluginData('animation') === name) {
      applyAnimation(node, properties);
    }
  });
}

// Initialize
(async () => {
  const stored = await figma.clientStorage.getAsync('animations');
  if (stored) {
    animationStore = stored as { [key: string]: AnimationPreset };
  }
})();