import { mkdir, writeFile } from "node:fs/promises";

const assets = [
  ["gavin-profile.jpg", "https://pbs.twimg.com/profile_images/2080589693763084288/o2KnXk3G_400x400.jpg"],
  ["gavin-banner.jpg", "https://pbs.twimg.com/profile_banners/1051879412478558208/1774824982/1500x500"],
  ["santi.jpg", "https://pbs.twimg.com/profile_images/2085570527842709504/HBZ5dEMm_x96.jpg"],
  ["dima.jpg", "https://pbs.twimg.com/profile_images/1034477941160402944/aayOR8O6_x96.jpg"],
  ["tim.jpg", "https://pbs.twimg.com/profile_images/1257956650281033729/nL9RKfVT_normal.jpg"],
  ["linear-detail.jpg", "https://pbs.twimg.com/amplify_video_thumb/2083074089078452224/img/Eig4Wti-7ty-of86.jpg"],
  ["starbucks-terminal.jpg", "https://pbs.twimg.com/amplify_video_thumb/2084273112221093888/img/9YQJHEGw2jyOLIXX.jpg"],
  ["matt.jpg", "https://pbs.twimg.com/profile_images/1678127997637754881/67TRXl2-_x96.jpg"],
  ["jonah.jpg", "https://pbs.twimg.com/profile_images/1679872386634481671/CTmTaIi5_x96.jpg"],
  ["peter.png", "https://pbs.twimg.com/profile_images/1131851609774985216/OcsssQ9J_x96.png"],
];

await mkdir(new URL("../public/x-assets/", import.meta.url), { recursive: true });

async function download([name, url]) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: ${response.status} ${response.statusText}`);
  await writeFile(new URL(`../public/x-assets/${name}`, import.meta.url), Buffer.from(await response.arrayBuffer()));
}

for (let index = 0; index < assets.length; index += 4) {
  await Promise.all(assets.slice(index, index + 4).map(download));
}

console.log(`Downloaded ${assets.length} X profile assets.`);
