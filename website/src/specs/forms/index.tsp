import "@common-grants/core";
import "@typespec/json-schema";

using JsonSchema;

@JsonSchema.jsonSchema
namespace Forms;

/**
 * Canary form used to exercise the forms pipeline before any real form
 * is composed. Provides one property and a minimal x-ui-schema so the
 * loader has a non-empty schema to dereference and extract from.
 *
 * Removed in the PR that introduces the first real form (key-contact).
 */
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Canary",
    elements: #[
      #{ type: "Control", scope: "#/properties/note", label: "Note" }
    ],
  }
)
@extension(
  "x-mapping-from-cg",
  #{ note: #{ field: "customFields.canary.note" } }
)
@extension("x-mapping-to-cg", #{ note: #{ field: "customFields.canary.note" } })
model FormCanary {
  /** Free-text note used only for canary verification */
  note?: string;
}
