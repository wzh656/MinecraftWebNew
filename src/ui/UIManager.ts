import type { MenuType, WorldInfo, DebugInfo, UICallbacks } from "./types";
import { MainMenu } from "./components/MainMenu";
import { WorldListMenu } from "./components/WorldListMenu";
import { CreateWorldDialog } from "./components/CreateWorldDialog";
import { OptionsMenu } from "./components/OptionsMenu";
import { PauseMenu } from "./components/PauseMenu";
import { Crosshair } from "./components/hud/Crosshair";
import { Hotbar } from "./components/hud/Hotbar";
import { DebugInfoDisplay } from "./components/hud/DebugInfo";
import { showDeleteConfirm, showEditWorldDialog } from "./components/DialogHelpers";

export type { MenuType, WorldInfo, DebugInfo, UICallbacks } from "./types";

export class UIManager {
  private container: HTMLElement;
  private uiLayer: HTMLElement;
  private currentMenu: MenuType = "main";
  private previousMenu: MenuType = "main";

  // Menu components
  private mainMenu: MainMenu;
  private worldListMenu: WorldListMenu;
  private createWorldDialog: CreateWorldDialog;
  private optionsMenu: OptionsMenu;
  private pauseMenu: PauseMenu;

  // HUD components
  private crosshair: Crosshair;
  private hotbar: Hotbar;
  private debugInfo: DebugInfoDisplay;

  // Callbacks
  private callbacks: UICallbacks = {};

  constructor(container: HTMLElement) {
    this.container = container;
    this.uiLayer = this.createUILayer();

    // Initialize callbacks first (will be passed to components)
    this.callbacks = {
      onSinglePlayer: () => this.showWorldList(),
      onOptions: () => this.showMenu("options"),
      onExit: () => {},
      onResume: () => this.showMenu("game"),
      onReturnToMain: () => {},
      onWorldSelect: () => {},
      onWorldCreate: () => {},
      onWorldDelete: () => {},
      onWorldEdit: () => {},
      onSettingsChange: () => {},
    };

        // Initialize menus
    this.mainMenu = new MainMenu(this.uiLayer, this.callbacks);
    this.worldListMenu = new WorldListMenu(
      this.uiLayer,
      this.callbacks,
      () => this.createWorldDialog.show(),
      (worldName, onConfirm) => showEditWorldDialog(this.uiLayer, worldName, onConfirm),
      (worldName) => showDeleteConfirm(this.uiLayer, worldName, this.callbacks),
      () => this.showMenu("main")
    );
    this.createWorldDialog = new CreateWorldDialog(this.uiLayer, this.callbacks);
    this.optionsMenu = new OptionsMenu(
      this.uiLayer,
      this.callbacks,
      () => this.goBackFromOptions()
    );
    this.pauseMenu = new PauseMenu(this.uiLayer, this.callbacks);

    // Initialize HUD
    this.crosshair = new Crosshair();
    this.hotbar = new Hotbar();
    this.debugInfo = new DebugInfoDisplay();

    this.createHUD();
    this.showMenu("main");
  }

  private createUILayer(): HTMLElement {
    const layer = document.createElement("div");
    layer.id = "ui-layer";
    this.container.appendChild(layer);
    return layer;
  }

  private createHUD(): void {
    this.crosshair.create(this.uiLayer);
    this.hotbar.create(this.uiLayer);
    this.debugInfo.create(this.uiLayer);
  }

  setCallbacks(callbacks: UICallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
    // Propagate callbacks to all menu components
    this.mainMenu.setCallbacks(this.callbacks);
    this.worldListMenu.setCallbacks(this.callbacks);
    this.createWorldDialog.setCallbacks(this.callbacks);
    this.optionsMenu.setCallbacks(this.callbacks);
    this.pauseMenu.setCallbacks(this.callbacks);
  }

  showMenu(menu: MenuType): void {
    if (menu === "options" && this.currentMenu !== "options") {
      this.previousMenu = this.currentMenu;
      // Update options menu style based on previous menu
      const optionsContainer = (this.optionsMenu as unknown as { container: HTMLElement }).container;
      if (this.previousMenu === "pause") {
        optionsContainer?.classList.add("mc-overlay");
        optionsContainer?.classList.remove("mc-background");
      } else {
        optionsContainer?.classList.add("mc-background");
        optionsContainer?.classList.remove("mc-overlay");
      }
    }

    this.currentMenu = menu;

    // Hide all menus
    this.mainMenu.hide();
    this.worldListMenu.hide();
    this.createWorldDialog.hide();
    this.optionsMenu.hide();
    this.pauseMenu.hide();

    // Show current menu
    switch (menu) {
      case "main":
        this.mainMenu.show();
        this.hideGameUI();
        break;
      case "worldList":
        this.worldListMenu.show();
        this.hideGameUI();
        break;
      case "options":
        this.optionsMenu.show();
        this.hideGameUI();
        break;
      case "pause":
        this.pauseMenu.show();
        this.hideGameUI();
        break;
      case "game":
        this.showGameUI();
        break;
    }
  }

  private goBackFromOptions(): void {
    if (this.previousMenu === "pause") {
      this.showMenu("pause");
    } else {
      this.showMenu("main");
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

  // World list management
  updateWorldList(worlds: WorldInfo[]): void {
    this.worldListMenu.updateWorldList(worlds);
  }

  // HUD methods
  showGameUI(): void {
    this.crosshair.show();
    this.hotbar.show();
    this.debugInfo.show();
  }

  hideGameUI(): void {
    this.crosshair.hide();
    this.hotbar.hide();
    this.debugInfo.hide();
  }

  show(): void {
    this.showGameUI();
  }

  hide(): void {
    this.hideGameUI();
  }

  // Block icons
  setBlockTypes(types: number[]): void {
    this.hotbar.setBlockTypes(types);
  }

  setBlockIcon(blockType: number, iconUrl: string): void {
    this.hotbar.setBlockIcon(blockType, iconUrl);
  }

  setBlockIcons(icons: Map<number, string>): void {
    icons.forEach((url, type) => {
      this.hotbar.setBlockIcon(type, url);
    });
  }

  updateHotbarSelection(index: number): void {
    this.hotbar.setSelection(index);
  }

  // Debug info
  updateDebugInfo(info: DebugInfo): void {
    this.debugInfo.update(info);
  }

  // Settings
  refreshSettingsUI(): void {
    this.optionsMenu.refreshSettingsUI();
  }

  // Legacy method - kept for compatibility
  setHotbarSelection(index: number): void {
    this.hotbar.setSelection(index);
  }

  // Legacy method - kept for compatibility
  setTeleportCallback(_callback: (x: number, y: number, z: number) => void): void {
    // Teleport functionality removed
  }

  dispose(): void {
    this.crosshair.dispose();
    this.hotbar.dispose();
    this.debugInfo.dispose();
    this.mainMenu.dispose();
    this.worldListMenu.dispose();
    this.createWorldDialog.dispose();
    this.optionsMenu.dispose();
    this.pauseMenu.dispose();
    this.uiLayer.remove();
  }
}
