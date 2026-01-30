import { HOTBAR_SIZE, BLOCK_ICON_SIZE } from '../utils/Constants';

export class UIManager {
  private container: HTMLElement;
  private crosshair: HTMLElement | null = null;
  private hotbar: HTMLElement | null = null;
  private debugInfo: HTMLElement | null = null;
  private pauseMenu: HTMLElement | null = null;
  private mainMenu: HTMLElement | null = null;
  private onResumeCallback: (() => void) | null = null;
  private onReturnToMainCallback: (() => void) | null = null;
  private onWorldSelectCallback: ((worldName: string) => void) | null = null;
  private onWorldCreateCallback: ((worldName: string) => void) | null = null;
  private onWorldDeleteCallback: ((worldName: string) => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
  }

  private createUI(): void {
    this.createCrosshair();
    this.createHotbar();
    this.createDebugInfo();
    this.createPauseMenu();
    this.createMainMenu();
  }

  setCallbacks(callbacks: {
    onResume?: () => void;
    onReturnToMain?: () => void;
    onWorldSelect?: (worldName: string) => void;
    onWorldCreate?: (worldName: string) => void;
    onWorldDelete?: (worldName: string) => void;
  }): void {
    this.onResumeCallback = callbacks.onResume ?? null;
    this.onReturnToMainCallback = callbacks.onReturnToMain ?? null;
    this.onWorldSelectCallback = callbacks.onWorldSelect ?? null;
    this.onWorldCreateCallback = callbacks.onWorldCreate ?? null;
    this.onWorldDeleteCallback = callbacks.onWorldDelete ?? null;
  }

  private createPauseMenu(): void {
    this.pauseMenu = document.createElement('div');
    this.pauseMenu.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.6);
      display: none;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 12px;
      z-index: 100;
    `;

    const title = document.createElement('h1');
    title.textContent = 'Game Paused';
    title.style.cssText = `
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 28px;
      margin-bottom: 30px;
      text-shadow: 2px 2px 0 #3f3f3f;
    `;

    const resumeBtn = this.createMenuButton('Resume Game', () => {
      this.onResumeCallback?.();
    });

    const returnBtn = this.createMenuButton('Return to Main Menu', () => {
      this.onReturnToMainCallback?.();
    });

    this.pauseMenu.appendChild(title);
    this.pauseMenu.appendChild(resumeBtn);
    this.pauseMenu.appendChild(returnBtn);
    this.container.appendChild(this.pauseMenu);
  }

  private createMainMenu(): void {
    this.mainMenu = document.createElement('div');
    this.mainMenu.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-image: url('images/background.png');
      background-size: cover;
      background-position: center;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      gap: 20px;
      z-index: 200;
    `;

    const title = document.createElement('h1');
    title.textContent = 'Minecraft Web Edition';
    title.style.cssText = `
      color: white;
      font-family: 'Courier New', monospace;
      font-size: 36px;
      margin-bottom: 40px;
      text-shadow: 3px 3px 0 #3f3f3f, -1px -1px 0 #8b8b8b;
    `;

    // World list container
    const worldListContainer = document.createElement('div');
    worldListContainer.id = 'world-list';
    worldListContainer.style.cssText = `
      width: 400px;
      max-height: 300px;
      overflow-y: auto;
      background: rgba(0, 0, 0, 0.3);
      border-radius: 8px;
      padding: 10px;
      margin-bottom: 20px;
    `;

    // Create world input
    const createWorldContainer = document.createElement('div');
    createWorldContainer.style.cssText = `
      display: flex;
      gap: 10px;
      margin-bottom: 20px;
    `;

    const worldNameInput = document.createElement('input');
    worldNameInput.id = 'world-name-input';
    worldNameInput.type = 'text';
    worldNameInput.placeholder = 'Enter world name';
    worldNameInput.style.cssText = `
      padding: 10px 15px;
      font-size: 16px;
      border: none;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.1);
      color: white;
      font-family: monospace;
      width: 250px;
    `;

    const createBtn = this.createMenuButton('Create World', () => {
      const name = worldNameInput.value.trim();
      if (name) {
        this.onWorldCreateCallback?.(name);
        worldNameInput.value = '';
      }
    });

    createWorldContainer.appendChild(worldNameInput);
    createWorldContainer.appendChild(createBtn);

