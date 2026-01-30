export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 256;
export const BLOCK_SIZE = 1;

export const RENDER_DISTANCE = 8;
export const GRAVITY = -18;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_SPEED = 4.3;
export const PLAYER_JUMP_SPEED = 7.5;

// Player dimensions and physics
export const PLAYER_WIDTH = 0.6;
export const PLAYER_DEPTH = 0.6;

// Player spawn position
export const PLAYER_INITIAL_X = 8;
export const PLAYER_INITIAL_Y = 255;
export const PLAYER_INITIAL_Z = 8;

// Auto-save intervals (milliseconds)
export const SAVE_INTERVAL_PLAYER = 30000; // Save player position every 30 seconds
export const SAVE_DELAY_CHUNK = 5000; // Delay chunk save by 5 seconds

// Block interaction
export const BLOCK_BREAK_COOLDOWN = 200; // milliseconds
export const BLOCK_PLACE_COOLDOWN = 200; // milliseconds
export const RAYCAST_MAX_DISTANCE = 5; // blocks

// Block interaction safety margins
export const BLOCK_PLACE_SAFETY_MARGIN = 0.1;

// UI
export const HOTBAR_SIZE = 9;
export const BLOCK_ICON_SIZE = 48; // pixels

// World bounds
export const WORLD_MIN_Y = -50; // Void level - teleport back up

export const BLOCK_FACES = {
  TOP: 0,
  BOTTOM: 1,
  FRONT: 2,
  BACK: 3,
  LEFT: 4,
  RIGHT: 5,
} as const;

export const FACE_OFFSETS = [
  [0, 1, 0],
  [0, -1, 0],
  [0, 0, 1],
  [0, 0, -1],
  [-1, 0, 0],
  [1, 0, 0],
] as const;
