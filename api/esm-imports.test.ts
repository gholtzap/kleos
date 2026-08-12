import { access, readFile, readdir } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = resolve(import.meta.dirname, "..");
const relativeImport = /\bfrom\s+["'](\.{1,2}\/[^"']+)["']/g;

describe("server ESM imports", () => {
  it("uses Node-resolvable extensions across the API module graph", async () => {
    const candidates = (await readdir(join(projectRoot, "api")))
      .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"))
      .map((file) => join(projectRoot, "api", file));
    const apiFiles: string[] = [];
    for (const file of candidates) {
      if ((await readFile(file, "utf8")).includes("export default")) {
        apiFiles.push(file);
      }
    }
    const pending = [...apiFiles];
    const checked = new Set<string>();

    while (pending.length) {
      const file = pending.pop();
      if (!file || checked.has(file)) continue;
      checked.add(file);
      const source = await readFile(file, "utf8");

      for (const match of source.matchAll(relativeImport)) {
        const specifier = match[1];
        expect(specifier, `${relative(projectRoot, file)} import`).toMatch(
          /\.js$/,
        );
        if (!specifier?.endsWith(".js")) continue;
        const dependency = resolve(dirname(file), specifier.replace(/\.js$/, ".ts"));
        await access(dependency);
        if (dependency.startsWith(projectRoot)) pending.push(dependency);
      }
    }
  });
});
