import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import yaml from "js-yaml";
import { describe, expect, it } from "vitest";

type Workflow = {
  on?: {
    pull_request?: {
      paths?: string[];
      branches?: string[];
      "branches-ignore"?: string[];
    };
  };
  jobs?: Record<
    string,
    {
      steps?: Array<{
        name?: string;
        uses?: string;
        with?: Record<string, unknown>;
        run?: string;
      }>;
    }
  >;
};

describe("TypeScript SDK CI configuration", () => {
  it("runs the complete SDK verification pipeline for relevant pull requests", () => {
    const packageJson = JSON.parse(
      readFileSync(resolve(process.cwd(), "package.json"), "utf8")
    ) as { scripts: Record<string, string> };
    const ciCommands = packageJson.scripts.ci.split("&&").map(command => command.trim());

    expect(ciCommands).toEqual([
      "pnpm run build",
      "pnpm run checks",
      "pnpm run test:coverage",
      "pnpm run example:transforms",
      "pnpm run test:package",
    ]);

    const workflow = yaml.load(
      readFileSync(resolve(process.cwd(), "../../.github/workflows/ci-lib-ts-sdk.yml"), "utf8")
    ) as Workflow;
    const pullRequest = workflow.on?.pull_request;
    const workflowCommands = Object.values(workflow.jobs ?? {}).flatMap(
      job => job.steps?.flatMap(step => step.run ?? []) ?? []
    );

    expect(pullRequest?.paths).toEqual(
      expect.arrayContaining([
        "lib/ts-sdk/**",
        "lib/core/**",
        "pnpm-workspace.yaml",
        "pnpm-lock.yaml",
      ])
    );
    expect(pullRequest?.branches).toBeUndefined();
    expect(pullRequest?.["branches-ignore"]).toBeUndefined();
    expect(workflowCommands).toContain("pnpm --filter @common-grants/sdk run ci");
  });

  it("probes the installed package on the exact minimum Node runtime", () => {
    const workflow = yaml.load(
      readFileSync(resolve(process.cwd(), "../../.github/workflows/ci-lib-ts-sdk.yml"), "utf8")
    ) as Workflow;
    const jobs = Object.values(workflow.jobs ?? {});
    const normalToolchainSetup = jobs
      .flatMap(job => job.steps ?? [])
      .find(
        step =>
          step.uses?.startsWith("actions/setup-node@") &&
          step.with?.["node-version-file"] === ".nvmrc"
      );

    expect(normalToolchainSetup).toBeDefined();

    const minimumRuntimeJob = jobs.find(job =>
      job.steps?.some(
        step =>
          step.uses?.startsWith("actions/setup-node@") && step.with?.["node-version"] === "22.0.0"
      )
    );
    const minimumRuntimeSteps = minimumRuntimeJob?.steps ?? [];
    const minimumSetupIndex = minimumRuntimeSteps.findIndex(
      step =>
        step.uses?.startsWith("actions/setup-node@") && step.with?.["node-version"] === "22.0.0"
    );

    expect(minimumSetupIndex).toBeGreaterThanOrEqual(0);

    const runtimeProbe = minimumRuntimeSteps
      .slice(minimumSetupIndex + 1)
      .find(
        step =>
          step.run !== undefined &&
          /installed[ -](?:artifact|package)|(?:artifact|package)[ -]runtime/i.test(
            `${step.name ?? ""} ${step.run}`
          )
      );

    expect(runtimeProbe).toBeDefined();
    expect(runtimeProbe?.run).toMatch(/(?:^|\s)node(?:\s|$)/m);
    expect(runtimeProbe?.run).not.toMatch(
      /\b(?:pnpm|npm|yarn|corepack|build|tsx|ts-node|vitest)\b/
    );
  });
});
