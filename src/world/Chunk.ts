import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/Constants';
import { BlockType } from './BlockType';

export class Chunk {
  public data: Uint8Array;
  public x: number;
  public z: number;
  public needsUpdate = true;

  constructor(x: number, z: number) {
    this.x = x;
    this.z = z;
    this.data = new Uint8Array(CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE).fill(
      BlockType.AIR
    );
  }

  getBlock(x: number, y: number, z: number): BlockType {
    if (!this.isValidPosition(x, y, z)) return BlockType.AIR;
    const index = this.getIndex(x, y, z);
    return this.data[index] as BlockType;
  }

  setBlock(x: number, y: number, z: number, type: BlockType): void {
    if (!this.isValidPosition(x, y, z)) return;
    const index = this.getIndex(x, y, z);
    this.data[index] = type;
    this.needsUpdate = true;
  }

  isValidPosition(x: number, y: number, z: number): boolean {
    return (
      x >= 0 &&
      x < CHUNK_SIZE &&
      y >= 0 &&
      y < CHUNK_HEIGHT &&
      z >= 0 &&
      z < CHUNK_SIZE
    );
  }

  private getIndex(x: number, y: number, z: number): number {
    return y * CHUNK_SIZE * CHUNK_SIZE + z * CHUNK_SIZE + x;
  }

  markUpdated(): void {
    this.needsUpdate = false;
  }
}
