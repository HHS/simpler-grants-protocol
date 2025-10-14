import type { JsonSchema } from "./schema-loader";

/**
 * Type constants
 */
export const TYPE_CONSTANTS = {
  ARRAY_TYPE: "array",
  OBJECT_TYPE: "object",
  STRING_TYPE: "string",
  UNKNOWN_TYPE: "unknown",
  RECORD_TYPE: "record",
} as const;

/**
 * Format mapping for string types with format
 */
const FORMAT_TO_TYPE_MAP: Record<string, string> = {
  "date-time": "utcDateTime",
  date: "isoDate",
  time: "isoTime",
  uri: "url",
  email: "email",
  uuid: "uuid",
};

/**
 * Type formatter for converting JSON Schema types to display strings
 */
export class TypeFormatter {
  /**
   * Formats a schema property type for display
   */
  static formatPropertyType(
    propSchema: JsonSchema,
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    return this.formatPropertyTypeInternal(
      propSchema,
      currentSchema,
      getSchemaDocPath,
    );
  }

  /**
   * Internal implementation of property type formatting
   */
  private static formatPropertyTypeInternal(
    propSchema: JsonSchema,
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    // Handle $ref
    if (propSchema.$ref) {
      return this.formatTypeReference(
        propSchema.$ref,
        currentSchema,
        getSchemaDocPath,
      );
    }

    // Handle array types
    if (propSchema.type === TYPE_CONSTANTS.ARRAY_TYPE && propSchema.items) {
      return this.formatArrayType(propSchema, currentSchema, getSchemaDocPath);
    }

    // Handle anyOf union types
    if (propSchema.anyOf && Array.isArray(propSchema.anyOf)) {
      return this.formatUnionType(
        propSchema.anyOf,
        currentSchema,
        getSchemaDocPath,
      );
    }

    // Handle oneOf union types
    if (propSchema.oneOf && Array.isArray(propSchema.oneOf)) {
      return this.formatUnionType(
        propSchema.oneOf,
        currentSchema,
        getSchemaDocPath,
      );
    }

    // Handle Record types (objects with unevaluatedProperties)
    if (
      propSchema.type === TYPE_CONSTANTS.OBJECT_TYPE &&
      propSchema.unevaluatedProperties
    ) {
      return this.formatRecordType(propSchema, currentSchema, getSchemaDocPath);
    }

    // Handle basic types with format
    if (propSchema.type) {
      return this.formatBasicType(propSchema, getSchemaDocPath);
    }

    return TYPE_CONSTANTS.UNKNOWN_TYPE;
  }

  /**
   * Converts a schema reference to a displayable type string with link
   */
  static formatTypeReference(
    ref: string,
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    // Handle internal $defs references
    if (ref.startsWith("#/$defs/")) {
      return this.formatInternalDefsReference(
        ref,
        currentSchema,
        getSchemaDocPath,
      );
    }

    // Handle external references
    if (ref.endsWith(".yaml")) {
      return this.formatExternalReference(ref, getSchemaDocPath);
    }

    // Handle plain type names
    return this.formatPlainTypeName(ref, getSchemaDocPath);
  }

  /**
   * Formats array type with proper generic syntax
   */
  private static formatArrayType(
    propSchema: JsonSchema,
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    if (!propSchema.items) {
      return this.formatTypeReference(
        TYPE_CONSTANTS.ARRAY_TYPE,
        currentSchema,
        getSchemaDocPath,
      );
    }

    if (propSchema.items.$ref) {
      const itemType = this.formatTypeReference(
        propSchema.items.$ref,
        currentSchema,
        getSchemaDocPath,
      );
      return `${this.formatTypeReference(TYPE_CONSTANTS.ARRAY_TYPE, currentSchema, getSchemaDocPath)}<${itemType}>`;
    }

    // Handle empty object schema for array items
    if (
      typeof propSchema.items === "object" &&
      Object.keys(propSchema.items).length === 0
    ) {
      const unknownLink = this.formatTypeReference(
        TYPE_CONSTANTS.UNKNOWN_TYPE,
        currentSchema,
        getSchemaDocPath,
      );
      return `${this.formatTypeReference(TYPE_CONSTANTS.ARRAY_TYPE, currentSchema, getSchemaDocPath)}<${unknownLink}>`;
    }

    // Handle basic type items
    const itemType = propSchema.items.type || TYPE_CONSTANTS.UNKNOWN_TYPE;
    const itemTypeLink = this.formatTypeReference(
      itemType,
      currentSchema,
      getSchemaDocPath,
    );
    const arrayLink = this.formatTypeReference(
      TYPE_CONSTANTS.ARRAY_TYPE,
      currentSchema,
      getSchemaDocPath,
    );
    return `${arrayLink}<${itemTypeLink}>`;
  }

