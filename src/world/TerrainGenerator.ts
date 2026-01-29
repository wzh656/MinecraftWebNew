import { Chunk } from './Chunk';
import { BlockType } from './BlockType';
import { CHUNK_SIZE, CHUNK_HEIGHT } from '../utils/Constants';

export class TerrainGenerator {
  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz);

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        const groundHeight = 3;

        for (let y = 0; y <= groundHeight && y < CHUNK_HEIGHT; y++) {
          let blockType: BlockType;

          if (y === groundHeight) {
            blockType = BlockType.GRASS;
          } else if (y >= groundHeight - 2) {
            blockType = BlockType.DIRT;
          } else {
            blockType = BlockType.STONE;
          }

          if (y === 4 && x % 4 === 2 && z % 4 === 2) {
            chunk.setBlock(x, y, z, BlockType.COMMAND_BLOCK);
          } else {
            chunk.setBlock(x, y, z, blockType);
          }
        }
      }
    }

    return chunk;
  }
}
