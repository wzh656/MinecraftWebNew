import { MenuBase } from "./MenuBase";
import type { UICallbacks } from "../types";

export class MainMenu extends MenuBase {
  private callbacks: UICallbacks;

  constructor(uiLayer: HTMLElement, callbacks: UICallbacks) {
    super(uiLayer);
    this.callbacks = callbacks;
    this.create();
  }

  setCallbacks(callbacks: UICallbacks): void {
    this.callbacks = callbacks;
  }

  private create(): void {
    this.container = document.createElement("div");
    this.container.className = "mc-menu-overlay mc-background";
    this.container.style.display = "none";

    const content = document.createElement("div");
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;

    const title = document.createElement("h1");
    title.textContent = "Minecraft Web Edition";
    title.className = "mc-title";

    const singlePlayerBtn = this.createMenuButton("单人游戏", () => {
      this.callbacks.onSinglePlayer?.();
    });

    const optionsBtn = this.createMenuButton("选项...", () => {
      this.callbacks.onOptions?.();
    });

    const exitBtn = this.createMenuButton("退出游戏", () => {
      this.callbacks.onExit?.();
    });

    content.appendChild(title);
    content.appendChild(singlePlayerBtn);
    content.appendChild(optionsBtn);
    content.appendChild(exitBtn);
    this.container.appendChild(content);
    this.uiLayer.appendChild(this.container);
  }

  show(): void {
    if (this.container) {
      this.container.style.display = "flex";
      this.visible = true;
    }
  }

  hide(): void {
    if (this.container) {
      this.container.style.display = "none";
      this.visible = false;
    }
  }
}
