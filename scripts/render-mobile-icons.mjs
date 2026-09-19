import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = await readFile(new URL("../apps/mobile/assets/icon-source.svg", import.meta.url));
const adaptive = await readFile(new URL("../apps/mobile/assets/adaptive-icon-source.svg", import.meta.url));

await Promise.all([
  sharp(source).resize(1024, 1024).png().toFile(fileURLToPath(new URL("../apps/mobile/assets/icon.png", import.meta.url))),
  sharp(adaptive).resize(1024, 1024).png().toFile(fileURLToPath(new URL("../apps/mobile/assets/adaptive-icon.png", import.meta.url))),
  sharp(source).resize(512, 512).png().toFile(fileURLToPath(new URL("../store-assets/icon-512.png", import.meta.url))),
  ...Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 }).flatMap(([density, size]) => [
    sharp(source).resize(size, size).webp().toFile(fileURLToPath(new URL(`../apps/mobile/android/app/src/main/res/mipmap-${density}/ic_launcher.webp`, import.meta.url))),
    sharp(source).resize(size, size).webp().toFile(fileURLToPath(new URL(`../apps/mobile/android/app/src/main/res/mipmap-${density}/ic_launcher_round.webp`, import.meta.url))),
    sharp(adaptive).resize(Math.round(size * 2.25), Math.round(size * 2.25)).webp().toFile(fileURLToPath(new URL(`../apps/mobile/android/app/src/main/res/mipmap-${density}/ic_launcher_foreground.webp`, import.meta.url))),
  ]),
]);
