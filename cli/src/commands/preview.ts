import { Command } from "commander";
import { DefaultPreviewService } from "../services/preview.service";
import { PreviewArgsSchema } from "../types/command-args";

export function previewCommand(program: Command) {
  const previewService = new DefaultPreviewService();

  program
    .command("preview")
    .description("Preview an OpenAPI specification")
    .argument("<specPath>", "Path to OpenAPI spec (.yaml or .json)")
    .option("--ui <tool>", "Preview tool to use (swagger or redocly)", "swagger")
    .action(async specPath => {
      try {
        const validatedArgs = PreviewArgsSchema.parse({ specPath });
        await previewService.previewSpec(validatedArgs.specPath);
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
