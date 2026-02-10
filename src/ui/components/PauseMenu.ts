import { MenuBase } from "./MenuBase";
import type { UICallbacks } from "../types";

export class PauseMenu extends MenuBase {
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
    this.container.className = "mc-menu-overlay mc-overlay";
    this.container.style.display = "none";

    const content = document.createElement("div");
    content.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
    `;

    const title = document.createElement("h1");
    title.textContent = "游戏菜单";
    title.className = "mc-title";
    title.style.fontSize = "24px";

    const resumeBtn = this.createMenuButton("回到游戏", () => {
      this.callbacks.onResume?.();
    });

    const optionsBtn = this.createMenuButton("选项...", () => {
      // Handled by UIManager
    });

    const returnBtn = this.createMenuButton("保存并回到标题画面", () => {
      this.callbacks.onReturnToMain?.();
    });

    content.appendChild(title);
    content.appendChild(resumeBtn);
    content.appendChild(optionsBtn);
    content.appendChild(returnBtn);
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
