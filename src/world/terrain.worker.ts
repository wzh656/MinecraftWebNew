import { createNoise2D, createNoise3D } from "simplex-noise";
import { BlockType } from "./BlockType";

const CHUNK_SIZE = 16;
const CHUNK_HEIGHT = 256;
const SEA_LEVEL = 63;

// ============ 配置常量 ============
const CONFIG = {
  // 树木生成
  TREE_MIN_DISTANCE: 4, // 树之间的最小间距
  TREE_EDGE_MARGIN: 4, // 区块边缘不生成树的边距（防止跨区块树叶丢失）
  TREE_TRUNK_HEIGHT: 4,
  TREE_LEAF_HEIGHT: 3,

  // 洞穴生成
  CAVE_CHEESE_THRESHOLD: -0.65, // 芝士洞穴基础阈值
  CAVE_SPAGHETTI_RADIUS: 0.08, // 意面洞穴半径

  // 高度阈值
  OCEAN_MAX_HEIGHT: SEA_LEVEL - 5, // 海洋最大高度
  LOWLAND_MAX_HEIGHT: 85, // 低地最大高度
  HIGHLAND_MAX_HEIGHT: 130, // 高地最大高度

  // 生物群系参数
  DESERT_TEMP_THRESHOLD: 0.4,
  DESERT_HUMID_THRESHOLD: -0.1,
  SNOW_TEMP_THRESHOLD: -0.2,
} as const;

// ============ 确定性随机数生成器 (Mulberry32) ============

// 基于字符串创建确定性随机数生成器
function createSeededRandom(seed: string): () => number {
  // 使用 cyrb128 哈希算法将字符串转为 32 位数字
  let hash = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    hash = Math.imul(hash ^ seed.charCodeAt(i), 3432918353);
    hash = (hash << 13) | (hash >>> 19);
  }

  // Mulberry32 算法
  return function () {
    hash |= 0;
    hash = (hash + 0x6d2b79f5) | 0;
    let t = Math.imul(hash ^ (hash >>> 15), 1 | hash);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============ 1. 分形柏林噪声系统 ============

interface FractalNoiseConfig {
  octaves: number;
  lacunarity: number; // 频率倍数，通常为 2
  persistence: number; // 振幅倍数，通常为 0.5
  scale: number; // 基础频率缩放
}

class FractalNoise2D {
  private noise: ReturnType<typeof createNoise2D>;

  constructor(seed: string, offset: number) {
    // 创建基础随机数生成器
    const rng = createSeededRandom(seed);
    // 跳过 offset 个随机数，确保不同噪声使用不同的状态序列
    for (let i = 0; i < offset * 100; i++) rng();
    this.noise = createNoise2D(rng);
  }

  generate(x: number, y: number, config: FractalNoiseConfig): number {
    let total = 0;
    let amplitude = 1;
    let frequency = config.scale;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      total += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= config.persistence;
      frequency *= config.lacunarity;
    }

    return total / maxValue; // 归一化到 [-1, 1]
  }
}

class FractalNoise3D {
  private noise: ReturnType<typeof createNoise3D>;

  constructor(seed: string, offset: number) {
    // 创建基础随机数生成器
    const rng = createSeededRandom(seed);
    // 跳过 offset 个随机数，确保不同噪声使用不同的状态序列
    for (let i = 0; i < offset * 100; i++) rng();
    this.noise = createNoise3D(rng);
  }

  generate(
    x: number,
    y: number,
    z: number,
    config: FractalNoiseConfig,
  ): number {
    let total = 0;
    let amplitude = 1;
    let frequency = config.scale;
    let maxValue = 0;

    for (let i = 0; i < config.octaves; i++) {
      total +=
        this.noise(x * frequency, y * frequency, z * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= config.persistence;
      frequency *= config.lacunarity;
    }

    return total / maxValue; // 归一化到 [-1, 1]
  }
}

// ============ 2. 样条插值系统 ============

interface ControlPoint {
  input: number;
  output: number;
}

class SplineInterpolator {
  private points: ControlPoint[];

  constructor(points: ControlPoint[]) {
    // 按 input 排序
    this.points = [...points].sort((a, b) => a.input - b.input);
  }

  // 分段线性插值
  interpolate(t: number): number {
    // 边界处理
    if (t <= this.points[0].input) return this.points[0].output;
    if (t >= this.points[this.points.length - 1].input)
      return this.points[this.points.length - 1].output;

    // 二分查找找到 t 所在的区间
    let low = 0;
    let high = this.points.length - 1;

    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (this.points[mid].input <= t) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const pLow = this.points[low];
    const pHigh = this.points[high];

    // 归一化
    const alpha = (t - pLow.input) / (pHigh.input - pLow.input);

    // 线性插值
    return pLow.output + alpha * (pHigh.output - pLow.output);
  }

