import * as fs from "fs";
import * as path from "path";
import * as yaml from "js-yaml";
import { z } from "zod";
import { formatZodIssues } from "./error";

export const CONFIG_FILE_NAMES = ["cg.config.yml", "cg.config.yaml", "cg.config.json"] as const;

export const ConfigSchema = z.strictObject({
  "check-spec": z.strictObject({}).optional(),
});

export type Config = z.infer<typeof ConfigSchema>;

export interface LoadConfigOptions {
  configPath?: string;
  cwd?: string;
}

/** Read and parse a config file, choosing the parser by extension. */
function parseConfigFile(filePath: string): unknown {
  const extension = path.extname(filePath).toLowerCase();
  if (extension !== ".json" && extension !== ".yaml" && extension !== ".yml") {
    throw new Error(`Unsupported config file extension: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");
  try {
    return extension === ".json" ? JSON.parse(content) : yaml.load(content);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not parse config file ${filePath}: ${reason}`, { cause: error });
  }
}

/**
 * Find a default-named config file in `cwd`, or undefined if there is none.
 * Throws if more than one exists, since there is no way to tell which one applies.
 */
function findConfigFile(cwd: string): string | undefined {
  const found = CONFIG_FILE_NAMES.map(name => path.join(cwd, name)).filter(candidate =>
    fs.statSync(candidate, { throwIfNoEntry: false })?.isFile()
  );
  if (found.length > 1) {
    throw new Error(
      `Found multiple config files, keep only one or pass --config:\n${found.map(file => `- ${file}`).join("\n")}`
    );
  }
  return found[0];
}

export function loadConfig(options: LoadConfigOptions = {}): Config {
  const { configPath, cwd = process.cwd() } = options;
  const filePath = configPath !== undefined ? path.resolve(cwd, configPath) : findConfigFile(cwd);
  if (!filePath) {
    return {};
  }
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`Config file not found: ${filePath}`);
  }

  // An empty YAML file parses to undefined, which we treat as an empty config
  const result = ConfigSchema.safeParse(parseConfigFile(filePath) ?? {});
  if (!result.success) {
    const issues = formatZodIssues(result.error.issues).map(line => `- ${line}`);
    throw new Error(`Invalid config file ${filePath}:\n${issues.join("\n")}`);
  }
  return result.data;
}
