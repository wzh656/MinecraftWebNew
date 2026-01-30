import { ShaderMaterial, Texture, Color } from "three";

/**
 * 区块Shader材质 - 实现原版Minecraft风格的雾效
 *
 * 雾效分层：
 * - 近处 (0-60%渲染距离): 清晰无雾
 * - 中距离 (60-90%): 逐渐过渡到雾色
 * - 远处 (90-100%): 完全雾色
 * - 边界外: 天空色（未加载区域）
 */

export const CHUNK_VERTEX_SHADER = `
  varying vec2 vUv;
  varying float vWorldDistance;

  void main() {
    vUv = uv;

    // 计算世界空间位置
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);

    // 计算欧几里得距离（世界空间，与视角无关）
    // 使用世界空间位置到相机的距离，而不是view space的z深度
    vec4 cameraPosition = inverse(viewMatrix) * vec4(0.0, 0.0, 0.0, 1.0);
    float dist = distance(worldPosition.xyz, cameraPosition.xyz);
    vWorldDistance = dist;

    gl_Position = projectionMatrix * viewMatrix * worldPosition;
  }
`;

export const CHUNK_FRAGMENT_SHADER = `
  uniform sampler2D map;
  uniform vec3 fogColor;
  uniform float fogNear;
  uniform float fogFar;
  uniform float chunkOpacity;

  varying vec2 vUv;
  varying float vWorldDistance;

  void main() {
    vec4 texColor = texture2D(map, vUv);

    // 跳过完全透明像素（discard是必要的，无法用min/max替代）
    if (texColor.a < 0.1) discard;

    // 无分支计算雾因子：
    // 1. 归一化距离： (worldDist - near) / (far - near)
    // 2. 用 clamp 限制到 [0, 1]
    float fogRange = fogFar - fogNear;
    float normalizedDist = (vWorldDistance - fogNear) / fogRange;
    float fogFactor = clamp(normalizedDist, 0.0, 1.0);

    // 应用平滑过渡
    fogFactor = smoothstep(0.0, 1.0, fogFactor);

    // 应用雾效：从纹理颜色混合到雾色
    vec3 withFog = mix(texColor.rgb, fogColor, fogFactor);

    // 区块加载时的淡入效果（从雾色逐渐显示）
    // chunkOpacity: 0 = 完全雾色（刚加载）, 1 = 正常显示
    vec3 finalColor = mix(fogColor, withFog, chunkOpacity);

    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

export class ChunkShaderMaterial {
  private material: ShaderMaterial;
  private uniforms: {
    map: { value: Texture | null };
    fogColor: { value: Color };
    fogNear: { value: number };
    fogFar: { value: number };
    chunkOpacity: { value: number };
  };

  constructor(texture: Texture | null) {
    this.uniforms = {
      map: { value: texture },
      // 雾颜色：蓝灰色调（比天空色稍灰一些）
      // 0x87ceeb (135, 206, 235) - 原版天空蓝
      // 0x9cb5c4 (156, 181, 196) - 稍灰的蓝色
      fogColor: { value: new Color(0x9cb5c4) },
      fogNear: { value: 100 }, // 雾开始距离
      fogFar: { value: 400 }, // 雾结束距离
      chunkOpacity: { value: 1.0 }, // 区块透明度（淡入动画）
    };

    this.material = new ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: CHUNK_VERTEX_SHADER,
      fragmentShader: CHUNK_FRAGMENT_SHADER,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: true,
      depthTest: true,
    });
  }

  /**
   * 获取Three.js ShaderMaterial实例
   */
  getMaterial(): ShaderMaterial {
    return this.material;
  }

  /**
   * 更新纹理
   */
  setTexture(texture: Texture): void {
    this.uniforms.map.value = texture;
  }

  /**
   * 设置雾颜色
   */
  setFogColor(color: Color | number): void {
    if (typeof color === "number") {
      this.uniforms.fogColor.value.setHex(color);
    } else {
      this.uniforms.fogColor.value.copy(color);
    }
  }

  /**
   * 设置雾的起止距离
   */
  setFogDistance(near: number, far: number): void {
    this.uniforms.fogNear.value = near;
    this.uniforms.fogFar.value = far;
  }

  /**
   * 获取雾开始距离
   */
  getFogNear(): number {
    return this.uniforms.fogNear.value;
  }

  /**
   * 获取雾结束距离
   */
  getFogFar(): number {
    return this.uniforms.fogFar.value;
  }

  /**
   * 设置区块透明度（用于加载淡入动画）
   */
  setChunkOpacity(opacity: number): void {
    this.uniforms.chunkOpacity.value = Math.max(0, Math.min(1, opacity));
  }

  /**
   * 获取区块透明度
   */
  getChunkOpacity(): number {
    return this.uniforms.chunkOpacity.value;
  }

  /**
   * 更新Uniforms（每帧调用）
   */
  update(): void {
    // ShaderMaterial会自动更新，这里预留接口供未来扩展
  }

  /**
   * 销毁材质
   */
  dispose(): void {
    this.material.dispose();
  }
}

/**
 * 区块淡入动画管理器
 * 管理新加载区块的雾中淡入效果
 */
export interface FadingChunk {
  key: string;
  currentOpacity: number;
  targetOpacity: number;
  fadeSpeed: number;
  completed: boolean;
}

export class ChunkFadeManager {
  private fadingChunks = new Map<string, FadingChunk>();
  private readonly defaultFadeSpeed = 0.08; // 约12-13帧完成淡入 (~200ms at 60fps)

  /**
   * 开始一个区块的淡入动画
   */
  startFadeIn(chunkKey: string, initialOpacity = 0): FadingChunk {
    const fade: FadingChunk = {
      key: chunkKey,
      currentOpacity: initialOpacity,
      targetOpacity: 1.0,
      fadeSpeed: this.defaultFadeSpeed,
      completed: false,
    };
    this.fadingChunks.set(chunkKey, fade);
    return fade;
  }

  /**
   * 更新所有进行中的淡入动画
   * 返回已完成淡入的区块keys
   */
  update(): string[] {
    const completed: string[] = [];

    for (const [key, fade] of this.fadingChunks) {
      if (fade.completed) continue;

      fade.currentOpacity += fade.fadeSpeed;

      if (fade.currentOpacity >= fade.targetOpacity) {
        fade.currentOpacity = fade.targetOpacity;
        fade.completed = true;
        completed.push(key);
        // 完成后保留在map中供后续查询，但标记为完成
      }
    }

    return completed;
  }

  /**
   * 获取指定区块的淡入状态
   */
  getFade(chunkKey: string): FadingChunk | undefined {
    return this.fadingChunks.get(chunkKey);
  }

  /**
   * 获取指定区块的当前透明度
   */
  getOpacity(chunkKey: string): number {
    const fade = this.fadingChunks.get(chunkKey);
    return fade?.currentOpacity ?? 1.0;
  }

  /**
   * 检查区块是否正在进行淡入
   */
  isFading(chunkKey: string): boolean {
    const fade = this.fadingChunks.get(chunkKey);
    return fade !== undefined && !fade.completed;
  }

  /**
   * 检查区块是否已完成淡入
   */
  hasCompleted(chunkKey: string): boolean {
    return this.fadingChunks.get(chunkKey)?.completed ?? false;
  }

  /**
   * 清理已完成的淡入记录
   */
  cleanupCompleted(): void {
    for (const [key, fade] of this.fadingChunks) {
      if (fade.completed) {
        this.fadingChunks.delete(key);
      }
    }
  }

  /**
   * 获取当前正在进行淡入的区块数量
   */
  getActiveCount(): number {
    let count = 0;
    for (const fade of this.fadingChunks.values()) {
      if (!fade.completed) count++;
    }
    return count;
  }

  /**
   * 停止特定区块的淡入
   */
  stopFade(chunkKey: string): void {
    this.fadingChunks.delete(chunkKey);
  }

  /**
   * 清空所有淡入状态
   */
  clear(): void {
    this.fadingChunks.clear();
  }
}
