import { describe, it, expect, beforeAll } from "vitest";
import * as fs from "fs";
import * as path from "path";
import { Paths } from "@/lib/schema/paths";

/**
 * Checks the navbar dropdowns' ARIA wiring on the built landing page: every
 * button and dropdown has an id no other element uses, and each names the
 * other through `aria-controls` / `aria-labelledby`.
 *
 * Requires a build: `pnpm --filter website build` writes the file under test.
 */

type Attributes = Record<string, string>;

const INDEX_PATH = path.join(
  Paths.WEBSITE_ROOT,
  "dist",
  "client",
  "index.html",
);

function openingTagsWithClass(html: string, className: string): Attributes[] {
  return [...html.matchAll(/<[a-z][^>]*>/gi)]
    .map(([tag]) =>
      Object.fromEntries(
        [...tag.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, name, value]) => [
          name,
          value,
        ]),
      ),
    )
    .filter((attributes) => attributes.class?.split(/\s+/).includes(className));
}

describe("navbar dropdowns on the built landing page", () => {
  let buttons: Attributes[];
  let dropdowns: Attributes[];
  let pageIds: string[];

  const countOfId = (id: string) => pageIds.filter((p) => p === id).length;

  beforeAll(() => {
    if (!fs.existsSync(INDEX_PATH)) {
      throw new Error(
        `${INDEX_PATH} does not exist. This suite checks built output — ` +
          "run `pnpm --filter website build` before `pnpm --filter website test`.",
      );
    }

    const html = fs.readFileSync(INDEX_PATH, "utf-8");
    buttons = openingTagsWithClass(html, "nav-menu-button");
    dropdowns = openingTagsWithClass(html, "nav-menu-dropdown");
    pageIds = [...html.matchAll(/\sid="([^"]*)"/g)].map(([, id]) => id);
  });

  // Pin the counts so markup that matches nothing can't pass vacuously.
  it("renders five dropdown buttons and five dropdowns", () => {
    expect(buttons).toHaveLength(5);
    expect(dropdowns).toHaveLength(5);
  });

  it("gives every button and dropdown an id no other element uses", () => {
    for (const { id } of [...buttons, ...dropdowns]) {
      expect(countOfId(id), id).toBe(1);
    }
  });

  // Each menu item renders its button then its dropdown, so the nth of each pair up.
  it("points each button's aria-controls at exactly one element, its own dropdown", () => {
    buttons.forEach((button, i) => {
      const controls = button["aria-controls"];
      expect(countOfId(controls), controls).toBe(1);
      expect(controls).toBe(dropdowns[i].id);
    });
  });

  it("points each dropdown's aria-labelledby at exactly one element, its own button", () => {
    dropdowns.forEach((dropdown, i) => {
      const labelledBy = dropdown["aria-labelledby"];
      expect(countOfId(labelledBy), labelledBy).toBe(1);
      expect(labelledBy).toBe(buttons[i].id);
    });
  });
});
