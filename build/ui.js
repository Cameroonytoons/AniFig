"use strict";
var UI = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/ui.ts
  var ui_exports = {};
  __export(ui_exports, {
    default: () => ui_default
  });

  // src/store.ts
  var Store = class {
    constructor() {
      this.animations = /* @__PURE__ */ new Map();
      this.initialized = false;
    }
    async init() {
      if (this.initialized) {
        console.log("Store already initialized");
        return;
      }
      try {
        console.log("Initializing Store");
        const stored = await figma.clientStorage.getAsync("animations");
        console.log("Retrieved stored animations:", stored ? "Found" : "None");
        if (stored) {
          Object.entries(stored).forEach(([key, value]) => {
            console.log(`Loading animation: ${key}`);
            this.animations.set(key, value);
          });
        }
        this.initialized = true;
        console.log("Store initialization completed");
      } catch (error) {
        console.error("Error initializing store:", error);
        this.initialized = false;
        throw error;
      }
    }
    getAnimation(name) {
      if (!this.initialized) {
        throw new Error("Store not initialized");
      }
      return this.animations.get(name);
    }
    setAnimation(name, preset) {
      if (!this.initialized) {
        throw new Error("Store not initialized");
      }
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
    getAnimationsByGroup(group) {
      return Array.from(this.animations.entries()).filter(([_, preset]) => preset.group === group);
    }
    searchAnimations(query) {
      const lowercaseQuery = query.toLowerCase();
      return Array.from(this.animations.entries()).filter(
        ([name, preset]) => {
          var _a, _b;
          return name.toLowerCase().includes(lowercaseQuery) || ((_a = preset.description) == null ? void 0 : _a.toLowerCase().includes(lowercaseQuery)) || ((_b = preset.group) == null ? void 0 : _b.toLowerCase().includes(lowercaseQuery));
        }
      );
    }
    validateAnimation(preset) {
      var _a, _b, _c, _d;
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
          return ("x" in properties || "y" in properties) && (((_a = properties.x) == null ? void 0 : _a.from) !== void 0 || ((_b = properties.y) == null ? void 0 : _b.from) !== void 0) && (((_c = properties.x) == null ? void 0 : _c.to) !== void 0 || ((_d = properties.y) == null ? void 0 : _d.to) !== void 0);
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
  var instance = null;
  var UI = class _UI {
    // Using ReturnType instead of NodeJS.Timeout
    constructor() {
      // Using definite assignment assertion
      this.container = null;
      this.previewElement = null;
      this.currentAnimation = null;
      this.searchInput = null;
      this.initializationTimeout = null;
      console.log("UI Constructor: Starting initialization");
      if (instance) {
        console.warn("UI instance already exists");
        return instance;
      }
      instance = this;
      this.store = new Store();
      this.initializePlugin();
    }
    static getInstance() {
      if (!instance) {
        instance = new _UI();
      }
      return instance;
    }
    async initializePlugin() {
      console.log("InitializePlugin: Starting setup");
      try {
        const errorState = document.getElementById("error-state");
        if (errorState) {
          errorState.style.display = "none";
        }
        window.onerror = (msg, url, lineNo, columnNo, error) => {
          console.error("Global error:", msg, "at", lineNo, ":", columnNo);
          console.error("Stack:", error == null ? void 0 : error.stack);
          this.showErrorState(new Error(msg));
          return false;
        };
        window.onmessage = (event) => {
          const msg = event.data.pluginMessage;
          if ((msg == null ? void 0 : msg.type) === "plugin-ready") {
            this.continueInitialization().catch((error) => {
              console.error("Failed to continue initialization:", error);
              this.showErrorState(error);
            });
          }
        };
        parent.postMessage({ pluginMessage: { type: "check-ready" } }, "*");
        this.initializationTimeout = setTimeout(() => {
          var _a;
          if (!((_a = this.container) == null ? void 0 : _a.classList.contains("loaded"))) {
            const error = new Error("Plugin initialization timeout");
            console.error(error);
            this.showErrorState(error);
          }
        }, 5e3);
      } catch (error) {
        console.error("Failed to initialize plugin:", error);
        this.showErrorState(error);
      }
    }
    async continueInitialization() {
      try {
        console.log("Plugin ready, initializing store");
        await this.store.init();
        await this.initializeDOMAfterLoad();
        if (this.initializationTimeout) {
          clearTimeout(this.initializationTimeout);
        }
      } catch (error) {
        console.error("Failed to continue initialization:", error);
        this.showErrorState(error);
        throw error;
      }
    }
    async initializeDOMAfterLoad() {
      console.log("InitializeDOMAfterLoad: Starting DOM initialization");
      try {
        this.container = document.getElementById("app");
        if (!this.container) {
          throw new Error("Could not find app container");
        }
        console.log("Found app container, rendering UI components");
        this.renderCreateForm();
        this.renderAnimationList();
        this.setupMessageHandlers();
        this.updateAnimationList();
        this.createPreviewElement();
        const loading = document.getElementById("loading");
        if (loading) {
          loading.remove();
        }
        console.log("UI initialization complete, showing content");
        this.container.classList.add("loaded");
      } catch (error) {
        console.error("Failed to initialize DOM:", error);
        this.showErrorState(error);
      }
    }
    showErrorState(error) {
      const errorState = document.getElementById("error-state");
      if (errorState) {
        errorState.style.display = "block";
        if (error) {
          const errorMessage = document.createElement("p");
          errorMessage.textContent = error.message;
          errorState.appendChild(errorMessage);
        }
      }
      const loading = document.getElementById("loading");
      if (loading) {
        loading.style.display = "none";
      }
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
        <input type="text" id="animationDescription" placeholder="Description (optional)">
        <span class="tooltip" data-tooltip="Add a description to help identify this animation">?</span>
      </div>
      <div class="input-group">
        <input type="text" id="animationGroup" placeholder="Group (optional)">
        <span class="tooltip" data-tooltip="Group related animations together">?</span>
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
        var _a, _b, _c;
        const nameInput = document.getElementById("animationName");
        const descriptionInput = document.getElementById("animationDescription");
        const groupInput = document.getElementById("animationGroup");
        const name = nameInput.value.trim();
        if (!name) {
          (_a = nameInput.parentElement) == null ? void 0 : _a.classList.add("error");
          return;
        }
        (_b = nameInput.parentElement) == null ? void 0 : _b.classList.remove("error");
        try {
          const type = document.getElementById("animationType").value;
          const duration = parseInt(document.getElementById("duration").value);
          const easing = document.getElementById("easing").value;
          if (isNaN(duration) || duration <= 0) {
            (_c = document.getElementById("duration").parentElement) == null ? void 0 : _c.classList.add("error");
            return;
          }
          const animation = {
            type,
            duration,
            easing,
            properties: this.getDefaultProperties(type),
            description: descriptionInput.value.trim() || void 0,
            group: groupInput.value.trim() || void 0
          };
          this.store.setAnimation(name, animation);
          nameInput.value = "";
          descriptionInput.value = "";
          groupInput.value = "";
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
      <div class="search-container">
        <input type="text" id="searchAnimations" placeholder="Search animations...">
        <span class="tooltip" data-tooltip="Search by name, description, or group">?</span>
      </div>
      <div class="animation-list" id="animationList"></div>
      <button id="findSimilarBtn">Find Similar Animations</button>
      <button id="applySelectedBtn">Apply Selected Animation</button>
    `;
      this.searchInput = list.querySelector("#searchAnimations");
      this.searchInput.addEventListener("input", () => {
        this.updateAnimationList(this.searchInput.value.trim());
      });
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
    updateAnimationList(searchQuery = "") {
      const listContainer = document.getElementById("animationList");
      const animations = searchQuery ? this.store.searchAnimations(searchQuery) : this.store.getAllAnimations();
      let currentGroup = "";
      const groupedAnimations = animations.sort(([, a], [, b]) => (a.group || "").localeCompare(b.group || "")).map(([name, preset]) => {
        const isNewGroup = preset.group && preset.group !== currentGroup;
        if (isNewGroup) {
          currentGroup = preset.group;
          return `
            ${isNewGroup ? `<div class="group-header">${preset.group}</div>` : ""}
            <div class="animation-item" data-name="${name}">
              <strong>${name}</strong>
              ${preset.description ? `<p class="description">${preset.description}</p>` : ""}
              <br>
              Type: ${preset.type}, Duration: ${preset.duration}ms
              <button class="preview-btn">Preview</button>
            </div>
          `;
        }
        return `
          <div class="animation-item" data-name="${name}">
            <strong>${name}</strong>
            ${preset.description ? `<p class="description">${preset.description}</p>` : ""}
            <br>
            Type: ${preset.type}, Duration: ${preset.duration}ms
            <button class="preview-btn">Preview</button>
          </div>
        `;
      }).join("");
      listContainer.innerHTML = groupedAnimations;
      const items = listContainer.querySelectorAll(".animation-item");
      items.forEach((item) => {
        item.addEventListener("click", () => {
          items.forEach((i) => i.classList.remove("selected"));
          item.classList.add("selected");
        });
        const previewBtn = item.querySelector(".preview-btn");
        previewBtn == null ? void 0 : previewBtn.addEventListener("click", (e) => {
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
      const content = document.createElement("div");
      content.className = "preview-content";
      this.previewElement.appendChild(content);
      try {
        const canvas = document.createElement("canvas");
        canvas.setAttribute("willReadFrequently", "true");
        canvas.className = "preview-canvas";
        this.previewElement.appendChild(canvas);
      } catch (error) {
        console.warn("Canvas creation failed:", error);
      }
      if (document.body) {
        document.body.appendChild(this.previewElement);
      } else {
        console.warn("Document body not available for preview element");
      }
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
      var _a;
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
      (_a = dialog.querySelector(".close-dialog")) == null ? void 0 : _a.addEventListener("click", () => {
        dialog.remove();
      });
      this.container.appendChild(dialog);
    }
  };
  console.log("UI module loaded, setting up global instance");
  window.UI = UI;
  window.addEventListener("load", () => {
    try {
      console.log("Window loaded, creating UI instance");
      UI.getInstance();
      console.log("UI initialized successfully");
    } catch (error) {
      console.error("Error creating UI:", error);
      const errorState = document.getElementById("error-state");
      if (errorState) {
        errorState.style.display = "block";
      }
    }
  });
  var ui_default = UI;
  return __toCommonJS(ui_exports);
})();
//# sourceMappingURL=ui.js.map
