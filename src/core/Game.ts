import { Renderer } from "./Renderer";
import { World } from "./World";
import { Player } from "../player/Player";
import { InputHandler } from "../input/InputHandler";
import { UIManager } from "../ui/UIManager";
import { Physics } from "../player/Physics";
import { BlockType } from "../world/BlockType";
import { BlockIconRenderer } from "../rendering/texture/BlockIconRenderer";
import { SaveManager } from "../save/SaveManager";
import { GameLoop } from "./GameLoop";
import { BlockInteractionManager } from "../interaction/BlockInteractionManager";
import {
  PLAYER_INITIAL_X,
  PLAYER_INITIAL_Y,
  PLAYER_INITIAL_Z,
  SAVE_INTERVAL_PLAYER,
  HOTBAR_SIZE,
  LOADING_PROGRESS_INIT,
  LOADING_PROGRESS_SAVE,
  LOADING_PROGRESS_ICONS,
  LOADING_PROGRESS_CHUNKS,
  LOADING_PROGRESS_COMPLETE,
  CHUNK_LOAD_TIMEOUT,
  CHUNK_LOAD_CHECK_INTERVAL,
  CHUNK_LOAD_DELAY,
} from "../utils/Constants";
import { GameSettings, settings } from "../utils/Settings";

export class Game {
  private renderer: Renderer;
  private world: World;
  private player: Player;
  private input: InputHandler;
  private ui: UIManager;
  private physics: Physics;
  private gameLoop: GameLoop;
  private blockInteraction: BlockInteractionManager;

  private running = false;
  private selectedSlot = 0;
  private selectedBlock = BlockType.STONE;
  private blockIconRenderer: BlockIconRenderer | null = null;
  private saveManager: SaveManager | null = null;
  private lastSaveTime = 0;
  private readonly saveInterval = SAVE_INTERVAL_PLAYER;
  private sprintActive = false;
  private pauseMenuVisible = false;

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

    this.player.setPosition(PLAYER_INITIAL_X, PLAYER_INITIAL_Y, PLAYER_INITIAL_Z);

    this.blockInteraction = new BlockInteractionManager(
      this.world,
      this.physics,
      this.player,
      this.renderer
    );

