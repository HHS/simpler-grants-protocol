import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, sep } from "node:path";
import process from "node:process";

const root = resolve(import.meta.dirname, "..");

// Bound every spawned subprocess so a hung pack, install, or probe fails the
// check instead of stalling CI indefinitely.
const SUBPROCESS_TIMEOUT_MS = 120_000;

// The registry install fetches runtime dependencies over the network, so give
// it a wider ceiling than the local compile/probe steps to avoid flaking on a
// slow registry or a cold CI cache.
const INSTALL_TIMEOUT_MS = 300_000;

/**
 * Run a subprocess, surfacing its captured output when it fails so CI logs
 * show the underlying error rather than an opaque non-zero exit.
 */
function run(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      stdio: "pipe",
      timeout: SUBPROCESS_TIMEOUT_MS,
      ...options,
    });
  } catch (error) {
    if (error.stdout) process.stderr.write(error.stdout);
    if (error.stderr) process.stderr.write(error.stderr);
    throw error;
  }
}

/**
 * Run a native ESM snippet in a fresh Node process rooted at the consumer
 * directory, with inherited loader flags cleared so tsx/ts-node cannot mask an
 * invalid published import. Node drives loader hooks through NODE_OPTIONS, so
 * clearing it removes the inherited --import/--loader vector.
 */
function runNodeModule(cwd, source) {
  const env = { ...process.env };
  delete env.NODE_OPTIONS;
  return run(process.execPath, ["--input-type=module", "--eval", source], {
    cwd,
    env,
  });
}

/** Resolve the consumer directory shared between the --prepare and --probe phases. */
function consumerDir() {
  return process.env.SDK_CONSUMER_DIR
    ? resolve(process.env.SDK_CONSUMER_DIR)
    : join(tmpdir(), "common-grants-sdk-consumer");
}

/**
 * Pack the SDK with pnpm (resolving catalog: dependencies) and install the
 * tarball into a fresh, workspace-external consumer with lifecycle scripts
 * disabled.
 */
function installPackedSdk(dir) {
  run("pnpm", ["pack", "--pack-destination", dir], { cwd: root });

  const tarball = readdirSync(dir).find(file => file.endsWith(".tgz"));
  assert(tarball, "pnpm pack did not create an SDK tarball");

  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ name: "sdk-package-consumer", private: true, type: "module" })
  );
  run("npm", ["install", "--ignore-scripts", "--no-audit", "--no-fund", join(dir, tarball)], {
    cwd: dir,
    timeout: INSTALL_TIMEOUT_MS,
  });
}

/**
 * Inspect the installed manifest and files: preserve the five subpaths with no
 * root export, confirm every export target exists as ESM, and reject compiled
 * tests, test utilities, and examples.
 */
function inspectInstalledPackage(dir) {
  const packageDir = join(dir, "node_modules", "@common-grants", "sdk");
  const manifest = JSON.parse(readFileSync(join(packageDir, "package.json"), "utf8"));

  assert.equal(manifest.type, "module");
  assert.equal(manifest.main, undefined, "the package must not declare a root export");
  assert.equal(
    Object.prototype.hasOwnProperty.call(manifest.exports, "."),
    false,
    "the package must not declare a root export"
  );
  assert.deepEqual(
    Object.keys(manifest.exports).sort(),
    ["./client", "./constants", "./extensions", "./schemas", "./types"],
    "the package must preserve exactly the five public subpaths"
  );

  for (const target of Object.values(manifest.exports)) {
    assert.match(target.default, /\.js$/);
    assert.match(target.types, /\.d\.ts$/);
    readFileSync(join(packageDir, target.default), "utf8");
    readFileSync(join(packageDir, target.types), "utf8");
  }

  // Normalize to posix separators so the forbidden-path regexes below match
  // regardless of the platform readdirSync runs on.
  const shippedPaths = readdirSync(packageDir, { recursive: true }).map(entry =>
    String(entry).split(sep).join("/")
  );
  assert.equal(
    shippedPaths.some(path => /(?:^|\/)__tests__(?:\/|$)/.test(path)),
    false,
    "compiled tests must be absent from the published package"
  );
  assert.equal(
    shippedPaths.some(path => /(?:^|\/)examples(?:\/|$)/.test(path)),
    false,
    "compiled examples must be absent from the published package"
  );
  assert.equal(
    shippedPaths.some(path =>
      /(?:^|\/)(?:helper|ajv-validator|fuzz-test|mock-fetch)\.(?:js|d\.ts)(?:\.map)?$/.test(path)
    ),
    false,
    "test utilities must be absent from the published package"
  );
}

