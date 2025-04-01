import { Command } from "commander";
import { DefaultCompileService } from "./compile-service";
import { CompileArgsSchema } from "../../types/command-args";

export function compileCommand(program: Command) {
  const compileService = new DefaultCompileService();

  program
    .command("compile")
    .description("Compile a TypeSpec file to OpenAPI")
    .argument("<typespecPath>", "Path to TypeSpec file (.tsp)")
    .action(async typespecPath => {
      try {
        const validatedArgs = CompileArgsSchema.parse({ typespecPath });
        await compileService.compile(validatedArgs.typespecPath);
      } catch (error) {
        if (error instanceof Error) {
          console.error(error.message);
        } else {
          console.error("Error compiling spec:", error);
        }
        process.exit(1);
      }
    });
}
