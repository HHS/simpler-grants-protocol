// Define strict types for command options
export interface InitCommandOptions {
  template?: string;
  dir?: string;
  list?: boolean;
}

export interface PreviewCommandOptions {
  ui: "swagger" | "redocly";
}

export interface AddFieldCommandOptions {
  example?: string;
  description?: string;
}

export interface CheckApiCommandOptions {
  client?: string;
  report?: "json" | "html";
  auth?: string;
}

export interface GenerateServerCommandOptions {
  lang?: string;
  only?: string;
}

export interface GenerateClientCommandOptions {
  lang?: string;
  output?: string;
  docs?: boolean;
}

export interface CheckSpecCommandOptions {
  version?: string;
  base?: string;
}

// Validation functions
export function validatePreviewOptions(options: any): PreviewCommandOptions {
  if (options.ui && !["swagger", "redocly"].includes(options.ui)) {
    throw new Error('UI option must be either "swagger" or "redocly"');
  }
  return {
    ui: options.ui || "swagger",
  };
}

export function validateCheckApiOptions(options: any): CheckApiCommandOptions {
  if (options.report && !["json", "html"].includes(options.report)) {
    throw new Error('Report format must be either "json" or "html"');
  }
  return {
    client: options.client,
    report: options.report,
    auth: options.auth,
  };
}

export function validateGenerateServerOptions(
  options: any
): GenerateServerCommandOptions {
  if (options.only) {
    const validComponents = ["controllers", "models", "routes"];
    const components = options.only.split(",");
    const invalidComponents = components.filter(
      (c: string) => !validComponents.includes(c)
    );
    if (invalidComponents.length > 0) {
      throw new Error(
        `Invalid components: ${invalidComponents.join(
          ", "
        )}. Valid components are: ${validComponents.join(", ")}`
      );
    }
  }
  return {
    lang: options.lang,
    only: options.only,
  };
}

export function validateCheckSpecOptions(
  options: any
): CheckSpecCommandOptions {
  if (options.version && !/^v\d+\.\d+\.\d+$/.test(options.version)) {
    throw new Error("Version must be in format vX.Y.Z (e.g., v2.0.1)");
  }
  return {
    version: options.version,
    base: options.base,
  };
}
