const sharp = require("sharp");
const { mkdir } = require("node:fs/promises");
const path = require("node:path");

async function main() {
  const root = path.resolve(__dirname, "..");
  const output = path.join(root, "store-assets");
  await mkdir(output, { recursive: true });
  const source = path.join(root, "apps", "mobile", "assets", "icon.png");

  const icon = await sharp(source).resize(512, 512).png().toBuffer();
  await sharp({
    create: { width: 512, height: 512, channels: 4, background: "#315cf4" },
  }).composite([{ input: icon, top: 0, left: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(output, "icon-512.png"));

  const background = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#101a3c"/><stop offset="1" stop-color="#172b6d"/></linearGradient>
      <radialGradient id="glow"><stop stop-color="#496ffa" stop-opacity=".42"/><stop offset="1" stop-color="#496ffa" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="1024" height="500" fill="url(#bg)"/>
    <circle cx="930" cy="72" r="360" fill="url(#glow)"/>
    <circle cx="930" cy="72" r="250" fill="none" stroke="#728dff" stroke-opacity=".13" stroke-width="2"/>
    <circle cx="930" cy="72" r="170" fill="none" stroke="#728dff" stroke-opacity=".14" stroke-width="2"/>
    <rect x="86" y="140" width="220" height="220" rx="54" fill="#6883ff" fill-opacity=".15"/>
    <text x="352" y="205" fill="#ffffff" font-family="Arial,sans-serif" font-size="62" font-weight="700">MémoCycle</text>
    <text x="355" y="258" fill="#dbe5ff" font-family="Arial,sans-serif" font-size="29">Révise au bon moment.</text>
    <rect x="354" y="297" width="126" height="39" rx="19.5" fill="#324988"/>
    <rect x="492" y="297" width="126" height="39" rx="19.5" fill="#324988"/>
    <rect x="630" y="297" width="126" height="39" rx="19.5" fill="#324988"/>
    <text x="417" y="323" fill="#e8eeff" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700">Planifier</text>
    <text x="555" y="323" fill="#e8eeff" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700">Réviser</text>
    <text x="693" y="323" fill="#e8eeff" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700">Retenir</text>
  </svg>`);
  const bannerIcon = await sharp(source).resize(190, 190).png().toBuffer();
  await sharp(background)
    .composite([{ input: bannerIcon, left: 101, top: 155 }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(output, "feature-graphic.png"));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
