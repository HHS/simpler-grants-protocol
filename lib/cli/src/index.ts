#!/usr/bin/env node

import { program } from "commander";
import { initCommand } from "./commands/init/init";
import { previewCommand } from "./commands/preview/preview";
import { checkCommand } from "./commands/check/check";
import { compileCommand } from "./commands/compile/compile";
import packageJson from "../package.json";

program.name("cg").description("CommonGrants CLI tools").version(packageJson.version);

// Register commands
initCommand(program);
previewCommand(program);
checkCommand(program);
compileCommand(program);

program.parse();
