import { type Frame, GIF, Image } from "imagescript";
import { readFile } from "node:fs/promises";
import { MAX_HEIGHT, MAX_WIDTH } from "./_constants.js";

export type DecodedFrames = GIF | Array<Image | Frame>;

/**
 * Decode an image from a URL
 * @param imgSrc Image URL
 * @returns Array of decoded frames
 */
async function decodeUrl({ href }: URL): Promise<DecodedFrames> {
  const res = await fetch(href);
  const data = new Uint8Array(await res.arrayBuffer());

  return !href.endsWith(".gif")
    ? [await Image.decode(data)]
    : ([...(await GIF.decode(data, false))] as GIF);
}

/**
 * Decode an image from a file path
 * @param path Image file path
 * @returns Array of decoded frames
 */
async function decodeImageFile(
  path: string,
  data: Uint8Array,
): Promise<DecodedFrames> {
  return !path.endsWith(".gif")
    ? [await Image.decode(data)]
    : ([...(await GIF.decode(data, false))] as GIF);
}

/**
 * Decode an image from a base64 string
 * @param base64 Base64 string
 * @returns Array of decoded frames
 */
async function decodeBase64(base64: string): Promise<DecodedFrames> {
  const data = new Uint8Array(
    atob(base64.replace(/^data:image\/(png|jpeg|gif);base64,/, ""))
      .split("")
      .map((x) => x.charCodeAt(0)),
  );

  return !base64.startsWith("data:image/gif")
    ? [await Image.decode(data)]
    : ([...(await GIF.decode(data, false))] as GIF);
}

/**
 * Decode an image from a URL, file path, or base64 string.\
 * Returns an array of resized frames.
 * @param path Image URL, file path, or base64 string
 * @param clamp Whether to resize frames above the max width/height
 * @returns Array of decoded frames
 */
export default async function decode(
  path: string,
  clamp = false,
): Promise<DecodedFrames> {
  let img = null;

  if (path.startsWith("http")) {
    img = await decodeUrl(new URL(path));
  }

  if (path.startsWith("data:image")) {
    img = await decodeBase64(path);
  }

  if (!img) {
    img = await decodeImageFile(path, await readFile(path));
  }

  if (!clamp) {
    return img;
  }

  // Resize every frame above the max width/height
  const frames =
    img?.map((i: Image | Frame) =>
      i.height > MAX_HEIGHT
        ? i.resize(Image.RESIZE_AUTO, MAX_HEIGHT)
        : i.width > MAX_WIDTH
        ? i.resize(MAX_WIDTH, Image.RESIZE_AUTO)
        : i
    ) ?? [];

  return frames satisfies DecodedFrames;
}
