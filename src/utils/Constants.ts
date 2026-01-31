export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 256;
export const BLOCK_SIZE = 1;

export const RENDER_DISTANCE = 8;
export const CACHE_DISTANCE = 12; // Chunks within this distance are kept in memory but not rendered
export const GRAVITY = -18;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_SPEED = 4.3;
export const PLAYER_SPRINT_SPEED = 6.5; // Sprint is 1.5x normal speed
export const PLAYER_FLIGHT_SPEED = 8.0; // Flight speed
export const PLAYER_JUMP_SPEED = 7.5;

// Double-tap detection for flight and sprint (milliseconds)
export const DOUBLE_TAP_WINDOW = 300;

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

// Time-related constants (milliseconds)
export const MS_PER_SECOND = 1000;
export const FPS_UPDATE_INTERVAL = 1000;

// Mouse sensitivity factor
export const MOUSE_SENSITIVITY_FACTOR = 0.002;

// Loading progress percentages
export const LOADING_PROGRESS_INIT = 0;
export const LOADING_PROGRESS_SAVE = 20;
export const LOADING_PROGRESS_ICONS = 40;
export const LOADING_PROGRESS_CHUNKS = 60;
export const LOADING_PROGRESS_COMPLETE = 100;

// Chunk loading timeout
export const CHUNK_LOAD_TIMEOUT = 30000;
export const CHUNK_LOAD_CHECK_INTERVAL = 100;
export const CHUNK_LOAD_DELAY = 500;

// Delta time cap (seconds)
export const MAX_DELTA_TIME = 0.1;

// Physics constants
export const VELOCITY_DAMPING = 0.9;
export const POSITION_SEARCH_EPSILON_START = 0.01;
export const POSITION_SEARCH_EPSILON_END = 0.2;
export const POSITION_SEARCH_EPSILON_STEP = 0.01;
export const MAX_POSITION_SEARCH_HEIGHT = 10;
export const TELEPORT_Y_POSITION = 50;
