import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");
const temp = mkdtempSync(join(tmpdir(), "common-grants-sdk-package-"));

try {
  execFileSync("pnpm", ["pack", "--pack-destination", temp], {
    cwd: root,
    stdio: "pipe",
  });

  const tarball = readdirSync(temp).find(file => file.endsWith(".tgz"));
  assert(tarball, "pnpm pack did not create an SDK tarball");

  writeFileSync(
    join(temp, "package.json"),
    JSON.stringify({ name: "sdk-package-consumer", private: true, type: "module" })
  );
  execFileSync(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(temp, tarball)],
    { cwd: temp, stdio: "pipe" }
  );

  execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "--eval",
      `const [{ Client }, schemas, , constants, { definePlugin }] = await Promise.all([
        import("@common-grants/sdk/client"),
        import("@common-grants/sdk/schemas"),
        import("@common-grants/sdk/types"),
        import("@common-grants/sdk/constants"),
        import("@common-grants/sdk/extensions"),
      ]);

      const config = { baseUrl: "https://api.example.org" };
      new Client(config);
      definePlugin({}).getClient(config);
      schemas.OpportunityBaseSchema.safeParse({});
      if (constants.OppStatusOptions.open !== "open") process.exit(1);`,
    ],
    { cwd: temp, stdio: "pipe" }
  );

  const packageDir = join(temp, "node_modules", "@common-grants", "sdk");
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));
  assert.equal(manifest.type, "module");

  for (const target of Object.values(manifest.exports)) {
    assert.match(target.default, /\.js$/);
    assert.match(target.types, /\.d\.ts$/);
    readFileSync(join(packageDir, target.default), "utf8");
    readFileSync(join(packageDir, target.types), "utf8");
  }

  const shippedPaths = readdirSync(packageDir, { recursive: true }).map(String);
  assert.equal(
    shippedPaths.some(path => path.includes("__tests__")),
    false
  );
  assert.equal(
    shippedPaths.some(path =>
      /(?:^|\/)(?:helper|ajv-validator|fuzz-test|mock-fetch)\.(?:js|d\.ts)(?:\.map)?$/.test(path)
    ),
    false
  );

  writeFileSync(
    join(temp, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      include: ["consumer.ts"],
    })
  );
  writeFileSync(
    join(temp, "consumer.ts"),
    `import { Client, type ClientConfig } from "@common-grants/sdk/client";
import { OpportunityBaseSchema } from "@common-grants/sdk/schemas";
import type { OpportunityBase, OppStatusOptions } from "@common-grants/sdk/types";
import { OppStatusOptions as OppStatusValues } from "@common-grants/sdk/constants";
import { definePlugin, type DefinePluginOptions } from "@common-grants/sdk/extensions";

const config: ClientConfig = { baseUrl: "https://api.example.org" };
const client = new Client(config);
const pluginOptions: DefinePluginOptions = {};
const pluginClient = definePlugin(pluginOptions).getClient(config);
const parsed = OpportunityBaseSchema.safeParse({});
const opportunity: OpportunityBase | undefined = parsed.success ? parsed.data : undefined;
const status: OppStatusOptions = OppStatusValues.open;

void [client, pluginClient, opportunity, status];
`
  );

  execFileSync(resolve(root, "node_modules", ".bin", "tsc"), ["--project", "tsconfig.json"], {
    cwd: temp,
    stdio: "pipe",
  });
} finally {
  rmSync(temp, { recursive: true, force: true });
}
