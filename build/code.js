"use strict";

// code.ts
figma.showUI(__html__, { width: 320, height: 480 });
var animationStore = {};
figma.ui.onmessage = async (msg) => {
  try {
    switch (msg.type) {
      case "create-animation":
        if (msg.animation) {
          const { name, properties } = msg.animation;
          if (animationStore[name]) {
            figma.notify(`Animation "${name}" already exists`, { error: true });
            return;
          }
          animationStore[name] = properties;
          await figma.clientStorage.setAsync("animations", animationStore);
          figma.notify(`Animation "${name}" created successfully`);
        }
        break;
      case "apply-animation":
        const selection = figma.currentPage.selection;
        if (selection.length === 0) {
          figma.notify("Please select at least one object", { error: true });
          return;
        }
        if (msg.animationName && animationStore[msg.animationName]) {
          const animation = animationStore[msg.animationName];
          let appliedCount = 0;
          for (const node of selection) {
            if ("opacity" in node || "x" in node || "rotation" in node) {
              node.setPluginData("animation", msg.animationName);
              await applyAnimation(node, animation);
              appliedCount++;
            }
          }
          figma.notify(`Animation applied to ${appliedCount} object(s)`);
        } else {
          figma.notify("Animation not found", { error: true });
        }
        break;
      case "find-similar":
        const similar = findSimilarAnimations();
        if (similar.length > 0) {
          figma.ui.postMessage({
            type: "similar-found",
            animations: similar.map(([name, nodes]) => [
              name,
              nodes.map((n) => ({ id: n.id, name: n.name }))
            ])
          });
        } else {
          figma.notify("No similar animations found");
        }
        break;
      case "modify-shared":
        if (msg.animationName && msg.newProperties) {
          animationStore[msg.animationName] = msg.newProperties;
          await figma.clientStorage.setAsync("animations", animationStore);
          await updateSharedAnimations(msg.animationName, msg.newProperties);
          figma.notify(`Animation "${msg.animationName}" updated successfully`);
        }
        break;
    }
  } catch (error) {
    console.error("Plugin error:", error);
    figma.notify("An error occurred", { error: true });
  }
};
async function applyAnimation(node, animation) {
  const { duration, easing, properties } = animation;
  node.setPluginData("animationProps", JSON.stringify({
    duration,
    easing,
    properties
  }));
  const existingControllers = figma.currentPage.findAll(
    (n) => n.getPluginData("targetNode") === node.id
  );
  existingControllers.forEach((n) => n.remove());
  for (const [key, value] of Object.entries(properties)) {
    if (key in node) {
      node[key] = value.from;
      const transition = figma.createFrame();
      transition.name = `${node.name}-transition`;
      transition.resize(1, 1);
      transition.opacity = 0;
      transition.locked = true;
      transition.setPluginData("animationType", key);
      transition.setPluginData("targetNode", node.id);
      transition.setPluginData("animationStart", value.from.toString());
      transition.setPluginData("animationEnd", value.to.toString());
      transition.setPluginData("duration", duration.toString());
      transition.setPluginData("easing", easing);
      if ("absoluteTransform" in node) {
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
function findSimilarAnimations() {
  const nodes = figma.currentPage.findAll(
    (node) => node.getPluginData("animation") !== ""
  );
  const animationMap = /* @__PURE__ */ new Map();
  nodes.forEach((node) => {
    const animationName = node.getPluginData("animation");
    if (animationName) {
      if (!animationMap.has(animationName)) {
        animationMap.set(animationName, []);
      }
      animationMap.get(animationName).push(node);
    }
  });
  return Array.from(animationMap.entries()).filter(([_, nodes2]) => nodes2.length > 1);
}
async function updateSharedAnimations(name, properties) {
  const nodes = figma.currentPage.findAll(
    (node) => node.getPluginData("animation") === name
  );
  for (const node of nodes) {
    if ("opacity" in node || "x" in node || "rotation" in node) {
      await applyAnimation(node, properties);
    }
  }
}
(async () => {
  try {
    const stored = await figma.clientStorage.getAsync("animations");
    if (stored) {
      animationStore = stored;
    }
    figma.on("run", () => {
      console.log("Plugin started");
    });
    figma.once("selectionchange", () => {
      const nodes = figma.currentPage.selection;
      nodes.forEach((node) => {
        const animationName = node.getPluginData("animation");
        if (animationName && animationStore[animationName]) {
          applyAnimation(
            node,
            animationStore[animationName]
          );
        }
      });
    });
    figma.notify("Animation Library Manager initialized");
  } catch (error) {
    console.error("Initialization error:", error);
    figma.notify("Failed to initialize plugin", { error: true });
  }
})();