  /**
   * Formats union types (anyOf/oneOf)
   */
  private static formatUnionType(
    unionSchemas: JsonSchema[],
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    const types = unionSchemas
      .map((subSchema) =>
        this.formatPropertyTypeInternal(
          subSchema,
          currentSchema,
          getSchemaDocPath,
        ),
      )
      .filter((type) => type !== "null")
      .join(" or ");
    return types || TYPE_CONSTANTS.UNKNOWN_TYPE;
  }

  /**
   * Formats Record types
   */
  private static formatRecordType(
    propSchema: JsonSchema,
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    if (
      typeof propSchema.unevaluatedProperties === "object" &&
      propSchema.unevaluatedProperties !== null &&
      "$ref" in propSchema.unevaluatedProperties
    ) {
      const valueType = this.formatTypeReference(
        propSchema.unevaluatedProperties.$ref as string,
        currentSchema,
        getSchemaDocPath,
      );
      return `${this.formatTypeReference(TYPE_CONSTANTS.RECORD_TYPE, currentSchema, getSchemaDocPath)}<${valueType}>`;
    }
    return this.formatTypeReference(
      TYPE_CONSTANTS.RECORD_TYPE,
      currentSchema,
      getSchemaDocPath,
    );
  }

  /**
   * Formats basic types with optional format
   */
  private static formatBasicType(
    propSchema: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    // Handle string with format
    if (propSchema.type === TYPE_CONSTANTS.STRING_TYPE && propSchema.format) {
      const typeName = FORMAT_TO_TYPE_MAP[propSchema.format];
      if (typeName) {
        return this.createTypeLink(typeName, getSchemaDocPath);
      }
    }

    // Use dynamic schema discovery for basic types (but not arrays)
    if (propSchema.type !== TYPE_CONSTANTS.ARRAY_TYPE && propSchema.type) {
      return this.createTypeLink(propSchema.type, getSchemaDocPath);
    }

    return propSchema.type || TYPE_CONSTANTS.UNKNOWN_TYPE;
  }

  /**
   * Formats internal $defs references
   */
  private static formatInternalDefsReference(
    ref: string,
    currentSchema?: JsonSchema,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    if (currentSchema && currentSchema.$defs) {
      const defName = ref.replace("#/$defs/", "");
      const defSchema = currentSchema.$defs[defName];
      if (
        defSchema &&
        defSchema.unevaluatedProperties &&
        typeof defSchema.unevaluatedProperties === "object" &&
        "$ref" in defSchema.unevaluatedProperties
      ) {
        const valueType = this.formatTypeReference(
          defSchema.unevaluatedProperties.$ref as string,
          currentSchema,
          getSchemaDocPath,
        );
        return `${this.formatTypeReference(TYPE_CONSTANTS.RECORD_TYPE, currentSchema, getSchemaDocPath)}<${valueType}>`;
      }
    }
    return this.formatTypeReference(
      TYPE_CONSTANTS.RECORD_TYPE,
      currentSchema,
      getSchemaDocPath,
    );
  }

  /**
   * Formats external references
   */
  private static formatExternalReference(
    ref: string,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    const typeName = ref.replace(".yaml", "");
    return this.createTypeLink(typeName, getSchemaDocPath);
  }

  /**
   * Formats plain type names
   */
  private static formatPlainTypeName(
    ref: string,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    return this.createTypeLink(ref, getSchemaDocPath);
  }

  /**
   * Creates a type link if documentation path is available
   */
  private static createTypeLink(
    typeName: string,
    getSchemaDocPath?: (typeName: string) => string | undefined,
  ): string {
    if (!getSchemaDocPath) {
      return typeName;
    }

    const docPath = getSchemaDocPath(typeName);
    if (docPath) {
      const anchor = typeName.toLowerCase();
      const linkWithAnchor = docPath.includes("#")
        ? docPath
        : `${docPath}#${anchor}`;
      return `<a href="${linkWithAnchor}">${typeName}</a>`;
    }

    return typeName;
  }
}
