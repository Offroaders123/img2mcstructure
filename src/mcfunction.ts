import type { PaletteSource } from "./types.js";
import { Image } from "imagescript";
import { getNearestColor } from "./_lib.js";
import decode from "./_decode.js";
import createPalette from "./_palette.js";
import { MAX_DEPTH } from "./_constants.js";

/**
 * Convert an image to a series of `setblock` commands.
 * @param imgSrc Source image
 * @param blocks Block palette database
 * @param offset Coordinate offset to apply to the `setblock` function
 * @returns mcfunction lines
 */
export default async function img2mcfunction(
  imgSrc: string,
  blocks: PaletteSource,
  offset: [number, number, number] = [0, 0, 0],
): Promise<string> {
  const frames = await decode(imgSrc);

  const len = Math.min(MAX_DEPTH, frames.length);

  const lines = [];

  for (let z = 0; z < len; z++) {
    const img = frames[z];
    for (const [x, y, c] of img.iterateWithColors()) {
      const [r, g, b, a] = Image.colorToRGBA(c);

      if (a < 128) {
        continue;
      }

      const nearest = getNearestColor([r, g, b], createPalette(blocks));
      lines.push(
        `setblock ~${Number(x + offset[0])}~${
          Math.abs(img.height - y + offset[1])
        }~${offset[2]} ${nearest.id} replace`,
      );
    }
  }

  return lines.join("\n");
}
