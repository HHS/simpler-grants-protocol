import { execFileSync } from "node:child_process";
import { describe, it } from "vitest";

describe("published package", () => {
  it("passes the isolated ESM consumer smoke test", () => {
    execFileSync(process.execPath, ["scripts/smoke-package.mjs"], {
      cwd: process.cwd(),
      stdio: "pipe",
    });
  });
});
