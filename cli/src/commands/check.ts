import { Command } from "commander";
import { DefaultValidationService } from "../services/validation.service";
import { validateCheckApiOptions, validateCheckSpecOptions } from "../types/command-options";

export function checkCommand(program: Command) {
  const validationService = new DefaultValidationService();

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
        const validatedOptions = validateCheckApiOptions(options);
        await validationService.checkApi(apiUrl, specPath, validatedOptions);
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
    .option("--spec-version <version>", "CommonGrants spec version to validate against")
    .option("--base <path>", "Path to base spec for validation")
    .action(async (specPath, options) => {
      try {
        const validatedOptions = validateCheckSpecOptions(options);
        await validationService.checkSpec(specPath, validatedOptions);
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
