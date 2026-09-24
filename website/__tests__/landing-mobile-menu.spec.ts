import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { Paths } from "@/lib/schema/paths";

/**
 * Guards the landing page's phone menu (src/routeData.ts) and the Starlight
 * markup the landing-page rules in src/styles/custom.css depend on, so a
 * Starlight upgrade that breaks either fails here instead of in production.
 *
 * Requires a build: `pnpm --filter website build` writes the pages under test.
 */

const CLIENT_DIR = path.join(Paths.WEBSITE_ROOT, "dist", "client");

// Starlight's menu button opens its sidebar pane by this id.
const MENU_ID = "starlight__sidebar";

// The sidebar's "Getting started" entry (astro.config.mjs), so an empty or
// unrelated pane can't pass.
const KNOWN_SIDEBAR_LINK = 'href="/getting-started"';

interface Tag {
  name: string;
  attrs: Record<string, string>;
  end: number;
}

/** Opening tags and their attributes. Enough for built pages, not a parser. */
function openingTags(html: string): Tag[] {
  return [...html.matchAll(/<([a-z][\w-]*)(\s[^>]*)?>/gi)].map((match) => ({
    name: match[1].toLowerCase(),
    attrs: Object.fromEntries(
      [...(match[2] ?? "").matchAll(/([^\s=]+)(?:="([^"]*)")?/g)].map(
        ([, key, value]) => [key, value ?? ""],
      ),
    ),
    end: match.index + match[0].length,
  }));
}

/** The markup inside `tag`, matching its close tag by nesting depth. */
function innerHtml(html: string, tag: Tag): string {
  const tagPattern = new RegExp(`<(/?)${tag.name}\\b[^>]*>`, "gi");
  tagPattern.lastIndex = tag.end;
  let depth = 1;
  for (let m = tagPattern.exec(html); m; m = tagPattern.exec(html)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(tag.end, m.index);
  }
  return html.slice(tag.end);
}

function hasClass(tag: Tag, name: string): boolean {
  return (tag.attrs.class ?? "").split(/\s+/).includes(name);
}

function readBuilt(file: string): string {
  const filePath = path.join(CLIENT_DIR, file);
  // Same reason as redirects.spec.ts: a bare ENOENT reads like a broken suite.
  if (!fs.existsSync(filePath)) {
    throw new Error(
      `${filePath} does not exist. This suite checks built output — ` +
        "run `pnpm --filter website build` before `pnpm --filter website test`.",
    );
  }
  return fs.readFileSync(filePath, "utf-8");
}

describe.each([
  ["landing page", "index.html"],
  ["docs page", "protocol/overview/index.html"],
])("phone menu on the %s", (_page, file) => {
  let html: string;
  let tags: Tag[];

  beforeAll(() => {
    html = readBuilt(file);
    tags = openingTags(html);
  });

  it("has a menu button that targets Starlight's sidebar pane", () => {
    const button = tags.find(
      (t) =>
        t.name === "button" &&
        (t.attrs.popovertarget === MENU_ID ||
          t.attrs["aria-controls"] === MENU_ID),
    );
    expect(
      button,
      `no <button> targets #${MENU_ID}. If Starlight renamed its menu, ` +
        "check the phone menu by hand and update MENU_ID.",
    ).toBeDefined();
  });

  it("has the pane that button opens, listing the docs", () => {
    const pane = tags.find((t) => t.attrs.id === MENU_ID);
    expect(
      pane,
      `the menu button targets #${MENU_ID}, but no element has that id, ` +
        "so the phone menu can't open",
    ).toBeDefined();
    expect(
      innerHtml(html, pane!),
      `#${MENU_ID} is missing the sidebar's "Getting started" link`,
    ).toContain(KNOWN_SIDEBAR_LINK);
  });
});

describe("Starlight markup the landing-page rules in custom.css rely on", () => {
  let tags: Tag[];
  let styles: string;

  beforeAll(() => {
    const html = readBuilt("index.html");
    const assetsDir = path.join(CLIENT_DIR, "_astro");
    tags = openingTags(html);
    styles = [
      html,
      ...fs
        .readdirSync(assetsDir)
        .filter((f) => f.endsWith(".css"))
        .map((f) => fs.readFileSync(path.join(assetsDir, f), "utf-8")),
    ].join("\n");
  });

  it("marks the landing page's <html> with data-has-hero", () => {
    const html = tags.find((t) => t.name === "html");
    expect(
      html?.attrs,
      "<html> lost data-has-hero, so none of the :root[data-has-hero] rules apply",
    ).toHaveProperty("data-has-hero");
  });

  it("renders a .sidebar-pane for the desktop rule to hide", () => {
    expect(
      tags.some((t) => hasClass(t, "sidebar-pane")),
      "no element has class sidebar-pane, so the rule hiding the desktop sidebar matches nothing",
    ).toBe(true);
  });

  it("renders a <header class=header> for the padding rule", () => {
    expect(
      tags.some((t) => t.name === "header" && hasClass(t, "header")),
      "no <header class=header>, so the landing header padding rule matches nothing",
    ).toBe(true);
  });

  // Starlight's PageFrame and ContentPanel declarations. Matching any var()
  // read isn't enough: Header.astro reads --sl-content-width too.
  it.each([
    ["--sl-content-inline-start", "padding-inline-start"],
    ["--sl-content-width", "max-width"],
  ])("still lays out content with %s", (property, declaration) => {
    expect(
      styles.includes(`${declaration}:var(${property})`),
      `Starlight's CSS no longer sets ${declaration} from ${property}, so overriding it in custom.css does nothing`,
    ).toBe(true);
  });
});
