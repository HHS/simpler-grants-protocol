import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  extractGettingStartedProjects,
  extractReadmeProject,
} from "@/lib/quickstart/extract";

const GETTING_STARTED_PATH = fileURLToPath(
  new URL("../../../src/content/docs/getting-started.mdx", import.meta.url),
);
const README_PATH = fileURLToPath(
  new URL("../../../../lib/core/README.md", import.meta.url),
);

const FENCE = "```";

const gettingStarted = `## Quickstart

### First steps

${FENCE}json title=package.json
{ "name": "my-api" }
${FENCE}

${FENCE}yaml title=pnpm-workspace.yaml
packages: []
${FENCE}

${FENCE}tsp title=main.tsp
import "@typespec/http";
using TypeSpec.Http;
${FENCE}

${FENCE}tsp title=routes.tsp
namespace Routes;
model Opportunity {}
${FENCE}

${FENCE}yaml title=tspconfig.yaml
emit:
  - "@typespec/openapi3"
${FENCE}

### Deep dive

${FENCE}tsp title=routes.tsp
namespace DeepDive;
${FENCE}

${FENCE}tsp title=main.tsp
namespace DeepDive;
${FENCE}

### Customization

${FENCE}tsp title=models.tsp
model CustomOpportunity {}
${FENCE}

${FENCE}tsp title=routes.tsp ins={2,11-13}
namespace Routes;
model CustomOpportunity {}
${FENCE}

## Next steps
`;

const readme = `# CommonGrants core library

${FENCE}bash
npm install @common-grants/core
${FENCE}

${FENCE}typespec
// models.tsp
model CustomOpportunity {}
${FENCE}

${FENCE}typespec
// routes.tsp
namespace Routes;
${FENCE}

${FENCE}typespec
// main.tsp
import "./routes.tsp";
${FENCE}

${FENCE}yaml
# tspconfig.yaml
emit:
  - "@typespec/openapi3"
${FENCE}

${FENCE}bash
tsp compile .
${FENCE}
`;

describe("extractGettingStartedProjects", () => {
  it("takes main.tsp, routes.tsp and tspconfig.yaml from First steps for the initial project", () => {
    const { initial } = extractGettingStartedProjects(gettingStarted);

    expect(Object.keys(initial).sort()).toEqual([
      "main.tsp",
      "routes.tsp",
      "tspconfig.yaml",
    ]);
    expect(initial["main.tsp"]).toBe(
      'import "@typespec/http";\nusing TypeSpec.Http;\n',
    );
    expect(initial["routes.tsp"]).toBe(
      "namespace Routes;\nmodel Opportunity {}\n",
    );
    expect(initial["tspconfig.yaml"]).toBe('emit:\n  - "@typespec/openapi3"\n');
  });

  it("ignores titled blocks in First steps that are not project files", () => {
    const { initial } = extractGettingStartedProjects(gettingStarted);

    expect(initial).not.toHaveProperty("package.json");
    expect(initial).not.toHaveProperty("pnpm-workspace.yaml");
  });

  it("ignores titled blocks under Deep dive even when their contents differ", () => {
    const { initial, customized } =
      extractGettingStartedProjects(gettingStarted);

    expect(initial["main.tsp"]).not.toContain("DeepDive");
    expect(initial["routes.tsp"]).not.toContain("DeepDive");
    expect(customized["main.tsp"]).not.toContain("DeepDive");
    expect(customized["routes.tsp"]).not.toContain("DeepDive");
  });

  it("ignores extra fence meta such as ins={...} when reading the title", () => {
    const { customized } = extractGettingStartedProjects(gettingStarted);

    expect(customized["routes.tsp"]).toBe(
      "namespace Routes;\nmodel CustomOpportunity {}\n",
    );
  });

  it("builds customized from initial plus models.tsp with routes.tsp replaced", () => {
    const { initial, customized } =
      extractGettingStartedProjects(gettingStarted);

    expect(Object.keys(customized).sort()).toEqual([
      "main.tsp",
      "models.tsp",
      "routes.tsp",
      "tspconfig.yaml",
    ]);
    expect(customized["models.tsp"]).toBe("model CustomOpportunity {}\n");
    expect(customized["main.tsp"]).toBe(initial["main.tsp"]);
    expect(customized["tspconfig.yaml"]).toBe(initial["tspconfig.yaml"]);
    expect(customized["routes.tsp"]).not.toBe(initial["routes.tsp"]);
  });

  it("throws naming the missing file and the First steps section", () => {
    const withoutTspconfig = gettingStarted.replace(
      `${FENCE}yaml title=tspconfig.yaml\nemit:\n  - "@typespec/openapi3"\n${FENCE}\n`,
      "",
    );

    expect(() => extractGettingStartedProjects(withoutTspconfig)).toThrow(
      /tspconfig\.yaml/,
    );
    expect(() => extractGettingStartedProjects(withoutTspconfig)).toThrow(
      /First steps/,
    );
  });

  it("throws naming the missing file and the Customization section", () => {
    const withoutModels = gettingStarted.replace(
      `${FENCE}tsp title=models.tsp\nmodel CustomOpportunity {}\n${FENCE}\n`,
      "",
    );

    expect(() => extractGettingStartedProjects(withoutModels)).toThrow(
      /models\.tsp/,
    );
    expect(() => extractGettingStartedProjects(withoutModels)).toThrow(
      /Customization/,
    );
  });

  it("extracts both projects from the real getting-started.mdx", () => {
    const mdx = readFileSync(GETTING_STARTED_PATH, "utf-8");

    const { initial, customized } = extractGettingStartedProjects(mdx);

    expect(Object.keys(initial).sort()).toEqual([
      "main.tsp",
      "routes.tsp",
      "tspconfig.yaml",
    ]);
    expect(Object.keys(customized).sort()).toEqual([
      "main.tsp",
      "models.tsp",
      "routes.tsp",
      "tspconfig.yaml",
    ]);
    expect(customized["routes.tsp"]).toContain("CustomOpportunity");
    expect(initial["routes.tsp"]).not.toContain("CustomOpportunity");
  });
});

describe("extractReadmeProject", () => {
  it("keys fenced blocks by the filename in their first-line comment", () => {
    const files = extractReadmeProject(readme);

    expect(Object.keys(files).sort()).toEqual([
      "main.tsp",
      "models.tsp",
      "routes.tsp",
      "tspconfig.yaml",
    ]);
    expect(files["models.tsp"]).toContain("CustomOpportunity");
    expect(files["tspconfig.yaml"]).toContain("@typespec/openapi3");
  });

  it("ignores fences without a filename header", () => {
    const files = extractReadmeProject(readme);

    expect(Object.keys(files)).toHaveLength(4);
    expect(Object.values(files).join("\n")).not.toContain("npm install");
    expect(Object.values(files).join("\n")).not.toContain("tsp compile");
  });

  it("throws naming the missing file", () => {
    const withoutMain = readme.replace(
      `${FENCE}typespec\n// main.tsp\nimport "./routes.tsp";\n${FENCE}\n`,
      "",
    );

    expect(() => extractReadmeProject(withoutMain)).toThrow(/main\.tsp/);
  });

  it("extracts the project from the real lib/core/README.md", () => {
    const markdown = readFileSync(README_PATH, "utf-8");

    const files = extractReadmeProject(markdown);

    expect(Object.keys(files).sort()).toEqual([
      "main.tsp",
      "models.tsp",
      "routes.tsp",
      "tspconfig.yaml",
    ]);
  });
});
