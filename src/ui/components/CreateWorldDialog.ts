import { MenuBase } from "./MenuBase";
import type { UICallbacks } from "../types";

export class CreateWorldDialog extends MenuBase {
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
    this.container.className = "mc-dialog-overlay";
    this.container.style.display = "none";

    const dialog = document.createElement("div");
    dialog.className = "mc-dialog";
    dialog.style.width = "400px";

    const title = document.createElement("div");
    title.className = "mc-dialog-title";
    title.textContent = "创建新世界";

    // World name
    const nameLabel = document.createElement("div");
    nameLabel.className = "mc-label";
    nameLabel.textContent = "世界名称:";
    nameLabel.style.marginTop = "16px";

    const nameInput = document.createElement("input");
    nameInput.id = "create-world-name";
    nameInput.type = "text";
    nameInput.className = "mc-input";
    nameInput.style.width = "100%";
    nameInput.style.marginTop = "4px";
    nameInput.placeholder = "新的世界";

    // Seed
    const seedLabel = document.createElement("div");
    seedLabel.className = "mc-label";
    seedLabel.textContent = "种子 (留空为随机):";
    seedLabel.style.marginTop = "12px";

    const seedInput = document.createElement("input");
    seedInput.id = "create-world-seed";
    seedInput.type = "text";
    seedInput.className = "mc-input";
    seedInput.style.width = "100%";
    seedInput.style.marginTop = "4px";
    seedInput.placeholder = "随机种子";

    // Buttons
    const buttonRow = document.createElement("div");
    buttonRow.className = "mc-dialog-buttons";
    buttonRow.style.marginTop = "24px";

    const createBtn = this.createMenuButton(
      "创建世界",
      () => {
        const name = (
          document.getElementById("create-world-name") as HTMLInputElement
        )?.value.trim();
        const seed = (
          document.getElementById("create-world-seed") as HTMLInputElement
        )?.value.trim();
        if (name) {
          this.callbacks.onWorldCreate?.(name, seed);
          this.hide();
        }
      },
      "mc-button-small",
    );

    const cancelBtn = this.createMenuButton(
      "取消",
      () => {
        this.hide();
      },
      "mc-button-small",
    );

    buttonRow.appendChild(createBtn);
    buttonRow.appendChild(cancelBtn);

    dialog.appendChild(title);
    dialog.appendChild(nameLabel);
    dialog.appendChild(nameInput);
    dialog.appendChild(seedLabel);
    dialog.appendChild(seedInput);
    dialog.appendChild(buttonRow);
    this.container.appendChild(dialog);
    this.uiLayer.appendChild(this.container);
  }

  show(): void {
    if (this.container) {
      const nameInput = document.getElementById(
        "create-world-name",
      ) as HTMLInputElement;
      const seedInput = document.getElementById(
        "create-world-seed",
      ) as HTMLInputElement;
      if (nameInput) nameInput.value = "";
      if (seedInput) seedInput.value = "";
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
