import { readFileSync, writeFileSync, readdirSync } from "fs";
import path from "path";
import yaml from "js-yaml";
import { Paths } from "../lib/schema/paths";

/**
 * Trims each generated OpenAPI document's top-level `tags` list to the tags its
 * operations actually use.
 *
 * TypeSpec emits every `@tagMetadata` entry into every version's `tags` list,
 * including versions that expose none of that tag's routes (for example, the
 * `Awards` tag appeared in v0.1.0 even though awards only exist in v0.4.0). This
 * removes the unreferenced entries so each document only advertises tags a
 * consumer can actually find routes for. Only the `- name:` blocks are removed;
 * every other line is left untouched, so the files don't get reformatted.
 */

const HTTP_METHODS = new Set([
  "get",
  "put",
  "post",
  "delete",
  "patch",
  "options",
  "head",
  "trace",
]);

interface OpenApiDoc {
  tags?: { name: string }[];
  paths?: Record<string, Record<string, { tags?: string[] }>>;
}

/** The set of tag names referenced by at least one operation. */
function referencedTags(doc: OpenApiDoc): Set<string> {
  const used = new Set<string>();
  for (const pathItem of Object.values(doc.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method)) continue;
      for (const tag of operation?.tags ?? []) used.add(tag);
    }
  }
  return used;
}

/**
 * Removes unreferenced `- name:` blocks from the top-level `tags:` list, leaving
 * the rest of the document's text unchanged.
 */
function pruneTagsBlock(
  text: string,
  keep: Set<string>,
): { text: string; removed: string[] } {
  const lines = text.split("\n");
  const start = lines.indexOf("tags:");
  if (start === -1) return { text, removed: [] };

  // The block runs until the next top-level key (an unindented, non-blank line).
  let end = start + 1;
  while (
    end < lines.length &&
    (lines[end] === "" || lines[end].startsWith(" "))
  )
    end++;

  const kept: string[] = [];
  const removed: string[] = [];
  let i = start + 1;
  while (i < end) {
    const itemStart = i++;
    while (i < end && !lines[i].startsWith("  - ")) i++;
    const item = lines.slice(itemStart, i);
    const name = item
      .join("\n")
      .match(/- name:\s*(.+?)\s*$/m)?.[1]
      ?.replace(/^["']|["']$/g, "");
    if (name && !keep.has(name)) removed.push(name);
    else kept.push(...item);
  }

  return {
    text: [...lines.slice(0, start + 1), ...kept, ...lines.slice(end)].join(
      "\n",
    ),
    removed,
  };
}

function main(): void {
  const files = readdirSync(Paths.OPENAPI_DIR).filter((f) =>
    f.endsWith(".yaml"),
  );
  for (const file of files) {
    const filePath = path.join(Paths.OPENAPI_DIR, file);
    const text = readFileSync(filePath, "utf8");
    const doc = yaml.load(text) as OpenApiDoc;
    if (!doc?.tags?.length) continue;

    const { text: pruned, removed } = pruneTagsBlock(text, referencedTags(doc));
    if (removed.length) {
      writeFileSync(filePath, pruned);
      console.log(`  ${file}: removed unused tag(s) -> ${removed.join(", ")}`);
    }
  }
}

main();
