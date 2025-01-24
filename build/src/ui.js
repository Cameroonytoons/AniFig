import { Store } from './store';
import { generateAnimationCSS } from './utils';
let instance = null;
class UI {
    constructor() {
        this.container = null;
        this.previewElement = null;
        this.currentAnimation = null;
        this.searchInput = null;
        this.initializationTimeout = null; // Using ReturnType instead of NodeJS.Timeout
        this.initialized = false;
        if (instance) {
            console.warn('UI instance already exists');
            return instance;
        }
        instance = this;
        this.store = new Store();
    }
    static getInstance() {
        try {
            if (!instance) {
                instance = new UI();
                instance.initializePlugin().catch(error => {
                    console.error('Failed to initialize UI:', error);
                    instance = null;
                    throw error;
                });
            }
            return instance;
        }
        catch (error) {
            console.error('Error getting UI instance:', error);
            return null;
        }
    }
    async initializePlugin() {
        console.log('InitializePlugin: Starting setup');
        try {
            if (this.initialized) {
                return;
            }
            // Clear any existing error state
            const errorState = document.getElementById('error-state');
            if (errorState) {
                errorState.style.display = 'none';
            }
            // Set up error handlers first
            window.onerror = (msg, url, lineNo, columnNo, error) => {
                console.error('Global error:', msg, 'at', lineNo, ':', columnNo);
                console.error('Stack:', error === null || error === void 0 ? void 0 : error.stack);
                this.showErrorState(new Error(msg));
                return false;
            };
            // Wait for store initialization
            await this.store.init();
            await this.initializeDOMAfterLoad();
            this.initialized = true;
            // Clear timeout if initialization succeeded
            if (this.initializationTimeout) {
                clearTimeout(this.initializationTimeout);
            }
        }
        catch (error) {
            console.error('Failed to initialize plugin:', error);
            this.showErrorState(error);
            throw error;
        }
    }
    async initializeDOMAfterLoad() {
        console.log('InitializeDOMAfterLoad: Starting DOM initialization');
        try {
            this.container = document.getElementById("app");
            if (!this.container) {
                throw new Error('Could not find app container');
            }
            console.log('Found app container, rendering UI components');
            await Promise.all([
                this.renderCreateForm(),
                this.renderAnimationList(),
                this.setupMessageHandlers(),
                this.updateAnimationList(),
                this.createPreviewElement()
            ]);
            const loading = document.getElementById("loading");
            if (loading) {
                loading.remove();
            }
            console.log('UI initialization complete, showing content');
            this.container.classList.add("loaded");
        }
        catch (error) {
            console.error('Failed to initialize DOM:', error);
            this.showErrorState(error);
            throw error;
        }
    }
    showErrorState(error) {
        const errorState = document.getElementById('error-state');
        if (errorState) {
            errorState.style.display = 'block';
            const errorMessage = errorState.querySelector('p');
            if (errorMessage) {
                errorMessage.textContent = (error === null || error === void 0 ? void 0 : error.message) || 'An unexpected error occurred';
            }
            if (error === null || error === void 0 ? void 0 : error.stack) {
                const stackTrace = document.createElement('pre');
                stackTrace.style.fontSize = '11px';
                stackTrace.style.overflow = 'auto';
                stackTrace.style.maxHeight = '200px';
                stackTrace.textContent = error.stack;
                errorState.appendChild(stackTrace);
            }
        }
        // Hide loading indicator if visible
        const loading = document.getElementById('loading');
        if (loading) {
            loading.style.display = 'none';
        }
        // Log error for debugging
        console.error('UI Error:', error);
    }
    renderCreateForm() {
        const form = document.createElement('div');
        form.className = 'section';
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
        const createBtn = form.querySelector('#createBtn');
        createBtn.addEventListener('click', () => {
            var _a, _b, _c;
            const nameInput = document.getElementById('animationName');
            const descriptionInput = document.getElementById('animationDescription');
            const groupInput = document.getElementById('animationGroup');
            const name = nameInput.value.trim();
            if (!name) {
                (_a = nameInput.parentElement) === null || _a === void 0 ? void 0 : _a.classList.add('error');
                return;
            }
            (_b = nameInput.parentElement) === null || _b === void 0 ? void 0 : _b.classList.remove('error');
            try {
                const type = document.getElementById('animationType').value;
                const duration = parseInt(document.getElementById('duration').value);
                const easing = document.getElementById('easing').value;
                if (isNaN(duration) || duration <= 0) {
                    (_c = document.getElementById('duration').parentElement) === null || _c === void 0 ? void 0 : _c.classList.add('error');
                    return;
                }
                const animation = {
                    type,
                    duration,
                    easing,
                    properties: this.getDefaultProperties(type),
                    description: descriptionInput.value.trim() || undefined,
                    group: groupInput.value.trim() || undefined
                };
                this.store.setAnimation(name, animation);
                nameInput.value = '';
                descriptionInput.value = '';
                groupInput.value = '';
                this.updateAnimationList();
                parent.postMessage({
                    pluginMessage: {
                        type: 'create-animation',
                        animation: { name, properties: animation }
                    }
                }, '*');
            }
            catch (error) {
                if (error instanceof Error) {
                    const errorElement = document.createElement('div');
                    errorElement.className = 'error-message';
                    errorElement.textContent = error.message;
                    form.appendChild(errorElement);
                    setTimeout(() => errorElement.remove(), 3000);
                }
            }
        });
        const previewBtn = form.querySelector('#previewBtn');
        previewBtn.addEventListener('click', () => {
            const type = document.getElementById('animationType').value;
            const duration = parseInt(document.getElementById('duration').value);
            const easing = document.getElementById('easing').value;
            const animation = {
                type,
                duration,
                easing,
                properties: this.getDefaultProperties(type)
            };
            this.previewAnimation(animation);
        });
        const typeSelect = form.querySelector('#animationType');
        typeSelect.addEventListener('change', () => {
            const type = typeSelect.value;
            const duration = parseInt(document.getElementById('duration').value);
            const easing = document.getElementById('easing').value;
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
        const list = document.createElement('div');
        list.className = 'section';
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
        this.searchInput = list.querySelector('#searchAnimations');
        this.searchInput.addEventListener('input', () => {
            this.updateAnimationList(this.searchInput.value.trim());
        });
        const findSimilarBtn = list.querySelector('#findSimilarBtn');
        findSimilarBtn.addEventListener('click', () => {
            parent.postMessage({ pluginMessage: { type: 'find-similar' } }, '*');
        });
        const applySelectedBtn = list.querySelector('#applySelectedBtn');
        applySelectedBtn.addEventListener('click', () => {
            const selected = document.querySelector('.animation-item.selected');
            if (!selected) {
                alert('Please select an animation first');
                return;
            }
            const animationName = selected.getAttribute('data-name');
            if (!animationName)
                return;
            parent.postMessage({
                pluginMessage: {
                    type: 'apply-animation',
                    animationName
                }
            }, '*');
        });
        this.container.appendChild(list);
    }
    updateAnimationList(searchQuery = '') {
        const listContainer = document.getElementById('animationList');
        const animations = searchQuery ?
            this.store.searchAnimations(searchQuery) :
            this.store.getAllAnimations();
        let currentGroup = '';
        const groupedAnimations = animations
            .sort(([, a], [, b]) => (a.group || '').localeCompare(b.group || ''))
            .map(([name, preset]) => {
            const isNewGroup = preset.group && preset.group !== currentGroup;
            if (isNewGroup) {
                currentGroup = preset.group;
                return `
            ${isNewGroup ? `<div class="group-header">${preset.group}</div>` : ''}
            <div class="animation-item" data-name="${name}">
              <strong>${name}</strong>
              ${preset.description ? `<p class="description">${preset.description}</p>` : ''}
              <br>
              Type: ${preset.type}, Duration: ${preset.duration}ms
              <button class="preview-btn">Preview</button>
            </div>
          `;
            }
            return `
          <div class="animation-item" data-name="${name}">
            <strong>${name}</strong>
            ${preset.description ? `<p class="description">${preset.description}</p>` : ''}
            <br>
            Type: ${preset.type}, Duration: ${preset.duration}ms
            <button class="preview-btn">Preview</button>
          </div>
        `;
        }).join('');
        listContainer.innerHTML = groupedAnimations;
        const items = listContainer.querySelectorAll('.animation-item');
        items.forEach(item => {
            item.addEventListener('click', () => {
                items.forEach(i => i.classList.remove('selected'));
                item.classList.add('selected');
            });
            const previewBtn = item.querySelector('.preview-btn');
            previewBtn === null || previewBtn === void 0 ? void 0 : previewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const name = item.getAttribute('data-name');
                if (name) {
                    this.previewAnimation(name);
                }
            });
        });
    }
    createPreviewElement() {
        if (this.previewElement)
            return;
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'preview-element';
        const content = document.createElement('div');
        content.className = 'preview-content';
        this.previewElement.appendChild(content);
        try {
            const canvas = document.createElement('canvas');
            canvas.setAttribute('willReadFrequently', 'true');
            canvas.className = 'preview-canvas';
            this.previewElement.appendChild(canvas);
        }
        catch (error) {
            console.warn('Canvas creation failed:', error);
        }
        if (document.body) {
            document.body.appendChild(this.previewElement);
        }
        else {
            console.warn('Document body not available for preview element');
        }
    }
    previewAnimation(animation) {
        if (!this.previewElement)
            return;
        const preset = typeof animation === 'string'
            ? this.store.getAnimation(animation)
            : animation;
        if (!preset)
            return;
        const content = this.previewElement.querySelector('.preview-content');
        content.style.cssText = '';
        void content.offsetWidth;
        const css = generateAnimationCSS(preset);
        content.style.cssText = css;
        this.currentAnimation = typeof animation === 'string' ? animation : null;
    }
    setupMessageHandlers() {
        window.onmessage = (event) => {
            var _a, _b;
            const msg = event.data.pluginMessage;
            try {
                if (msg.type === 'plugin-ready') {
                    // Handle plugin ready state
                    console.log('Plugin ready event received:', msg);
                    if ((_a = msg.state) === null || _a === void 0 ? void 0 : _a.isInitialized) {
                        (_b = this.container) === null || _b === void 0 ? void 0 : _b.classList.add('loaded');
                        const loading = document.getElementById('loading');
                        if (loading) {
                            loading.remove();
                        }
                    }
                }
                else if (msg.type === 'initialization-error') {
                    // Handle initialization errors from plugin
                    console.error('Plugin initialization error:', msg.error);
                    this.showErrorState(new Error(msg.error || 'Failed to initialize plugin'));
                }
                else if (msg.type === 'similar-found') {
                    this.showSimilarAnimations(msg.animations);
                }
            }
            catch (error) {
                console.error('Error handling plugin message:', error);
                this.showErrorState(new Error('Failed to process plugin message'));
            }
        };
    }
    getDefaultProperties(type) {
        switch (type) {
            case 'fade':
                return { opacity: { from: 0, to: 1 } };
            case 'slide':
                return { x: { from: -100, to: 0 } };
            case 'scale':
                return { scale: { from: 0.5, to: 1 } };
            case 'rotate':
                return { rotation: { from: -180, to: 0 } };
            default:
                return {};
        }
    }
    showSimilarAnimations(animations) {
        var _a;
        const dialog = document.createElement('div');
        dialog.className = 'dialog';
        dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Similar Animations Found</h3>
        ${animations.map(([name, nodes]) => `
          <div class="animation-group">
            <strong>${name}</strong> (${nodes.length} objects)
            <div class="animation-nodes">
              ${nodes.map(n => `<div class="node-item">${n.name}</div>`).join('')}
            </div>
            <button class="group-btn">Group Animation</button>
          </div>
        `).join('')}
        <button class="close-dialog">Close</button>
      </div>
    `;
        const groupBtns = dialog.querySelectorAll('.group-btn');
        groupBtns.forEach((btn, index) => {
            btn.addEventListener('click', () => {
                const [name] = animations[index];
                parent.postMessage({
                    pluginMessage: {
                        type: 'modify-shared',
                        animationName: name,
                        newProperties: this.store.getAnimation(name)
                    }
                }, '*');
            });
        });
        (_a = dialog.querySelector('.close-dialog')) === null || _a === void 0 ? void 0 : _a.addEventListener('click', () => {
            dialog.remove();
        });
        this.container.appendChild(dialog);
    }
}
console.log('UI module loaded, setting up global instance');
window.UI = UI;
// Initialize when the window loads
window.addEventListener('load', () => {
    try {
        console.log('Window loaded, creating UI instance');
        const ui = UI.getInstance();
        if (!ui) {
            throw new Error('Failed to create UI instance');
        }
        console.log('UI initialized successfully');
    }
    catch (error) {
        console.error("Error creating UI:", error);
        const errorState = document.getElementById("error-state");
        if (errorState) {
            errorState.style.display = "block";
            const message = errorState.querySelector("p");
            if (message) {
                message.textContent = error instanceof Error
                    ? `Initialization failed: ${error.message}`
                    : "Initialization failed: Unknown error occurred";
            }
        }
    }
});
export default UI;
//# sourceMappingURL=ui.js.map