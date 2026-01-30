import { Game } from './core/Game';
import { SaveManager } from './save/SaveManager';

let currentGame: Game | null = null;
let saveManager: SaveManager | null = null;

async function init(): Promise<void> {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Game container not found');
  }

  // Initialize save manager for main menu
  saveManager = new SaveManager();
  await saveManager.init();

  // Create a temporary game instance just for UI (we'll create a proper one when world is selected)
  currentGame = new Game(container);

  // Setup UI callbacks for main menu
  const ui = currentGame.getUIManager();
  ui.setCallbacks({
    onResume: () => {
      currentGame?.setPauseMenuVisible(false);
    },
    onReturnToMain: () => {
      returnToMainMenu();
    },
    onWorldSelect: async (worldName: string) => {
      await startGame(worldName);
    },
    onWorldCreate: async (worldName: string) => {
      await startGame(worldName);
    },
    onWorldDelete: async (worldName: string) => {
      await saveManager?.deleteWorld(worldName);
      await updateWorldList();
    },
  });

  // Show main menu and load world list
  await updateWorldList();
  ui.showMainMenu();

  // Hide loading screen
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
  }

  window.addEventListener('beforeunload', () => {
    currentGame?.dispose();
  });
}

async function updateWorldList(): Promise<void> {
  if (!saveManager) return;
  const worlds = await saveManager.listWorlds();
  currentGame?.getUIManager().updateWorldList(worlds);
}

async function startGame(worldName: string): Promise<void> {
  if (!currentGame) return;

  const ui = currentGame.getUIManager();
  ui.hideMainMenu();
  ui.show();

  try {
    await currentGame.initialize(worldName);
    // Don't start game loop yet - show pause menu first
    // Player needs to click "Resume Game" to lock pointer and start
    currentGame.showInitialPauseMenu();
  } catch (error) {
    console.error('Failed to start game:', error);
    returnToMainMenu();
  }
}

function returnToMainMenu(): void {
  if (!currentGame) return;

  // Dispose current game state
  currentGame.dispose().then(() => {
    // Create new game instance for fresh start
    const container = document.getElementById('game-container');
    if (!container) return;

    // Clear container to remove old canvas and UI elements
    container.innerHTML = '';

    currentGame = new Game(container);

    // Re-setup callbacks
    const ui = currentGame.getUIManager();
    ui.setCallbacks({
      onResume: () => {
        currentGame?.setPauseMenuVisible(false);
      },
      onReturnToMain: () => {
        returnToMainMenu();
      },
      onWorldSelect: async (worldName: string) => {
        await startGame(worldName);
      },
      onWorldCreate: async (worldName: string) => {
        await startGame(worldName);
      },
      onWorldDelete: async (worldName: string) => {
        await saveManager?.deleteWorld(worldName);
        await updateWorldList();
      },
    });

    // Show main menu with updated world list
    updateWorldList().then(() => {
      ui.showMainMenu();
    });
  });
}

init().catch(console.error);
