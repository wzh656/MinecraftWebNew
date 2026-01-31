import { HOTBAR_SIZE, BLOCK_ICON_SIZE } from "../utils/Constants";
import { settings, GameSettings } from "../utils/Settings";
import { getBlockColor } from "../utils/BlockUtils";

type MenuType =
  | "main"
  | "worldList"
  | "createWorld"
  | "options"
  | "pause"
  | "game";

interface WorldInfo {
  name: string;
  createdAt: number;
  lastPlayed: number;
}

export class UIManager {
  private container: HTMLElement;
  private crosshair: HTMLElement | null = null;
  private hotbar: HTMLElement | null = null;
  private debugInfo: HTMLElement | null = null;
  private currentMenu: MenuType = "main";
  private previousMenu: MenuType = "main";
  private selectedWorld: string | null = null;
  private worlds: WorldInfo[] = [];

  // Callbacks
  private callbacks: {
    onResume?: () => void;
    onReturnToMain?: () => void;
    onWorldSelect?: (worldName: string) => void;
    onWorldCreate?: (worldName: string, seed: string) => void;
    onWorldDelete?: (worldName: string) => void;
    onWorldEdit?: (worldName: string, newName: string) => void;
    onSinglePlayer?: () => void;
    onOptions?: () => void;
    onExit?: () => void;
    onTeleport?: (x: number, y: number, z: number) => void;
    onSettingsChange?: (settings: GameSettings) => void;
  } = {};

  // Menu containers
  private mainMenu: HTMLElement | null = null;
  private worldListMenu: HTMLElement | null = null;
  private createWorldDialog: HTMLElement | null = null;
  private optionsMenu: HTMLElement | null = null;
  private pauseMenu: HTMLElement | null = null;
  private uiLayer: HTMLElement | null = null;

  private blockTypes: number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  private blockIcons: Map<number, string> = new Map();

  constructor(container: HTMLElement) {
    this.container = container;
    this.createUI();
  }

  setCallbacks(callbacks: typeof this.callbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private createUI(): void {
    this.createUILayer();
    this.createMainMenu();
    this.createWorldListMenu();
    this.createCreateWorldDialog();
    this.createOptionsMenu();
    this.createPauseMenu();
    this.createCrosshair();
    this.createHotbar();
    this.createDebugInfo();
    this.showMenu("main");
  }

  private createUILayer(): void {
    this.uiLayer = document.createElement("div");
    this.uiLayer.id = "ui-layer";
    this.container.appendChild(this.uiLayer);
  }

  // ===== 主页菜单 =====
  private createMainMenu(): void {
    this.mainMenu = document.createElement("div");
    this.mainMenu.className = "mc-menu-overlay mc-background";
    this.mainMenu.style.display = "none";

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
      this.showMenu("worldList");
    });

    const optionsBtn = this.createMenuButton("选项...", () => {
      this.showMenu("options");
    });

    const exitBtn = this.createMenuButton("退出游戏", () => {
      this.callbacks.onExit?.();
    });

