import { Command } from "commander";
import { DefaultInitService } from "./init-service";
import { InitCommandSchema } from "./init-args";
import { handleCommandError } from "../../utils/error";

export function initCommand(program: Command) {
  const initService: DefaultInitService = new DefaultInitService();

  program
    .command("init")
    .description("Initialize a new CommonGrants project")
    .option("-t, --template <template>", "Use a specific template")
    .option("-l, --list", "List available templates")
    .action(async options => {
      try {
        if (options.list) {
          const templates = await initService.listTemplates();
          console.log("Available templates:");
          templates.forEach((template: string) => console.log(`- ${template}`));
          return;
        }

        const validatedOptions = InitCommandSchema.parse(options);
        await initService.init(validatedOptions);
      } catch (error) {
        handleCommandError(error);
      }
    });
}
