import { Command } from "commander";
import { DefaultCodeGenerationService } from "../services/code-generation.service";
import { validateGenerateServerOptions } from "../types/command-options";

export function generateCommand(program: Command) {
  const generationService = new DefaultCodeGenerationService();

  const generate = program
    .command("generate")
    .description("Generate server or client code");

  generate
    .command("server")
    .description("Generate API server code from a TypeSpec specification")
    .argument("<specPath>", "Path to TypeSpec file")
    .option("--lang <language>", "Target language/framework")
    .option("--only <components>", "Generate only specific components")
    .action(async (specPath, options) => {
      try {
        const validatedOptions = validateGenerateServerOptions(options);
        await generationService.generateServer(specPath, {
          lang: validatedOptions.lang,
          only: validatedOptions.only?.split(","),
        });
      } catch (error) {
        if (error instanceof Error) {
          console.error("Validation error:", error.message);
        } else {
          console.error("Error generating server:", error);
        }
        process.exit(1);
      }
    });

  generate
    .command("client")
    .description("Generate client code from a TypeSpec specification")
    .argument("<specPath>", "Path to TypeSpec file")
    .option("--lang <language>", "Target language")
    .option("--output <path>", "Output directory")
    .option("--docs", "Include API documentation")
    .action(async (specPath, options) => {
      try {
        await generationService.generateClient(specPath, {
          lang: options.lang,
          output: options.output,
          docs: options.docs,
        });
      } catch (error) {
        console.error("Error generating client:", error);
        process.exit(1);
      }
    });
}
