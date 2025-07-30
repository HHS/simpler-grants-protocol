/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";
import * as fs from "fs";
import * as path from "path";

/**
 * Dynamically get available base spec versions from the openapi directory
 * Returns versions sorted in reverse order (latest first)
 */
function getAvailableBaseVersions(): string[] {
  const openapiDir = path.resolve(__dirname, "../../../lib/openapi");
  if (!fs.existsSync(openapiDir)) {
    return [];
  }

  const files = fs.readdirSync(openapiDir);
  const versions: string[] = [];

  for (const file of files) {
    const match = file.match(/^openapi\.(.+)\.yaml$/);
    if (match) {
      versions.push(match[1]);
    }
  }

  // Sort in reverse order so latest version comes first
  return versions.sort().reverse();
}

export const availableVersions = getAvailableBaseVersions();

/**
 * Positional arguments that must be passed to the `check api` command.
 */
export const CheckApiArgsSchema = z.object({
  apiUrl: z.string().url(),
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
 * Optional arguments that can be passed to the `check spec` command using flags (e.g. `--base` or `--version`)
 */
export const CheckSpecOptionsSchema = z.object({
  base: z.string().optional(),
  baseVersion:
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
