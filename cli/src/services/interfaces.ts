/**
 * Service for initializing new CommonGrants projects from templates.
 */
export interface InitService {
  /**
   * Initialize a new CommonGrants project.
   * @param options - Configuration options for project initialization
   * @throws {Error} If template is invalid or directory creation fails
   */
  init(options: InitOptions): Promise<void>;

  /**
   * Get a list of available project templates.
   * @returns Array of template names that can be used with init
   */
  listTemplates(): Promise<string[]>;
}

/**
 * Service for previewing OpenAPI specifications using different UI tools.
 */
export interface PreviewService {
  /**
   * Preview a TypeSpec/OpenAPI specification using a UI tool.
   * @param specPath - Path to the TypeSpec or OpenAPI specification file
   * @param options - Configuration options for the preview
   * @throws {Error} If spec file is invalid or preview server fails to start
   */
  previewSpec(specPath: string): Promise<void>;
}

/**
 * Service for managing custom fields in a CommonGrants API schema.
 */
export interface FieldService {
  /**
   * Add a new custom field to the API schema.
   * @param name - Name of the field to add
   * @param type - Data type of the field
   * @param options - Additional field configuration options
   * @throws {Error} If field name is invalid or already exists
   */
  addField(name: string, type: string, options: FieldOptions): Promise<void>;
}

/**
 * Service for generating server and client code from API specifications.
 */
export interface CodeGenerationService {
  /**
   * Generate server code from an API specification.
   * @param specPath - Path to the TypeSpec or OpenAPI specification
   * @param options - Code generation configuration options
   * @throws {Error} If spec is invalid or code generation fails
   */
  generateServer(specPath: string, options: GenerateOptions): Promise<void>;

  /**
   * Generate client SDK from an API specification.
   * @param specPath - Path to the TypeSpec or OpenAPI specification
   * @param options - Code generation configuration options
   * @throws {Error} If spec is invalid or code generation fails
   */
  generateClient(specPath: string, options: GenerateOptions): Promise<void>;
}

/**
 * Service for compiling TypeSpec files to OpenAPI specifications.
 */
export interface CompileService {
  /**
   * Compile a TypeSpec file to OpenAPI.
   * @param typespecPath - Path to the TypeSpec file to compile
   * @throws {Error} If compilation fails
   */
  compile(typespecPath: string): Promise<void>;
}

// Option Types

/**
 * Options for initializing a new project
 */
export interface InitOptions {
  /** Template name or path to use for initialization */
  template?: string;
}

/**
 * Options for adding a custom field
 */
export interface FieldOptions {
  /** Example value for the field */
  example?: string;
  /** Description of the field's purpose */
  description?: string;
}

/**
 * Options for code generation
 */
export interface GenerateOptions {
  /** Target language or framework */
  lang?: string;
  /** Output directory for generated code */
  output?: string;
  /** Specific components to generate */
  only?: string[];
  /** Whether to include API documentation */
  docs?: boolean;
}
