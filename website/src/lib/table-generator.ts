import type { JsonSchema } from "./schema-loader";
import { SchemaLoader } from "./schema-loader";
import { TypeFormatter } from "./type-formatter";

/**
 * Table row for property tables
 */
export interface PropertyRow {
  property: string;
  type: string;
  required: boolean;
  description: string;
}

/**
 * Table row for enum tables
 */
export interface EnumRow {
  value: string;
  description: string;
}

/**
 * Table generation service
 */
export class TableGenerator {
  /**
   * Generates property table rows from an object schema
   */
  static generatePropertyRows(
    schema: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): PropertyRow[] {
    const rows: PropertyRow[] = [];
    const requiredFields = new Set<string>();

    // Handle allOf schemas by merging properties from all referenced schemas
    if (schema.allOf && Array.isArray(schema.allOf)) {
      for (const allOfItem of schema.allOf) {
        if (allOfItem.$ref) {
          const resolvedSchema = SchemaLoader.resolveSchemaReference(
            allOfItem.$ref,
          );
          if (resolvedSchema) {
            const allOfRows = this.generatePropertyRows(
              resolvedSchema,
              getSchemaDocPath,
            );
            rows.push(...allOfRows);

            // Collect required fields from allOf schemas
            if (resolvedSchema.required) {
              resolvedSchema.required.forEach((field) =>
                requiredFields.add(field),
              );
            }
          }
        } else if (allOfItem.properties) {
          // Handle inline allOf properties
          const inlineRows = this.processProperties(
            allOfItem.properties,
            allOfItem.required || [],
            schema,
            getSchemaDocPath,
          );
          rows.push(...inlineRows);

          if (allOfItem.required) {
            allOfItem.required.forEach((field) => requiredFields.add(field));
          }
        }
      }
    }

    // Handle direct properties
    if (schema.properties) {
      const directRows = this.processProperties(
        schema.properties,
        schema.required || [],
        schema,
        getSchemaDocPath,
      );
      rows.push(...directRows);

      if (schema.required) {
        schema.required.forEach((field) => requiredFields.add(field));
      }
    }

    // Update required status for all rows based on collected required fields
    rows.forEach((row) => {
      if (requiredFields.has(row.property)) {
        row.required = true;
      }
    });

    // Remove duplicates based on property name, keeping the last occurrence
    const uniqueRows = new Map<string, PropertyRow>();
    rows.forEach((row) => {
      uniqueRows.set(row.property, row);
    });

    return Array.from(uniqueRows.values());
  }

  /**
   * Generates enum table rows from an enum schema
   */
  static generateEnumRows(schema: JsonSchema): EnumRow[] {
    if (!schema.enum || !Array.isArray(schema.enum)) {
      return [];
    }

    const rows: EnumRow[] = [];

    for (const enumValue of schema.enum) {
      const value = String(enumValue);
      const description = this.extractEnumDescription(schema, value);

      rows.push({
        value,
        description,
      });
    }

    return rows;
  }

  /**
   * Processes properties and returns property rows
   */
  private static processProperties(
    properties: Record<string, JsonSchema>,
    required: string[],
    currentSchema: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): PropertyRow[] {
    const rows: PropertyRow[] = [];

    for (const [propertyName, propSchema] of Object.entries(properties)) {
      const isRequired = required.includes(propertyName);
      const type = TypeFormatter.formatPropertyType(
        propSchema,
        currentSchema,
        getSchemaDocPath,
      );
      const description = propSchema.description || "";

      rows.push({
        property: propertyName,
        type,
        required: isRequired,
        description,
      });
    }

    return rows;
  }

  /**
   * Extracts description for an enum value from schema description
   */
  private static extractEnumDescription(
    schema: JsonSchema,
    value: string,
  ): string {
    if (!schema.description) {
      return "";
    }

    // Look for description patterns like "- `value`: description"
    const lines = schema.description.split("\n");
    for (const line of lines) {
      if (line.includes(`\`${value}\``)) {
        const match = line.match(/`[^`]+`:\s*(.+)/);
        if (match) {
          return match[1].trim();
        }
      }
    }

    return "";
  }
}
