import "../index.tsp";

namespace CommonGrants.Models;

model Form {
  /** The form's unique identifier. */
  id: Types.uuid;

  /** The form's name. */
  name: string;

  /** The form's description. */
  description?: string;

  /** The form's instructions. */
  instructions?: string | Fields.File;

  /** The form's JSON schema used to render the form and validate responses. */
  jsonSchema: Record<unknown>;

  /** The form's UI schema used to render the form in the UI. */
  uiSchema?: Record<unknown>;

  mappings?: {
    /** The form's mappings. */
    mappingToCommonGrants: Record<unknown>;

    /** The form's mappings. */
    mappingFromCommonGrants: Record<unknown>;
  };

  /** Custom attributes about the form itself, not custom fields within the form. */
  customFields?: Record<Fields.CustomField>;
}
