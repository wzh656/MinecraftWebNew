export const CHUNK_SIZE = 16;
export const CHUNK_HEIGHT = 256;
export const BLOCK_SIZE = 1;

export const RENDER_DISTANCE = 8;
export const GRAVITY = -19.8;
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_SPEED = 4.3;
export const PLAYER_JUMP_SPEED = 8.5;

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
