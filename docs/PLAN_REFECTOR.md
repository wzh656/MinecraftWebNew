# Minecraft Web Edition 重构计划

## 项目现状分析

### 严重问题
1. **文件过大**：
   - `src/ui/UIManager.ts` (1,114行) - 单一文件包含6种菜单+HUD
   - `src/world/terrain.worker.ts` (1,179行) - 完整地形生成算法堆砌
   - `src/core/Game.ts` (680行) - 上帝类，承担8+项职责

2. **死代码**：
   - `src/player/PlayerController.ts` - 完全未被使用

3. **重复定义**：
   - `getChunkKey()` 在 ChunkManager.ts 和 MeshBuilder.ts 重复
   - CHUNK_SIZE/CHUNK_HEIGHT 在 terrain.worker.ts 重复定义

4. **职责混杂**：
   - ChunkShaderMaterial.ts 包含材质+淡入管理两个职责
   - Game类处理初始化/循环/输入/交互/UI/存档

### 目标
- 保持代码逻辑完全不变
- 重新规划文件结构，按职责分层
- 拆分大文件，删除死代码
- 提取共享代码，改善命名

---

## 重构后文件结构

```
src/
├── core/                      # 游戏核心引擎
│   ├── Game.ts               # 精简主控制器 (目标250行)
│   ├── GameLoop.ts           # 游戏循环管理
│   ├── Renderer.ts           # Three.js渲染器封装
│   ├── Camera.ts             # 相机控制
│   └── World.ts              # 世界状态协调
│
├── world/                     # 地形系统
│   ├── chunk/                # 区块管理
│   │   ├── Chunk.ts
│   │   ├── ChunkManager.ts
│   │   └── ChunkMesh.ts      # 网格数据类型
│   │
│   ├── generation/           # 地形生成
│   │   ├── TerrainGenerator.ts
│   │   ├── WorkerTerrainManager.ts
│   │   ├── terrain.worker.ts (精简至200行)
│   │   ├── noise/
│   │   │   ├── FractalNoise2D.ts
│   │   │   ├── FractalNoise3D.ts
│   │   │   └── SeededRandom.ts
│   │   ├── spline/
│   │   │   ├── SplineInterpolator.ts
│   │   │   └── TerrainSplines.ts
│   │   ├── biome/
│   │   │   ├── BiomeType.ts
│   │   │   ├── BiomeDefinition.ts
│   │   │   └── BiomeSelector.ts
│   │   ├── cave/
│   │   │   ├── CheeseCaveGenerator.ts
│   │   │   └── SpaghettiCaveGenerator.ts
│   │   └── tree/
│   │       └── TreeGenerator.ts
│   │
│   ├── mesh/                  # 网格构建
│   │   ├── MeshBuilder.ts
│   │   └── FaceCulling.ts
│   │
│   ├── Block.ts
│   └── BlockType.ts
│
├── player/                    # 玩家系统
│   ├── Player.ts             # 玩家实体
│   ├── Physics.ts            # 射线检测
│   └── collision/
│       └── CollisionDetector.ts
│
├── input/                     # 输入系统
│   ├── InputHandler.ts
│   ├── KeyBindings.ts
│   └── DoubleTapDetector.ts
│
├── interaction/               # 交互系统 (新增)
│   └── BlockInteractionManager.ts
│
├── ui/                        # 用户界面
│   ├── UIManager.ts          # UI协调器 (目标200行)
│   ├── components/           # UI组件
│   │   ├── UILayer.ts
│   │   ├── MenuBase.ts       # 菜单抽象基类
│   │   ├── MainMenu.ts
│   │   ├── WorldListMenu.ts
│   │   ├── CreateWorldDialog.ts
│   │   ├── OptionsMenu.ts
│   │   ├── PauseMenu.ts
│   │   └── hud/
│   │       ├── Crosshair.ts
│   │       ├── Hotbar.ts
│   │       └── DebugInfo.ts
│   └── types.ts              # UI类型定义
│
├── save/                      # 存档系统
│   ├── SaveManager.ts
│   ├── Database.ts           # IndexedDB封装
│   └── WorldMetadata.ts
│
├── rendering/                 # 渲染相关 (新增)
│   ├── material/
│   │   ├── ChunkShaderMaterial.ts (精简至150行)
│   │   └── ChunkFadeManager.ts
│   ├── texture/
│   │   ├── TextureLoader.ts
│   │   └── BlockIconRenderer.ts
│   └── geometry/
│       └── BlockGeometry.ts
│
├── utils/                     # 工具函数
│   ├── Constants.ts
│   ├── Settings.ts
│   ├── BlockUtils.ts
│   ├── ChunkUtils.ts         # 新增: getChunkKey等
│   ├── WorldConstants.ts     # 新增: CHUNK_SIZE等
│   └── MathUtils.ts
│
└── main.ts
```

