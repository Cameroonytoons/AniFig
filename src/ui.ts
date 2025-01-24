import { AnimationPreset, Message } from './types';
import { Store } from './store';
import { generateAnimationCSS, generateTransitionKeyframes } from './utils';

class UI {
  private store: Store;
  private container: HTMLElement;
  private previewElement: HTMLElement | null = null;
  private currentAnimation: string | null = null;

  constructor() {
    this.store = new Store();
    this.container = document.getElementById('app')!;
    this.init();
  }

  private async init() {
    await this.store.init();
    this.renderCreateForm();
    this.renderAnimationList();
    this.setupMessageHandlers();
    this.updateAnimationList();
    this.createPreviewElement();
  }

  private renderCreateForm() {
    const form = document.createElement('div');
    form.className = 'section';
    form.innerHTML = `
      <h3>Create Animation</h3>
      <input type="text" id="animationName" placeholder="Animation Name" required>
      <select id="animationType">
        <option value="fade">Fade</option>
        <option value="slide">Slide</option>
        <option value="scale">Scale</option>
        <option value="rotate">Rotate</option>
      </select>
      <input type="number" id="duration" placeholder="Duration (ms)" value="300" min="0">
      <select id="easing">
        <option value="ease">Ease</option>
        <option value="linear">Linear</option>
        <option value="ease-in">Ease In</option>
        <option value="ease-out">Ease Out</option>
        <option value="ease-in-out">Ease In Out</option>
      </select>
      <div id="previewContainer" class="preview-container">
        <div id="previewBox" class="preview-box"></div>
        <button id="previewBtn" class="preview-btn">Preview Animation</button>
      </div>
      <button id="createBtn">Create Animation</button>
    `;

    const createBtn = form.querySelector('#createBtn')!;
    createBtn.addEventListener('click', () => {
      const name = (document.getElementById('animationName') as HTMLInputElement).value;
      if (!name) {
        alert('Please enter an animation name');
        return;
      }

      const type = (document.getElementById('animationType') as HTMLSelectElement).value as AnimationPreset['type'];
      const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
      const easing = (document.getElementById('easing') as HTMLSelectElement).value as AnimationPreset['easing'];

      const animation: AnimationPreset = {
        type,
        duration,
        easing,
        properties: this.getDefaultProperties(type)
      };

      parent.postMessage({ 
        pluginMessage: {
          type: 'create-animation',
          animation: { name, properties: animation }
        }
      }, '*');

      this.store.setAnimation(name, animation);
      (document.getElementById('animationName') as HTMLInputElement).value = '';
      this.updateAnimationList();
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

    // Add type change handler
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

    this.container.appendChild(form);
  }

  private renderAnimationList() {
    const list = document.createElement('div');
    list.className = 'section';
    list.innerHTML = `
      <h3>Saved Animations</h3>
      <div class="animation-list" id="animationList"></div>
      <button id="findSimilarBtn">Find Similar Animations</button>
      <button id="applySelectedBtn">Apply Selected Animation</button>
    `;

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

    this.container.appendChild(list);
  }

  private updateAnimationList() {
    const listContainer = document.getElementById('animationList')!;
    const animations = this.store.getAllAnimations();

    listContainer.innerHTML = animations.map(([name, preset]) => `
      <div class="animation-item" data-name="${name}">
        <strong>${name}</strong>
        <br>
        Type: ${preset.type}, Duration: ${preset.duration}ms
        <button class="preview-btn">Preview</button>
      </div>
    `).join('');

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
    this.previewElement.innerHTML = '<div class="preview-content"></div>';
    document.body.appendChild(this.previewElement);
  }

  private previewAnimation(animation: AnimationPreset | string) {
    if (!this.previewElement) return;

    const preset = typeof animation === 'string' 
      ? this.store.getAnimation(animation)
      : animation;

    if (!preset) return;

    const content = this.previewElement.querySelector('.preview-content') as HTMLDivElement;

    // Reset the animation state
    content.style.cssText = '';
    void content.offsetWidth; // Force reflow

    const css = generateAnimationCSS(preset);
    content.style.cssText = css;

    // Track current animation
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

    this.container.appendChild(dialog);
  }
}

new UI();