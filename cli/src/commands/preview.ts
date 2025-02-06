import { Command } from "commander";
import { DefaultPreviewService } from "../services/preview.service";
import { PreviewArgsSchema, PreviewCommandSchema } from "../types/command-args";

export function previewCommand(program: Command) {
  const previewService = new DefaultPreviewService();

  program
    .command("preview")
    .description("Preview an OpenAPI specification")
    .argument("<specPath>", "Path to TypeSpec or OpenAPI spec (.tsp or .yaml)")
    .option("--ui <tool>", "Preview tool to use (swagger or redocly)", "swagger")
    .action(async (specPath, options) => {
      try {
        const validatedArgs = PreviewArgsSchema.parse({ specPath });
        const validatedOptions = PreviewCommandSchema.parse(options);
        await previewService.previewSpec(validatedArgs.specPath, validatedOptions);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Validation error:", error.message);
        } else {
          console.error("Error previewing spec:", error);
        }
        process.exit(1);
      }
    });
}
