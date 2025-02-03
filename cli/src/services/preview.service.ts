import { PreviewService, PreviewOptions } from "./interfaces";

export class DefaultPreviewService implements PreviewService {
  async previewSpec(specPath: string, options: PreviewOptions): Promise<void> {
    console.log("Mock: Previewing spec", { specPath, options });
  }
}
