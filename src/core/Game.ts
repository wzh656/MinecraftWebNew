import { Renderer } from "./Renderer";
import { World } from "./World";
import { Player } from "../player/Player";
import { InputHandler } from "../input/InputHandler";
import { UIManager } from "../ui/UIManager";
import { Physics } from "../player/Physics";
import { BlockType } from "../world/BlockType";
import { BlockIconRenderer } from "../utils/BlockIconRenderer";
import { SaveManager } from "../save/SaveManager";
import {
  PLAYER_INITIAL_X,
  PLAYER_INITIAL_Y,
  PLAYER_INITIAL_Z,
  SAVE_INTERVAL_PLAYER,
  BLOCK_BREAK_COOLDOWN,
  BLOCK_PLACE_COOLDOWN,
  RAYCAST_MAX_DISTANCE,
  HOTBAR_SIZE,
  PLAYER_WIDTH,
  PLAYER_DEPTH,
  PLAYER_HEIGHT,
  MS_PER_SECOND,
  FPS_UPDATE_INTERVAL,
  LOADING_PROGRESS_INIT,
  LOADING_PROGRESS_SAVE,
  LOADING_PROGRESS_ICONS,
  LOADING_PROGRESS_CHUNKS,
  LOADING_PROGRESS_COMPLETE,
  CHUNK_LOAD_TIMEOUT,
  CHUNK_LOAD_CHECK_INTERVAL,
  CHUNK_LOAD_DELAY,
  MAX_DELTA_TIME,
  FACE_OFFSETS,
} from "../utils/Constants";
import { GameSettings, settings } from "../utils/Settings";

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
  private readonly saveInterval = SAVE_INTERVAL_PLAYER;
  private sprintActive = false;

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

    this.player.setPosition(
      PLAYER_INITIAL_X,
      PLAYER_INITIAL_Y,
      PLAYER_INITIAL_Z,
    );

    // Listen for pointer lock changes to show/hide pause menu
    document.addEventListener("pointerlockchange", () => {
      const isLocked = document.pointerLockElement === document.body;
      // Sync pause menu state with pointer lock state
      if (!isLocked && this.running && !this.ui.isMainMenuVisible()) {
        // Pointer unlocked while game is running - show pause menu
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
    // Initialize save manager
    this.saveManager = new SaveManager();
    await this.saveManager.init();

    // Set current world if specified
    if (worldName) {
      this.saveManager.setCurrentWorld(worldName);
    }

    // Load world metadata to get seed
    const worldMetadata = await this.saveManager.loadWorldMetadata();
    if (!worldMetadata) {
      throw new Error(`World "${worldName}" metadata not found`);
    }

    // Initialize world with seed for terrain generation
    await this.world.initialize(worldMetadata.seed);

    this.world.getChunkManager().setSaveManager(this.saveManager);

    this.applySettings(settings.values);

    const savedPosition = await this.world
      .getChunkManager()
      .loadPlayerPosition();
    if (savedPosition) {
      this.player.setPosition(
        savedPosition.x,
        savedPosition.y,
        savedPosition.z,
      );
    }

    const savedRotation = await this.world
      .getChunkManager()
      .loadPlayerRotation();
    if (savedRotation) {
      this.renderer.setCameraRotation(savedRotation.x, savedRotation.y);
    }

    this.updateLoadingStatus(
      "Generating block icons...",
      LOADING_PROGRESS_ICONS,
    );
    // Initialize block icon renderer and generate icons
    this.blockIconRenderer = new BlockIconRenderer(
      this.world.getTextureLoader(),
    );
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

    // Setup teleport callback
    this.ui.setTeleportCallback((x, y, z) => {
      this.player.setPosition(x, y, z);
    });

    // Load initial chunks with progress tracking
    const playerPos = savedPosition ?? {
      x: PLAYER_INITIAL_X,
      y: PLAYER_INITIAL_Y,
      z: PLAYER_INITIAL_Z,
    };
    await this.loadInitialChunks(playerPos.x, playerPos.z);

    this.updateLoadingStatus("Starting game...", LOADING_PROGRESS_COMPLETE);

    // Loading screen is managed by main.ts for initial load
    // World loading overlay would be handled separately

    this.ui.setHotbarSelection(0);

    // Note: Fog is now handled by the custom shader in MeshBuilder

    // Start game loop
    this.start();
  }

  private updateLoadingStatus(status: string, progress: number): void {
    const statusEl = document.getElementById("loading-status");
    const progressBar = document.getElementById("loading-progress-bar");
    if (statusEl) {
      statusEl.textContent = status;
    }
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  private async loadInitialChunks(
    playerX: number,
    playerZ: number,
  ): Promise<void> {
    this.updateLoadingStatus("Loading chunks...", LOADING_PROGRESS_CHUNKS);

    const chunkManager = this.world.getChunkManager();
    const maxWaitTime = CHUNK_LOAD_TIMEOUT;
    const startTime = performance.now();

    while (performance.now() - startTime < maxWaitTime) {
      this.world.update(playerX, playerZ);

      const visibleChunks = Array.from(chunkManager.getVisibleChunks());
      const totalVisible = visibleChunks.length;

      let loadedCount = 0;
      let renderedCount = 0;
      for (const chunk of visibleChunks) {
        const hasData = chunk.data.some((b) => b !== 0);
        if (hasData) loadedCount++;

        const isRendered = this.world.isChunkRendered(chunk.x, chunk.z);
        if (isRendered) renderedCount++;
      }

      const hasPending = chunkManager.hasPendingChunks();

      const progress =
        LOADING_PROGRESS_CHUNKS +
        Math.floor((renderedCount / totalVisible) * 35);
      this.updateLoadingStatus(
        `Loading chunks... (${renderedCount}/${totalVisible} rendered)${hasPending ? " (generating...)" : ""}`,
        Math.min(progress, LOADING_PROGRESS_COMPLETE - 1),
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
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    this.running = false;
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const delta = Math.min(
      (currentTime - this.lastTime) / MS_PER_SECOND,
      MAX_DELTA_TIME,
    );
    this.lastTime = currentTime;

    this.update(delta);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  // FPS calculation (frames per second, updated once per second)
  private fpsFrameCount = 0;
  private fpsLastTime = performance.now();
  private currentFps = 0;

  private update(delta: number): void {
    this.handleInput(delta);
    this.player.update(delta);

    const pos = this.player.getPosition();
    const rotation = this.renderer.getCameraRotation();
    this.world.update(pos.x, pos.z, rotation.y);

    this.handleBlockInteraction();
    this.handleHotbarSelection();

    // Update FPS (once per second)
    this.fpsFrameCount++;
    const now = performance.now();
    if (now - this.fpsLastTime >= FPS_UPDATE_INTERVAL) {
      this.currentFps = this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsLastTime = now;
    }

    const raycastHit = this.raycast();

    this.ui.updateDebugInfo({
      fps: this.currentFps,
      position: pos,
      rotation: { x: rotation.x, y: rotation.y },
      target: raycastHit,
      flying: this.player.isFlying(),
      sprinting: this.player.isSprinting(),
    });

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
    // Handle ESC key for pause menu
    if (this.input.isKeyDown("Escape")) {
      if (!this.pauseMenuVisible) {
        this.setPauseMenuVisible(true);
      }
    }

    // Don't process game input when paused
    if (this.pauseMenuVisible) {
      // Clear all input and movement state when paused
      this.input.clearAllKeys();
      this.sprintActive = false;
      this.player.deactivateSprint();
      return;
    }

    // Track if W was pressed this frame for sprint detection
    const wPressed = this.input.isKeyDown("KeyW");

    // Handle double-tap for flight toggle (double Space)
    if (this.input.isDoubleSpaceTap()) {
      this.player.toggleFlight();
    }

    // Sprint: double-tap W to activate, only active while moving forward
    if (this.input.isDoubleWTap()) {
      this.sprintActive = true;
    }

    // Check movement keys
    if (wPressed) {
      // Sprint is active ONLY when holding forward
      if (this.sprintActive) {
        this.player.activateSprint();
      }
      this.player.moveForward(1);
    }
    if (this.input.isKeyDown("KeyS")) {
      this.player.moveForward(-1);
      this.player.deactivateSprint();
      this.sprintActive = false;
    }
    if (this.input.isKeyDown("KeyA")) {
      this.player.moveRight(-1);
    }
    if (this.input.isKeyDown("KeyD")) {
      this.player.moveRight(1);
    }

    // If not moving forward, deactivate sprint
    if (!wPressed) {
      this.sprintActive = false;
      this.player.deactivateSprint();
    }

    // Handle flight movement
    let verticalInput = false;
    if (this.player.isFlying()) {
      if (this.input.isKeyDown("Space")) {
        this.player.ascend();
        verticalInput = true;
      }
      if (
        this.input.isKeyDown("ShiftLeft") ||
        this.input.isKeyDown("ShiftRight")
      ) {
        this.player.descend();
        verticalInput = true;
      }
      // No vertical input = hover in place
      if (!verticalInput) {
        this.player.hover();
      }
    } else {
      // Normal jump when not flying
      if (this.input.isKeyDown("Space")) {
        this.player.jump();
      }
    }

    const mouseDelta = this.input.getMouseDelta();
    if (this.input.isLocked() && (mouseDelta.dx !== 0 || mouseDelta.dy !== 0)) {
      this.renderer.rotateCamera(
        -mouseDelta.dx * settings.mouseSensitivity,
        -mouseDelta.dy * settings.mouseSensitivity,
      );
    }

    if (this.input.isMouseDown("left")) {
      this.input.lockPointer();
    }
  }

  private lastBreakTime = 0;
  private lastPlaceTime = 0;
  private readonly breakCooldown = BLOCK_BREAK_COOLDOWN;
  private readonly placeCooldown = BLOCK_PLACE_COOLDOWN;

  private handleBlockInteraction(): void {
    // Don't process block interactions when paused or main menu is visible
    if (this.pauseMenuVisible || this.ui.isMainMenuVisible()) {
      return;
    }

    const now = performance.now();

    if (
      this.input.isMouseDown("left") &&
      now - this.lastBreakTime > this.breakCooldown
    ) {
      this.breakBlock();
      this.lastBreakTime = now;
    }
    if (
      this.input.isMouseDown("right") &&
      now - this.lastPlaceTime > this.placeCooldown
    ) {
      this.placeBlock();
      this.lastPlaceTime = now;
    }
  }

  private handleHotbarSelection(): void {
    // Handle number keys
    for (let i = 1; i <= HOTBAR_SIZE; i++) {
      if (this.input.isKeyDown(`Digit${i}`)) {
        this.selectedSlot = i - 1;
        this.selectedBlock =
          this.blockTypes[this.selectedSlot] ?? BlockType.STONE;
        this.ui.setHotbarSelection(this.selectedSlot);
      }
    }

    // Handle mouse wheel
    const wheelDelta = this.input.getWheelDelta();
    if (wheelDelta !== 0) {
      // wheelDelta > 0: scroll down (next slot)
      // wheelDelta < 0: scroll up (previous slot)
      const slotCount = this.blockTypes.length;
      this.selectedSlot =
        (this.selectedSlot + wheelDelta + slotCount) % slotCount;
      this.selectedBlock =
        this.blockTypes[this.selectedSlot] ?? BlockType.STONE;
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

    // Use DDA raycast starting from camera position
    // The DDA algorithm handles edge cases properly (including when camera is inside a block)
    return this.physics.raycast(
      pos.x,
      pos.y,
      pos.z,
      forward.x,
      forward.y,
      forward.z,
      RAYCAST_MAX_DISTANCE,
    );
  }

  private getAdjacentPosition(
    x: number,
    y: number,
    z: number,
    face: number,
  ): { x: number; y: number; z: number } {
    const offset = FACE_OFFSETS[face];
    return { x: x + offset[0], y: y + offset[1], z: z + offset[2] };
  }

  private isPlayerInBlock(x: number, y: number, z: number): boolean {
    // Check if placing a block at (x, y, z) would intersect with the player's AABB
    const pos = this.player.getPosition();

    // Player AABB
    const playerMinX = pos.x - PLAYER_WIDTH / 2;
    const playerMaxX = pos.x + PLAYER_WIDTH / 2;
    const playerMinY = pos.y;
    const playerMaxY = pos.y + PLAYER_HEIGHT;
    const playerMinZ = pos.z - PLAYER_DEPTH / 2;
    const playerMaxZ = pos.z + PLAYER_DEPTH / 2;

    // Block AABB (block at x, y, z occupies [x, x+1] x [y, y+1] x [z, z+1])
    const blockMinX = x;
    const blockMaxX = x + 1;
    const blockMinY = y;
    const blockMaxY = y + 1;
    const blockMinZ = z;
    const blockMaxZ = z + 1;

    // Check AABB intersection
    return (
      blockMinX < playerMaxX &&
      blockMaxX > playerMinX &&
      blockMinY < playerMaxY &&
      blockMaxY > playerMinY &&
      blockMinZ < playerMaxZ &&
      blockMaxZ > playerMinZ
    );
  }

  async dispose(): Promise<void> {
    this.stop();

    // Save all pending chunks and player position with rotation
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
    // Initial state: show pause menu but don't start game loop yet
    // Wait for player to click Resume Game to lock pointer and start
    this.pauseMenuVisible = true;
    this.ui.showPauseMenu();
    // Don't lock pointer yet - wait for Resume button click
  }

  hidePauseMenu(): void {
    this.ui.hidePauseMenu();
    // Only hide menu after pointer is successfully locked
    // pointerlockchange event will update pauseMenuVisible if lock fails
    this.input.lockPointer();
  }

  isPaused(): boolean {
    return this.pauseMenuVisible;
  }

  private pauseMenuVisible = false;

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

    // Save current world if any
    if (this.saveManager.getCurrentWorld()) {
      const pos = this.player.getPosition();
      const rotation = this.renderer.getCameraRotation();
      await this.world.getChunkManager().savePlayerPosition(pos, rotation);
      await this.world.getChunkManager().saveAll();
    }

    // Switch to new world
    this.saveManager.setCurrentWorld(worldName);

    // Load new world metadata to get seed
    const worldMetadata = await this.saveManager.loadWorldMetadata(worldName);
    if (!worldMetadata) {
      throw new Error(`World "${worldName}" metadata not found`);
    }

    // Clear existing chunks and reinitialize terrain with new seed
    this.world.getChunkManager().clear();

    // Reinitialize terrain generator with seed
    await this.world.getChunkManager().initializeTerrain(worldMetadata.seed);

    // Reload player position
    const savedPosition = await this.world
      .getChunkManager()
      .loadPlayerPosition();
    if (savedPosition) {
      this.player.setPosition(
        savedPosition.x,
        savedPosition.y,
        savedPosition.z,
      );
    } else {
      this.player.setPosition(
        PLAYER_INITIAL_X,
        PLAYER_INITIAL_Y,
        PLAYER_INITIAL_Z,
      );
    }

    const savedRotation = await this.world
      .getChunkManager()
      .loadPlayerRotation();
    if (savedRotation) {
      this.renderer.setCameraRotation(savedRotation.x, savedRotation.y);
    } else {
      this.renderer.setCameraRotation(0, 0, 0);
    }

    // Update world to load chunks
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
