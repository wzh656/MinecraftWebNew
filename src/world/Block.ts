import { BlockType, isSolid, isTransparent, getTextureIndex } from './BlockType';

export class Block {
  constructor(public readonly type: BlockType) {}

  isSolid(): boolean {
    return isSolid(this.type);
  }

  isTransparent(): boolean {
    return isTransparent(this.type);
  }

  getTextureIndex(face: number): number {
    return getTextureIndex(this.type, face);
  }
}
