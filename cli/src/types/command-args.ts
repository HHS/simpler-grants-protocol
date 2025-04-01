/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from "zod";

// ############################################################
// Zod Schemas - Arguments
// ############################################################

export const PreviewArgsSchema = z.object({
  specPath: z.string().refine(path => path.endsWith(".yaml") || path.endsWith(".json"), {
    message: "Spec path must end with .yaml or .json",
  }),
});

export const CompileArgsSchema = z.object({
  typespecPath: z.string().endsWith(".tsp", { message: "File must be a .tsp file" }),
});

// ############################################################
// Zod Schemas - Options
// ############################################################

export const InitCommandSchema = z.object({
  template: z.string().min(1).optional(),
  list: z.boolean().optional(),
});

// ############################################################
// Types
// ############################################################

export type PreviewArgs = z.infer<typeof PreviewArgsSchema>;
export type CompileArgs = z.infer<typeof CompileArgsSchema>;

// ############################################################
// Types - Options
// ############################################################

export type InitCommandOptions = z.infer<typeof InitCommandSchema>;
