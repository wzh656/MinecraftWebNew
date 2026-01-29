# 我的世界网页版游戏 - 开发计划

## 项目概述
基于Three.js的完整可维护的Minecraft网页版游戏，采用TypeScript + Vite + pnpm构建。

## 技术栈
- **语言**: TypeScript
- **构建工具**: Vite
- **包管理器**: pnpm
- **3D引擎**: Three.js
- **代码规范**: ESLint + Prettier

## 项目结构
```
/mnt/f/Projects/Html5/mc/
├── src/
│   ├── main.ts                 # 入口文件
│   ├── core/                   # 核心引擎
│   │   ├── Game.ts             # 游戏主类
│   │   ├── Renderer.ts         # 渲染器
│   │   ├── World.ts            # 世界管理
│   │   └── Camera.ts           # 相机控制
│   ├── world/                  # 世界系统
│   │   ├── Chunk.ts            # 区块类 (16x16x16)
│   │   ├── ChunkManager.ts     # 区块管理器
│   │   ├── BlockType.ts        # 方块类型定义
│   │   ├── Block.ts            # 方块类
│   │   ├── MeshBuilder.ts      # 网格构建器
│   │   └── TerrainGenerator.ts # 地形生成器
│   ├── player/                 # 玩家系统
│   │   ├── Player.ts           # 玩家类
│   │   ├── PlayerController.ts # 玩家控制器
│   │   └── Physics.ts          # 物理引擎 (射线检测)
│   ├── input/                  # 输入系统
│   │   ├── InputHandler.ts     # 输入处理器
│   │   └── KeyBindings.ts      # 按键绑定
│   ├── ui/                     # 用户界面
│   │   └── UIManager.ts        # UI管理器 (准星、物品栏、调试信息)
│   ├── save/                   # 存档系统
│   │   └── SaveManager.ts      # IndexedDB 存档管理器
│   └── utils/                  # 工具类
│       ├── Constants.ts        # 常量定义
│       ├── TextureLoader.ts    # 纹理加载器
│       ├── GeometryCache.ts    # 几何体缓存
│       └── BlockIconRenderer.ts # 方块3D图标渲染器
├── images/                     # 图片资源
│   ├── textures.png            # 方块纹理 (128x48, 16x16每格)
│   └── loading.gif             # 加载动画
├── index.html                  # HTML入口
├── package.json                # 包配置
├── tsconfig.json               # TS配置
├── vite.config.ts              # Vite配置
└── .gitignore
```

## 开发进度

### Phase 1: 基础架构 (已完成)
- [x] 项目初始化 (package.json, vite.config.ts, tsconfig.json)
- [x] Three.js 环境搭建
- [x] 纹理加载器 (解析 textures.png)
- [x] 代码规范配置 (ESLint + Prettier)

### Phase 2: 区块系统与地形 (已完成)
- [x] BlockType 枚举定义 (256种方块支持)
- [x] Chunk 类 (16x16x16 Uint8Array 存储)
- [x] ChunkManager (区块加载/卸载、渲染距离管理)
- [x] TerrainGenerator (地形生成)
- [x] MeshBuilder (面剔除 + 可见面合并)
- [x] 几何体缓存优化

### Phase 3: 玩家与物理 (已完成)
- [x] Player 类 (位置、速度、AABB碰撞)
- [x] 第一人称相机控制 (鼠标锁定)
- [x] WASD 移动控制
- [x] 重力与跳跃
- [x] 碰撞检测 (AABB vs 方块)
- [x] 方块射线检测 (Physics.raycast)

### Phase 4: 交互系统 (已完成)
- [x] 挖掘方块 (左键)
- [x] 放置方块 (右键)
- [x] 方块纹理映射 (UV映射)
- [x] 热键选择 (1-9数字键)

### Phase 5: 物品栏与输入优化 (已完成)
- [x] 鼠标滚轮切换物品 (循环切换)
- [x] 修复区块边缘更新 BUG (跨区块边界检测)
- [x] 物品栏3D方块图标 (实时渲染到Canvas)

### Phase 6: 存档系统 (已完成)
- [x] SaveManager 类 (IndexedDB 封装)
- [x] 区块数据序列化/反序列化
- [x] 玩家位置保存/加载
- [x] 自动保存机制 (5秒延迟保存区块，30秒保存玩家位置)
- [x] 多世界支持 (世界列表、删除世界)

### Phase 7: UI完善 (待开始)
- [ ] 加载界面 (使用 loading.gif)
- [ ] 暂停菜单
- [ ] 存档管理界面 (世界列表、新建/加载/删除世界)
- [ ] 调试信息显示优化

### Phase 8: 游戏内容扩展 (规划中)
- [ ] 基于 Simplex Noise 生成地形、树、群系等
- [ ] 基于时间的光照系统
- [ ] 太阳、月亮、云等天空系统
- [ ] 实体系统．如沙子坠落等

## 关键技术决策

### 1. 区块存储
- 使用 Uint8Array 存储方块ID (256种方块)
- 每个 Chunk 16x16x16 = 4096 字节
- 视锥内区块动态加载
- IndexedDB 持久化存储 (键: `worldName:cx,cz`)

### 2. 渲染优化
- 只生成朝向空气方块的可见面
- 相同纹理的面合并为单个几何体
- 每个区块一个 InstancedMesh

### 3. 物理系统
- AABB (轴对齐边界框) 碰撞检测
- 简单重力加速度
- 地面碰撞检测

### 4. 方块纹理映射
- textures.png 规格: 128x48, 3行8列
- 每个纹理 16x16 像素
- BlockType 定义每个面的纹理索引

### 5. 存档系统 (IndexedDB)
- 数据库: `MinecraftWebDB`
- 对象存储: `chunks` (区块数据), `metadata` (世界元数据)
- 区块键格式: `${worldName}:${cx},${cz}`
- 自动保存策略:
  - 区块修改后延迟5秒保存
  - 玩家位置每30秒保存
  - 游戏关闭时立即保存所有数据

### 纹理索引映射
```
第一行 (0-7):
0: 命令方块顶面
1: 命令方块侧面
2: 命令方块底面
3: 草方块顶面
4: 草方块侧面
5: 泥土 (草方块底面)
6: 原石
7: 石头

第二行 (8-15):
8: 沙子
9: 木头顶面
10: 木头侧面
11: 树叶 (透明)
12: 木板
13: 砖块
14: 仙人掌顶面 (透明)
15: 仙人掌侧面

第三行 (16-23):
16: 仙人掌底面 (透明)
17-23: 未使用
```

## 性能目标
- 帧率: 60 FPS
- 渲染距离: 8 区块 (128 方块)
- 内存占用: < 500MB