/**
 * Type-check a consumer fixture that imports representative values and types
 * from all five subpaths against the installed declarations, under Node16
 * resolution with strict checking and no declaration-error suppression. The
 * compiler is pinned to the repository's installed TypeScript.
 */
function typeCheckConsumer(dir) {
  writeFileSync(
    join(dir, "tsconfig.json"),
    JSON.stringify({
      compilerOptions: {
        target: "ES2022",
        module: "Node16",
        moduleResolution: "Node16",
        strict: true,
        noEmit: true,
        skipLibCheck: false,
      },
      include: ["consumer.ts"],
    })
  );
  writeFileSync(
    join(dir, "consumer.ts"),
    `import { Client, type ClientConfig } from "@common-grants/sdk/client";
import { MoneySchema } from "@common-grants/sdk/schemas";
import type { Money, OppStatusOptions } from "@common-grants/sdk/types";
import { OppStatusOptions as OppStatusValues } from "@common-grants/sdk/constants";
import { definePlugin, type DefinePluginOptions } from "@common-grants/sdk/extensions";

const config: ClientConfig = { baseUrl: "https://api.example.org" };
const client = new Client(config);
const pluginOptions: DefinePluginOptions = {};
const pluginClient = definePlugin(pluginOptions).getClient(config);
const parsed = MoneySchema.safeParse({ amount: "100.00", currency: "USD" });
const money: Money | undefined = parsed.success ? parsed.data : undefined;
const status: OppStatusOptions = OppStatusValues.open;

void [client, pluginClient, money, status];
`
  );

  run(resolve(root, "node_modules", ".bin", "tsc"), ["--project", "tsconfig.json"], {
    cwd: dir,
  });
}

/**
 * Exercise the installed artifact with native Node, no loaders. Each subpath is
 * imported in its own process to expose entry-order initialization errors, then
 * a functional probe parses a valid schema value and constructs clients without
 * contacting any network service.
 */
function probeRuntime(dir) {
  for (const subpath of ["client", "schemas", "types", "constants", "extensions"]) {
    runNodeModule(dir, `await import("@common-grants/sdk/${subpath}");`);
  }

  runNodeModule(
    dir,
    `import assert from "node:assert/strict";

const { Client } = await import("@common-grants/sdk/client");
const schemas = await import("@common-grants/sdk/schemas");
const constants = await import("@common-grants/sdk/constants");
const { definePlugin } = await import("@common-grants/sdk/extensions");

const config = { baseUrl: "https://api.example.org" };
assert.ok(new Client(config), "expected a direct client instance");
assert.ok(definePlugin({}).getClient(config), "expected a plugin-bound client instance");
assert.equal(constants.OppStatusOptions.open, "open");

const parsed = schemas.MoneySchema.safeParse({ amount: "100.00", currency: "USD" });
assert.ok(parsed.success, "expected a valid Money value to parse");`
  );
}

/** Pack, install, and perform every toolchain-dependent check in one directory. */
function prepare(dir) {
  installPackedSdk(dir);
  inspectInstalledPackage(dir);
  typeCheckConsumer(dir);
}

const mode = process.argv[2];

if (mode === undefined) {
  const dir = mkdtempSync(join(tmpdir(), "common-grants-sdk-package-"));
  try {
    prepare(dir);
    probeRuntime(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
} else if (mode === "--prepare") {
  const dir = consumerDir();
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  prepare(dir);
} else if (mode === "--probe") {
  probeRuntime(consumerDir());
} else {
  throw new Error(`Unknown mode "${mode}". Use --prepare, --probe, or no argument.`);
}
