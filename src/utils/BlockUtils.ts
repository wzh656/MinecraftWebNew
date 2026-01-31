import { BlockType } from "../world/BlockType";

/**
 * 方块纹理属性
 * 定义方块六个面使用的纹理索引
 */
export interface BlockTextureProps {
  textureTop: number;
  textureBottom: number;
  textureSide: number;
}

/**
 * 获取方块纹理属性
 * 集中管理所有方块的纹理映射，避免在多个地方重复定义
 */
export function getBlockTextureProperties(
  blockType: BlockType,
): BlockTextureProps {
  switch (blockType) {
    case BlockType.STONE:
      return { textureTop: 7, textureBottom: 7, textureSide: 7 };
    case BlockType.DIRT:
      return { textureTop: 5, textureBottom: 5, textureSide: 5 };
    case BlockType.GRASS:
      return { textureTop: 3, textureBottom: 5, textureSide: 4 };
    case BlockType.COBBLESTONE:
      return { textureTop: 6, textureBottom: 6, textureSide: 6 };
    case BlockType.PLANKS:
      return { textureTop: 12, textureBottom: 12, textureSide: 12 };
    case BlockType.BRICKS:
      return { textureTop: 13, textureBottom: 13, textureSide: 13 };
    case BlockType.SAND:
      return { textureTop: 8, textureBottom: 8, textureSide: 8 };
    case BlockType.WOOD:
      return { textureTop: 9, textureBottom: 9, textureSide: 10 };
    case BlockType.LEAVES:
      return { textureTop: 11, textureBottom: 11, textureSide: 11 };
    case BlockType.CACTUS:
      return { textureTop: 14, textureBottom: 16, textureSide: 15 };
    case BlockType.COMMAND_BLOCK:
      return { textureTop: 0, textureBottom: 2, textureSide: 1 };
    default:
      return { textureTop: 5, textureBottom: 5, textureSide: 5 };
  }
}

/**
 * 面顶点数据
 * 6个面，每个面4个顶点，每个顶点3个坐标 (x, y, z)
 * 面的顺序: 上(0)、下(1)、前(2)、后(3)、左(4)、右(5)
 */
export const FACE_VERTICES: readonly number[][] = [
  // Top (y+) - CCW when looking from above
  [0, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1, 1],
  // Bottom (y-) - CCW when looking from below
  [0, 0, 1, 1, 0, 1, 1, 0, 0, 0, 0, 0],
  // Front (z+) - CCW
  [1, 0, 1, 0, 0, 1, 0, 1, 1, 1, 1, 1],
  // Back (z-) - CCW
  [0, 0, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0],
  // Left (x-) - CCW
  [0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 1],
  // Right (x+) - CCW
  [1, 0, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0],
] as const;

/**
 * 面方向偏移量
 * 用于计算相邻方块位置，顺序与 BLOCK_FACES 一致
 */
export const FACE_DIRECTION_OFFSETS: readonly [number, number, number][] = [
  [0, 1, 0], // TOP
  [0, -1, 0], // BOTTOM
  [0, 0, 1], // FRONT
  [0, 0, -1], // BACK
  [-1, 0, 0], // LEFT
  [1, 0, 0], // RIGHT
] as const;

/**
 * 根据面索引获取相邻方块坐标
 * @param x 当前方块X坐标
 * @param y 当前方块Y坐标
 * @param z 当前方块Z坐标
 * @param face 面索引 (0-5)
 * @returns 相邻方块坐标
 */
export function getAdjacentBlockPosition(
  x: number,
  y: number,
  z: number,
  face: number,
): { x: number; y: number; z: number } {
  const offset = FACE_DIRECTION_OFFSETS[face];
  return {
    x: x + offset[0],
    y: y + offset[1],
    z: z + offset[2],
  };
}

/**
 * 区块颜色映射（用于UI显示）
 * 当方块图标无法加载时作为后备颜色
 */
export const BLOCK_COLORS: Readonly<Record<number, string>> = {
  0: "#000000", // AIR
  1: "#808080", // STONE
  2: "#8B4513", // DIRT
  3: "#7CFC00", // GRASS
  4: "#666666", // COBBLESTONE
  5: "#DEB887", // PLANKS
  6: "#B22222", // BRICKS
  7: "#F0E68C", // SAND
  8: "#8B5A2B", // WOOD
  9: "#228B22", // LEAVES
  10: "#2E8B57", // CACTUS
  11: "#FF00FF", // COMMAND_BLOCK
};

/**
 * 获取方块显示颜色
 * @param type 方块类型
 * @returns CSS颜色字符串
 */
export function getBlockColor(type: number): string {
  return BLOCK_COLORS[type] ?? "#888888";
}
