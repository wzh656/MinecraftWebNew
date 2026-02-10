import { Game } from "./core/Game";
import { SaveManager } from "./save/SaveManager";
import { audioManager } from "./utils/AudioManager";

let currentGame: Game | null = null;
let saveManager: SaveManager | null = null;

async function init(): Promise<void> {
  const container = document.getElementById("game-container");
  if (!container) {
    throw new Error("Game container not found");
  }

  // Initialize save manager for main menu
  saveManager = new SaveManager();
  await saveManager.init();

  // Create game instance
  currentGame = new Game(container);

  // Setup UI callbacks
  setupUICallbacks();

  // Show main menu
  const ui = currentGame.getUIManager();
  ui.showMainMenu();

  // Hide loading screen
  const loadingElem = document.getElementById("loading");
  loadingElem?.classList.add("hidden");

  const startAudioOnInteraction = () => {
    audioManager.start();
    document.removeEventListener("click", startAudioOnInteraction);
    document.removeEventListener("keydown", startAudioOnInteraction);
  };
  document.addEventListener("click", startAudioOnInteraction);
  document.addEventListener("keydown", startAudioOnInteraction);

  window.addEventListener("beforeunload", () => {
    currentGame?.dispose();
  });
}

function setupUICallbacks(): void {
  if (!currentGame) return;

  const ui = currentGame.getUIManager();
  ui.setCallbacks({
    // 主页
    onSinglePlayer: async () => {
      await updateWorldList();
      ui.showWorldList();
    },
    onOptions: () => {
      // 显示选项菜单
    },
    onExit: () => {
      // 退出游戏 (刷新页面或关闭标签)
      window.location.reload();
    },

    // 存档列表
    onWorldSelect: async (worldName: string) => {
      await startGame(worldName);
    },
    onWorldCreate: async (worldName: string, seed: string) => {
      await createNewWorld(worldName, seed);
    },
    onWorldDelete: async (worldName: string) => {
      await saveManager?.deleteWorld(worldName);
      await updateWorldList();
    },
    onWorldEdit: async (worldName: string, newName: string) => {
      if (!saveManager) return;

      const worlds = await saveManager.listWorlds();
      if (worlds.some((w) => w.name === newName)) {
        alert(`世界 "${newName}" 已存在`);
        return;
      }

      await saveManager.renameWorld(worldName, newName);
      await updateWorldList();
    },

    // 暂停菜单
    onResume: () => {
      currentGame?.setPauseMenuVisible(false);
    },
    onReturnToMain: () => {
      returnToMainMenu();
    },

    // 设置变更
    onSettingsChange: (newSettings) => {
      // 应用设置变更
      currentGame?.applySettings?.(newSettings);
    },
  });
}

async function updateWorldList(): Promise<void> {
  if (!saveManager) return;
  const worlds = await saveManager.listWorlds();
  currentGame?.getUIManager().updateWorldList(worlds);
}

async function createNewWorld(worldName: string, seed: string): Promise<void> {
  if (!saveManager) return;

  // 检查世界是否已存在
  const worlds = await saveManager.listWorlds();
  if (worlds.some((w) => w.name === worldName)) {
    alert(`世界 "${worldName}" 已存在`);
    return;
  }

  // 如果种子为空，生成随机种子
  const finalSeed = seed.trim() || Math.random().toString(36).substring(2);

  // 创建世界（保存种子）
  await saveManager.createWorld(worldName, finalSeed);
  saveManager.setCurrentWorld(worldName);
  await saveManager.savePlayerPosition({ x: 8, y: 255, z: 8 });

  await startGame(worldName);
}

async function startGame(worldName: string): Promise<void> {
  if (!currentGame) return;

  // Show loading screen
  const loadingElem = document.getElementById("loading");
  const loadingText = document.getElementById("loading-text");
  if (loadingText) loadingText.textContent = "加载世界中...";
  loadingElem?.classList.remove("hidden");

  try {
    await currentGame.initialize(worldName);

    // Show game UI
    const ui = currentGame.getUIManager();
    ui.show();

    // Show initial pause menu (wait for user to resume)
    currentGame.showInitialPauseMenu();
  } catch (error) {
    console.error("Failed to start game:", error);
    returnToMainMenu();
  } finally {
    loadingElem?.classList.add("hidden");
  }
}

function returnToMainMenu(): void {
  if (!currentGame) return;

  currentGame.dispose().then(() => {
    const container = document.getElementById("game-container");
    if (!container) return;

    // Clear container
    container.innerHTML = "";

    // Create new game instance
    currentGame = new Game(container);

    // Re-setup callbacks
    setupUICallbacks();

    // Show main menu
    const ui = currentGame.getUIManager();
    updateWorldList().then(() => {
      ui.showMainMenu();
    });
  });
}

init().catch(console.error);
