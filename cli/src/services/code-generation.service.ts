import { CodeGenerationService, GenerateOptions } from "./interfaces";

export class DefaultCodeGenerationService implements CodeGenerationService {
  async generateServer(
    specPath: string,
    options: GenerateOptions
  ): Promise<void> {
    console.log("Mock: Generating server", { specPath, options });
  }

  async generateClient(
    specPath: string,
    options: GenerateOptions
  ): Promise<void> {
    console.log("Mock: Generating client", { specPath, options });
  }
}
