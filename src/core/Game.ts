import { Renderer } from './Renderer';
import { World } from './World';
import { Player } from '../player/Player';
import { InputHandler } from '../input/InputHandler';
import { UIManager } from '../ui/UIManager';
import { Physics } from '../player/Physics';
import { BlockType } from '../world/BlockType';
import { BlockIconRenderer } from '../utils/BlockIconRenderer';
import { SaveManager } from '../save/SaveManager';

export class Game {
  private renderer: Renderer;
  private world: World;
  private player: Player;
  private input: InputHandler;
  private ui: UIManager;
  private physics: Physics;

  private running = false;
  private lastTime = 0;
  private selectedSlot = 0;
  private selectedBlock = BlockType.STONE;
  private blockIconRenderer: BlockIconRenderer | null = null;
  private saveManager: SaveManager | null = null;
  private lastSaveTime = 0;
  private readonly saveInterval = 30000; // Save player position every 30 seconds

  private blockTypes = [
    BlockType.STONE,
    BlockType.DIRT,
    BlockType.GRASS,
    BlockType.COBBLESTONE,
    BlockType.PLANKS,
    BlockType.BRICKS,
    BlockType.SAND,
    BlockType.WOOD,
    BlockType.LEAVES,
  ];

  constructor(container: HTMLElement) {
    this.renderer = new Renderer(container);
    this.world = new World(this.renderer.getScene());
    this.input = new InputHandler();
    this.ui = new UIManager(container);

    const chunkManager = this.world.getChunkManager();
    this.physics = new Physics(chunkManager);
    this.player = new Player(this.renderer, chunkManager);

    this.player.setPosition(8, 15, 8);
  }

