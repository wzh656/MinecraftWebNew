import type { IMenu } from "../types";

export abstract class MenuBase implements IMenu {
  protected container: HTMLElement | null = null;
  protected visible = false;
  protected uiLayer: HTMLElement;

  constructor(uiLayer: HTMLElement) {
    this.uiLayer = uiLayer;
  }

  abstract show(): void;
  abstract hide(): void;

  isVisible(): boolean {
    return this.visible;
  }

  protected createMenuButton(
    text: string,
    onClick: () => void,
    extraClass = "",
  ): HTMLButtonElement {
    const btn = document.createElement("button");
    btn.textContent = text;
    btn.className = `mc-button ${extraClass}`;
    btn.addEventListener("click", onClick);
    return btn;
  }

  dispose(): void {
    this.container?.remove();
    this.container = null;
  }
}
