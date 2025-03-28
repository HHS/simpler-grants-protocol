#!/usr/bin/env node

import { program } from "commander";
import { initCommand } from "./commands/init";
import { previewCommand } from "./commands/preview";
import { checkCommand } from "./commands/check";
import { compileCommand } from "./commands/compile";

program.name("cg").description("CommonGrants CLI tools").version("0.1.0");

// Register commands
initCommand(program);
previewCommand(program);
checkCommand(program);
compileCommand(program);

program.parse();
