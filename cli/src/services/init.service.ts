import { InitService, InitOptions } from "./interfaces";

export class DefaultInitService implements InitService {
  private readonly templates = ["grants-api", "custom-fields", "minimal-api"];

  async init(options: InitOptions): Promise<void> {
    // Implementation would go here
    console.log("Initializing project with options:", options);
  }

  async listTemplates(): Promise<string[]> {
    return Promise.resolve(this.templates);
  }
}