    content.appendChild(title);
    content.appendChild(singlePlayerBtn);
    content.appendChild(optionsBtn);
    content.appendChild(exitBtn);
    this.mainMenu.appendChild(content);
    this.uiLayer!.appendChild(this.mainMenu);
  }

  // ===== 存档列表菜单 =====
  private createWorldListMenu(): void {
    this.worldListMenu = document.createElement("div");
    this.worldListMenu.className = "mc-menu-overlay mc-background";
    this.worldListMenu.style.display = "none";

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

    // 世界列表容器
    const worldListContainer = document.createElement("div");
    worldListContainer.id = "world-list-container";
    worldListContainer.className = "mc-world-list mc-scroll";
    worldListContainer.style.minHeight = "200px";

    // 按钮行
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
        this.showCreateWorldDialog();
      },
      "mc-button-small",
    );

    const editBtn = this.createMenuButton(
      "重命名",
      () => {
        if (this.selectedWorld) {
          this.showEditWorldDialog(this.selectedWorld, (newName) => {
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
          this.showDeleteConfirm(this.selectedWorld);
        }
      },
      "mc-button-small mc-button-danger",
    );
    deleteBtn.id = "btn-delete-world";
    deleteBtn.disabled = true;

    const backBtn = this.createMenuButton(
      "返回",
      () => {
        this.showMenu("main");
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
    this.worldListMenu.appendChild(content);
    this.uiLayer!.appendChild(this.worldListMenu);
  }

  // ===== 创建世界对话框 =====
  private createCreateWorldDialog(): void {
    this.createWorldDialog = document.createElement("div");
    this.createWorldDialog.className = "mc-dialog-overlay";
    this.createWorldDialog.style.display = "none";

    const dialog = document.createElement("div");
    dialog.className = "mc-dialog";
    dialog.style.width = "400px";

    const title = document.createElement("div");
    title.className = "mc-dialog-title";
    title.textContent = "创建新世界";

    // 世界名称
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

    // 种子
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

    // 按钮
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
          this.hideCreateWorldDialog();
        }
      },
      "mc-button-small",
    );

    const cancelBtn = this.createMenuButton(
      "取消",
      () => {
        this.hideCreateWorldDialog();
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
    this.createWorldDialog.appendChild(dialog);
    this.uiLayer!.appendChild(this.createWorldDialog);
  }

  showCreateWorldDialog(): void {
    if (this.createWorldDialog) {
      const nameInput = document.getElementById(
        "create-world-name",
      ) as HTMLInputElement;
      const seedInput = document.getElementById(
        "create-world-seed",
      ) as HTMLInputElement;
      if (nameInput) nameInput.value = "";
      if (seedInput) seedInput.value = "";
      this.createWorldDialog.style.display = "flex";
    }
  }

  hideCreateWorldDialog(): void {
    if (this.createWorldDialog) {
      this.createWorldDialog.style.display = "none";
    }
  }

  private showDeleteConfirm(worldName: string): void {
    const dialog = document.createElement("div");
    dialog.className = "mc-dialog-overlay";

    const content = document.createElement("div");
    content.className = "mc-dialog";

    const title = document.createElement("div");
    title.className = "mc-dialog-title";
    title.textContent = "删除世界";

    const message = document.createElement("div");
    message.className = "mc-font";
    message.style.color = "white";
    message.style.textAlign = "center";
    message.style.margin = "16px 0";
    message.textContent = `确定要删除世界 "${worldName}" 吗？\n此操作无法撤销。`;
    message.style.whiteSpace = "pre-line";

    const buttonRow = document.createElement("div");
    buttonRow.className = "mc-dialog-buttons";

    const confirmBtn = this.createMenuButton(
      "删除",
      () => {
        this.callbacks.onWorldDelete?.(worldName);
        dialog.remove();
      },
      "mc-button-small mc-button-danger",
    );

    const cancelBtn = this.createMenuButton(
      "取消",
      () => {
        dialog.remove();
      },
      "mc-button-small",
    );

    buttonRow.appendChild(confirmBtn);
    buttonRow.appendChild(cancelBtn);

    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(buttonRow);
    dialog.appendChild(content);
    this.uiLayer!.appendChild(dialog);
  }

  showEditWorldDialog(
    worldName: string,
    onConfirm: (newName: string) => void,
  ): void {
    const dialog = document.createElement("div");
    dialog.className = "mc-dialog-overlay";

    const content = document.createElement("div");
    content.className = "mc-dialog";
    content.style.width = "400px";

    const title = document.createElement("div");
    title.className = "mc-dialog-title";
    title.textContent = "重命名世界";

    const label = document.createElement("div");
    label.className = "mc-label";
    label.textContent = "新世界名称:";
    label.style.marginTop = "16px";

    const input = document.createElement("input");
    input.type = "text";
    input.className = "mc-input";
    input.style.width = "100%";
    input.style.marginTop = "4px";
    input.value = worldName;
    input.placeholder = "输入新的世界名称";

    const buttonRow = document.createElement("div");
    buttonRow.className = "mc-dialog-buttons";
    buttonRow.style.marginTop = "24px";

    const confirmBtn = this.createMenuButton(
      "确认",
      () => {
        const newName = input.value.trim();
        if (newName && newName !== worldName) {
          onConfirm(newName);
        }
        dialog.remove();
      },
      "mc-button-small",
    );

    const cancelBtn = this.createMenuButton(
      "取消",
      () => {
        dialog.remove();
      },
      "mc-button-small",
    );

    buttonRow.appendChild(confirmBtn);
    buttonRow.appendChild(cancelBtn);

    content.appendChild(title);
    content.appendChild(label);
    content.appendChild(input);
    content.appendChild(buttonRow);
    dialog.appendChild(content);
    this.uiLayer!.appendChild(dialog);

    input.focus();
    input.select();
  }

  // ===== 选项菜单 =====
  private createOptionsMenu(): void {
    this.optionsMenu = document.createElement("div");
    this.optionsMenu.className = "mc-menu-overlay mc-background";
    this.optionsMenu.style.display = "none";

    const content = document.createElement("div");
    content.className = "mc-panel";
    content.style.width = "500px";
    content.style.maxHeight = "80vh";
    content.style.overflow = "auto";

    const title = document.createElement("h1");
    title.className = "mc-title";
    title.style.fontSize = "24px";
    title.style.marginBottom = "20px";
    title.textContent = "选项";

    const settingsContainer = document.createElement("div");

    // 渲染距离
    const renderRow = this.createSliderSetting(
      "渲染距离",
      "renderDistance",
      2,
      16,
      1,
      (v) => `${v} 区块`,
      (v) => this.updateCacheDistanceMin(v),
    );

    // 缓存距离
    const cacheRow = this.createSliderSetting(
      "缓存距离",
      "cacheDistance",
      2,
      20,
      1,
      (v) => `${v} 区块`,
    );
    this.cacheDistanceRow = cacheRow;
    this.updateCacheDistanceMin(settings.values.renderDistance);

    // 视野距离
    const fovRow = this.createSliderSetting(
      "视野",
      "fov",
      30,
      110,
      1,
      (v) => `${v}°`,
    );

    // 鼠标灵敏度
    const sensRow = this.createSliderSetting(
      "鼠标灵敏度",
      "mouseSensitivity",
      0.001,
      0.01,
      0.001,
      (v) => `${(v * 1000).toFixed(1)}x`,
    );

    // 音量
    const volRow = this.createSliderSetting(
      "主音量",
      "volume",
      0,
      100,
      5,
      (v) => `${v}%`,
    );

    // 玩家速度
    const speedRow = this.createSliderSetting(
      "玩家速度",
      "playerSpeed",
      1,
      10,
      0.5,
      (v) => `${v.toFixed(1)}`,
    );

    settingsContainer.appendChild(renderRow);
    settingsContainer.appendChild(cacheRow);
    settingsContainer.appendChild(fovRow);
    settingsContainer.appendChild(sensRow);
    settingsContainer.appendChild(volRow);
    settingsContainer.appendChild(speedRow);

    // 按钮行
    const buttonRow = document.createElement("div");
    buttonRow.className = "mc-button-row";

    const resetBtn = this.createMenuButton(
      "重置为默认",
      () => {
        settings.resetToDefaults();
        this.refreshSettingsUI();
      },
      "mc-button-small",
    );

    const doneBtn = this.createMenuButton(
      "完成",
      () => {
        this.goBackFromOptions();
      },
      "mc-button-small",
    );

    buttonRow.appendChild(resetBtn);
    buttonRow.appendChild(doneBtn);

    content.appendChild(title);
    content.appendChild(settingsContainer);
    content.appendChild(buttonRow);
    this.optionsMenu.appendChild(content);
    this.uiLayer!.appendChild(this.optionsMenu);
  }

  private cacheDistanceRow: HTMLElement | null = null;

  private updateCacheDistanceMin(renderDist: number): void {
    if (!this.cacheDistanceRow) return;
    const slider = this.cacheDistanceRow.querySelector(
      'input[data-setting="cacheDistance"]',
    ) as HTMLInputElement;
    if (slider) {
      slider.min = renderDist.toString();
      const currentVal = parseFloat(slider.value);
      if (currentVal < renderDist) {
        slider.value = renderDist.toString();
        settings.updateSetting("cacheDistance", renderDist);
        const valueEl = document.getElementById("setting-value-cacheDistance");
        if (valueEl) valueEl.textContent = `${renderDist} 区块`;
      }
    }
  }

  private createSliderSetting(
    label: string,
    key: keyof GameSettings,
    min: number,
    max: number,
    step: number,
    valueFormatter: (v: number) => string,
    onChange?: (val: number) => void,
  ): HTMLElement {
    const row = document.createElement("div");
    row.className = "mc-setting-row";

    const labelEl = document.createElement("span");
    labelEl.className = "mc-setting-label";
    labelEl.textContent = label;

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "mc-slider";
    slider.dataset.setting = key;
    slider.min = min.toString();
    slider.max = max.toString();
    slider.step = step.toString();
    slider.value = (settings.values[key] as number).toString();

    const valueEl = document.createElement("span");
    valueEl.className = "mc-setting-value";
    valueEl.id = `setting-value-${key}`;
    valueEl.textContent = valueFormatter(settings.values[key] as number);
    valueEl.style.minWidth = "100px";

    slider.addEventListener("input", () => {
      const val = parseFloat(slider.value);
      settings.updateSetting(key, val as never);
      valueEl.textContent = valueFormatter(val);
      onChange?.(val);
      this.callbacks.onSettingsChange?.(settings.values);
    });

    row.appendChild(labelEl);
    row.appendChild(slider);
    row.appendChild(valueEl);

    return row;
  }

  private refreshSettingsUI(): void {
    const s = settings.values;
    const setSlider = (key: keyof GameSettings, val: number) => {
      const slider = this.optionsMenu?.querySelector(
        `input[data-setting="${key}"]`,
      ) as HTMLInputElement;
      if (slider) {
        slider.value = val.toString();
        const valueEl = document.getElementById(`setting-value-${key}`);
        if (valueEl) {
          const formatter = this.getValueFormatter(key);
          valueEl.textContent = formatter(val);
        }
      }
    };
    setSlider("renderDistance", s.renderDistance);
    setSlider("cacheDistance", s.cacheDistance);
    setSlider("fov", s.fov);
    setSlider("mouseSensitivity", s.mouseSensitivity);
    setSlider("volume", s.volume);
    setSlider("playerSpeed", s.playerSpeed);
    setSlider("playerJumpSpeed", s.playerJumpSpeed);

    this.updateCacheDistanceMin(s.renderDistance);

    this.callbacks.onSettingsChange?.(s);
  }

  private getValueFormatter(key: keyof GameSettings): (v: number) => string {
    const formatters: Record<string, (v: number) => string> = {
      renderDistance: (v) => `${v} 区块`,
      cacheDistance: (v) => `${v} 区块`,
      fov: (v) => `${v}°`,
      mouseSensitivity: (v) => `${(v * 1000).toFixed(1)}x`,
      volume: (v) => `${v}%`,
      playerSpeed: (v) => v.toFixed(1),
      playerJumpSpeed: (v) => v.toFixed(1),
      gravity: (v) => v.toFixed(1),
    };
    return formatters[key] || ((v) => v.toString());
  }

  private goBackFromOptions(): void {
    if (this.previousMenu === "pause") {
      this.showMenu("pause");
    } else {
      this.showMenu("main");
    }
  }

  // ===== 暂停菜单 =====
  private createPauseMenu(): void {
    this.pauseMenu = document.createElement("div");
    this.pauseMenu.className = "mc-menu-overlay mc-overlay";
    this.pauseMenu.style.display = "none";

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
      this.showMenu("options");
    });

    const returnBtn = this.createMenuButton("保存并回到标题画面", () => {
      this.callbacks.onReturnToMain?.();
    });

    content.appendChild(title);
    content.appendChild(resumeBtn);
    content.appendChild(optionsBtn);
    content.appendChild(returnBtn);
    this.pauseMenu.appendChild(content);
    this.uiLayer!.appendChild(this.pauseMenu);
  }

  // ===== 辅助方法 =====
  private createMenuButton(
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

  // ===== 公共方法 =====
  showMenu(menu: MenuType): void {
    if (menu === "options" && this.currentMenu !== "options") {
      this.previousMenu = this.currentMenu;
      if (this.previousMenu === "pause") {
        this.optionsMenu?.classList.add("mc-overlay");
        this.optionsMenu?.classList.remove("mc-background");
      } else {
        this.optionsMenu?.classList.add("mc-background");
        this.optionsMenu?.classList.remove("mc-overlay");
      }
    }

    this.currentMenu = menu;

    // 隐藏所有菜单
    this.mainMenu!.style.display = "none";
    this.worldListMenu!.style.display = "none";
    this.createWorldDialog!.style.display = "none";
    this.optionsMenu!.style.display = "none";
    this.pauseMenu!.style.display = "none";

    // 显示当前菜单
    switch (menu) {
      case "main":
        this.mainMenu!.style.display = "flex";
        this.hideGameUI();
        break;
      case "worldList":
        this.worldListMenu!.style.display = "flex";
        this.hideGameUI();
        break;
      case "options":
        this.optionsMenu!.style.display = "flex";
        this.hideGameUI();
        break;
      case "pause":
        this.pauseMenu!.style.display = "flex";
        this.hideGameUI();
        break;
      case "game":
        this.showGameUI();
        break;
    }
  }

  showMainMenu(): void {
    this.showMenu("main");
  }

  showPauseMenu(): void {
    this.showMenu("pause");
  }

  hidePauseMenu(): void {
    this.showMenu("game");
  }

  showWorldList(): void {
    this.showMenu("worldList");
  }

  isMainMenuVisible(): boolean {
    return this.currentMenu === "main";
  }

  isPaused(): boolean {
    return this.currentMenu === "pause";
  }

  getCurrentMenu(): MenuType {
    return this.currentMenu;
  }

  // ===== 世界列表管理 =====
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
          // 移除其他选中状态
          container.querySelectorAll(".mc-list-item").forEach((el) => {
            el.classList.remove("selected");
          });
          // 选中当前
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

  // ===== 游戏内UI =====
  private createCrosshair(): void {
    this.crosshair = document.createElement("div");
    this.crosshair.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      width: 16px;
      height: 16px;
      transform: translate(-50%, -50%);
      pointer-events: none;
      z-index: 10;
    `;
    this.crosshair.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 16 16" style="image-rendering: pixelated;">
        <line x1="8" y1="0" x2="8" y2="16" stroke="white" stroke-width="2"/>
        <line x1="0" y1="8" x2="16" y2="8" stroke="white" stroke-width="2"/>
      </svg>
    `;
    this.crosshair.style.display = "none";
    this.uiLayer!.appendChild(this.crosshair);
  }

  private createHotbar(): void {
    this.hotbar = document.createElement("div");
    this.hotbar.style.cssText = `
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
      this.hotbar.appendChild(slot);
    }

    this.hotbar.style.display = "none";
    this.uiLayer!.appendChild(this.hotbar);
  }

  private createDebugInfo(): void {
    this.debugInfo = document.createElement("div");
    this.debugInfo.style.cssText = `
      position: absolute;
      top: 10px;
      left: 10px;
      color: white;
      font-family: 'Minecraft', monospace;
      font-size: 12px;
      pointer-events: none;
      background: rgba(0, 0, 0, 0.5);
      padding: 8px;
      z-index: 10;
      border-radius: 0;
    `;
    this.debugInfo.style.display = "none";
    this.uiLayer!.appendChild(this.debugInfo);
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
    if (!this.hotbar) return;
    const slots = this.hotbar.querySelectorAll(".hotbar-slot");
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

  setHotbarSelection(index: number): void {
    if (!this.hotbar) return;
    const slots = this.hotbar.children;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i] as HTMLElement;
      slot.style.borderColor = i === index ? "white" : "#555";
    }
  }

  showGameUI(): void {
    if (this.crosshair) this.crosshair.style.display = "block";
    if (this.hotbar) this.hotbar.style.display = "flex";
    if (this.debugInfo) this.debugInfo.style.display = "block";
  }

  hideGameUI(): void {
    if (this.crosshair) this.crosshair.style.display = "none";
    if (this.hotbar) this.hotbar.style.display = "none";
    if (this.debugInfo) this.debugInfo.style.display = "none";
  }

  show(): void {
    this.showGameUI();
  }

  hide(): void {
    this.hideGameUI();
  }

  // ===== Debug Info =====
  setTeleportCallback(
    _callback: (x: number, y: number, z: number) => void,
  ): void {}

  updateDebugInfo(info: {
    fps: number;
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number };
    target: { x: number; y: number; z: number; face: number } | null;
    flying?: boolean;
    sprinting?: boolean;
  }): void {
    if (this.debugInfo) {
      const yaw = ((info.rotation.y * 180) / Math.PI) % 360;
      const pitch = (info.rotation.x * 180) / Math.PI;
      const targetStr = info.target
        ? `${info.target.x}, ${info.target.y}, ${info.target.z} (face: ${info.target.face})`
        : "none";

      const statusStr = [];
      if (info.flying) statusStr.push("Flying");
      if (info.sprinting) statusStr.push("Sprinting");
      const statusText =
        statusStr.length > 0 ? ` [${statusStr.join(", ")}]` : "";

      this.debugInfo.innerHTML = `
        <div>FPS: ${info.fps}${statusText}</div>
        <div>Pos: ${info.position.x.toFixed(2)}, ${info.position.y.toFixed(2)}, ${info.position.z.toFixed(2)}</div>
        <div>Yaw: ${yaw.toFixed(1)}°, Pitch: ${pitch.toFixed(1)}°</div>
        <div>Target: ${targetStr}</div>
      `;
    }
  }
}
