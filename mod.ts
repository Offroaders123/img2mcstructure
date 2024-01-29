import type { Axis, IBlock, IMcStructure, RGB } from "./types.ts";
import { hex2rgb, imagescript, nbt } from "./deps.ts";
import {
  BLOCK_VERSION,
  DEFAULT_BLOCK,
  MASK_BLOCK,
  MAX_DEPTH,
} from "./_constants.ts";
import rotateStructure from "./_rotate.ts";

/**
 * Calculate the distance between two RGB colors.
 * @param color1 RGB color to compare
 * @param color2 RGB color to compare
 * @returns Distance between the two colors
 */
export function colorDistance(color1: RGB, color2: RGB) {
  return Math.sqrt(
    Math.pow(color1[0] - color2[0], 2) + Math.pow(color1[1] - color2[1], 2) +
      Math.pow(color1[2] - color2[2], 2),
  );
}

/**
 * Attempt to find the nearest block to the given color.
 * @param color RGB color to compare
 * @param palette Array of blocks to compare against
 * @returns The block which is closest to the given color
 */
export function getNearestColor(
  color: RGB,
  palette: IBlock[],
): IBlock {
  // https://gist.github.com/Ademking/560d541e87043bfff0eb8470d3ef4894?permalink_comment_id=3720151#gistcomment-3720151
  return palette.reduce(
    (prev: [number, IBlock], curr: IBlock): [number, IBlock] => {
      const distance = colorDistance(color, hex2rgb(curr.hexColor));

      return (distance < prev[0]) ? [distance, curr] : prev;
    },
    [Number.POSITIVE_INFINITY, palette[0]],
  )[1];
}

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(
  c: number,
  palette: IBlock[],
): Pick<IBlock, "id" | "states"> {
  const [r, g, b, a] = imagescript.Image.colorToRGBA(c);

  if (a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
    };
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return {
      id: DEFAULT_BLOCK,
      states: {},
    };
  }

  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
  };
}

/**
 * Convert GIF / Image to .mcstructure file format
 * @param frames - The GIF or image source as an array
 * @param palette - The list of blocks permitted to be used in the structure
 */
export function constructDecoded(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
) {
  /**
   * Block palette
   */
  const blockPalette: Array<{
    version: number;
    name: string;
    states: Record<string, unknown>;
  }> = [];

  /**
   * Block position data. First element is the position index. Second element is the block entity data.
   */
  // const positionData: Array<
  //   [number, Record<string, Record<string, number | string>>]
  // > = [];

  /**
   * Structure size (X, Y, Z)
   */
  const size: [number, number, number] = [
    frames[0].width,
    frames[0].height,
    Math.min(MAX_DEPTH, frames.length),
  ];

  const [width, height, depth] = size;

  const memo = new Map<number, [string, number]>();

  /**
   * Block indices primary layer
   */
  const layer = Array.from({ length: width * height * depth }, () => -1);
  const waterLayer = layer.slice();

  for (let z = 0; z < depth; z++) {
    const img = frames[z];

    // FIXME: Image must be rotated 90 degrees for some reason
    img.rotate(90);

    for (const [x, y, c] of img.iterateWithColors()) {
      const [memoizedNearest, memoizedIdx] = memo.get(c) ?? [null, null];
      const nearest = memoizedNearest ?? convertBlock(c, palette).id;

      let blockIdx = memoizedIdx ??
        blockPalette.findIndex(({ name }) => name === nearest);

      if (blockIdx === -1) {
        blockIdx = blockPalette.push(
          {
            version: BLOCK_VERSION,
            name: nearest,
            states: {},
          },
        ) - 1;

        memo.set(c, [nearest, blockIdx]);
      }

      const key = (z * img.width * img.height) + (y * img.width) +
        (img.width - x - 1);

      layer[key] = blockIdx;
    }
  }

  const tag: IMcStructure = {
    format_version: 1,
    size,
    structure_world_origin: [0, 0, 0],
    structure: {
      block_indices: [layer.filter((i) => i !== -1), waterLayer],
      entities: [],
      palette: {
        default: {
          block_palette: blockPalette,
          block_position_data: {},
        },
      },
    },
  };

  return tag;
}

/**
 * Convert GIF / Image to .mcstructure file format
 * @param frames Decoded frames
 * @param palette Blocks to use in the structure
 * @param axis The axis to rotate the structure over. Defaults to "x"
 * @param name Optional name for the structure. Defaults to "img2mcstructure"
 * @returns NBT data as a buffer
 */
export async function createStructure(
  frames: imagescript.GIF | Array<imagescript.Image | imagescript.Frame>,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2mcstructure",
) {
  const decoded = constructDecoded(frames, palette);
  const structure = JSON.stringify(
    axis !== "x" ? rotateStructure(decoded, axis) : decoded,
  );

  return await nbt.write(nbt.parse(structure), {
    name,
    endian: "little",
    compression: null,
    bedrockLevel: null,
  });
}
