/**
 * Keyboard regression checks for #355 against every HTML page in dist/client.
 * Run after the normal build. Requires the Chromium installed for check:a11y.
 * No screen reader, publishing, API execution, or external requests are used.
 */
import * as fs from "node:fs";
import * as http from "node:http";
import * as path from "node:path";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { AddressInfo } from "node:net";
import { chromium, type Browser, type Page } from "playwright";

const WEBSITE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const CLIENT = path.join(WEBSITE, "dist/client");
const SETTLE_MS = 2_500;
const API_SETTLE_MS = 15_000;
// Every built HTML page is checked; there are no route exemptions.
const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".yaml": "text/yaml; charset=utf-8",
  ".yml": "text/yaml; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".wasm": "application/wasm",
};

function requireCondition(
  condition: unknown,
  message: string,
): asserts condition {
  if (!condition) throw new Error(message);
}

function buildDigest(root: string, dir = root): string {
  const hash = createHash("sha256");
  for (const entry of fs
    .readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name))) {
    const file = path.join(dir, entry.name);
    hash.update(path.relative(root, file));
    if (entry.isDirectory()) hash.update(buildDigest(root, file));
    else if (entry.isFile()) hash.update(fs.readFileSync(file));
  }
  return hash.digest("hex");
}

function routes(root: string, dir = root): string[] {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) return routes(root, file);
    if (!entry.isFile() || !entry.name.endsWith(".html")) return [];
    const relative = path.relative(root, file).split(path.sep).join("/");
    return ["/" + relative.replace(/(^|\/)index\.html$/, "$1")];
  });
}

