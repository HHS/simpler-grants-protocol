#!/usr/bin/env node

import { program } from "commander";
import { initCommand } from "./commands/init";
import { previewCommand } from "./commands/preview";
import { addFieldCommand } from "./commands/add-field";
import { checkCommand } from "./commands/check";
import { generateCommand } from "./commands/generate";
import { compileCommand } from "./commands/compile";

program.name("cg").description("CommonGrants CLI tools").version("0.1.0");

// Register commands
initCommand(program);
previewCommand(program);
addFieldCommand(program);
checkCommand(program);
generateCommand(program);
compileCommand(program);

program.parse();
