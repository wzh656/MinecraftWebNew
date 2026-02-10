export class Crosshair {
  private element: HTMLElement | null = null;

  create(parent: HTMLElement): void {
    this.element = document.createElement("div");
    this.element.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 10;
    `;
    this.element.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" style="image-rendering: pixelated;">
        <line x1="8" y1="0" x2="8" y2="16" stroke="white" stroke-width="2"/>
        <line x1="0" y1="8" x2="16" y2="8" stroke="white" stroke-width="2"/>
      </svg>
    `;
    this.element.style.display = "none";
    parent.appendChild(this.element);
  }

  show(): void {
    if (this.element) this.element.style.display = "block";
  }

  hide(): void {
    if (this.element) this.element.style.display = "none";
  }

  dispose(): void {
    this.element?.remove();
    this.element = null;
  }
}
