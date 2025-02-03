import { ValidationService, ValidationOptions, SpecValidationOptions } from "./interfaces";

export class DefaultValidationService implements ValidationService {
  async checkApi(apiUrl: string, specPath: string, options: ValidationOptions): Promise<void> {
    console.log("Mock: Checking API", { apiUrl, specPath, options });
  }

  async checkSpec(specPath: string, options: SpecValidationOptions): Promise<void> {
    console.log("Mock: Checking spec compliance", { specPath, options });
  }
}