  // 平滑插值 (Smoothstep)
  interpolateSmooth(t: number): number {
    // 边界处理
    if (t <= this.points[0].input) return this.points[0].output;
    if (t >= this.points[this.points.length - 1].input)
      return this.points[this.points.length - 1].output;

    // 二分查找
    let low = 0;
    let high = this.points.length - 1;

    while (low < high - 1) {
      const mid = Math.floor((low + high) / 2);
      if (this.points[mid].input <= t) {
        low = mid;
      } else {
        high = mid;
      }
    }

    const pLow = this.points[low];
    const pHigh = this.points[high];

    // 归一化
    let alpha = (t - pLow.input) / (pHigh.input - pLow.input);

    // Smoothstep: 3t^2 - 2t^3
    alpha = alpha * alpha * (3 - 2 * alpha);

    return pLow.output + alpha * (pHigh.output - pLow.output);
  }
}

// ============ 3. 地形参数样条定义 ============

// Continentalness 到基础高度的映射 (决定海陆分布和大陆形状)
const CONTINENTALNESS_HEIGHT_TABLE: ControlPoint[] = [
  { input: -1.0, output: 30 }, // 深海
  { input: -0.7, output: 45 }, // 深海到浅海过渡
  { input: -0.4, output: 50 }, // 浅海
  { input: -0.15, output: 55 }, // 海岸/海滩
  { input: 0.0, output: 68 }, // 海岸平地
  { input: 0.15, output: 75 }, // 低地
  { input: 0.3, output: 95 }, // 开始上升
  { input: 0.4, output: 140 }, // 【陡峭悬崖】极小的变化导致高度剧增
  { input: 0.5, output: 160 }, // 高山
  { input: 0.7, output: 180 }, // 更高
  { input: 1.0, output: 200 }, // 最高山峰
];

// Erosion 到振幅的映射 (侵蚀度越高，地形越平坦)
const EROSION_AMPLITUDE_TABLE: ControlPoint[] = [
  { input: -1.0, output: 25 }, // 低侵蚀 = 高振幅 = 崎岖地形
  { input: -0.5, output: 18 },
  { input: 0.0, output: 10 },
  { input: 0.5, output: 4 },
  { input: 1.0, output: 1.5 }, // 高侵蚀 = 低振幅 = 平坦地形
];

// PeaksValleys 映射 (将 PV 噪声映射到 -1 到 1 的细节系数)
const PV_SHAPE_TABLE: ControlPoint[] = [
  { input: -1.0, output: -1.0 }, // 深谷
  { input: -0.3, output: -0.3 },
  { input: 0.0, output: 0.0 },
  { input: 0.3, output: 0.3 },
  { input: 1.0, output: 1.0 }, // 高峰
];

// Continentalness 到 Squash 因子的映射
const CONTINENTALNESS_SQUASH_TABLE: ControlPoint[] = [
  { input: -1.0, output: 30 }, // 海洋平缓
  { input: -0.2, output: 25 },
  { input: 0.2, output: 15 },
  { input: 0.35, output: 3 }, // 悬崖处陡峭
  { input: 1.0, output: 8 }, // 山峰陡峭
];

// Erosion 到 Squash 因子的映射 (高侵蚀需要大 Squash 来压平地形)
const EROSION_SQUASH_TABLE: ControlPoint[] = [
  { input: -1.0, output: 80 }, // 高侵蚀 = 大 Squash = 极平坦
  { input: -0.5, output: 40 },
  { input: 0.0, output: 15 },
  { input: 1.0, output: 5 }, // 低侵蚀 = 小 Squash = 陡峭
];

// 洞穴高度衰减表 (y -> threshold offset)
// 越高的地方，洞穴阈值越高（越难形成洞穴）
const CAVE_HEIGHT_ATTENUATION_TABLE: ControlPoint[] = [
  { input: 0, output: -0.2 }, // y=0，阈值降低（更容易形成洞穴）
  { input: 40, output: 0 }, // y=40，标准阈值
  { input: 80, output: 0.3 }, // y=80，阈值提高
  { input: 120, output: 0.8 }, // y=120，很难形成洞穴
  { input: 200, output: 2.0 }, // y=200，几乎不可能有洞穴
];

// ============ 4. 生物群系定义 (基于 5D 特征向量) ============

enum BiomeType {
  OCEAN = 0,
  DEEP_OCEAN = 1,
  PLAINS = 2,
  FOREST = 3,
  DESERT = 4,
  MOUNTAINS = 5,
  SNOWY_MOUNTAINS = 6,
  HILLS = 7,
}

// 生物群系的中心特征点 (5D 向量: [C, E, PV, T, H])
interface BiomeDefinition {
  type: BiomeType;
  name: string;
  center: [number, number, number, number, number]; // [C, E, PV, T, H]
  surfaceBlock: number;
  subSurfaceBlock: number;
  stoneDepth: number;
  treeDensity: number;
  snowHeight: number; // -1 表示无雪
}

const BIOME_DEFINITIONS: BiomeDefinition[] = [
  {
    type: BiomeType.DEEP_OCEAN,
    name: "deep_ocean",
    center: [-0.8, 0.5, 0.0, 0.5, 0.5],
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    stoneDepth: 3,
    treeDensity: 0,
    snowHeight: -1,
  },
  {
    type: BiomeType.OCEAN,
    name: "ocean",
    center: [-0.5, 0.3, 0.0, 0.5, 0.6],
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    stoneDepth: 3,
    treeDensity: 0,
    snowHeight: -1,
  },
  {
    type: BiomeType.PLAINS,
    name: "plains",
    center: [0.0, 0.6, 0.0, 0.7, 0.5],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 3,
    treeDensity: 0.02,
    snowHeight: -1,
  },
  {
    type: BiomeType.FOREST,
    name: "forest",
    center: [0.1, 0.4, 0.2, 0.6, 0.7],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 3,
    treeDensity: 0.25,
    snowHeight: -1,
  },
  {
    type: BiomeType.DESERT,
    name: "desert",
    center: [0.0, 0.3, 0.0, 0.9, 0.1],
    surfaceBlock: BlockType.SAND,
    subSurfaceBlock: BlockType.SAND,
    stoneDepth: 5,
    treeDensity: 0,
    snowHeight: -1,
  },
  {
    type: BiomeType.HILLS,
    name: "hills",
    center: [0.2, 0.2, 0.3, 0.6, 0.5],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 3,
    treeDensity: 0.08,
    snowHeight: -1,
  },
  {
    type: BiomeType.MOUNTAINS,
    name: "mountains",
    center: [0.5, -0.3, 0.6, 0.4, 0.4],
    surfaceBlock: BlockType.GRASS,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 2,
    treeDensity: 0.02,
    snowHeight: 140,
  },
  {
    type: BiomeType.SNOWY_MOUNTAINS,
    name: "snowy_mountains",
    center: [0.5, -0.2, 0.7, 0.1, 0.3],
    surfaceBlock: BlockType.SNOW,
    subSurfaceBlock: BlockType.DIRT,
    stoneDepth: 2,
    treeDensity: 0,
    snowHeight: 100,
  },
];

// ============ 5. 地形生成器主类 ============

interface InitGeneratorMessage {
  type: "INIT_GENERATOR";
  seed: string;
}

interface GenerateChunkMessage {
  type: "GENERATE_CHUNK";
  cx: number;
  cz: number;
  priority: number;
}

interface ChunkReadyMessage {
  type: "CHUNK_READY";
  cx: number;
  cz: number;
  data: Uint8Array;
}

interface ErrorMessage {
  type: "ERROR";
  cx: number;
  cz: number;
  error: string;
}

type WorkerMessage = InitGeneratorMessage | GenerateChunkMessage;

// 缓存的列地形参数（避免重复计算）
interface ColumnTerrainData {
  c: number;
  e: number;
  pv: number;
  temp: number;
  humid: number;
  targetHeight: number;
  squashFactor: number;
  biome: BiomeDefinition;
}

class WorkerTerrainGenerator {
  // 2D 噪声 (用于地形参数)
  private continentalnessNoise!: FractalNoise2D;
  private erosionNoise!: FractalNoise2D;
  private pvNoise!: FractalNoise2D; // Peaks & Valleys
  private temperatureNoise!: FractalNoise2D;
  private humidityNoise!: FractalNoise2D;

