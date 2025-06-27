import { z } from "zod";

export const CompileArgsSchema = z.object({
  typespecPath: z.string().endsWith(".tsp", { message: "File must be a .tsp file" }),
});

export type CompileArgs = z.infer<typeof CompileArgsSchema>;
