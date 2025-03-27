import { Command } from "commander";
import { DefaultCheckService } from "./check-service";
import {
  CheckApiArgsSchema,
  CheckApiCommandSchema,
  CheckSpecArgsSchema,
  CheckSpecCommandSchema,
} from "./check-args";

export function checkCommand(program: Command) {
  const validationService = new DefaultCheckService();

  const check = program.command("check").description("Validate APIs and specifications");

  check
    .command("api")
    .description("Validate an API implementation against its specification")
    .argument("<apiUrl>", "Root URL of the API")
    .argument("<specPath>", "Path to TypeSpec or OpenAPI spec")
    .option("--client <client>", "HTTP client to use")
    .option("--report <format>", "Report format (json or html)")
    .option("--auth <auth>", "Authentication token or credentials")
    .action(async (apiUrl, specPath, options) => {
      try {
        const validatedArgs = CheckApiArgsSchema.parse({ apiUrl, specPath });
        const validatedOptions = CheckApiCommandSchema.parse(options);
        await validationService.checkApi(
          validatedArgs.apiUrl,
          validatedArgs.specPath,
          validatedOptions
        );
      } catch (error) {
        if (error instanceof Error) {
          console.error("Validation error:", error.message);
        } else {
          console.error("Error checking API:", error);
        }
        process.exit(1);
      }
    });

  check
    .command("spec")
    .description("Validate a specification against the CommonGrants base spec")
    .argument("<specPath>", "Path or URL to TypeSpec or OpenAPI spec")
    .option("--base <path>", "Path to base spec for validation")
    .action(async (specPath, options) => {
      try {
        const validatedArgs = CheckSpecArgsSchema.parse({ specPath });
        const validatedOptions = CheckSpecCommandSchema.parse(options);
        await validationService.checkSpec(validatedArgs.specPath, validatedOptions);
      } catch (error) {
        if (error instanceof Error) {
          console.error("Validation error:", error.message);
        } else {
          console.error("Error checking spec:", error);
        }
        process.exit(1);
      }
    });
}