  // 3D 噪声 (用于地形细节和洞穴)
  private detailNoise3D!: FractalNoise3D;
  private cheeseCaveNoise!: FractalNoise3D;
  private spaghettiCaveNoise!: FractalNoise3D;

  // 树木噪声
  private treeNoise!: FractalNoise2D;

  // 样条插值器
  private continentalnessHeightSpline: SplineInterpolator;
  private erosionAmplitudeSpline: SplineInterpolator;
  private pvShapeSpline: SplineInterpolator;
  private continentalnessSquashSpline: SplineInterpolator;
  private erosionSquashSpline: SplineInterpolator;
  private caveHeightAttenuationSpline: SplineInterpolator;

  private initialized = false;

  constructor() {
    // 初始化样条插值器 (这些不需要种子)
    this.continentalnessHeightSpline = new SplineInterpolator(
      CONTINENTALNESS_HEIGHT_TABLE,
    );
    this.erosionAmplitudeSpline = new SplineInterpolator(
      EROSION_AMPLITUDE_TABLE,
    );
    this.pvShapeSpline = new SplineInterpolator(PV_SHAPE_TABLE);
    this.continentalnessSquashSpline = new SplineInterpolator(
      CONTINENTALNESS_SQUASH_TABLE,
    );
    this.erosionSquashSpline = new SplineInterpolator(EROSION_SQUASH_TABLE);
    this.caveHeightAttenuationSpline = new SplineInterpolator(
      CAVE_HEIGHT_ATTENUATION_TABLE,
    );
  }

