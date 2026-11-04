import { ZodError } from "zod";
import chalk from "chalk";

/** Format Zod issues as `path: message` lines, one per issue (just `message` at the root). */
export function formatZodIssues(issues: ZodError["issues"]): string[] {
  return issues.map(issue =>
    issue.path.length > 0 ? `${issue.path.join(".")}: ${issue.message}` : issue.message
  );
}

export function handleCommandError(error: unknown): never {
  if (error instanceof ZodError) {
    console.error(chalk.red("Validation error:"));
    formatZodIssues(error.issues).forEach(line => {
      console.error(chalk.red(`- ${line}`));
    });
  } else if (error instanceof Error) {
    console.error(chalk.red("Error:"), error.message);
  } else {
    console.error(chalk.red("An unexpected error occurred:"), error);
  }
  process.exit(1);
}
