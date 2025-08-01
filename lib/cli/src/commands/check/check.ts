import { Command } from "commander";
import { DefaultCheckService } from "./check-service";
import {
  CheckApiArgsSchema,
  CheckApiOptionsSchema,
  CheckSpecArgsSchema,
  CheckSpecOptionsSchema,
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
        const validatedOptions = CheckApiOptionsSchema.parse(options);
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
    .description("Validate an OpenAPI spec against the CommonGrants base protocol")
    .argument("<specPath>", "Path to the OpenAPI spec you want to validate")
    .option("--base <path>", "Path to the base OpenAPI spec you want to use for validation")
    .option(
      "--protocol-version <version>",
      "Version of the CommonGrants protocol OpenAPI spec to validate against. Note: Only major and minor versions are supported."
    )
    .action(async (specPath, options) => {
      try {
        const validatedArgs = CheckSpecArgsSchema.parse({ specPath });
        const validatedOptions = CheckSpecOptionsSchema.parse(options);

        // Handle conflict between --base and --protocol-version
        if (validatedOptions.base && validatedOptions.protocolVersion) {
          console.warn(
            "Warning: Both --base and --protocol-version are specified. Using --base and ignoring --protocol-version."
          );
          // Remove protocolVersion from options to prioritize base
          delete validatedOptions.protocolVersion;
        }

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