  // 初始化噪声生成器 (使用种子字符串派生各个噪声的种子)
  initialize(seed: string): void {
    // 初始化噪声生成器 (使用不同的 offset 确保不同的噪声状态)
    this.continentalnessNoise = new FractalNoise2D(seed, 0);
    this.erosionNoise = new FractalNoise2D(seed, 1);
    this.pvNoise = new FractalNoise2D(seed, 2);
    this.temperatureNoise = new FractalNoise2D(seed, 3);
    this.humidityNoise = new FractalNoise2D(seed, 4);

    this.detailNoise3D = new FractalNoise3D(seed, 5);
    this.cheeseCaveNoise = new FractalNoise3D(seed, 6);
    this.spaghettiCaveNoise = new FractalNoise3D(seed, 7);

    this.treeNoise = new FractalNoise2D(seed, 8);

    this.initialized = true;
  }

  // 噪声配置
  private readonly CONTINENTALNESS_CONFIG: FractalNoiseConfig = {
    octaves: 4,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.0008,
  };

  private readonly EROSION_CONFIG: FractalNoiseConfig = {
    octaves: 4,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.0012,
  };

  private readonly PV_CONFIG: FractalNoiseConfig = {
    octaves: 3,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.002,
  };

  private readonly TEMPERATURE_CONFIG: FractalNoiseConfig = {
    octaves: 3,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.001,
  };

  private readonly HUMIDITY_CONFIG: FractalNoiseConfig = {
    octaves: 3,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.001,
  };

  private readonly DETAIL_3D_CONFIG: FractalNoiseConfig = {
    octaves: 3,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.03,
  };

  private readonly CHEESE_CAVE_CONFIG: FractalNoiseConfig = {
    octaves: 2,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.015,
  };

  private readonly SPAGHETTI_CAVE_CONFIG: FractalNoiseConfig = {
    octaves: 2,
    lacunarity: 2,
    persistence: 0.5,
    scale: 0.02,
  };

  // ============ 6. 地形参数计算 ============

  // 计算整列的地形参数（只计算一次）
  private getColumnTerrainData(
    worldX: number,
    worldZ: number,
  ): ColumnTerrainData {
    // 获取 2D 噪声值
    const c = this.continentalnessNoise.generate(
      worldX,
      worldZ,
      this.CONTINENTALNESS_CONFIG,
    );
    const e = this.erosionNoise.generate(worldX, worldZ, this.EROSION_CONFIG);
    const pv = this.pvNoise.generate(worldX, worldZ, this.PV_CONFIG);

    // 计算高度和 squash 因子
    const targetHeight = this.calculateTargetHeight(c, e, pv);
    const squashFactor = this.calculateSquashFactor(c, e);

    // 温度和湿度 (用于生物群系)
    const temp = this.temperatureNoise.generate(
      worldX,
      worldZ,
      this.TEMPERATURE_CONFIG,
    );
    const humid = this.humidityNoise.generate(
      worldX,
      worldZ,
      this.HUMIDITY_CONFIG,
    );

    // 选择生物群系
    const biome = this.selectBiome(c, e, pv, temp, humid, targetHeight);

    return {
      c,
      e,
      pv,
      temp,
      humid,
      targetHeight,
      squashFactor,
      biome,
    };
  }

