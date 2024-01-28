import type { Axis } from "../types.ts";
import { nanoid } from "../deps.ts";
import main from "../main.ts";

const structureId = nanoid(6);

await Deno.writeFile(
  `./stained_glass_window_${structureId}.mcstructure`,
  await main(
    Deno.args[0],
    Deno.args[1] ?? "x" as Axis,
    ({ id }) => id.includes("glass"),
  ),
);
