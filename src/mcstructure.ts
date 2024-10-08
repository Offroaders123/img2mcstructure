import type { Axis, IBlock, IMcStructure, StructurePalette } from "./types.js";
import { write, Int32, type IntTag } from "nbtify";
import { Image, GIF, Frame } from "imagescript";
import decode from "./_decode.js";
import createPalette from "./_palette.js";
import {
  BLOCK_VERSION,
  DEFAULT_BLOCK,
  MASK_BLOCK,
  MAX_DEPTH,
} from "./_constants.js";
import rotateStructure from "./_rotate.js";
import { compareStates, getNearestColor } from "./_lib.js";

export { createPalette, decode };

/**
 * Get the appropriate block for the given pixel color.
 * @param c Pixel color
 * @param palette Block palette
 * @returns Nearest, masked, or default block
 */
function convertBlock(
  c: number,
  palette: IBlock[],
): Pick<IBlock, "id" | "states" | "version"> {
  const [r, g, b, a] = Image.colorToRGBA(c);

  if (a < 128) {
    return {
      id: MASK_BLOCK,
      states: {},
      version: new Int32(BLOCK_VERSION),
    };
  }

  const nearestBlock = getNearestColor([r, g, b], palette);

  if (!nearestBlock) {
    return {
      id: DEFAULT_BLOCK,
      states: {},
      version: new Int32(BLOCK_VERSION),
    };
  }

  return {
    id: nearestBlock.id,
    states: nearestBlock.states ?? {},
    version: nearestBlock.version ?? BLOCK_VERSION,
  };
}

function findBlock(
  c: number,
  palette: IBlock[],
  blockPalette: StructurePalette,
): [Pick<IBlock, "id" | "states" | "version">, IntTag] {
  const nearest = convertBlock(c, palette);
  const blockIdx: IntTag = new Int32(blockPalette.findIndex(
    ({ name, states }) =>
      name === nearest.id && compareStates(nearest.states, states),
  ));

  return [nearest, blockIdx];
}

/**
 * Convert GIF / Image to .mcstructure file format
 * @param frames - The GIF or image source as an array
 * @param palette - The list of blocks permitted to be used in the structure
 */
export function constructDecoded(
  frames: GIF | Array<Image | Frame>,
  palette: IBlock[],
  _axis: Axis = "x",
): IMcStructure {
  /**
   * Block palette
   */
  const blockPalette: StructurePalette = [];

  /**
   * Block position data. First element is the position index. Second element is the block entity data.
   */
  // const positionData: Array<
  //   [number, Record<string, Record<string, number | string>>]
  // > = [];

  /**
   * Structure size (X, Y, Z)
   */
  const size: [IntTag, IntTag, IntTag] = [
    new Int32(frames[0].width),
    new Int32(frames[0].height),
    new Int32(frames.length),
  ];

  const [width, height, depth] = size.map(tag => tag.valueOf());

  const memo = new Map<
    number,
    [Pick<IBlock, "states" | "version" | "id">, IntTag]
  >();

  /**
   * Block indices primary layer
   */
  const layer: IntTag[] = Array.from({ length: width * height * depth }, () => new Int32(-1));
  const waterLayer: IntTag[] = layer.slice();

  const loopDepth = Math.min(MAX_DEPTH, depth);

  for (let z = 0; z < loopDepth; z++) {
    const img = frames[z];

    for (const [y, x, c] of img.iterateWithColors()) {
      let [nearest, blockIdx] = memo.get(c) ??
        findBlock(c, palette, blockPalette);

      if (blockIdx.valueOf() === -1) {
        blockIdx = new Int32(blockPalette.push({
          version: nearest.version ?? BLOCK_VERSION,
          name: nearest.id ?? DEFAULT_BLOCK,
          states: nearest.states ?? {},
        }) - 1);

        memo.set(c, [nearest, blockIdx]);
      }

      const key = (Math.abs(y - height) * width + (width - x)) * depth + z;

      layer[key] = blockIdx;
    }
  }

  const tag: IMcStructure = {
    format_version: new Int32(1),
    size,
    structure_world_origin: [new Int32(0), new Int32(0), new Int32(0)],
    structure: {
      block_indices: [layer.filter((i) => i.valueOf() !== -1), waterLayer],
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
export async function createMcStructure(
  frames: GIF | Array<Image | Frame>,
  palette: IBlock[],
  axis: Axis = "x",
  name = "img2mcstructure",
): Promise<Uint8Array> {
  const decoded = constructDecoded(frames, palette);
  const structure = axis !== "x" ? rotateStructure(decoded, axis) : decoded;

  return await write(structure, {
    rootName: name,
    endian: "little",
    compression: null,
    bedrockLevel: false,
  });
}

/**
 * Convert an image to a Minecraft Bedrock structure file.
 * @param imgSrc Image source
 * @param db Block palette
 * @param axis Axis on which to stack frames
 * @returns .mcstructure data
 */
export default async function img2mcstructure(
  imgSrc: string,
  db: IBlock[] = [],
  axis: Axis = "x",
): Promise<Uint8Array> {
  const img = await decode(imgSrc);

  return await createMcStructure(img, db, axis);
}
