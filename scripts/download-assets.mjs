import { mkdir, writeFile } from "node:fs/promises";

const destination = new URL("../public/x-assets/", import.meta.url);

const assets = [
  ["chirp-light.woff2", "https://abs.twimg.com/responsive-web/client-web/Chirp-Light.3a18e64a.woff2"],
  ["chirp-regular.woff2", "https://abs.twimg.com/responsive-web/client-web/Chirp-Regular.80fda27a.woff2"],
  ["chirp-medium.woff2", "https://abs.twimg.com/responsive-web/client-web/Chirp-Medium.f8e2739a.woff2"],
  ["chirp-bold.woff2", "https://abs.twimg.com/responsive-web/client-web/Chirp-Bold.ebb56aba.woff2"],
  ["chirp-heavy.woff2", "https://abs.twimg.com/responsive-web/client-web/Chirp-Heavy.f44ae4ea.woff2"],
  ["icon-ios.png", "https://abs.twimg.com/responsive-web/client-web/icon-ios.77d25eba.png"],
  ["icon.svg", "https://abs.twimg.com/responsive-web/client-web/icon-svg.ea5ff4aa.svg"],
  ["gavin.jpg", "https://pbs.twimg.com/profile_images/2080589693763084288/o2KnXk3G_normal.jpg"],
  ["josh.jpg", "https://pbs.twimg.com/profile_images/2014069436626710528/vEinr5dz_normal.jpg"],
  ["brayden.jpg", "https://pbs.twimg.com/profile_images/2016613099034345472/zHWjcVEQ_bigger.jpg"],
  ["daniel.jpg", "https://pbs.twimg.com/profile_images/1918297484805177344/TyBFSTiW_normal.jpg"],
  ["david.jpg", "https://pbs.twimg.com/profile_images/1648718535038758913/l_64B_Ae_normal.jpg"],
  ["josh-video.jpg", "https://pbs.twimg.com/amplify_video_thumb/2085797304112480256/img/bCObnH38sXv5xuzE.jpg"],
  ["brayden-post.jpg", "https://pbs.twimg.com/media/HPIXIP5WwAAXLyA?format=jpg&name=large"],
  ["daniel-chart.jpg", "https://pbs.twimg.com/media/HPHw9CmXAAEMyO2?format=jpg&name=large"],
  ["liner-post.jpg", "https://pbs.twimg.com/media/HO13J2YaEAA1_SS?format=jpg&name=large"],
];

await mkdir(destination, { recursive: true });

async function download([name, url]) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`${name}: ${response.status}`);
  await writeFile(new URL(name, destination), Buffer.from(await response.arrayBuffer()));
  return name;
}

const downloaded = [];
for (let index = 0; index < assets.length; index += 4) {
  const batch = assets.slice(index, index + 4);
  const results = await Promise.allSettled(batch.map(download));
  for (const result of results) {
    if (result.status === "rejected") throw result.reason;
    downloaded.push(result.value);
  }
}

console.log(`Downloaded ${downloaded.length} X assets.`);
