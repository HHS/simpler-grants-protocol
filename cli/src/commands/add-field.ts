import { Command } from "commander";
import { DefaultFieldService } from "../services/field.service";
import { AddFieldArgsSchema, AddFieldCommandSchema } from "../types/command-args";

export function addFieldCommand(program: Command) {
  const fieldService = new DefaultFieldService();

  program
    .command("add")
    .command("field")
    .description("Add a custom field to the schema")
    .argument("<name>", "Name of the field")
    .argument("<type>", "Type of the field (string|number|boolean|date|object|array)")
    .option("--example <value>", "Example value for the field")
    .option("--description <text>", "Description of the field")
    .action(async (name, type, options) => {
      try {
        const validatedArgs = AddFieldArgsSchema.parse({ name, type });
        const validatedOptions = AddFieldCommandSchema.parse(options);
        await fieldService.addField(validatedArgs.name, validatedArgs.type, validatedOptions);
      } catch (error) {
        console.error("Error adding field:", error);
        process.exit(1);
      }
    });
}