    this.gameLoop = new GameLoop({
      onUpdate: this.update.bind(this),
      onRender: this.render.bind(this),
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    document.addEventListener("pointerlockchange", () => {
      const isLocked = document.pointerLockElement === document.body;
      if (!isLocked && this.running && !this.ui.isMainMenuVisible()) {
        if (!this.pauseMenuVisible) {
          this.pauseMenuVisible = true;
          this.ui.showPauseMenu();
        }
      }
    });
  }

  getUIManager(): UIManager {
    return this.ui;
  }

  async initialize(worldName?: string): Promise<void> {
    this.updateLoadingStatus("Initializing world...", LOADING_PROGRESS_INIT);

    this.updateLoadingStatus("Loading save data...", LOADING_PROGRESS_SAVE);
    this.saveManager = new SaveManager();
    await this.saveManager.init();

    if (worldName) {
      this.saveManager.setCurrentWorld(worldName);
    }

    const worldMetadata = await this.saveManager.loadWorldMetadata();
    if (!worldMetadata) {
      throw new Error(`World "${worldName}" metadata not found`);
    }

    await this.world.initialize(worldMetadata.seed);
    this.world.getChunkManager().setSaveManager(this.saveManager);
    this.applySettings(settings.values);

    const savedPosition = await this.world.getChunkManager().loadPlayerPosition();
    if (savedPosition) {
      this.player.setPosition(savedPosition.x, savedPosition.y, savedPosition.z);
    }

    const savedRotation = await this.world.getChunkManager().loadPlayerRotation();
    if (savedRotation) {
      this.renderer.setCameraRotation(savedRotation.x, savedRotation.y);
    }

    this.updateLoadingStatus("Generating block icons...", LOADING_PROGRESS_ICONS);
    this.blockIconRenderer = new BlockIconRenderer(this.world.getTextureLoader());
    this.blockIconRenderer.initialize();

    for (const blockType of this.blockTypes) {
      const iconUrl = this.blockIconRenderer.renderBlockIcon(blockType);
      if (iconUrl) {
        this.ui.setBlockIcon(blockType, iconUrl);
      }
    }

    this.ui.show();
    this.ui.setBlockTypes(this.blockTypes);
    this.ui.setTeleportCallback((x, y, z) => {
      this.player.setPosition(x, y, z);
    });

    const playerPos = savedPosition ?? { x: PLAYER_INITIAL_X, y: PLAYER_INITIAL_Y, z: PLAYER_INITIAL_Z };
    await this.loadInitialChunks(playerPos.x, playerPos.z);

    this.updateLoadingStatus("Starting game...", LOADING_PROGRESS_COMPLETE);
    this.ui.setHotbarSelection(0);
    this.start();
  }

  private updateLoadingStatus(status: string, progress: number): void {
    const statusEl = document.getElementById("loading-status");
    const progressBar = document.getElementById("loading-progress-bar");
    if (statusEl) statusEl.textContent = status;
    if (progressBar) progressBar.style.width = `${progress}%`;
  }

  private async loadInitialChunks(playerX: number, playerZ: number): Promise<void> {
    this.updateLoadingStatus("Loading chunks...", LOADING_PROGRESS_CHUNKS);

    const chunkManager = this.world.getChunkManager();
    const maxWaitTime = CHUNK_LOAD_TIMEOUT;
    const startTime = performance.now();

    while (performance.now() - startTime < maxWaitTime) {
      this.world.update(playerX, playerZ);

      const visibleChunks = Array.from(chunkManager.getVisibleChunks());
      const totalVisible = visibleChunks.length;

      let renderedCount = 0;
      for (const chunk of visibleChunks) {
        if (this.world.isChunkRendered(chunk.x, chunk.z)) renderedCount++;
      }

      const hasPending = chunkManager.hasPendingChunks();
      const progress = LOADING_PROGRESS_CHUNKS + Math.floor((renderedCount / totalVisible) * 35);
      this.updateLoadingStatus(
        `Loading chunks... (${renderedCount}/${totalVisible} rendered)${hasPending ? " (generating...)" : ""}`,
        Math.min(progress, LOADING_PROGRESS_COMPLETE - 1)
      );

      if (renderedCount >= totalVisible && !hasPending && totalVisible > 0) {
        await this.delay(CHUNK_LOAD_DELAY);
        break;
      }

      await this.delay(CHUNK_LOAD_CHECK_INTERVAL);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  start(): void {
    this.running = true;
    this.gameLoop.start();
  }

  stop(): void {
    this.running = false;
    this.gameLoop.stop();
  }

  private update(delta: number): void {
    this.handleInput(delta);
    this.player.update(delta);

    const pos = this.player.getPosition();
    const rotation = this.renderer.getCameraRotation();
    this.world.update(pos.x, pos.z, rotation.y);

    this.handleBlockInteraction();
    this.handleHotbarSelection();

    const raycastHit = this.blockInteraction.raycast();
    this.ui.updateDebugInfo({
      fps: this.gameLoop.getFps(),
      position: pos,
      rotation: { x: rotation.x, y: rotation.y },
      target: raycastHit,
      flying: this.player.isFlying(),
      sprinting: this.player.isSprinting(),
    });

    const now = performance.now();
    if (now - this.lastSaveTime > this.saveInterval) {
      this.world.getChunkManager().savePlayerPosition(pos, rotation);
      this.lastSaveTime = now;
    }
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.render();
  }

  private handleInput(_delta: number): void {
    if (this.input.isKeyDown("Escape")) {
      if (!this.pauseMenuVisible) {
        this.setPauseMenuVisible(true);
      }
    }

    if (this.pauseMenuVisible) {
      this.input.clearAllKeys();
      this.sprintActive = false;
      this.player.deactivateSprint();
      return;
    }

    const wPressed = this.input.isKeyDown("KeyW");

    if (this.input.isDoubleSpaceTap()) {
      this.player.toggleFlight();
    }

    if (this.input.isDoubleWTap()) {
      this.sprintActive = true;
    }

    if (wPressed) {
      if (this.sprintActive) this.player.activateSprint();
      this.player.moveForward(1);
    }
    if (this.input.isKeyDown("KeyS")) {
      this.player.moveForward(-1);
      this.player.deactivateSprint();
      this.sprintActive = false;
    }
    if (this.input.isKeyDown("KeyA")) this.player.moveRight(-1);
    if (this.input.isKeyDown("KeyD")) this.player.moveRight(1);

    if (!wPressed) {
      this.sprintActive = false;
      this.player.deactivateSprint();
    }

    let verticalInput = false;
    if (this.player.isFlying()) {
      if (this.input.isKeyDown("Space")) {
        this.player.ascend();
        verticalInput = true;
      }
      if (this.input.isKeyDown("ShiftLeft") || this.input.isKeyDown("ShiftRight")) {
        this.player.descend();
        verticalInput = true;
      }
      if (!verticalInput) this.player.hover();
    } else {
      if (this.input.isKeyDown("Space")) this.player.jump();
    }

    const mouseDelta = this.input.getMouseDelta();
    if (this.input.isLocked() && (mouseDelta.dx !== 0 || mouseDelta.dy !== 0)) {
      this.renderer.rotateCamera(
        -mouseDelta.dx * settings.mouseSensitivity,
        -mouseDelta.dy * settings.mouseSensitivity
      );
    }

    if (this.input.isMouseDown("left")) {
      this.input.lockPointer();
    }
  }

  private handleBlockInteraction(): void {
    if (!this.blockInteraction.canInteract(this.pauseMenuVisible)) return;

    if (this.input.isMouseDown("left")) {
      this.blockInteraction.tryBreakBlock();
    }
    if (this.input.isMouseDown("right")) {
      this.blockInteraction.tryPlaceBlock(this.selectedBlock);
    }
  }

  private handleHotbarSelection(): void {
    for (let i = 1; i <= HOTBAR_SIZE; i++) {
      if (this.input.isKeyDown(`Digit${i}`)) {
        this.selectedSlot = i - 1;
        this.selectedBlock = this.blockTypes[this.selectedSlot] ?? BlockType.STONE;
        this.ui.setHotbarSelection(this.selectedSlot);
      }
    }

    const wheelDelta = this.input.getWheelDelta();
    if (wheelDelta !== 0) {
      const slotCount = this.blockTypes.length;
      this.selectedSlot = (this.selectedSlot + wheelDelta + slotCount) % slotCount;
      this.selectedBlock = this.blockTypes[this.selectedSlot] ?? BlockType.STONE;
      this.ui.setHotbarSelection(this.selectedSlot);
    }
  }

  async dispose(): Promise<void> {
    this.stop();
    const pos = this.player.getPosition();
    const rotation = this.renderer.getCameraRotation();
    await this.world.getChunkManager().savePlayerPosition(pos, rotation);
    await this.world.getChunkManager().saveAll();

    this.blockIconRenderer?.dispose();
    this.saveManager?.close();
    this.world.dispose();
    this.renderer.dispose();
  }

  showPauseMenu(): void {
    this.ui.showPauseMenu();
    this.input.unlockPointer();
  }

  showInitialPauseMenu(): void {
    this.pauseMenuVisible = true;
    this.ui.showPauseMenu();
  }

  hidePauseMenu(): void {
    this.ui.hidePauseMenu();
    this.input.lockPointer();
  }

  isPaused(): boolean {
    return this.pauseMenuVisible;
  }

  setPauseMenuVisible(visible: boolean): void {
    this.pauseMenuVisible = visible;
    if (visible) {
      this.showPauseMenu();
    } else {
      this.hidePauseMenu();
    }
  }

  returnToMainMenu(): void {
    this.pauseMenuVisible = false;
    this.ui.hidePauseMenu();
    this.ui.hide();
    this.input.unlockPointer();
    this.dispose();
    this.ui.showMainMenu();
  }

  getSaveManager(): SaveManager | null {
    return this.saveManager;
  }

  async loadWorld(worldName: string): Promise<void> {
    if (!this.saveManager) return;

    if (this.saveManager.getCurrentWorld()) {
      const pos = this.player.getPosition();
      const rotation = this.renderer.getCameraRotation();
      await this.world.getChunkManager().savePlayerPosition(pos, rotation);
      await this.world.getChunkManager().saveAll();
    }

    this.saveManager.setCurrentWorld(worldName);

    const worldMetadata = await this.saveManager.loadWorldMetadata(worldName);
    if (!worldMetadata) {
      throw new Error(`World "${worldName}" metadata not found`);
    }

    this.world.getChunkManager().clear();
    await this.world.getChunkManager().initializeTerrain(worldMetadata.seed);

    const savedPosition = await this.world.getChunkManager().loadPlayerPosition();
    if (savedPosition) {
      this.player.setPosition(savedPosition.x, savedPosition.y, savedPosition.z);
    } else {
      this.player.setPosition(PLAYER_INITIAL_X, PLAYER_INITIAL_Y, PLAYER_INITIAL_Z);
    }

    const savedRotation = await this.world.getChunkManager().loadPlayerRotation();
    if (savedRotation) {
      this.renderer.setCameraRotation(savedRotation.x, savedRotation.y);
    } else {
      this.renderer.setCameraRotation(0, 0);
    }

    const playerPos = this.player.getPosition();
    this.world.update(playerPos.x, playerPos.z);
  }

  applySettings(newSettings: GameSettings): void {
    this.player.updateSpeeds({
      normal: newSettings.playerSpeed,
      sprint: settings.playerSprintSpeed,
      flight: settings.playerFlightSpeed,
      jump: newSettings.playerJumpSpeed,
    });

    this.renderer.setFOV(newSettings.fov);
    this.world.setRenderDistance(newSettings.renderDistance);
  }
}
