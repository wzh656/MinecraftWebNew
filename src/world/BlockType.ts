export enum BlockType {
  AIR = 0,
  STONE = 1,
  DIRT = 2,
  GRASS = 3,
  COBBLESTONE = 4,
  PLANKS = 5,
  BRICKS = 6,
  SAND = 7,
  WOOD = 8,
  LEAVES = 9,
  CACTUS = 10,
  COMMAND_BLOCK = 11,
  SNOW = 12,
  CRAFTING_TABLE = 13,
  BEDROCK = 14,
}

interface BlockProperties {
  name: string;
  solid: boolean;
  transparent: boolean;
  textureIndices: [number, number, number, number, number, number];
}

export const BLOCK_PROPERTIES: Record<BlockType, BlockProperties> = {
  [BlockType.AIR]: {
    name: "air",
    solid: false,
    transparent: true,
    textureIndices: [-1, -1, -1, -1, -1, -1],
  },
  [BlockType.STONE]: {
    name: "stone",
    solid: true,
    transparent: false,
    textureIndices: [7, 7, 7, 7, 7, 7],
  },
  [BlockType.DIRT]: {
    name: "dirt",
    solid: true,
    transparent: false,
    textureIndices: [5, 5, 5, 5, 5, 5],
  },
  [BlockType.GRASS]: {
    name: "grass",
    solid: true,
    transparent: false,
    textureIndices: [3, 5, 4, 4, 4, 4],
  },
  [BlockType.COBBLESTONE]: {
    name: "cobblestone",
    solid: true,
    transparent: false,
    textureIndices: [6, 6, 6, 6, 6, 6],
  },
  [BlockType.PLANKS]: {
    name: "planks",
    solid: true,
    transparent: false,
    textureIndices: [12, 12, 12, 12, 12, 12],
  },
  [BlockType.BRICKS]: {
    name: "bricks",
    solid: true,
    transparent: false,
    textureIndices: [13, 13, 13, 13, 13, 13],
  },
  [BlockType.SAND]: {
    name: "sand",
    solid: true,
    transparent: false,
    textureIndices: [8, 8, 8, 8, 8, 8],
  },
  [BlockType.WOOD]: {
    name: "wood",
    solid: true,
    transparent: false,
    textureIndices: [9, 9, 10, 10, 10, 10],
  },
  [BlockType.LEAVES]: {
    name: "leaves",
    solid: true,
    transparent: true,
    textureIndices: [11, 11, 11, 11, 11, 11],
  },
  [BlockType.CACTUS]: {
    name: "cactus",
    solid: true,
    transparent: true,
    textureIndices: [14, 16, 15, 15, 15, 15],
  },
  [BlockType.COMMAND_BLOCK]: {
    name: "command_block",
    solid: true,
    transparent: false,
    textureIndices: [0, 2, 1, 1, 1, 1],
  },
  [BlockType.SNOW]: {
    name: "snow",
    solid: true,
    transparent: true,
    textureIndices: [17, 17, 17, 17, 17, 17],
  },
  [BlockType.CRAFTING_TABLE]: {
    name: "crafting_table",
    solid: true,
    transparent: false,
    textureIndices: [18, 18, 18, 18, 18, 18],
  },
  [BlockType.BEDROCK]: {
    name: "bedrock",
    solid: true,
    transparent: false,
    textureIndices: [19, 19, 19, 19, 19, 19],
  },
};

export function isSolid(type: BlockType): boolean {
  return BLOCK_PROPERTIES[type]?.solid ?? false;
}

export function isTransparent(type: BlockType): boolean {
  return BLOCK_PROPERTIES[type]?.transparent ?? false;
}

export function getTextureIndex(type: BlockType, face: number): number {
  const props = BLOCK_PROPERTIES[type];
  if (!props) return 0;
  return props.textureIndices[face] ?? 0;
}
