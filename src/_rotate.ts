import { Int32, type IntTag } from "nbtify";
import type { Axis, IMcStructure } from "./types.js";

function rotateOverY(structure: IMcStructure): IMcStructure {
  const {
    size,
    structure: {
      block_indices: [layer],
    },
  } = structure;
  const [width, height, depth] = size.map(tag => tag.valueOf());

  const newLayer: IntTag[] = Array.from({ length: width * height * depth }, () => new Int32(-1));

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);

        newLayer[key] =
          layer[z * width * height + (height - y - 1) * width + x];
      }
    }
  }

  structure.size = [new Int32(width), new Int32(depth), new Int32(height)];

  structure.structure.block_indices[0] = newLayer;

  return structure;
}

function rotateOverZ(structure: IMcStructure): IMcStructure {
  const {
    size,
    structure: {
      block_indices: [layer],
    },
  } = structure;
  const [width, height, depth] = size.map(tag => tag.valueOf());

  const newLayer: IntTag[] = Array.from({ length: width * height * depth }, () => new Int32(-1));

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);

        newLayer[key] = layer[(depth - z - 1) * width * height + y * width + x];
      }
    }
  }

  structure.size = [new Int32(width), new Int32(height), new Int32(depth)];

  structure.structure.block_indices[0] = newLayer;

  return structure;
}

function rotateOverX(structure: IMcStructure): IMcStructure {
  const {
    size,
    structure: {
      block_indices: [layer],
    },
  } = structure;
  const [width, height, depth] = size.map(tag => tag.valueOf());

  const newLayer: IntTag[] = Array.from({ length: width * height * depth }, () => new Int32(-1));

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = z * width * height + y * width + (width - x - 1);

        newLayer[key] = layer[z * width * height + y * width + x];
      }
    }
  }

  structure.size = [new Int32(depth), new Int32(height), new Int32(width)];

  structure.structure.block_indices[0] = newLayer;

  return structure;
}

export default function rotateStructure(
  structure: IMcStructure,
  axis: Axis,
): IMcStructure {
  if (axis === "y") {
    return rotateOverY(structure);
  }

  if (axis === "z") {
    return rotateOverZ(structure);
  }

  return rotateOverX(structure);
}
