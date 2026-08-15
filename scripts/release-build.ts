import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export type BuildScript = "build" | "db:migrate";

export function buildScriptsFor(environment: string | undefined): readonly BuildScript[] {
  return environment === "production"
    ? ["db:migrate", "build"]
    : ["build"];
}

function runNpmScript(script: BuildScript): void {
  const npmCli = process.env.npm_execpath;
  if (!npmCli) throw new Error("npm_execpath is required.");
  const result = spawnSync(process.execPath, [npmCli, "run", script], {
    env: process.env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${script} failed with exit code ${result.status ?? "unknown"}.`);
  }
}

export function runVercelBuild(
  environment: string | undefined,
  run: (script: BuildScript) => void = runNpmScript,
): void {
  for (const script of buildScriptsFor(environment)) run(script);
}

const entryPoint = process.argv[1];
if (entryPoint && import.meta.url === pathToFileURL(resolve(entryPoint)).href) {
  runVercelBuild(process.env.VERCEL_ENV);
}
