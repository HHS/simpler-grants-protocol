import { z } from "zod";
import * as fs from "fs";
import * as path from "path";
import * as semver from "semver";

/**
 * Dynamically get available base spec versions from the openapi directory
 * Returns versions sorted by version number, latest first
 */
function getAvailableBaseVersions(): string[] {
  const openapiDir = path.resolve(__dirname, "../../../lib/openapi");
  if (!fs.existsSync(openapiDir)) {
    return [];
  }

  return parseBaseVersions(fs.readdirSync(openapiDir));
}

/**
 * Extract the versions from base spec file names like `openapi.0.5.0.yaml`
 * Returns versions sorted by version number, latest first, so 0.10.0 comes before 0.9.0
 */
export function parseBaseVersions(fileNames: string[]): string[] {
  const versions: string[] = [];

  for (const fileName of fileNames) {
    const match = fileName.match(/^openapi\.(.+)\.yaml$/);
    // semver.valid("v0.5.0") returns "0.5.0", so compare to reject a leading "v"
    if (match && semver.valid(match[1]) === match[1]) {
      versions.push(match[1]);
    }
  }

  return versions.sort(semver.rcompare);
}

export const availableVersions = getAvailableBaseVersions();

/**
 * Positional arguments that must be passed to the `check api` command.
 */
export const CheckApiArgsSchema = z.object({
  apiUrl: z.url(),
  specPath: z
    .string()
    .endsWith(".json")
    .or(z.string().endsWith(".yaml"))
    .or(z.string().endsWith(".yml")),
});

/**
 * Positional arguments that must be passed to the `check spec` command.
 */
export const CheckSpecArgsSchema = z.object({
  specPath: z
    .string()
    .endsWith(".json")
    .or(z.string().endsWith(".yaml"))
    .or(z.string().endsWith(".yml")),
});

/**
 * Optional arguments that can be passed to the `check spec` command using flags (e.g. `--base` or `--protocol-version`)
 */
export const CheckSpecOptionsSchema = z.object({
  base: z.string().optional(),
  protocolVersion:
    availableVersions.length > 0
      ? z.enum(availableVersions as [string, ...string[]]).optional()
      : z.string().optional(),
});

/**
 * Optional arguments that can be passed to the `check api` command using flags (e.g. `--client` or `--report`)
 */
export const CheckApiOptionsSchema = z.object({
  client: z.string().optional(),
  report: z.enum(["json", "html"]).optional(),
  auth: z.string().optional(),
});

export type CheckApiArgs = z.infer<typeof CheckApiArgsSchema>;
export type CheckSpecArgs = z.infer<typeof CheckSpecArgsSchema>;

export type CheckApiOptions = z.infer<typeof CheckApiOptionsSchema>;
export type CheckSpecOptions = z.infer<typeof CheckSpecOptionsSchema>;
