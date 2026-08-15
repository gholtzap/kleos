import { describe, expect, it } from "vitest";
import {
  buildScriptsFor,
  runVercelBuild,
  type BuildScript,
} from "./release-build";

describe("Vercel release build", () => {
  it("migrates production before it builds", () => {
    expect(buildScriptsFor("production")).toEqual(["db:migrate", "build"]);
  });

  it("does not migrate shared databases from preview or local builds", () => {
    expect(buildScriptsFor("preview")).toEqual(["build"]);
    expect(buildScriptsFor(undefined)).toEqual(["build"]);
  });

  it("stops before the build when migration fails", () => {
    const executed: BuildScript[] = [];
    expect(() => runVercelBuild("production", (script) => {
      executed.push(script);
      if (script === "db:migrate") throw new Error("migration failed");
    })).toThrow("migration failed");
    expect(executed).toEqual(["db:migrate"]);
  });
});
