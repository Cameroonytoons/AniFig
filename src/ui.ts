import { AnimationPreset, Message } from './types';
import { Store } from './store';
import { generateAnimationCSS } from './utils';

class UI {
  private store: Store;
  private container: HTMLElement | null = null;
  private previewElement: HTMLElement | null = null;
  private currentAnimation: string | null = null;
  private searchInput: HTMLInputElement | null = null;

  constructor() {
    this.store = new Store();

    // Ensure DOM is loaded before initialization
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        this.initializePlugin();
      });
    } else {
      setTimeout(() => this.initializePlugin(), 0);
    }
  }

  private initializePlugin() {
    window.onmessage = (event) => {
      if (event.data.pluginMessage?.type === 'plugin-ready') {
        this.initializeDOMAfterLoad();
      }
    };
  }

  private async initializeDOMAfterLoad() {
    try {
      if (!document || !document.body) {
        console.error("Document or body not available");
        return;
      }

      this.container = document.getElementById("app");
      if (!this.container) {
        console.error("Could not find app container");
        return;
      }

      await this.store.init();
      this.renderCreateForm();
      this.renderAnimationList();
      this.setupMessageHandlers();
      this.updateAnimationList();
      this.createPreviewElement();

      const loading = document.getElementById("loading");
      if (loading) {
        loading.remove();
      }
      this.container.classList.add("loaded");
    } catch (error) {
      console.error("Error during initialization:", error);
      const errorState = document.getElementById("error-state");
      if (errorState) {
        errorState.style.display = "block";
      }
    }
  }

  private showErrorState() {
    const errorState = document.getElementById('error-state');
    if (errorState) {
      errorState.style.display = 'block';
    }
  }

  private renderCreateForm() {
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

    const createBtn = form.querySelector('#createBtn')!;
    createBtn.addEventListener('click', () => {
      const nameInput = document.getElementById('animationName') as HTMLInputElement;
      const descriptionInput = document.getElementById('animationDescription') as HTMLInputElement;
      const groupInput = document.getElementById('animationGroup') as HTMLInputElement;
      const name = nameInput.value.trim();

      if (!name) {
        nameInput.parentElement?.classList.add('error');
        return;
      }
      nameInput.parentElement?.classList.remove('error');

      try {
        const type = (document.getElementById('animationType') as HTMLSelectElement).value as AnimationPreset['type'];
        const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
        const easing = (document.getElementById('easing') as HTMLSelectElement).value as AnimationPreset['easing'];

        if (isNaN(duration) || duration <= 0) {
          (document.getElementById('duration') as HTMLInputElement).parentElement?.classList.add('error');
          return;
        }

        const animation: AnimationPreset & { description?: string; group?: string } = {
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

      } catch (error) {
        if (error instanceof Error) {
          const errorElement = document.createElement('div');
          errorElement.className = 'error-message';
          errorElement.textContent = error.message;
          form.appendChild(errorElement);
          setTimeout(() => errorElement.remove(), 3000);
        }
      }
    });

    const previewBtn = form.querySelector('#previewBtn')!;
    previewBtn.addEventListener('click', () => {
      const type = (document.getElementById('animationType') as HTMLSelectElement).value as AnimationPreset['type'];
      const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
      const easing = (document.getElementById('easing') as HTMLSelectElement).value as AnimationPreset['easing'];

      const animation: AnimationPreset = {
        type,
        duration,
        easing,
        properties: this.getDefaultProperties(type)
      };

      this.previewAnimation(animation);
    });

    const typeSelect = form.querySelector('#animationType') as HTMLSelectElement;
    typeSelect.addEventListener('change', () => {
      const type = typeSelect.value as AnimationPreset['type'];
      const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
      const easing = (document.getElementById('easing') as HTMLSelectElement).value as AnimationPreset['easing'];

      const animation: AnimationPreset = {
        type,
        duration,
        easing,
        properties: this.getDefaultProperties(type)
      };

      this.previewAnimation(animation);
    });

    this.container!.appendChild(form);
  }

  private renderAnimationList() {
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

    this.searchInput = list.querySelector('#searchAnimations') as HTMLInputElement;
    this.searchInput.addEventListener('input', () => {
      this.updateAnimationList(this.searchInput!.value.trim());
    });

    const findSimilarBtn = list.querySelector('#findSimilarBtn')!;
    findSimilarBtn.addEventListener('click', () => {
      parent.postMessage({ pluginMessage: { type: 'find-similar' } }, '*');
    });

    const applySelectedBtn = list.querySelector('#applySelectedBtn')!;
    applySelectedBtn.addEventListener('click', () => {
      const selected = document.querySelector('.animation-item.selected');
      if (!selected) {
        alert('Please select an animation first');
        return;
      }
      const animationName = selected.getAttribute('data-name');
      if (!animationName) return;

      parent.postMessage({ 
        pluginMessage: { 
          type: 'apply-animation',
          animationName 
        }
      }, '*');
    });

    this.container!.appendChild(list);
  }

  private updateAnimationList(searchQuery: string = '') {
    const listContainer = document.getElementById('animationList')!;
    const animations = searchQuery ? 
      this.store.searchAnimations(searchQuery) : 
      this.store.getAllAnimations();

    let currentGroup = '';
    const groupedAnimations = animations
      .sort(([, a], [, b]) => (a.group || '').localeCompare(b.group || ''))
      .map(([name, preset]) => {
        const isNewGroup = preset.group && preset.group !== currentGroup;
        if (isNewGroup) {
          currentGroup = preset.group!;
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
      previewBtn?.addEventListener('click', (e) => {
        e.stopPropagation();
        const name = item.getAttribute('data-name');
        if (name) {
          this.previewAnimation(name);
        }
      });
    });
  }

  private createPreviewElement() {
    if (this.previewElement) return;

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
    } catch (error) {
      console.warn('Canvas creation failed:', error);
    }

    if (document.body) {
      document.body.appendChild(this.previewElement);
    } else {
      console.warn('Document body not available for preview element');
    }
  }

  private previewAnimation(animation: AnimationPreset | string) {
    if (!this.previewElement) return;

    const preset = typeof animation === 'string' 
      ? this.store.getAnimation(animation)
      : animation;

    if (!preset) return;

    const content = this.previewElement.querySelector('.preview-content') as HTMLDivElement;

    content.style.cssText = '';
    void content.offsetWidth; 

    const css = generateAnimationCSS(preset);
    content.style.cssText = css;

    this.currentAnimation = typeof animation === 'string' ? animation : null;
  }

  private setupMessageHandlers() {
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg.type === 'similar-found') {
        this.showSimilarAnimations(msg.animations);
      }
    };
  }

  private getDefaultProperties(type: AnimationPreset['type']): AnimationPreset['properties'] {
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

  private showSimilarAnimations(animations: [string, Array<{ id: string; name: string }>][]) {
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

    dialog.querySelector('.close-dialog')?.addEventListener('click', () => {
      dialog.remove();
    });

    this.container!.appendChild(dialog);
  }
}

// Initialize UI with proper error handling
const initUI = () => {
  try {
    new UI();
  } catch (error) {
    console.error("Error creating UI:", error);
    const errorState = document.getElementById("error-state");
    if (errorState) {
      errorState.style.display = "block";
    }
  }
};

// Ensure proper initialization timing
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initUI);
} else {
  setTimeout(initUI, 0);
}