async function serve(): Promise<http.Server> {
  const server = http.createServer((request, response) => {
    let file: string | undefined;
    try {
      const urlPath = decodeURIComponent(
        new URL(request.url ?? "/", "http://localhost").pathname,
      );
      const candidate = path.resolve(CLIENT, "." + urlPath);
      if (candidate === CLIENT || candidate.startsWith(CLIENT + path.sep)) {
        file = [
          candidate,
          path.join(candidate, "index.html"),
          candidate + ".html",
        ].find((name) => fs.existsSync(name) && fs.statSync(name).isFile());
      }
    } catch {
      // Malformed URLs fail as missing resources, never escape the build root.
    }
    if (!file) {
      response.writeHead(404);
      response.end("Not found");
      return;
    }
    response.writeHead(200, {
      "Content-Type": TYPES[path.extname(file)] ?? "application/octet-stream",
    });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  return server;
}

async function snapshot(page: Page) {
  return page.evaluate(() => {
    const link = document.querySelector<HTMLAnchorElement>("a.sl-skip-link");
    const target = link && document.getElementById(link.hash.slice(1));
    const rect = target?.getBoundingClientRect();
    const header = document.querySelector("header")?.getBoundingClientRect();
    const active = document.activeElement;
    return {
      at: Date.now(),
      readyState: document.readyState,
      targetId: target?.id,
      targetInMain: !!target?.closest("main"),
      targetFocused: !!target && active === target,
      targetTop: rect?.top,
      targetBottom: rect?.bottom,
      targetHeight: rect?.height,
      headerBottom: header?.bottom ?? 0,
      viewportHeight: innerHeight,
      activeTag: active?.tagName,
      activeId: active?.id,
      activeText: active?.textContent?.trim().slice(0, 100),
      activeInMain: !!active?.closest("main"),
    };
  });
}

function checkTarget(state: Awaited<ReturnType<typeof snapshot>>) {
  requireCondition(state.targetInMain, "Skip target is outside main");
  requireCondition(state.targetFocused, "Skip did not move actual DOM focus");
  requireCondition(
    state.targetHeight &&
      state.targetTop !== undefined &&
      state.targetTop >= state.headerBottom - 1 &&
      state.targetBottom !== undefined &&
      state.targetBottom <= state.viewportHeight,
    "Skip target is hidden or obscured by the header/viewport",
  );
}

async function checkSkip(browser: Browser, origin: string, route: string) {
  const result: Record<string, unknown> = { kind: "skip", route };
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await context.route("**/*", (request) =>
      new URL(request.request().url()).origin === origin
        ? request.continue()
        : request.abort(),
    );
    const page = await context.newPage();
    const response = await page.goto(origin + route, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    result.httpStatus = response?.status();
    requireCondition(response?.ok(), "Page did not load successfully");
    const link = page.locator("a.sl-skip-link");
    requireCondition(
      (await link.count()) === 1,
      "Expected exactly one skip link",
    );
    // Swagger can replace its panel after networkidle. Wait on rendered data,
    // without using the repaired accessible name as a readiness precondition.
    if (route === "/protocol/api-docs/") {
      await page.waitForFunction(
        () => {
          const mount = document.getElementById("swagger-ui");
          return (
            mount?.querySelector<HTMLSelectElement>(
              ".scheme-container .servers select",
            )?.value === "/api/v0.5.0" &&
            mount
              ?.querySelector(".info .version")
              ?.textContent?.includes("0.5.0")
          );
        },
        undefined,
        { timeout: 15_000 },
      );
    }
    result.ready = await snapshot(page);
    await page.keyboard.press("Tab");
    requireCondition(
      await link.evaluate((element) => element === document.activeElement),
      "First keyboard Tab did not reach the skip link",
    );
    requireCondition(
      await link.isVisible(),
      "Focused skip link is not visible",
    );
    result.linkReachedByKeyboard = true;
    await page.keyboard.press("Enter");
    result.immediate = await snapshot(page);
    checkTarget(result.immediate as Awaited<ReturnType<typeof snapshot>>);
    const wait = route === "/protocol/api-docs/" ? API_SETTLE_MS : SETTLE_MS;
    // This is a deliberate stability observation, not a readiness workaround.
    await page.waitForTimeout(wait);
    result.settled = await snapshot(page);
    result.minimumWaitMs = wait;
    checkTarget(result.settled as Awaited<ReturnType<typeof snapshot>>);
    await page.keyboard.press("Tab");
    const next = await snapshot(page);
    result.nextTab = next;
    if (route === "/protocol/api-docs/") {
      requireCondition(
        next.activeInMain && next.activeId === "version-select",
        "Next Tab on API docs did not reach API Version inside main",
      );
    }
    // Other templates have different following controls; preserve the actual
    // next-Tab result without pretending that they all contain API Version.
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await context.close();
  }
  return result;
}

async function checkServer(browser: Browser, origin: string) {
  const result: Record<string, unknown> = {
    kind: "server",
    route: "/protocol/api-docs/",
  };
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  try {
    await context.route("**/*", (request) =>
      new URL(request.request().url()).origin === origin
        ? request.continue()
        : request.abort(),
    );
    const page = await context.newPage();
    const response = await page.goto(
      origin + "/protocol/api-docs/?version=0.5.0",
      {
        waitUntil: "networkidle",
        timeout: 60_000,
      },
    );
    requireCondition(response?.ok(), "API page did not load");
    const version = page.getByRole("combobox", {
      name: "API Version",
      exact: true,
    });
    const servers = page.locator(
      "#swagger-ui .scheme-container .servers select",
    );
    const observations: Array<{
      version: string;
      name: string;
      value: string;
      url: string;
      at: number;
    }> = [];
    result.observations = observations;
    for (const value of ["0.5.0", "0.4.0"]) {
      if (value === "0.4.0") {
        // Public native combobox interaction; no direct render-function call.
        await version.selectOption(value);
      }
      await page.waitForFunction(
        (expected) => {
          const mount = document.getElementById("swagger-ui");
          const select = mount?.querySelector<HTMLSelectElement>(
            ".scheme-container .servers select",
          );
          return (
            select?.value === `/api/v${expected}` &&
            mount
              ?.querySelector(".info .version")
              ?.textContent?.includes(expected)
          );
        },
        value,
        { timeout: 15_000 },
      );
      requireCondition(
        (await servers.count()) === 1,
        "Expected one top-level Server selector",
      );
      const server = page.getByRole("combobox", {
        name: "Server",
        exact: true,
      });
      requireCondition(
        (await server.count()) === 1,
        "Server accessible name is missing or ambiguous",
      );
      requireCondition(
        (await server.inputValue()) === `/api/v${value}`,
        "Wrong Server value",
      );
      requireCondition(
        (await version.inputValue()) === value,
        "Wrong API Version value",
      );
      requireCondition(
        new URL(page.url()).searchParams.get("version") === value,
        "Wrong URL version after redraw",
      );
      observations.push({
        version: value,
        name: "Server",
        value: await server.inputValue(),
        url: page.url(),
        at: Date.now(),
      });
    }
    result.status = "PASS";
  } catch (error) {
    result.status = "FAIL";
    result.error = error instanceof Error ? error.message : String(error);
  } finally {
    await context.close();
  }
  return result;
}

async function main() {
  requireCondition(
    fs.existsSync(path.join(CLIENT, "index.html")),
    "Missing dist/client: run the normal website build first",
  );
  const pages = routes(CLIENT).sort();
  requireCondition(
    pages.includes("/protocol/api-docs/"),
    "API docs missing from build",
  );
  const buildSHA256 = buildDigest(CLIENT);
  const server = await serve();
  let browser: Browser | undefined;
  const results: Record<string, unknown>[] = [];
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    const head = execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: WEBSITE,
      encoding: "utf8",
    }).trim();
    browser = await chromium.launch();
    for (const route of pages) {
      results.push(await checkSkip(browser, origin, route));
    }
    results.push(await checkServer(browser, origin));
    requireCondition(
      buildDigest(CLIENT) === buildSHA256,
      "Built files changed during the check",
    );
    const dirtyStatus = execFileSync("git", ["status", "--porcelain=v1"], {
      cwd: WEBSITE,
      encoding: "utf8",
    }).trim();
    const workingDiff = execFileSync("git", ["diff", "HEAD", "--binary"], {
      cwd: WEBSITE,
      encoding: "utf8",
    });
    const report = {
      head,
      sourceDirty: dirtyStatus.length > 0,
      checkScriptSHA256: createHash("sha256")
        .update(fs.readFileSync(fileURLToPath(import.meta.url)))
        .digest("hex"),
      sourceStatus: dirtyStatus,
      trackedWorkingDiffSHA256: createHash("sha256")
        .update(workingDiff)
        .digest("hex"),
      buildProvenance:
        "buildSHA256 identifies actual served files; HEAD and dirty status do not independently establish which source built them",
      browser: browser.version(),
      platform: process.platform,
      build: "dist/client",
      buildSHA256,
      pageCount: pages.length,
      results,
    };
    console.log(JSON.stringify(report, null, 2));
    return results.some((result) => result.status === "FAIL") ? 1 : 0;
  } finally {
    await browser?.close();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error);
    process.exitCode = 1;
  },
);