  // Spline_Height: 计算目标高度
  private calculateTargetHeight(c: number, e: number, pv: number): number {
    // 1. 基础高度 (由大陆性决定)
    const baseHeight = this.continentalnessHeightSpline.interpolateSmooth(c);

    // 2. 崎岖度修正 (由侵蚀度决定)
    const amplitude = this.erosionAmplitudeSpline.interpolateSmooth(e);

    // 3. 细节波动 (由 PV 决定)
    const detailFactor = this.pvShapeSpline.interpolateSmooth(pv);

    // 4. 最终合成
    return baseHeight + detailFactor * amplitude;
  }

  // Spline_Squash: 计算地形压缩因子
  private calculateSquashFactor(c: number, e: number): number {
    // 基础 squash (由大陆性控制)
    const baseSquash = this.continentalnessSquashSpline.interpolateSmooth(c);

    // 侵蚀度修正
    const erosionFactor = this.erosionSquashSpline.interpolateSmooth(e);

    // 取最大值，侵蚀度的权重很高
    return Math.max(baseSquash, erosionFactor);
  }

  // 基于实际地表高度的生物群系选择
  private selectBiome(
    c: number,
    e: number,
    pv: number,
    temp: number,
    humid: number,
    targetHeight: number,
  ): BiomeDefinition {
    // 海拔修正温度 (越高越冷，每升高30格降低0.2温度)
    const altitudeTempFactor = Math.max(0, (targetHeight - 80) / 150);
    const adjustedTemp = temp - altitudeTempFactor * 0.5;

    // 根据实际地形高度选择生物群系
    // 深海/海洋: 目标高度低于海平面
    if (targetHeight < SEA_LEVEL - 5) {
      if (c < -0.6) {
        return this.getBiomeByType(BiomeType.DEEP_OCEAN);
      }
      return this.getBiomeByType(BiomeType.OCEAN);
    }

    // 海滩/海岸: 接近海平面
    if (targetHeight < SEA_LEVEL + 3) {
      // 炎热干燥地区生成沙漠海滩，否则是沙子
      if (adjustedTemp > CONFIG.DESERT_TEMP_THRESHOLD &&
          humid < CONFIG.DESERT_HUMID_THRESHOLD) {
        return this.getBiomeByType(BiomeType.DESERT);
      }
      // 否则使用海洋的沙子
      return this.getBiomeByType(BiomeType.OCEAN);
    }

    // 低地: 高于海平面但不太高
    if (targetHeight < CONFIG.LOWLAND_MAX_HEIGHT) {
      // 炎热干燥地区生成沙漠
      if (adjustedTemp > CONFIG.DESERT_TEMP_THRESHOLD &&
          humid < CONFIG.DESERT_HUMID_THRESHOLD) {
        return this.getBiomeByType(BiomeType.DESERT);
      }

      let biomePool: BiomeDefinition[] = [
        this.getBiomeByType(BiomeType.PLAINS),
        this.getBiomeByType(BiomeType.FOREST),
        this.getBiomeByType(BiomeType.HILLS),
      ];

      return this.selectFromPool(biomePool, c, e, pv, adjustedTemp, humid);
    }

    // 高地
    if (targetHeight < CONFIG.HIGHLAND_MAX_HEIGHT) {
      let biomePool: BiomeDefinition[] = [
        this.getBiomeByType(BiomeType.HILLS),
        this.getBiomeByType(BiomeType.FOREST),
      ];

      if (e > 0.3) {
        biomePool.push(this.getBiomeByType(BiomeType.PLAINS));
      }

      return this.selectFromPool(biomePool, c, e, pv, adjustedTemp, humid);
    }

    // 高山区域
    if (adjustedTemp < CONFIG.SNOW_TEMP_THRESHOLD) {
      return this.getBiomeByType(BiomeType.SNOWY_MOUNTAINS);
    }

    const biomePool = [
      this.getBiomeByType(BiomeType.MOUNTAINS),
      this.getBiomeByType(BiomeType.HILLS),
    ];

    return this.selectFromPool(biomePool, c, e, pv, adjustedTemp, humid);
  }

  private selectFromPool(
    pool: BiomeDefinition[],
    c: number,
    e: number,
    pv: number,
    temp: number,
    humid: number,
  ): BiomeDefinition {
    const v: [number, number, number, number, number] = [c, e, pv, temp, humid];

    let nearestBiome = pool[0];
    let minDistance = Infinity;

    for (const biome of pool) {
      const distance = this.calculateBiomeDistance(v, biome.center);
      if (distance < minDistance) {
        minDistance = distance;
        nearestBiome = biome;
      }
    }

    return nearestBiome;
  }

  private getBiomeByType(type: BiomeType): BiomeDefinition {
    const biome = BIOME_DEFINITIONS.find((b) => b.type === type);
    if (!biome) throw new Error(`Unknown biome type: ${type}`);
    return biome;
  }

