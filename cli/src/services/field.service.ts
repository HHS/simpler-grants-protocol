import { FieldService, FieldOptions } from "./interfaces";

export class DefaultFieldService implements FieldService {
  async addField(
    name: string,
    type: string,
    options: FieldOptions
  ): Promise<void> {
    console.log("Mock: Adding field", { name, type, options });
  }
}
