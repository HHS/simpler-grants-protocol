import { Command } from "commander";
import { InitService, InitOptions } from "../services/interfaces";
import { DefaultInitService } from "../services/init.service";

export function initCommand(program: Command) {
  const initService: InitService = new DefaultInitService();

  program
    .command("init")
    .description("Initialize a new CommonGrants project")
    .option("-t, --template <template>", "Use a specific template")
    .option("-d, --dir <directory>", "Target directory for the new project")
    .option("-l, --list", "List available templates")
    .action(async (options) => {
      try {
        if (options.list) {
          const templates = await initService.listTemplates();
          console.log("Available templates:");
          templates.forEach((template) => console.log(`  - ${template}`));
          return;
        }

        const initOptions: InitOptions = {
          template: options.template,
          output: options.output,
        };

        await initService.init(initOptions);
      } catch (error) {
        console.error("Error initializing project:", error);
        process.exit(1);
      }
    });
}
