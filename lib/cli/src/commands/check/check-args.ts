/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

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
  baseVersion: z.enum(["0.1.0", "0.2.0"]).optional(),
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
