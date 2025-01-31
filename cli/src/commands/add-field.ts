import { Command } from "commander";
import { DefaultFieldService } from "../services/field.service";

export function addFieldCommand(program: Command) {
  const fieldService = new DefaultFieldService();

  program
    .command("add")
    .command("field")
    .description("Add a custom field to the schema")
    .argument("<name>", "Name of the field")
    .argument("<type>", "Type of the field")
    .option("--example <value>", "Example value for the field")
    .option("--description <text>", "Description of the field")
    .action(async (name, type, options) => {
      try {
        await fieldService.addField(name, type, {
          example: options.example,
          description: options.description,
        });
      } catch (error) {
        console.error("Error adding field:", error);
        process.exit(1);
      }
    });
}