  async initialize(): Promise<void> {
    await this.world.initialize();

    // Initialize save manager
    this.saveManager = new SaveManager();
    await this.saveManager.init();
    this.world.getChunkManager().setSaveManager(this.saveManager);

    // Load player position if available
    const savedPosition = await this.world.getChunkManager().loadPlayerPosition();
    if (savedPosition) {
      this.player.setPosition(savedPosition.x, savedPosition.y, savedPosition.z);
    }

    // Initialize block icon renderer and generate icons
    this.blockIconRenderer = new BlockIconRenderer(this.world.getTextureLoader());
    this.blockIconRenderer.initialize();

    // Generate icons for all block types
    for (const blockType of this.blockTypes) {
      const iconUrl = this.blockIconRenderer.renderBlockIcon(blockType);
      if (iconUrl) {
        this.ui.setBlockIcon(blockType, iconUrl);
      }
    }

    this.ui.show();
    this.ui.setBlockTypes(this.blockTypes);

    const loading = document.getElementById('loading');
    if (loading) {
      loading.classList.add('hidden');
    }

    this.world.update(8, 8);
    this.ui.setHotbarSelection(0);
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    this.running = false;
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(delta: number): void {
    this.handleInput(delta);
    this.player.update(delta);

    const pos = this.player.getPosition();
    this.world.update(pos.x, pos.z);

    this.handleBlockInteraction();
    this.handleHotbarSelection();

    const fps = Math.round(1 / delta);
    this.ui.updateDebugInfo(fps, pos);

    // Auto-save player position
    const now = performance.now();
    if (now - this.lastSaveTime > this.saveInterval) {
      this.world.getChunkManager().savePlayerPosition(pos);
      this.lastSaveTime = now;
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.render();
  }

  private handleInput(_delta: number): void {
    if (this.input.isKeyDown('KeyW')) {
      this.player.moveForward(1);
    }
    if (this.input.isKeyDown('KeyS')) {
      this.player.moveForward(-1);
    }
    if (this.input.isKeyDown('KeyA')) {
      this.player.moveRight(-1);
    }
    if (this.input.isKeyDown('KeyD')) {
      this.player.moveRight(1);
    }
    if (this.input.isKeyDown('Space')) {
      this.player.jump();
    }

    const mouseDelta = this.input.getMouseDelta();
    if (this.input.isLocked() && (mouseDelta.dx !== 0 || mouseDelta.dy !== 0)) {
      // console.log('mouseDelta:', mouseDelta.dx, mouseDelta.dy);
      this.renderer.rotateCamera(-mouseDelta.dx * 0.002, -mouseDelta.dy * 0.002);
      // const forward = this.renderer.getForwardVector();
      // console.log('After rotate, forward:', forward.x.toFixed(3), forward.y.toFixed(3), forward.z.toFixed(3));
    }

    if (this.input.isMouseDown('left')) {
      this.input.lockPointer();
    }
  }

  private lastBreakTime = 0;
  private lastPlaceTime = 0;
  private readonly breakCooldown = 200;
  private readonly placeCooldown = 200;

  private handleBlockInteraction(): void {
    const now = performance.now();

    if (this.input.isMouseDown('left') && now - this.lastBreakTime > this.breakCooldown) {
      this.breakBlock();
      this.lastBreakTime = now;
    }
    if (this.input.isMouseDown('right') && now - this.lastPlaceTime > this.placeCooldown) {
      this.placeBlock();
      this.lastPlaceTime = now;
    }
  }

  private handleHotbarSelection(): void {
    // Handle number keys
    for (let i = 1; i <= 9; i++) {
      if (this.input.isKeyDown(`Digit${i}`)) {
        this.selectedSlot = i - 1;
        this.selectedBlock = this.blockTypes[this.selectedSlot] ?? BlockType.STONE;
        this.ui.setHotbarSelection(this.selectedSlot);
      }
    }

    // Handle mouse wheel
    const wheelDelta = this.input.getWheelDelta();
    if (wheelDelta !== 0) {
      // wheelDelta > 0: scroll down (next slot)
      // wheelDelta < 0: scroll up (previous slot)
      const slotCount = this.blockTypes.length;
      this.selectedSlot = (this.selectedSlot + wheelDelta + slotCount) % slotCount;
      this.selectedBlock = this.blockTypes[this.selectedSlot] ?? BlockType.STONE;
      this.ui.setHotbarSelection(this.selectedSlot);
    }
  }

  private breakBlock(): void {
    const hit = this.raycast();
    if (hit) {
      this.world.setBlock(hit.x, hit.y, hit.z, BlockType.AIR);
    }
  }

  private placeBlock(): void {
    const hit = this.raycast();
    if (hit) {
      const pos = this.getAdjacentPosition(hit.x, hit.y, hit.z, hit.face);
      if (!this.isPlayerInBlock(pos.x, pos.y, pos.z)) {
        this.world.setBlock(pos.x, pos.y, pos.z, this.selectedBlock);
      }
    }
  }

  private raycast(): { x: number; y: number; z: number; face: number } | null {
    const pos = this.renderer.getCameraPosition();
    const forward = this.renderer.getForwardVector();
    const maxDistance = 5;

    return this.physics.raycast(
      pos.x,
      pos.y,
      pos.z,
      forward.x,
      forward.y,
      forward.z,
      maxDistance
    );
  }

  private getAdjacentPosition(
    x: number,
    y: number,
    z: number,
    face: number
  ): { x: number; y: number; z: number } {
    const offsets = [
      [0, 1, 0],
      [0, -1, 0],
      [0, 0, 1],
      [0, 0, -1],
      [-1, 0, 0],
      [1, 0, 0],
    ];
    const offset = offsets[face];
    return { x: x + offset[0], y: y + offset[1], z: z + offset[2] };
  }

  private isPlayerInBlock(x: number, y: number, z: number): boolean {
    const pos = this.player.getPosition();
    const px = Math.floor(pos.x);
    const py = Math.floor(pos.y);
    const pz = Math.floor(pos.z);

    return (
      (x === px || x === px - 1) &&
      (y === py || y === py + 1) &&
      (z === pz || z === pz - 1)
    );
  }

  async dispose(): Promise<void> {
    this.stop();

    // Save all pending chunks and player position
    const pos = this.player.getPosition();
    await this.world.getChunkManager().savePlayerPosition(pos);
    await this.world.getChunkManager().saveAll();

    this.blockIconRenderer?.dispose();
    this.saveManager?.close();
    this.world.dispose();
    this.renderer.dispose();
  }
}