    this.mainMenu.appendChild(title);
    this.mainMenu.appendChild(worldListContainer);
    this.mainMenu.appendChild(createWorldContainer);
    this.container.appendChild(this.mainMenu);
  }

  private createMenuButton(text: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = text;
    btn.style.cssText = `
      padding: 10px 24px;
      font-size: 16px;
      font-family: 'Courier New', monospace;
      font-weight: bold;
      background: #6b6b6b;
      color: white;
      border: 2px solid #373737;
      border-top-color: #8b8b8b;
      border-left-color: #8b8b8b;
      cursor: pointer;
      min-width: 200px;
      text-shadow: 1px 1px 0 #373737;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = '#7b7b7b';
      btn.style.color = '#ffff55';
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = '#6b6b6b';
      btn.style.color = 'white';
    });
    btn.addEventListener('mousedown', () => {
      btn.style.borderColor = '#8b8b8b';
      btn.style.borderTopColor = '#373737';
      btn.style.borderLeftColor = '#373737';
    });
    btn.addEventListener('mouseup', () => {
      btn.style.borderColor = '#373737';
      btn.style.borderTopColor = '#8b8b8b';
      btn.style.borderLeftColor = '#8b8b8b';
    });
    btn.addEventListener('click', onClick);
    return btn;
  }

  showPauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.style.display = 'flex';
    }
  }

  hidePauseMenu(): void {
    if (this.pauseMenu) {
      this.pauseMenu.style.display = 'none';
    }
  }

  showMainMenu(): void {
    if (this.mainMenu) {
      this.mainMenu.style.display = 'flex';
    }
    this.hideGameUI();
  }

  hideMainMenu(): void {
    if (this.mainMenu) {
      this.mainMenu.style.display = 'none';
    }
  }

  isMainMenuVisible(): boolean {
    return this.mainMenu?.style.display === 'flex';
  }

  private hideGameUI(): void {
    if (this.crosshair) this.crosshair.style.display = 'none';
    if (this.hotbar) this.hotbar.style.display = 'none';
    if (this.debugInfo) this.debugInfo.style.display = 'none';
  }

  updateWorldList(worlds: Array<{ name: string; createdAt: number; lastPlayed: number }>): void {
    const container = this.mainMenu?.querySelector('#world-list');
    if (!container) return;

    container.innerHTML = '';

    if (worlds.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.textContent = 'No worlds found. Create one to start playing!';
      emptyMsg.style.cssText = `
        color: #888;
        text-align: center;
        padding: 20px;
        font-family: monospace;
      `;
      container.appendChild(emptyMsg);
      return;
    }

    worlds.forEach(world => {
      const worldItem = document.createElement('div');
      worldItem.style.cssText = `
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 10px;
        background: rgba(255, 255, 255, 0.05);
        border-radius: 4px;
        margin-bottom: 8px;
        cursor: pointer;
        transition: background 0.2s;
      `;
      worldItem.addEventListener('mouseenter', () => {
        worldItem.style.background = 'rgba(255, 255, 255, 0.1)';
      });
      worldItem.addEventListener('mouseleave', () => {
        worldItem.style.background = 'rgba(255, 255, 255, 0.05)';
      });
      worldItem.addEventListener('click', () => {
        this.onWorldSelectCallback?.(world.name);
      });

      const worldInfo = document.createElement('div');
      worldInfo.style.cssText = `
        display: flex;
        flex-direction: column;
        color: white;
        font-family: monospace;
      `;

      const worldName = document.createElement('span');
      worldName.textContent = world.name;
      worldName.style.fontWeight = 'bold';

      const worldDate = document.createElement('span');
      worldDate.textContent = new Date(world.lastPlayed).toLocaleDateString();
      worldDate.style.fontSize = '12px';
      worldDate.style.color = '#888';

      worldInfo.appendChild(worldName);
      worldInfo.appendChild(worldDate);

      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '×';
      deleteBtn.style.cssText = `
        background: #a44;
        color: white;
        border: none;
        border-radius: 4px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        font-size: 18px;
        line-height: 1;
      `;
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Delete world "${world.name}"? This cannot be undone.`)) {
          this.onWorldDeleteCallback?.(world.name);
        }
      });

      worldItem.appendChild(worldInfo);
      worldItem.appendChild(deleteBtn);
      container.appendChild(worldItem);
    });
  }

  private createCrosshair(): void {
    this.crosshair = document.createElement('div');
    this.crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      pointer-events: none;
    `;
    this.crosshair.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16">
        <line x1="8" y1="0" x2="8" y2="16" stroke="white" stroke-width="2"/>
        <line x1="0" y1="8" x2="16" y2="8" stroke="white" stroke-width="2"/>
      </svg>
    `;
    this.container.appendChild(this.crosshair);
  }

  private blockTypes: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private blockIcons: Map<number, string> = new Map();

  setBlockTypes(types: number[]): void {
    this.blockTypes = types;
    this.updateBlockIcons();
  }

  setBlockIcon(blockType: number, iconUrl: string): void {
    this.blockIcons.set(blockType, iconUrl);
    this.updateBlockIcons();
  }

  private getBlockColor(type: number): string {
    const colors: Record<number, string> = {
      0: '#000000',
      1: '#808080',
      2: '#8B4513',
      3: '#7CFC00',
      4: '#666666',
      5: '#DEB887',
      6: '#B22222',
      7: '#F0E68C',
      8: '#8B5A2B',
      9: '#228B22',
      10: '#2E8B57',
      11: '#FF00FF',
    };
    return colors[type] ?? '#888888';
  }

  private createHotbar(): void {
    this.hotbar = document.createElement('div');
    this.hotbar.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      pointer-events: none;
    `;

    const iconDisplaySize = BLOCK_ICON_SIZE * 0.75; // 36px for 48px slot

    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = i.toString();
      slot.style.cssText = `
        width: ${BLOCK_ICON_SIZE}px;
        height: ${BLOCK_ICON_SIZE}px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #555;
        display: flex;
        position: relative;
        padding: 2px;
      `;

      const iconContainer = document.createElement('div');
      iconContainer.className = 'icon-container';
      iconContainer.style.cssText = `
        width: ${iconDisplaySize}px;
        height: ${iconDisplaySize}px;
        margin: auto;
        position: relative;
      `;

      const icon = document.createElement('img');
      icon.className = 'block-icon-img';
      icon.style.cssText = `
        width: ${iconDisplaySize}px;
        height: ${iconDisplaySize}px;
        image-rendering: pixelated;
        display: none;
        position: absolute;
        top: 0;
        left: 0;
      `;

      const fallback = document.createElement('div');
      fallback.className = 'block-icon-fallback';
      fallback.style.cssText = `
        width: ${iconDisplaySize}px;
        height: ${iconDisplaySize}px;
        background-color: ${this.getBlockColor(this.blockTypes[i])};
        border: 1px solid #333;
        position: absolute;
        top: 0;
        left: 0;
      `;

      iconContainer.appendChild(icon);
      iconContainer.appendChild(fallback);

      const number = document.createElement('span');
      number.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 2px;
        color: white;
        font-family: monospace;
        font-size: 10px;
        text-shadow: 1px 1px 0 #000;
      `;
      number.textContent = (i + 1).toString();

      slot.appendChild(iconContainer);
      slot.appendChild(number);
      this.hotbar.appendChild(slot);
    }

    this.container.appendChild(this.hotbar);
  }

  private updateBlockIcons(): void {
    if (!this.hotbar) return;
    const slots = this.hotbar.querySelectorAll('.hotbar-slot');
    slots.forEach((slot, i) => {
      const blockType = this.blockTypes[i];
      if (blockType === undefined) return;

      const iconImg = slot.querySelector('.block-icon-img') as HTMLImageElement;
      const fallback = slot.querySelector('.block-icon-fallback') as HTMLElement;

      if (iconImg && fallback) {
        const iconUrl = this.blockIcons.get(blockType);
        if (iconUrl) {
          iconImg.src = iconUrl;
          iconImg.style.display = 'block';
          fallback.style.display = 'none';
        } else {
          iconImg.style.display = 'none';
          fallback.style.display = 'block';
          fallback.style.backgroundColor = this.getBlockColor(blockType);
        }
      }
    });
  }

  private createDebugInfo(): void {
    this.debugInfo = document.createElement('div');
    this.debugInfo.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: monospace;
      font-size: 12px;
      pointer-events: none;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px;
      border-radius: 4px;
    `;
    this.container.appendChild(this.debugInfo);
  }

  private onTeleportCallback: ((x: number, y: number, z: number) => void) | null = null;

  setTeleportCallback(callback: (x: number, y: number, z: number) => void): void {
    this.onTeleportCallback = callback;
  }

  updateDebugInfo(info: {
    fps: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number };
    target: { x: number; y: number; z: number; face: number } | null;
  }): void {
    if (this.debugInfo) {
      const yaw = (info.rotation.y * 180 / Math.PI) % 360;
      const pitch = (info.rotation.x * 180 / Math.PI);
      const targetStr = info.target
        ? `${info.target.x}, ${info.target.y}, ${info.target.z} (face: ${info.target.face})`
        : 'none';

      this.debugInfo.innerHTML = `
        <div>FPS: ${info.fps}</div>
        <div>Pos: ${info.position.x.toFixed(2)}, ${info.position.y.toFixed(2)}, ${info.position.z.toFixed(2)}</div>
        <div>Yaw: ${yaw.toFixed(1)}°, Pitch: ${pitch.toFixed(1)}°</div>
        <div>Target: ${targetStr}</div>
        <button id="teleport-btn" style="
          margin-top: 8px;
          padding: 4px 8px;
          font-size: 11px;
          background: #555;
          color: white;
          border: 1px solid #777;
          cursor: pointer;
          pointer-events: auto;
        ">Teleport</button>
      `;

      // Add teleport button event listener
      const teleportBtn = this.debugInfo.querySelector('#teleport-btn');
      if (teleportBtn) {
        teleportBtn.addEventListener('click', () => {
          this.showTeleportDialog(info.position);
        });
      }
    }
  }

  private showTeleportDialog(currentPos: { x: number; y: number; z: number }): void {
    // Remove existing dialog if any
    const existingDialog = document.getElementById('teleport-dialog');
    if (existingDialog) {
      existingDialog.remove();
    }

    const dialog = document.createElement('div');
    dialog.id = 'teleport-dialog';
    dialog.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      padding: 20px;
      border-radius: 8px;
      border: 2px solid #555;
      z-index: 300;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: auto;
    `;

    const title = document.createElement('div');
    title.textContent = 'Teleport to coordinates';
    title.style.cssText = 'color: white; font-family: monospace; font-size: 14px;';

    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = 'display: flex; gap: 8px; align-items: center;';

    const createInput = (label: string, value: number) => {
      const wrapper = document.createElement('div');
      wrapper.style.cssText = 'display: flex; flex-direction: column; gap: 2px;';

      const lbl = document.createElement('label');
      lbl.textContent = label;
      lbl.style.cssText = 'color: #aaa; font-size: 10px;';

      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.1';
      input.value = value.toFixed(2);
      input.style.cssText = `
        width: 80px;
        padding: 4px;
        font-size: 12px;
        background: #333;
        color: white;
        border: 1px solid #555;
        font-family: monospace;
      `;

      wrapper.appendChild(lbl);
      wrapper.appendChild(input);
      return { wrapper, input };
    };

    const xInput = createInput('X', currentPos.x);
    const yInput = createInput('Y', currentPos.y);
    const zInput = createInput('Z', currentPos.z);

    inputContainer.appendChild(xInput.wrapper);
    inputContainer.appendChild(yInput.wrapper);
    inputContainer.appendChild(zInput.wrapper);

    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = 'display: flex; gap: 8px; justify-content: center; margin-top: 10px;';

    const teleportBtn = document.createElement('button');
    teleportBtn.textContent = 'Teleport';
    teleportBtn.style.cssText = `
      padding: 6px 16px;
      font-size: 12px;
      background: #4a4;
      color: white;
      border: 1px solid #5b5;
      cursor: pointer;
      font-family: monospace;
    `;
    teleportBtn.addEventListener('click', () => {
      const x = parseFloat(xInput.input.value);
      const y = parseFloat(yInput.input.value);
      const z = parseFloat(zInput.input.value);
      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        this.onTeleportCallback?.(x, y, z);
      }
      dialog.remove();
    });

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.style.cssText = `
      padding: 6px 16px;
      font-size: 12px;
      background: #555;
      color: white;
      border: 1px solid #777;
      cursor: pointer;
      font-family: monospace;
    `;
    cancelBtn.addEventListener('click', () => {
      dialog.remove();
    });

    buttonContainer.appendChild(teleportBtn);
    buttonContainer.appendChild(cancelBtn);

    dialog.appendChild(title);
    dialog.appendChild(inputContainer);
    dialog.appendChild(buttonContainer);

    this.container.appendChild(dialog);
  }

  show(): void {
    if (this.crosshair) this.crosshair.style.display = 'block';
    if (this.hotbar) this.hotbar.style.display = 'flex';
    if (this.debugInfo) this.debugInfo.style.display = 'block';
  }

  hide(): void {
    if (this.crosshair) this.crosshair.style.display = 'none';
    if (this.hotbar) this.hotbar.style.display = 'none';
    if (this.debugInfo) this.debugInfo.style.display = 'none';
  }

  setHotbarSelection(index: number): void {
    if (!this.hotbar) return;
    const slots = this.hotbar.children;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i] as HTMLElement;
      slot.style.borderColor = i === index ? 'white' : '#555';
    }
  }
}
