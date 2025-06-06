/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

export const CheckApiArgsSchema = z.object({
  apiUrl: z.string().url(),
  specPath: z
    .string()
    .endsWith(".json")
    .or(z.string().endsWith(".yaml"))
    .or(z.string().endsWith(".yml")),
});

export const CheckSpecArgsSchema = z.object({
  specPath: z
    .string()
    .endsWith(".json")
    .or(z.string().endsWith(".yaml"))
    .or(z.string().endsWith(".yml")),
});

export const CheckSpecCommandSchema = z.object({
  base: z.string().optional(),
});

export const CheckApiCommandSchema = z.object({
  client: z.string().optional(),
  report: z.enum(["json", "html"]).optional(),
  auth: z.string().optional(),
});

export type CheckApiArgs = z.infer<typeof CheckApiArgsSchema>;
export type CheckSpecArgs = z.infer<typeof CheckSpecArgsSchema>;

export type CheckApiCommandOptions = z.infer<typeof CheckApiCommandSchema>;
export type CheckSpecCommandOptions = z.infer<typeof CheckSpecCommandSchema>;