---

## 重构阶段

### 阶段1: 基础准备（低风险）

**步骤1.1: 创建共享工具模块**
- 新建 `src/utils/ChunkUtils.ts`
  ```typescript
  export function getChunkKey(cx: number, cz: number): string {
    return `${cx},${cz}`;
  }
  ```
- 新建 `src/utils/WorldConstants.ts`
  ```typescript
  export const CHUNK_SIZE = 16;
  export const CHUNK_HEIGHT = 256;
  export const SEA_LEVEL = 63;
  ```
- 更新 ChunkManager.ts 和 MeshBuilder.ts 使用共享函数

**步骤1.2: 删除死代码**
- 删除 `src/player/PlayerController.ts`
- 确认无文件导入后安全删除

**步骤1.3: 修复 Worker 常量定义**
- 修改 terrain.worker.ts，从共享模块导入常量

**关键文件**: `src/utils/ChunkUtils.ts`, `src/utils/WorldConstants.ts`

---

### 阶段2: UI模块拆分（中风险）

**步骤2.1: 创建目录结构**
```
src/ui/components/
src/ui/components/hud/
```

**步骤2.2: 提取基础组件**
- `UILayer.ts` - DOM容器管理
- `MenuBase.ts` - 抽象基类
  ```typescript
  export abstract class MenuBase implements IMenu {
    protected container: HTMLElement;
    protected visible = false;

    abstract show(): void;
    abstract hide(): void;
    abstract isVisible(): boolean;
  }
  ```

**步骤2.3: 提取各菜单类**
- `MainMenu.ts` - 主菜单（从UIManager第84-119行提取）
- `WorldListMenu.ts` - 世界列表（从第122-218行提取）
- `CreateWorldDialog.ts` - 创建世界（从第221-303行提取）
- `OptionsMenu.ts` - 选项菜单（从第440-559行提取）
- `PauseMenu.ts` - 暂停菜单

**步骤2.4: 提取HUD组件**
- `Crosshair.ts` - 准星（第885-907行）
- `Hotbar.ts` - 快捷栏（第908-992行）
- `DebugInfo.ts` - 调试信息（第993-1053行）

**步骤2.5: 重构UIManager.ts**
- 从1114行精简至约200行
- 改为协调器模式，使用工厂创建菜单
- 保留 `showMenu()`, `hideMenu()`, `updateDebugInfo()` 等公共接口

**关键文件**: `src/ui/UIManager.ts`, `src/ui/components/*.ts`

---

### 阶段3: 地形生成器拆分（高风险）

**步骤3.1: 创建目录结构**
```
src/world/generation/
src/world/generation/noise/
src/world/generation/spline/
src/world/generation/biome/
src/world/generation/cave/
src/world/generation/tree/
```

**步骤3.2: 提取噪声系统**（从terrain.worker.ts提取）
- `SeededRandom.ts` - Mulberry32算法
- `FractalNoise2D.ts` - 2D分形噪声
- `FractalNoise3D.ts` - 3D分形噪声

**步骤3.3: 提取样条系统**
- `SplineInterpolator.ts` - 插值算法
- `TerrainSplines.ts` - 地形参数表常量

**步骤3.4: 提取生物群系系统**
- `BiomeType.ts` - 枚举定义
- `BiomeDefinition.ts` - 生物群系数据结构
- `BiomeSelector.ts` - 选择逻辑

**步骤3.5: 提取洞穴生成**
- `CheeseCaveGenerator.ts` - 芝士洞穴
- `SpaghettiCaveGenerator.ts` - 意面洞穴

**步骤3.6: 提取树木生成**
- `TreeGenerator.ts` - 树木生成逻辑

**步骤3.7: 重构terrain.worker.ts**
- 从1179行精简至约200行
- 仅保留Worker消息路由
- 委托到各子模块

**关键文件**: `src/world/terrain.worker.ts`, `src/world/generation/**/*.ts`

---

### 阶段4: 渲染系统拆分（中风险）

**步骤4.1: 创建目录结构**
```
src/rendering/
src/rendering/material/
src/rendering/texture/
src/rendering/geometry/
```

**步骤4.2: 分离材质和淡入管理**
- `ChunkShaderMaterial.ts` - 仅保留材质相关代码（约150行）
- `ChunkFadeManager.ts` - 淡入管理器（从原文件第191-298行提取）

**步骤4.3: 移动渲染相关文件**
- `TextureLoader.ts` 从 utils 移至 rendering/texture/
- `BlockIconRenderer.ts` 移至 rendering/texture/

**关键文件**: `src/rendering/material/ChunkShaderMaterial.ts`, `src/rendering/material/ChunkFadeManager.ts`

