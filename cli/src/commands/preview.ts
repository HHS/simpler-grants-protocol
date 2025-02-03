import { Command } from "commander";
import { DefaultPreviewService } from "../services/preview.service";
import { validatePreviewOptions } from "../types/command-options";

export function previewCommand(program: Command) {
  const previewService = new DefaultPreviewService();

  program
    .command("preview")
    .description("Preview an OpenAPI specification")
    .argument("<specPath>", "Path to TypeSpec file")
    .option("--ui <tool>", "Preview tool to use (swagger or redocly)", "swagger")
    .action(async (specPath, options) => {
      try {
        const validatedOptions = validatePreviewOptions(options);
        await previewService.previewSpec(specPath, validatedOptions);
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
