import type { IBlock, RGB } from "./types.ts";
import { BLOCK_VERSION } from "./_constants.ts";

/**
 * Converts database of colors to palette of block data.
 * @see {@link IBlock}
 * @param db Block ID/Color database.
 * @returns Array of blocks.
 */
export default function createPalette(
  db: Record<string, string>,
) {
  const blockPalette: IBlock[] = [];

  for (const id in db) {
    const hexColor = db[id].toString();
    const color = hexColor.match(/[^#]{1,2}/g)!.map((x) =>
      parseInt(x, 16)
    ) as RGB;

    blockPalette.push({
      id,
      hexColor,
      color,
      states: {},
      version: BLOCK_VERSION,
    });
  }

  return blockPalette;
}
