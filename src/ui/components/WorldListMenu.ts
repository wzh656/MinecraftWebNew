import { MenuBase } from "./MenuBase";
import type { UICallbacks, WorldInfo } from "../types";

export class WorldListMenu extends MenuBase {
  private callbacks: UICallbacks;
  private worlds: WorldInfo[] = [];
  private selectedWorld: string | null = null;
  private onShowCreateDialog?: () => void;
  private onShowEditDialog?: (worldName: string, onConfirm: (newName: string) => void) => void;
  private onShowDeleteConfirm?: (worldName: string) => void;
  private onGoBack?: () => void;

  constructor(
    uiLayer: HTMLElement,
    callbacks: UICallbacks,
    onShowCreateDialog: () => void,
    onShowEditDialog: (worldName: string, onConfirm: (newName: string) => void) => void,
    onShowDeleteConfirm: (worldName: string) => void,
    onGoBack?: () => void
  ) {
    super(uiLayer);
    this.callbacks = callbacks;
    this.onShowCreateDialog = onShowCreateDialog;
    this.onShowEditDialog = onShowEditDialog;
    this.onShowDeleteConfirm = onShowDeleteConfirm;
    this.onGoBack = onGoBack;
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
      width: 600px;
    `;

    const title = document.createElement("h1");
    title.textContent = "选择世界";
    title.className = "mc-title";
    title.style.fontSize = "24px";
    title.style.marginBottom = "20px";

    // World list container
    const worldListContainer = document.createElement("div");
    worldListContainer.id = "world-list-container";
    worldListContainer.className = "mc-world-list mc-scroll";
    worldListContainer.style.minHeight = "200px";

    // Button row
    const buttonRow = document.createElement("div");
    buttonRow.className = "mc-button-row";
    buttonRow.style.marginTop = "16px";

    const playBtn = this.createMenuButton(
      "进入选中的世界",
      () => {
        if (this.selectedWorld) {
          this.callbacks.onWorldSelect?.(this.selectedWorld);
        }
      },
      "mc-button-small",
    );
    playBtn.id = "btn-play-world";
    playBtn.disabled = true;

    const createBtn = this.createMenuButton(
      "创建新世界",
      () => {
        this.onShowCreateDialog?.();
      },
      "mc-button-small",
    );

    const editBtn = this.createMenuButton(
      "重命名",
      () => {
        if (this.selectedWorld) {
          this.onShowEditDialog?.(this.selectedWorld, (newName) => {
            this.callbacks.onWorldEdit?.(this.selectedWorld!, newName);
          });
        }
      },
      "mc-button-small",
    );
    editBtn.id = "btn-edit-world";
    editBtn.disabled = true;

    const deleteBtn = this.createMenuButton(
      "删除",
      () => {
        if (this.selectedWorld) {
          this.onShowDeleteConfirm?.(this.selectedWorld);
        }
      },
      "mc-button-small mc-button-danger",
    );
    deleteBtn.id = "btn-delete-world";
    deleteBtn.disabled = true;

    const backBtn = this.createMenuButton(
      "返回",
      () => {
        this.onGoBack?.();
      },
      "mc-button-small",
    );

    buttonRow.appendChild(playBtn);
    buttonRow.appendChild(createBtn);
    buttonRow.appendChild(editBtn);
    buttonRow.appendChild(deleteBtn);
    buttonRow.appendChild(backBtn);

    content.appendChild(title);
    content.appendChild(worldListContainer);
    content.appendChild(buttonRow);
    this.container.appendChild(content);
    this.uiLayer.appendChild(this.container);
  }

  updateWorldList(worlds: WorldInfo[]): void {
    this.worlds = worlds;
    this.selectedWorld = null;
    this.updateWorldListUI();
  }

  private updateWorldListUI(): void {
    const container = document.getElementById("world-list-container");
    if (!container) return;

    container.innerHTML = "";

    if (this.worlds.length === 0) {
      const emptyMsg = document.createElement("div");
      emptyMsg.className = "mc-font";
      emptyMsg.style.cssText = `
        color: #888;
        text-align: center;
        padding: 40px 20px;
        font-size: 14px;
      `;
      emptyMsg.textContent = '没有可用的世界\n点击"创建新世界"来开始游戏';
      emptyMsg.style.whiteSpace = "pre-line";
      container.appendChild(emptyMsg);
    } else {
      this.worlds.forEach((world) => {
        const item = document.createElement("div");
        item.className = "mc-list-item";
        item.style.display = "flex";
        item.style.justifyContent = "space-between";
        item.style.alignItems = "center";

        const info = document.createElement("div");
        info.className = "mc-world-info";

        const name = document.createElement("div");
        name.className = "mc-world-name mc-font";
        name.textContent = world.name;

        const date = document.createElement("div");
        date.className = "mc-world-date mc-font";
        date.textContent = `创建: ${new Date(world.createdAt).toLocaleDateString()} | 最后游玩: ${new Date(world.lastPlayed).toLocaleDateString()}`;

        info.appendChild(name);
        info.appendChild(date);
        item.appendChild(info);

        item.addEventListener("click", () => {
          // Remove other selected state
          container.querySelectorAll(".mc-list-item").forEach((el) => {
            el.classList.remove("selected");
          });
          // Select current
          item.classList.add("selected");
          this.selectedWorld = world.name;
          this.updateButtonStates();
        });

        container.appendChild(item);
      });
    }

    this.updateButtonStates();
  }

  private updateButtonStates(): void {
    const hasSelection = this.selectedWorld !== null;
    const playBtn = document.getElementById(
      "btn-play-world",
    ) as HTMLButtonElement;
    const editBtn = document.getElementById(
      "btn-edit-world",
    ) as HTMLButtonElement;
    const deleteBtn = document.getElementById(
      "btn-delete-world",
    ) as HTMLButtonElement;

    if (playBtn) playBtn.disabled = !hasSelection;
    if (editBtn) editBtn.disabled = !hasSelection;
    if (deleteBtn) deleteBtn.disabled = !hasSelection;
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
