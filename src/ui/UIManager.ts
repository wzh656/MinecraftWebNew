export class UIManager {
  private container: HTMLElement;
  private crosshair: HTMLElement | null = null;
  private hotbar: HTMLElement | null = null;
  private debugInfo: HTMLElement | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
  }

  private createUI(): void {
    this.createCrosshair();
    this.createHotbar();
    this.createDebugInfo();
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

    for (let i = 0; i < 9; i++) {
      const slot = document.createElement('div');
      slot.className = 'hotbar-slot';
      slot.dataset.index = i.toString();
      slot.style.cssText = `
        width: 48px;
        height: 48px;
        background: rgba(0, 0, 0, 0.5);
        border: 2px solid #555;
        display: flex;
        position: relative;
        padding: 2px;
      `;

      const iconContainer = document.createElement('div');
      iconContainer.className = 'icon-container';
      iconContainer.style.cssText = `
        width: 36px;
        height: 36px;
        margin: auto;
        position: relative;
      `;

      const icon = document.createElement('img');
      icon.className = 'block-icon-img';
      icon.style.cssText = `
        width: 36px;
        height: 36px;
        image-rendering: pixelated;
        display: none;
        position: absolute;
        top: 0;
        left: 0;
      `;

      const fallback = document.createElement('div');
      fallback.className = 'block-icon-fallback';
      fallback.style.cssText = `
        width: 36px;
        height: 36px;
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

  updateDebugInfo(fps: number, position: { x: number; y: number; z: number }): void {
    if (this.debugInfo) {
      this.debugInfo.innerHTML = `
        FPS: ${fps}<br>
        Pos: ${position.x.toFixed(2)}, ${position.y.toFixed(2)}, ${position.z.toFixed(2)}
      `;
    }
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
