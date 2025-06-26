import { z } from "zod";

export const InitCommandSchema = z.object({
  template: z.string().min(1).optional(),
  list: z.boolean().optional(),
});

export type InitCommandOptions = z.infer<typeof InitCommandSchema>;
