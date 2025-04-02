import { z } from "zod";

export const PreviewArgsSchema = z.object({
  specPath: z.string().refine(path => path.endsWith(".yaml") || path.endsWith(".json"), {
    message: "Spec path must end with .yaml or .json",
  }),
});

export type PreviewArgs = z.infer<typeof PreviewArgsSchema>;
