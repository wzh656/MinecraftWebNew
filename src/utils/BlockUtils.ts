import { BlockType, BLOCK_PROPERTIES } from "../world/BlockType";
import { FACE_OFFSETS } from "../utils/Constants";

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
 * 从 BLOCK_PROPERTIES 派生，避免数据重复定义
 * 面的顺序: 上(0)、下(1)、前(2)、后(3)、左(4)、右(5)
 */
export function getBlockTextureProperties(
  blockType: BlockType,
): BlockTextureProps {
  const props = BLOCK_PROPERTIES[blockType];
  // if (!props) {
  //   return { textureTop: 5, textureBottom: 5, textureSide: 5 };
  // }
  const indices = props.textureIndices;
  return {
    textureTop: indices[0],
    textureBottom: indices[1],
    textureSide: indices[2], // 前/后/左/右使用相同的侧面纹理
  };
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
  const offset = FACE_OFFSETS[face];
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
