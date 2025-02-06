import { ZodError } from "zod";
import chalk from "chalk";

export function handleCommandError(error: unknown): never {
  if (error instanceof ZodError) {
    console.error(chalk.red("Validation error:"));
    error.errors.forEach(err => {
      console.error(chalk.red(`- ${err.path.join(".")}: ${err.message}`));
    });
  } else if (error instanceof Error) {
    console.error(chalk.red("Error:"), error.message);
  } else {
    console.error(chalk.red("An unexpected error occurred:"), error);
  }
  process.exit(1);
}
