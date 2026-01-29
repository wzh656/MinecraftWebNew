import { Game } from './core/Game';

async function init(): Promise<void> {
  const container = document.getElementById('game-container');
  if (!container) {
    throw new Error('Game container not found');
  }

  const game = new Game(container);

  try {
    await game.initialize();
    game.start();
  } catch (error) {
    console.error('Failed to initialize game:', error);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = '<p style="color: red">Failed to load game</p>';
    }
  }

  window.addEventListener('beforeunload', () => {
    game.dispose();
  });
}

init();