  // 计算生物群系距离 (加权欧几里得距离)
  private calculateBiomeDistance(
    v: [number, number, number, number, number],
    center: [number, number, number, number, number],
  ): number {
    // 权重: C 和 E 对地形影响最大
    const weights = [1.5, 1.2, 1.0, 0.8, 0.8];

    let sum = 0;
    for (let i = 0; i < 5; i++) {
      const diff = v[i] - center[i];
      sum += weights[i] * diff * diff;
    }

    return Math.sqrt(sum);
  }

  // ============ 7. 洞穴生成 ============

  // 芝士洞穴 (Cheese Caves) - 气泡型
  private isCheeseCave(worldX: number, worldY: number, worldZ: number): boolean {
    const cheeseNoise = this.cheeseCaveNoise.generate(
      worldX,
      worldY,
      worldZ,
      this.CHEESE_CAVE_CONFIG,
    );

    // 高度衰减：越高的地方，阈值越高（越难形成洞穴）
    const heightAttenuation = this.caveHeightAttenuationSpline.interpolate(
      worldY,
    );
    const threshold = CONFIG.CAVE_CHEESE_THRESHOLD + heightAttenuation;

    return cheeseNoise < threshold;
  }

  // 意面洞穴 (Spaghetti Caves) - 隧道型
  private isSpaghettiCave(
    worldX: number,
    worldY: number,
    worldZ: number,
  ): boolean {
    const spaghettiNoise = this.spaghettiCaveNoise.generate(
      worldX,
      worldY,
      worldZ,
      this.SPAGHETTI_CAVE_CONFIG,
    );

    // 高度衰减：越高的地方，半径越小（越难形成洞穴）
    const heightAttenuation = this.caveHeightAttenuationSpline.interpolate(
      worldY,
    );
    const radius = Math.max(0.01, CONFIG.CAVE_SPAGHETTI_RADIUS - heightAttenuation * 0.1);

    return Math.abs(spaghettiNoise) < radius;
  }

  // ============ 8. 方块类型判定 ============

  generateChunk(cx: number, cz: number): Uint8Array {
    if (!this.initialized) {
      throw new Error("Generator not initialized with seed");
    }
    const data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE);
    data.fill(BlockType.AIR);

