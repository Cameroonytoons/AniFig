/// <reference types="@figma/plugin-typings" />
import { AnimationPreset, Message } from './src/types';

console.log('Starting plugin initialization...');

// Show UI with proper dimensions and styling
figma.showUI(__html__, { 
  width: 320, 
  height: 480, 
  themeColors: true,
  title: 'Animation Library Manager'
});

let animationStore: { [key: string]: AnimationPreset } = {};
let isInitialized = false;

// Initialize plugin with proper error handling
async function initializePlugin() {
  console.log('Initializing plugin...');
  try {
    // Load stored animations
    const stored = await figma.clientStorage.getAsync('animations');
    if (stored) {
      animationStore = stored as { [key: string]: AnimationPreset };
      console.log('Successfully loaded stored animations');
    }

    isInitialized = true;
    console.log('Plugin initialized successfully');

    // Notify UI of successful initialization
    figma.ui.postMessage({ 
      type: 'plugin-ready',
      state: { isInitialized: true }
    });

  } catch (error) {
    console.error('Initialization error:', error);
    isInitialized = false;
    figma.ui.postMessage({ 
      type: 'initialization-error',
      error: error instanceof Error ? error.message : 'Unknown initialization error'
    });
    throw error;
  }
}

// Setup message handlers with improved error handling
figma.ui.onmessage = async (msg: Message) => {
  console.log('Received message:', msg.type);

  if (!isInitialized && msg.type !== 'check-ready') {
    console.warn('Plugin not initialized, rejecting message:', msg.type);
    figma.notify('Plugin is still initializing', { error: true });
    return;
  }

  try {
    switch (msg.type) {
      case 'check-ready':
        console.log('Checking plugin ready state:', isInitialized);
        figma.ui.postMessage({ 
          type: 'plugin-ready',
          state: { isInitialized }
        });
        break;

      case 'create-animation':
        if (msg.animation) {
          const { name, properties } = msg.animation;
          if (animationStore[name]) {
            figma.notify(`Animation "${name}" already exists`, { error: true });
            return;
          }
          animationStore[name] = properties;
          await figma.clientStorage.setAsync('animations', animationStore);
          figma.notify(`Animation "${name}" created successfully`);
        }
        break;

      case 'apply-animation':
        handleApplyAnimation(msg);
        break;

      case 'find-similar':
        handleFindSimilar();
        break;

      case 'modify-shared':
        handleModifyShared(msg);
        break;
    }
  } catch (error) {
    console.error('Error handling message:', msg.type, error);
    figma.notify(error instanceof Error ? error.message : 'An error occurred', { error: true });
  }
};

// Initialize the plugin
initializePlugin().catch(error => {
  console.error('Failed to initialize plugin:', error);
  figma.notify('Failed to initialize plugin', { error: true });
});

// Helper functions moved to separate function declarations for better error tracking
async function handleApplyAnimation(msg: Message) {
  if (msg.type !== 'apply-animation') return;

  const selection = figma.currentPage.selection;
  if (selection.length === 0) {
    figma.notify('Please select at least one object', { error: true });
    return;
  }

  if (msg.animationName && animationStore[msg.animationName]) {
    const animation = animationStore[msg.animationName];
    let appliedCount = 0;

    for (const node of selection) {
      if ('opacity' in node || 'x' in node || 'rotation' in node) {
        node.setPluginData('animation', msg.animationName);
        await applyAnimation(
          node as SceneNode & { opacity?: number, x?: number, rotation?: number }, 
          animation
        );
        appliedCount++;
      }
    }

    figma.notify(`Animation applied to ${appliedCount} object(s)`);
  } else {
    figma.notify('Animation not found', { error: true });
  }
}

function handleFindSimilar() {
  const similar = findSimilarAnimations();
  if (similar.length > 0) {
    figma.ui.postMessage({ 
      type: 'similar-found', 
      animations: similar.map(([name, nodes]) => [
        name, 
        nodes.map(n => ({ id: n.id, name: n.name }))
      ])
    });
  } else {
    figma.notify('No similar animations found');
  }
}

async function handleModifyShared(msg: Message) {
  if (msg.type !== 'modify-shared') return;

  if (msg.animationName && msg.newProperties) {
    animationStore[msg.animationName] = msg.newProperties;
    await figma.clientStorage.setAsync('animations', animationStore);
    await updateSharedAnimations(msg.animationName, msg.newProperties);
    figma.notify(`Animation "${msg.animationName}" updated successfully`);
  }
}

// Existing helper functions remain unchanged
async function applyAnimation(node: SceneNode & { opacity?: number, x?: number, rotation?: number }, animation: AnimationPreset) {
  const { duration, easing, properties } = animation;
  node.setPluginData('animationProps', JSON.stringify({ duration, easing, properties }));

  const existingControllers = figma.currentPage.findAll(n => 
    n.getPluginData('targetNode') === node.id
  );
  existingControllers.forEach(n => n.remove());

  for (const [key, value] of Object.entries(properties)) {
    if (key in node) {
      (node as any)[key] = value.from;

      const transition = figma.createFrame();
      transition.name = `${node.name}-transition`;
      transition.resize(1, 1);
      transition.opacity = 0;
      transition.locked = true;

      transition.setPluginData('animationType', key);
      transition.setPluginData('targetNode', node.id);
      transition.setPluginData('animationStart', value.from.toString());
      transition.setPluginData('animationEnd', value.to.toString());
      transition.setPluginData('duration', duration.toString());
      transition.setPluginData('easing', easing);

      if ('absoluteTransform' in node) {
        const nodeTransform = node.absoluteTransform;
        transition.x = nodeTransform[0][2];
        transition.y = nodeTransform[1][2] - 20;
      } else {
        transition.x = 0;
        transition.y = 0;
      }

      node.setRelaunchData({ 
        animate: `Play ${animation.type} animation (${duration}ms ${easing})`
      });
    }
  }
}

function findSimilarAnimations(): [string, SceneNode[]][] {
  const nodes = figma.currentPage.findAll(node => node.getPluginData('animation') !== '');
  const animationMap = new Map<string, SceneNode[]>();

  nodes.forEach(node => {
    const animationName = node.getPluginData('animation');
    if (animationName) {
      if (!animationMap.has(animationName)) {
        animationMap.set(animationName, []);
      }
      animationMap.get(animationName)!.push(node);
    }
  });

  return Array.from(animationMap.entries())
    .filter(([_, nodes]) => nodes.length > 1);
}

async function updateSharedAnimations(name: string, properties: AnimationPreset) {
  const nodes = figma.currentPage.findAll(node => node.getPluginData('animation') === name);

  for (const node of nodes) {
    if ('opacity' in node || 'x' in node || 'rotation' in node) {
      await applyAnimation(
        node as SceneNode & { opacity?: number, x?: number, rotation?: number }, 
        properties
      );
    }
  }
}

figma.on('selectionchange', () => {
  if (!isInitialized) return;

  const nodes = figma.currentPage.selection;
  nodes.forEach(node => {
    const animationName = node.getPluginData('animation');
    if (animationName && animationStore[animationName]) {
      applyAnimation(
        node as SceneNode & { opacity?: number, x?: number, rotation?: number },
        animationStore[animationName]
      );
    }
  });
});