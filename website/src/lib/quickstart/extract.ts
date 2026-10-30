/**
 * Extracts the quickstart projects that the docs ask readers to create, so CI can
 * compile them against the in-repo `@common-grants/core` and catch drift.
 *
 * - Getting Started (`getting-started.mdx`) marks each file with a `title=<file>`
 *   fence meta and shows the project twice: once in "First steps" and again after
 *   "Customization" adds `models.tsp` and replaces `routes.tsp`.
 * - The core README marks each file with a first-line comment (`// main.tsp`,
 *   `# tspconfig.yaml`).
 */

/** Filename -> file contents. */
export type QuickstartFiles = Record<string, string>;

interface CodeBlock {
  /** The `##`/`###` heading the block sits under. */
  section: string;
  /** Fence info after the language, e.g. `title=routes.tsp ins={2,11-13}`. */
  meta: string;
  body: string;
}

const FIRST_STEPS = "First steps";
const CUSTOMIZATION = "Customization";
const SECTION_HEADING = /^#{2,3} (.+)$/;
const FENCE_OPEN = /^```\S*\s*(.*)$/;
const FENCE_CLOSE = /^```\s*$/;
const TITLE_META = /(?:^|\s)title=(?:"([^"]+)"|(\S+))/;
const FILENAME_COMMENT = /^(?:\/\/|#)\s+([\w.-]+\.(?:tsp|yaml))\s*$/;

/** Collects top-level fenced code blocks along with the section each sits under. */
function parseCodeBlocks(markdown: string): CodeBlock[] {
  const blocks: CodeBlock[] = [];
  let section = "";
  let open: { meta: string; lines: string[] } | null = null;

  for (const line of markdown.split("\n")) {
    if (open) {
      if (FENCE_CLOSE.test(line)) {
        blocks.push({
          section,
          meta: open.meta,
          body: `${open.lines.join("\n")}\n`,
        });
        open = null;
      } else {
        open.lines.push(line);
      }
      continue;
    }
    const fence = FENCE_OPEN.exec(line);
    if (fence) {
      open = { meta: fence[1], lines: [] };
      continue;
    }
    const heading = SECTION_HEADING.exec(line);
    if (heading) section = heading[1].trim();
  }
  return blocks;
}

/** Picks the titled blocks named in `files` from one section, failing on any gap. */
function pickTitled(
  blocks: CodeBlock[],
  section: string,
  files: string[],
): QuickstartFiles {
  const picked: QuickstartFiles = {};
  for (const block of blocks) {
    if (block.section !== section) continue;
    const title = TITLE_META.exec(block.meta);
    const name = title?.[1] ?? title?.[2];
    if (name && files.includes(name) && !(name in picked))
      picked[name] = block.body;
  }
  for (const file of files) {
    if (!(file in picked)) {
      throw new Error(
        `Getting Started is missing a \`title=${file}\` code block in the "${section}" section`,
      );
    }
  }
  return picked;
}

/**
 * Extracts the Getting Started project as it stands after "First steps" and
 * after "Customization".
 * @throws If a file the quickstart needs has no titled block in its section
 */
export function extractGettingStartedProjects(mdx: string): {
  initial: QuickstartFiles;
  customized: QuickstartFiles;
} {
  const blocks = parseCodeBlocks(mdx);
  const initial = pickTitled(blocks, FIRST_STEPS, [
    "main.tsp",
    "routes.tsp",
    "tspconfig.yaml",
  ]);
  const customization = pickTitled(blocks, CUSTOMIZATION, [
    "models.tsp",
    "routes.tsp",
  ]);
  return { initial, customized: { ...initial, ...customization } };
}

/**
 * Extracts the core README quickstart project.
 * @throws If a file the quickstart needs has no comment-headed block
 */
export function extractReadmeProject(markdown: string): QuickstartFiles {
  const files: QuickstartFiles = {};
  for (const block of parseCodeBlocks(markdown)) {
    const name = FILENAME_COMMENT.exec(block.body.split("\n")[0])?.[1];
    if (name && !(name in files)) files[name] = block.body;
  }
  for (const file of [
    "main.tsp",
    "routes.tsp",
    "models.tsp",
    "tspconfig.yaml",
  ]) {
    if (!(file in files)) {
      throw new Error(
        `The core README is missing a code block headed \`${file}\``,
      );
    }
  }
  return files;
}