    // 预计算每列的地形参数
    const columnData: ColumnTerrainData[][] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      columnData[x] = [];
      const worldX = cx * CHUNK_SIZE + x;
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldZ = cz * CHUNK_SIZE + z;
        columnData[x][z] = this.getColumnTerrainData(worldX, worldZ);
      }
    }

    // 记录每列的地表高度（用于水面判断）
    const surfaceHeights: number[][] = [];
    for (let x = 0; x < CHUNK_SIZE; x++) {
      surfaceHeights[x] = [];
    }

    // 第一遍：生成基础地形
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const colData = columnData[x][z];

        // 从上往下找到第一个固体方块作为地表
        let surfaceY = -1;

        for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
          // 基岩层
          if (y === 0) {
            data[this.getIndex(x, y, z)] = BlockType.BEDROCK;
            if (surfaceY === -1) surfaceY = 0;
            continue;
          }

          // 计算密度
          const baseDensity =
            (colData.targetHeight - y) / colData.squashFactor;
          const detailNoise = this.detailNoise3D.generate(
            worldX,
            y,
            worldZ,
            this.DETAIL_3D_CONFIG,
          );
          const density = baseDensity + detailNoise * 0.5;

          // 密度 > 0 表示石头
          let blockType: number | null = null;

          if (density > 0) {
            blockType = BlockType.STONE;
          }

          // 洞穴挖掘
          if (
            blockType !== null &&
            (this.isCheeseCave(worldX, y, worldZ) ||
              this.isSpaghettiCave(worldX, y, worldZ))
          ) {
            blockType = null;
          }

          // 设置方块
          if (blockType !== null) {
            data[this.getIndex(x, y, z)] = blockType;
            if (surfaceY === -1) surfaceY = y;
          }
        }

        surfaceHeights[x][z] = surfaceY;
      }
    }

    // 第二遍：填充水面
    // 只在表面低于海平面的列中，在表面以下填充水
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const surfaceY = surfaceHeights[x][z];

        // 只有地表低于海平面的地方才填水
        if (surfaceY >= 0 && surfaceY < SEA_LEVEL) {
          for (let y = surfaceY + 1; y < SEA_LEVEL; y++) {
            const index = this.getIndex(x, y, z);
            if (data[index] === BlockType.AIR) {
              data[index] = BlockType.WATER;
            }
          }
        }
      }
    }

    // 第三遍：地表装饰
    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const surfaceY = surfaceHeights[x][z];
        const colData = columnData[x][z];

        // 应用生物群系表层
        if (surfaceY >= 0) {
          this.applySurfaceDecoration(data, x, surfaceY, z, colData);
        }
      }
    }

    // 第四遍：生成树木
    this.generateTrees(data, cx, cz, columnData);

    return data;
  }

  // 应用地表装饰 (泥土层、草方块、沙子等)
  private applySurfaceDecoration(
    data: Uint8Array,
    x: number,
    surfaceY: number,
    z: number,
    colData: ColumnTerrainData,
  ): void {
    const biome = colData.biome;

    // 从地表向下填充 dirt/sand 层
    const stoneDepth = biome.stoneDepth;

    for (let dy = 0; dy <= stoneDepth && surfaceY - dy >= 0; dy++) {
      const y = surfaceY - dy;
      const index = this.getIndex(x, y, z);

      if (data[index] === BlockType.STONE) {
        if (dy === 0) {
          // 最表层
          if (biome.snowHeight > 0 && surfaceY > biome.snowHeight) {
            data[index] = BlockType.SNOW;
          } else {
            data[index] = biome.surfaceBlock;
          }
        } else {
          // 下层
          data[index] = biome.subSurfaceBlock;
        }
      }
    }
  }

  // ============ 9. 树木生成 ============

  // 记录已放置树的位置，防止重叠
  private treePositions: Set<string> = new Set();

  private generateTrees(
    data: Uint8Array,
    cx: number,
    cz: number,
    columnData: ColumnTerrainData[][],
  ): void {
    // 每区块生成前清空记录
    this.treePositions.clear();

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const worldX = cx * CHUNK_SIZE + x;
        const worldZ = cz * CHUNK_SIZE + z;
        const colData = columnData[x][z];

        // 边界保护：边缘 CONFIG.TREE_EDGE_MARGIN 格内不生成树（防止跨区块树叶丢失）
        if (
          x < CONFIG.TREE_EDGE_MARGIN ||
          x >= CHUNK_SIZE - CONFIG.TREE_EDGE_MARGIN ||
          z < CONFIG.TREE_EDGE_MARGIN ||
          z >= CHUNK_SIZE - CONFIG.TREE_EDGE_MARGIN
        ) {
          continue;
        }

        // 快速跳过不生成树的生物群系
        if (colData.biome.treeDensity <= 0) {
          continue;
        }

        // 检查是否已有树在此位置附近
        if (this.isTooCloseToOtherTree(worldX, worldZ)) {
          continue;
        }

        if (this.shouldPlaceTree(worldX, worldZ, colData.biome.treeDensity)) {
          // 找到可以放置树的位置
          let groundY = -1;
          let groundBlock: number = BlockType.AIR;
          for (let y = CHUNK_HEIGHT - 1; y >= 0; y--) {
            const block = data[this.getIndex(x, y, z)];
            if (block !== BlockType.AIR && block !== BlockType.WATER) {
              groundY = y;
              groundBlock = block;
              break;
            }
          }

          // 检查：不能种在水里或水下
          if (groundY < SEA_LEVEL) {
            continue;
          }

          // 只能种植在特定方块上（草方块、泥土）
          const canPlantOn =
            groundBlock === BlockType.GRASS ||
            groundBlock === BlockType.DIRT ||
            groundBlock === BlockType.SAND;

          if (
            groundY > 0 &&
            groundY < CHUNK_HEIGHT - 8 &&
            canPlantOn &&
            this.isValidTreeLocation(data, x, groundY + 1, z)
          ) {
            this.placeTree(data, x, groundY + 1, z, colData.biome);
            this.treePositions.add(`${worldX},${worldZ}`);
          }
        }
      }
    }
  }

  // 检查是否与其他树太近
  private isTooCloseToOtherTree(worldX: number, worldZ: number): boolean {
    for (const pos of this.treePositions) {
      const [tx, tz] = pos.split(",").map(Number);
      const dist = Math.sqrt(
        Math.pow(tx - worldX, 2) + Math.pow(tz - worldZ, 2),
      );
      if (dist < CONFIG.TREE_MIN_DISTANCE) {
        return true;
      }
    }
    return false;
  }

  // 检查树的位置是否有效（周围空间是否足够）
  private isValidTreeLocation(
    data: Uint8Array,
    x: number,
    y: number,
    z: number,
  ): boolean {
    // 检查树干和树叶空间
    const maxHeight = CONFIG.TREE_TRUNK_HEIGHT + CONFIG.TREE_LEAF_HEIGHT;

    for (let i = 0; i < maxHeight; i++) {
      if (y + i >= CHUNK_HEIGHT) return false;
      if (!this.isInChunk(x, z)) return false;

      const index = this.getIndex(x, y + i, z);
      const block = data[index];

      // 树干位置必须为空或空气/水
      if (i < CONFIG.TREE_TRUNK_HEIGHT) {
        if (block !== BlockType.AIR && block !== BlockType.WATER) {
          return false;
        }
      }
    }
    return true;
  }

  private shouldPlaceTree(
    worldX: number,
    worldZ: number,
    treeDensity: number,
  ): boolean {
    // 使用噪声判断
    const treeNoise = this.treeNoise.generate(worldX, worldZ, {
      octaves: 1,
      lacunarity: 2,
      persistence: 0.5,
      scale: 0.1,
    });

    // 将噪声从 [-1, 1] 映射到 [0, 1]
    const normalizedNoise = (treeNoise + 1) * 0.5;

    // 树密度直接决定生成概率
    // treeDensity 范围 0-1，forest=0.25 表示 25% 概率生成树
    return normalizedNoise < treeDensity;
  }

  private placeTree(
    data: Uint8Array,
    x: number,
    y: number,
    z: number,
    biome: BiomeDefinition,
  ): void {
    const trunkHeight =
      biome.type === BiomeType.MOUNTAINS
        ? CONFIG.TREE_TRUNK_HEIGHT - 1
        : CONFIG.TREE_TRUNK_HEIGHT;

    // 树干 - 只替换空气/水，不替换其他方块
    for (let i = 0; i < trunkHeight && y + i < CHUNK_HEIGHT; i++) {
      if (this.isInChunk(x, z)) {
        const index = this.getIndex(x, y + i, z);
        const currentBlock = data[index];
        // 只能替换空气或水
        if (currentBlock === BlockType.AIR || currentBlock === BlockType.WATER) {
          data[index] = BlockType.WOOD;
        }
      }
    }

    // 树叶 - 不覆盖已有的非空气方块
    const leafStart = y + trunkHeight - 1;
    const leafRadius = biome.type === BiomeType.MOUNTAINS ? 1 : 2;

    for (
      let ly = leafStart;
      ly <= leafStart + 2 && ly < CHUNK_HEIGHT;
      ly++
    ) {
      for (let lx = x - leafRadius; lx <= x + leafRadius; lx++) {
        for (let lz = z - leafRadius; lz <= z + leafRadius; lz++) {
          // 跳过角落
          if (
            Math.abs(lx - x) === leafRadius &&
            Math.abs(lz - z) === leafRadius
          )
            continue;

          // 修复：只有树干最顶部一格不填充树叶（而不是顶部2格）
          if (lx === x && lz === z && ly === leafStart) continue;

          if (this.isInChunk(lx, lz)) {
            const index = this.getIndex(lx, ly, lz);
            const currentBlock = data[index];
            // 树叶只替换空气
            if (currentBlock === BlockType.AIR) {
              data[index] = BlockType.LEAVES;
            }
          }
        }
      }
    }
  }

  // ============ 工具方法 ============

  private getIndex(x: number, y: number, z: number): number {
    return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
  }

  private isInChunk(x: number, z: number): boolean {
    return x >= 0 && x < CHUNK_SIZE && z >= 0 && z < CHUNK_SIZE;
  }
}

// ============ Worker 消息处理 ============

const generator = new WorkerTerrainGenerator();

self.onmessage = function (e: MessageEvent<WorkerMessage>) {
  const message = e.data;

  if (message.type === "INIT_GENERATOR") {
    try {
      generator.initialize(message.seed);
      self.postMessage({ type: "INIT_READY" });
    } catch (err) {
      const errorMessage: ErrorMessage = {
        type: "ERROR",
        cx: 0,
        cz: 0,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMessage);
    }
  } else if (message.type === "GENERATE_CHUNK") {
    try {
      const { cx, cz } = message;
      const data = generator.generateChunk(cx, cz);

      const response: ChunkReadyMessage = {
        type: "CHUNK_READY",
        cx,
        cz,
        data,
      };

      self.postMessage(response, { transfer: [data.buffer] });
    } catch (err) {
      const errorMessage: ErrorMessage = {
        type: "ERROR",
        cx: message.cx,
        cz: message.cz,
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMessage);
    }
  }
};

export {};
