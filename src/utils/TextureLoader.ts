import { Texture, NearestFilter, RepeatWrapping } from "three";

export class TextureLoader {
  private textureAtlas: Texture | null = null;
  private textureSize = 16;
  private atlasWidth = 128;
  private atlasHeight = 64;
  private cols = 8;

  async load(url: string): Promise<Texture> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.crossOrigin = "anonymous";
      image.onload = () => {
        this.textureAtlas = new Texture(image);
        this.textureAtlas.magFilter = NearestFilter;
        this.textureAtlas.minFilter = NearestFilter;
        this.textureAtlas.wrapS = RepeatWrapping;
        this.textureAtlas.wrapT = RepeatWrapping;
        this.textureAtlas.needsUpdate = true;
        resolve(this.textureAtlas);
      };
      image.onerror = reject;
      image.src = url;
    });
  }

  getTexture(): Texture | null {
    return this.textureAtlas;
  }

  getUVs(textureIndex: number): {
    u1: number;
    v1: number;
    u2: number;
    v2: number;
  } {
    if (textureIndex < 0) {
      return { u1: 0, v1: 0, u2: 0, v2: 0 };
    }

    const col = textureIndex % this.cols;
    const row = Math.floor(textureIndex / this.cols);

    const u1 = (col * this.textureSize) / this.atlasWidth;
    const v1 = 1 - ((row + 1) * this.textureSize) / this.atlasHeight;
    const u2 = ((col + 1) * this.textureSize) / this.atlasWidth;
    const v2 = 1 - (row * this.textureSize) / this.atlasHeight;

    return { u1, v1, u2, v2 };
  }
}
