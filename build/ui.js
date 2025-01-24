"use strict";
(() => {
  // src/store.ts
  var Store = class {
    constructor() {
      this.animations = /* @__PURE__ */ new Map();
    }
    async init() {
      const stored = await figma.clientStorage.getAsync("animations");
      if (stored) {
        Object.entries(stored).forEach(([key, value]) => {
          this.animations.set(key, value);
        });
      }
    }
    getAnimation(name) {
      return this.animations.get(name);
    }
    setAnimation(name, preset) {
      if (!this.validateAnimation(preset)) {
        throw new Error("Invalid animation preset");
      }
      if (this.animations.has(name)) {
        throw new Error(`Animation "${name}" already exists`);
      }
      this.animations.set(name, preset);
      this.persist();
    }
    updateAnimation(name, preset) {
      if (!this.validateAnimation(preset)) {
        throw new Error("Invalid animation preset");
      }
      if (!this.animations.has(name)) {
        throw new Error(`Animation "${name}" does not exist`);
      }
      this.animations.set(name, preset);
      this.persist();
    }
    deleteAnimation(name) {
      if (!this.animations.has(name)) {
        throw new Error(`Animation "${name}" does not exist`);
      }
      this.animations.delete(name);
      this.persist();
    }
    validateAnimation(preset) {
      const { type, duration, easing, properties } = preset;
      if (!type || !duration || !easing || !properties) {
        return false;
      }
      if (duration <= 0 || duration > 1e4) {
        return false;
      }
      switch (type) {
        case "fade":
          if (!properties.opacity) return false;
          return properties.opacity.from >= 0 && properties.opacity.to >= 0 && properties.opacity.from <= 1 && properties.opacity.to <= 1;
        case "slide":
          return ("x" in properties || "y" in properties) && (properties.x?.from !== void 0 || properties.y?.from !== void 0) && (properties.x?.to !== void 0 || properties.y?.to !== void 0);
        case "scale":
          if (!properties.scale) return false;
          return properties.scale.from > 0 && properties.scale.to > 0;
        case "rotate":
          return "rotation" in properties && properties.rotation !== void 0;
        default:
          return false;
      }
    }
    async persist() {
      const data = Object.fromEntries(this.animations);
      await figma.clientStorage.setAsync("animations", data);
    }
    getAllAnimations() {
      return Array.from(this.animations.entries());
    }
    getAnimationCount() {
      return this.animations.size;
    }
  };

  // src/utils.ts
  function generateAnimationCSS(animation) {
    const { duration, easing, properties } = animation;
    const transforms = [];
    const styles = [];
    Object.entries(properties).forEach(([key, value]) => {
      switch (key) {
        case "x":
          transforms.push(`translateX(${value.to}px)`);
          styles.push(`transform-origin: left center`);
          break;
        case "y":
          transforms.push(`translateY(${value.to}px)`);
          styles.push(`transform-origin: center top`);
          break;
        case "scale":
          transforms.push(`scale(${value.to})`);
          styles.push(`transform-origin: center center`);
          break;
        case "rotation":
          transforms.push(`rotate(${value.to}deg)`);
          styles.push(`transform-origin: center center`);
          break;
        case "opacity":
          styles.push(`opacity: ${value.to}`);
          break;
      }
    });
    const cssTransform = transforms.length > 0 ? `transform: ${transforms.join(" ")};` : "";
    const cssStyles = styles.join(";");
    const keyframeAnimation = generateKeyframes(animation);
    return `
    ${keyframeAnimation}
    animation: customAnimation ${duration}ms ${easing} forwards;
    ${cssTransform}
    ${cssStyles}
  `;
  }
  function generateKeyframes(animation) {
    const { properties } = animation;
    let fromTransforms = [];
    let fromStyles = [];
    let toTransforms = [];
    let toStyles = [];
    Object.entries(properties).forEach(([key, value]) => {
      switch (key) {
        case "x":
          fromTransforms.push(`translateX(${value.from}px)`);
          toTransforms.push(`translateX(${value.to}px)`);
          break;
        case "y":
          fromTransforms.push(`translateY(${value.from}px)`);
          toTransforms.push(`translateY(${value.to}px)`);
          break;
        case "scale":
          fromTransforms.push(`scale(${value.from})`);
          toTransforms.push(`scale(${value.to})`);
          break;
        case "rotation":
          fromTransforms.push(`rotate(${value.from}deg)`);
          toTransforms.push(`rotate(${value.to}deg)`);
          break;
        case "opacity":
          fromStyles.push(`opacity: ${value.from}`);
          toStyles.push(`opacity: ${value.to}`);
          break;
      }
    });
    const fromTransform = fromTransforms.length > 0 ? `transform: ${fromTransforms.join(" ")};` : "";
    const toTransform = toTransforms.length > 0 ? `transform: ${toTransforms.join(" ")};` : "";
    return `
    @keyframes customAnimation {
      from {
        ${fromTransform}
        ${fromStyles.join(";")}
      }
      to {
        ${toTransform}
        ${toStyles.join(";")}
      }
    }
  `;
  }

  // src/ui.ts
  var UI = class {
    constructor() {
      this.previewElement = null;
      this.currentAnimation = null;
      this.store = new Store();
      this.container = document.getElementById("app");
      this.init();
    }
    async init() {
      await this.store.init();
      this.renderCreateForm();
      this.renderAnimationList();
      this.setupMessageHandlers();
      this.updateAnimationList();
      this.createPreviewElement();
    }
    renderCreateForm() {
      const form = document.createElement("div");
      form.className = "section";
      form.innerHTML = `
      <h3>Create Animation
        <span class="tooltip" data-tooltip="Create a new named animation preset">?</span>
      </h3>
      <div class="input-group">
        <input type="text" id="animationName" placeholder="Animation Name" required>
        <div class="error-message">Please enter a unique animation name</div>
      </div>
      <div class="input-group">
        <select id="animationType">
          <option value="fade">Fade</option>
          <option value="slide">Slide</option>
          <option value="scale">Scale</option>
          <option value="rotate">Rotate</option>
        </select>
        <span class="tooltip" data-tooltip="Choose the type of animation effect">?</span>
      </div>
      <div class="input-group">
        <input type="number" id="duration" placeholder="Duration (ms)" value="300" min="0">
        <span class="tooltip" data-tooltip="Animation duration in milliseconds">?</span>
      </div>
      <div class="input-group">
        <select id="easing">
          <option value="ease">Ease</option>
          <option value="linear">Linear</option>
          <option value="ease-in">Ease In</option>
          <option value="ease-out">Ease Out</option>
          <option value="ease-in-out">Ease In Out</option>
        </select>
        <span class="tooltip" data-tooltip="Select the animation timing function">?</span>
      </div>
      <div id="previewContainer" class="preview-container">
        <div id="previewBox" class="preview-box"></div>
        <button id="previewBtn" class="preview-btn">
          Preview Animation
          <span class="tooltip" data-tooltip="See how the animation will look">?</span>
        </button>
      </div>
      <button id="createBtn">Create Animation</button>
    `;
      const createBtn = form.querySelector("#createBtn");
      createBtn.addEventListener("click", () => {
        const nameInput = document.getElementById("animationName");
        const name = nameInput.value.trim();
        if (!name) {
          nameInput.parentElement?.classList.add("error");
          return;
        }
        nameInput.parentElement?.classList.remove("error");
        try {
          const type = document.getElementById("animationType").value;
          const duration = parseInt(document.getElementById("duration").value);
          const easing = document.getElementById("easing").value;
          if (isNaN(duration) || duration <= 0) {
            document.getElementById("duration").parentElement?.classList.add("error");
            return;
          }
          const animation = {
            type,
            duration,
            easing,
            properties: this.getDefaultProperties(type)
          };
          this.store.setAnimation(name, animation);
          nameInput.value = "";
          this.updateAnimationList();
          parent.postMessage({
            pluginMessage: {
              type: "create-animation",
              animation: { name, properties: animation }
            }
          }, "*");
        } catch (error) {
          if (error instanceof Error) {
            const errorElement = document.createElement("div");
            errorElement.className = "error-message";
            errorElement.textContent = error.message;
            form.appendChild(errorElement);
            setTimeout(() => errorElement.remove(), 3e3);
          }
        }
      });
      const previewBtn = form.querySelector("#previewBtn");
      previewBtn.addEventListener("click", () => {
        const type = document.getElementById("animationType").value;
        const duration = parseInt(document.getElementById("duration").value);
        const easing = document.getElementById("easing").value;
        const animation = {
          type,
          duration,
          easing,
          properties: this.getDefaultProperties(type)
        };
        this.previewAnimation(animation);
      });
      const typeSelect = form.querySelector("#animationType");
      typeSelect.addEventListener("change", () => {
        const type = typeSelect.value;
        const duration = parseInt(document.getElementById("duration").value);
        const easing = document.getElementById("easing").value;
        const animation = {
          type,
          duration,
          easing,
          properties: this.getDefaultProperties(type)
        };
        this.previewAnimation(animation);
      });
      this.container.appendChild(form);
    }
    renderAnimationList() {
      const list = document.createElement("div");
      list.className = "section";
      list.innerHTML = `
      <h3>Saved Animations</h3>
      <div class="animation-list" id="animationList"></div>
      <button id="findSimilarBtn">Find Similar Animations</button>
      <button id="applySelectedBtn">Apply Selected Animation</button>
    `;
      const findSimilarBtn = list.querySelector("#findSimilarBtn");
      findSimilarBtn.addEventListener("click", () => {
        parent.postMessage({ pluginMessage: { type: "find-similar" } }, "*");
      });
      const applySelectedBtn = list.querySelector("#applySelectedBtn");
      applySelectedBtn.addEventListener("click", () => {
        const selected = document.querySelector(".animation-item.selected");
        if (!selected) {
          alert("Please select an animation first");
          return;
        }
        const animationName = selected.getAttribute("data-name");
        if (!animationName) return;
        parent.postMessage({
          pluginMessage: {
            type: "apply-animation",
            animationName
          }
        }, "*");
      });
      this.container.appendChild(list);
    }
    updateAnimationList() {
      const listContainer = document.getElementById("animationList");
      const animations = this.store.getAllAnimations();
      listContainer.innerHTML = animations.map(([name, preset]) => `
      <div class="animation-item" data-name="${name}">
        <strong>${name}</strong>
        <br>
        Type: ${preset.type}, Duration: ${preset.duration}ms
        <button class="preview-btn">Preview</button>
      </div>
    `).join("");
      const items = listContainer.querySelectorAll(".animation-item");
      items.forEach((item) => {
        item.addEventListener("click", () => {
          items.forEach((i) => i.classList.remove("selected"));
          item.classList.add("selected");
        });
        const previewBtn = item.querySelector(".preview-btn");
        previewBtn?.addEventListener("click", (e) => {
          e.stopPropagation();
          const name = item.getAttribute("data-name");
          if (name) {
            this.previewAnimation(name);
          }
        });
      });
    }
    createPreviewElement() {
      if (this.previewElement) return;
      this.previewElement = document.createElement("div");
      this.previewElement.className = "preview-element";
      this.previewElement.innerHTML = '<div class="preview-content"></div>';
      document.body.appendChild(this.previewElement);
    }
    previewAnimation(animation) {
      if (!this.previewElement) return;
      const preset = typeof animation === "string" ? this.store.getAnimation(animation) : animation;
      if (!preset) return;
      const content = this.previewElement.querySelector(".preview-content");
      content.style.cssText = "";
      void content.offsetWidth;
      const css = generateAnimationCSS(preset);
      content.style.cssText = css;
      this.currentAnimation = typeof animation === "string" ? animation : null;
    }
    setupMessageHandlers() {
      window.onmessage = (event) => {
        const msg = event.data.pluginMessage;
        if (msg.type === "similar-found") {
          this.showSimilarAnimations(msg.animations);
        }
      };
    }
    getDefaultProperties(type) {
      switch (type) {
        case "fade":
          return { opacity: { from: 0, to: 1 } };
        case "slide":
          return { x: { from: -100, to: 0 } };
        case "scale":
          return { scale: { from: 0.5, to: 1 } };
        case "rotate":
          return { rotation: { from: -180, to: 0 } };
        default:
          return {};
      }
    }
    showSimilarAnimations(animations) {
      const dialog = document.createElement("div");
      dialog.className = "dialog";
      dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Similar Animations Found</h3>
        ${animations.map(([name, nodes]) => `
          <div class="animation-group">
            <strong>${name}</strong> (${nodes.length} objects)
            <div class="animation-nodes">
              ${nodes.map((n) => `<div class="node-item">${n.name}</div>`).join("")}
            </div>
            <button class="group-btn">Group Animation</button>
          </div>
        `).join("")}
        <button class="close-dialog">Close</button>
      </div>
    `;
      const groupBtns = dialog.querySelectorAll(".group-btn");
      groupBtns.forEach((btn, index) => {
        btn.addEventListener("click", () => {
          const [name] = animations[index];
          parent.postMessage({
            pluginMessage: {
              type: "modify-shared",
              animationName: name,
              newProperties: this.store.getAnimation(name)
            }
          }, "*");
        });
      });
      dialog.querySelector(".close-dialog")?.addEventListener("click", () => {
        dialog.remove();
      });
      this.container.appendChild(dialog);
    }
  };
  new UI();
})();
