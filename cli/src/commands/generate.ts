import { Command } from "commander";
import { DefaultCodeGenerationService } from "../services/code-generation.service";
import {
  GenerateArgsSchema,
  GenerateServerCommandSchema,
  GenerateClientCommandSchema,
} from "../types/command-args";

export function generateCommand(program: Command) {
  const generationService = new DefaultCodeGenerationService();

  const generate = program.command("generate").description("Generate server or client code");

  generate
    .command("server")
    .description("Generate API server code from a TypeSpec specification")
    .argument("<specPath>", "Path to TypeSpec file")
    .option("--lang <language>", "Target language/framework")
    .option("--only <components>", "Generate only specific components")
    .action(async (specPath, options) => {
      try {
        const validatedArgs = GenerateArgsSchema.parse({ specPath });
        const validatedOptions = GenerateServerCommandSchema.parse(options);
        await generationService.generateServer(validatedArgs.specPath, validatedOptions);
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
        const validatedArgs = GenerateArgsSchema.parse({ specPath });
        const validatedOptions = GenerateClientCommandSchema.parse(options);
        await generationService.generateClient(validatedArgs.specPath, validatedOptions);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Validation error:", error.message);
        } else {
          console.error("Error generating client:", error);
        }
        process.exit(1);
      }
    });
}
