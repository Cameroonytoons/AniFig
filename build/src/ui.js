import { Store } from './store';
import { generateAnimationCSS } from './utils';
class UI {
    constructor() {
        this.container = null;
        this.previewElement = null;
        this.currentAnimation = null;
        this.searchInput = null;
        this.store = new Store();
        this.initializePlugin();
    }
    initializePlugin() {
        // Wait for Figma's plugin environment to be ready
        window.onmessage = (event) => {
            var _a;
            if (((_a = event.data.pluginMessage) === null || _a === void 0 ? void 0 : _a.type) === 'plugin-ready') {
                this.initializeDOMAfterLoad();
            }
        };
    }
    async initializeDOMAfterLoad() {
        try {
            // Wait for both document and window to be ready
            if (typeof document === 'undefined' || !document.body) {
                console.error('Document not available');
                return;
            }
            // Initialize container
            this.container = document.getElementById('app');
            if (!this.container) {
                console.error('Could not find app container');
                return;
            }
            await this.store.init();
            this.renderCreateForm();
            this.renderAnimationList();
            this.setupMessageHandlers();
            this.updateAnimationList();
            this.createPreviewElement();
            // Remove loading indicator and show UI
            const loading = document.getElementById('loading');
            if (loading) {
                loading.remove();
            }
            this.container.classList.add('loaded');
        }
        catch (error) {
            console.error('Error during initialization:', error);
            const errorState = document.getElementById('error-state');
            if (errorState) {
                errorState.style.display = 'block';
            }
        }
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
        // Create preview container
        this.previewElement = document.createElement('div');
        this.previewElement.className = 'preview-element';
        // Create preview content
        const content = document.createElement('div');
        content.className = 'preview-content';
        this.previewElement.appendChild(content);
        // Create and configure canvas with performance attributes
        try {
            const canvas = document.createElement('canvas');
            canvas.setAttribute('willReadFrequently', 'true');
            canvas.className = 'preview-canvas';
            this.previewElement.appendChild(canvas);
        }
        catch (error) {
            console.warn('Canvas creation failed:', error);
            // Continue without canvas as it's not critical for core functionality
        }
        // Append to document only after all elements are configured
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
            const msg = event.data.pluginMessage;
            if (msg.type === 'similar-found') {
                this.showSimilarAnimations(msg.animations);
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
// Initialize UI only when in Figma's plugin environment
if (typeof parent !== 'undefined' && typeof parent.postMessage === 'function') {
    try {
        new UI();
    }
    catch (error) {
        console.error('Error creating UI:', error);
        const errorState = document.getElementById('error-state');
        if (errorState) {
            errorState.style.display = 'block';
        }
    }
}
//# sourceMappingURL=ui.js.map