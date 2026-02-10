import { HOTBAR_SIZE, BLOCK_ICON_SIZE } from "../../../utils/Constants";
import { getBlockColor } from "../../../utils/BlockUtils";

export class Hotbar {
  private element: HTMLElement | null = null;
  private blockTypes: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private blockIcons: Map<number, string> = new Map();

  create(parent: HTMLElement): void {
    this.element = document.createElement("div");
    this.element.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 4px;
      pointer-events: none;
      z-index: 10;
    `;

    const iconDisplaySize = BLOCK_ICON_SIZE * 0.75;

    for (let i = 0; i < HOTBAR_SIZE; i++) {
      const slot = document.createElement("div");
      slot.className = "hotbar-slot";
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

      const iconContainer = document.createElement("div");
      iconContainer.className = "icon-container";
      iconContainer.style.cssText = `
        width: ${iconDisplaySize}px;
        height: ${iconDisplaySize}px;
        margin: auto;
        position: relative;
      `;

      const icon = document.createElement("img");
      icon.className = "block-icon-img";
      icon.style.cssText = `
        width: ${iconDisplaySize}px;
        height: ${iconDisplaySize}px;
        image-rendering: pixelated;
        display: none;
        position: absolute;
        top: 0;
        left: 0;
      `;

      const fallback = document.createElement("div");
      fallback.className = "block-icon-fallback";
      fallback.style.cssText = `
        width: ${iconDisplaySize}px;
        height: ${iconDisplaySize}px;
        background-color: ${getBlockColor(this.blockTypes[i])};
        border: 1px solid #333;
        position: absolute;
        top: 0;
        left: 0;
      `;

      iconContainer.appendChild(icon);
      iconContainer.appendChild(fallback);

      const number = document.createElement("span");
      number.className = "mc-font";
      number.style.cssText = `
        position: absolute;
        bottom: 2px;
        right: 2px;
        color: white;
        font-size: 10px;
        text-shadow: 1px 1px 0 #000;
      `;
      number.textContent = (i + 1).toString();

      slot.appendChild(iconContainer);
      slot.appendChild(number);
      this.element.appendChild(slot);
    }

    this.element.style.display = "none";
    parent.appendChild(this.element);
  }

  setBlockTypes(types: number[]): void {
    this.blockTypes = types;
    this.updateBlockIcons();
  }

  setBlockIcon(blockType: number, iconUrl: string): void {
    this.blockIcons.set(blockType, iconUrl);
    this.updateBlockIcons();
  }

  private updateBlockIcons(): void {
    if (!this.element) return;
    const slots = this.element.querySelectorAll(".hotbar-slot");
    slots.forEach((slot, i) => {
      const blockType = this.blockTypes[i];
      if (blockType === undefined) return;

      const iconImg = slot.querySelector(".block-icon-img") as HTMLImageElement;
      const fallback = slot.querySelector(
        ".block-icon-fallback",
      ) as HTMLElement;

      if (iconImg && fallback) {
        const iconUrl = this.blockIcons.get(blockType);
        if (iconUrl) {
          iconImg.src = iconUrl;
          iconImg.style.display = "block";
          fallback.style.display = "none";
        } else {
          iconImg.style.display = "none";
          fallback.style.display = "block";
          fallback.style.backgroundColor = getBlockColor(blockType);
        }
      }
    });
  }

  setSelection(index: number): void {
    if (!this.element) return;
    const slots = this.element.children;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i] as HTMLElement;
      slot.style.borderColor = i === index ? "white" : "#555";
    }
  }

  show(): void {
    if (this.element) this.element.style.display = "flex";
  }

  hide(): void {
    if (this.element) this.element.style.display = "none";
  }

  dispose(): void {
    this.element?.remove();
    this.element = null;
  }
}
