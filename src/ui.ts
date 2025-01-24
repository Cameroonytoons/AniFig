import { AnimationPreset, Message } from './types';
import { Store } from './store';
import { compareAnimations, generateAnimationCSS } from './utils';

class UI {
  private store: Store;
  private container: HTMLElement;

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
      <button id="createBtn">Create Animation</button>
    `;

    const createBtn = form.querySelector('#createBtn')!;
    createBtn.addEventListener('click', () => {
      const name = (document.getElementById('animationName') as HTMLInputElement).value;
      if (!name) {
        alert('Please enter an animation name');
        return;
      }

      const type = (document.getElementById('animationType') as HTMLSelectElement).value;
      const duration = parseInt((document.getElementById('duration') as HTMLInputElement).value);
      const easing = (document.getElementById('easing') as HTMLSelectElement).value;

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

      (document.getElementById('animationName') as HTMLInputElement).value = '';
      this.updateAnimationList();
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
      </div>
    `).join('');

    const items = listContainer.querySelectorAll('.animation-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        items.forEach(i => i.classList.remove('selected'));
        item.classList.add('selected');
      });
    });
  }

  private setupMessageHandlers() {
    window.onmessage = (event) => {
      const msg = event.data.pluginMessage;
      if (msg.type === 'similar-found') {
        this.showSimilarAnimations(msg.animations);
      }
    };
  }

  private getDefaultProperties(type: string): { [key: string]: { from: number; to: number } } {
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

  private showSimilarAnimations(animations: [string, SceneNode[]][]) {
    const dialog = document.createElement('div');
    dialog.className = 'dialog';
    dialog.innerHTML = `
      <div class="dialog-content">
        <h3>Similar Animations Found</h3>
        ${animations.map(([name, nodes]) => `
          <div class="animation-group">
            <p>${name} (${nodes.length} objects)</p>
            <button onclick="this.groupAnimation('${name}')">Group Animation</button>
          </div>
        `).join('')}
        <button class="close-dialog">Close</button>
      </div>
    `;

    dialog.querySelector('.close-dialog')?.addEventListener('click', () => {
      dialog.remove();
    });

    this.container.appendChild(dialog);
  }
}

new UI();