---

### 阶段5: Game类拆分（高风险）

**步骤5.1: 创建新目录**
```
src/interaction/
```

**步骤5.2: 提取游戏循环**
- `GameLoop.ts` - 管理requestAnimationFrame和deltaTime计算
  ```typescript
  export class GameLoop {
    private running = false;
    private lastTime = 0;
    private onUpdate: (deltaTime: number) => void;
    private onRender: () => void;

    start(): void;
    stop(): void;
    private tick(): void;
  }
  ```

**步骤5.3: 提取方块交互系统**
- `BlockInteractionManager.ts` - 方块破坏/放置逻辑（从Game.ts第423-490行提取）
  ```typescript
  export class BlockInteractionManager {
    constructor(
      private world: World,
      private physics: Physics,
      private player: Player
    );

    breakBlock(): void;
    placeBlock(blockType: BlockType): void;
    getTargetBlock(): RaycastHit | null;
  }
  ```

**步骤5.4: 重构Game.ts**
- 从680行精简至约250行
- 使用组合模式委托给子系统
- 保留公共接口：initialize(), start(), stop(), loadWorld(), returnToMainMenu()

**关键文件**: `src/core/Game.ts`, `src/core/GameLoop.ts`, `src/interaction/BlockInteractionManager.ts`

---

## 关键文件公共接口

### Game.ts 接口
```typescript
export class Game {
  constructor(container: HTMLElement);

  // 生命周期
  initialize(worldName?: string): Promise<void>;
  start(): void;
  stop(): void;
  dispose(): Promise<void>;

  // 世界管理
  loadWorld(worldName: string): Promise<void>;
  returnToMainMenu(): void;

  // 访问器
  getUIManager(): UIManager;
  applySettings(settings: GameSettings): void;
}
```

### UIManager.ts 接口
```typescript
export type MenuType = 'main' | 'worldList' | 'createWorld' | 'options' | 'pause' | 'game';

export interface IMenu {
  show(): void;
  hide(): void;
  isVisible(): boolean;
}

export class UIManager {
  constructor(container: HTMLElement);

  setCallbacks(callbacks: UICallbacks): void;

  // 菜单控制
  showMenu(type: MenuType): void;
  showMainMenu(): void;
  showPauseMenu(): void;
  showGameUI(): void;
  hideGameUI(): void;

  // HUD更新
  updateDebugInfo(info: DebugInfo): void;
  updateHotbarSelection(slot: number): void;
  setBlockIcons(icons: Map<number, string>): void;
}
```

### 共享工具接口
```typescript
// src/utils/ChunkUtils.ts
export function getChunkKey(cx: number, cz: number): string;
export function worldToChunk(worldX: number, worldZ: number): { cx: number, cz: number };
export function worldToLocal(worldX: number, worldY: number, worldZ: number): { x: number, y: number, z: number };

// src/utils/WorldConstants.ts
export const CHUNK_SIZE: 16;
export const CHUNK_HEIGHT: 256;
export const CHUNK_VOLUME: 4096;
export const SEA_LEVEL: 63;
```

---

## 验证步骤

1. **功能验证** - 逐功能测试：
   - 世界生成正常
   - 方块交互（破坏/放置）正常
   - UI导航正常
   - 存档加载/保存正常

2. **性能验证** - 确保重构后：
   - FPS不下降
   - 内存占用不增加
   - 加载时间不增加

3. **代码质量验证**:
   - 无重复定义
   - 无死代码
   - 单一职责原则
   - 文件行数在合理范围（<300行）

---

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| terrain.worker.ts 拆分引入bug | 地形生成错误 | 保持算法完全一致，逐模块替换验证 |
| Game.ts 拆分破坏游戏循环 | 游戏卡顿/崩溃 | 保持原接口不变，逐步迁移调用 |
| UI拆分导致事件丢失 | 按钮无响应 | 保持回调链完整，事件委托验证 |

## tsconfig.json 路径更新

```json
{
  "compilerOptions": {
    "paths": {
      "@core/*": ["src/core/*"],
      "@world/*": ["src/world/*"],
      "@world/chunk/*": ["src/world/chunk/*"],
      "@world/generation/*": ["src/world/generation/*"],
      "@world/mesh/*": ["src/world/mesh/*"],
      "@player/*": ["src/player/*"],
      "@input/*": ["src/input/*"],
      "@interaction/*": ["src/interaction/*"],
      "@ui/*": ["src/ui/*"],
      "@ui/components/*": ["src/ui/components/*"],
      "@save/*": ["src/save/*"],
      "@rendering/*": ["src/rendering/*"],
      "@utils/*": ["src/utils/*"]
    }
  }
}
```
