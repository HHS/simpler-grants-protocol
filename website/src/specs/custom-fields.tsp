import "@common-grants/core";
import "@typespec/json-schema";

using TypeSpec.JsonSchema;
using CommonGrants.Fields;

@jsonSchema
namespace CustomFields;

model CustomLegacyId extends CustomField {
  name: "legacyId";
  fieldType: CustomFieldType.number;

  @example(12345)
  value: integer;

  description: "An integer ID for the opportunity, needed for compatibility with legacy systems";
}

model CustomFoo extends CustomField {
  name: "foo";
  fieldType: CustomFieldType.string;

  @example("bar")
  value: string;

  description: "A string field for the foo";
}

model CustomBar extends CustomField {
  name: "bar";
  fieldType: CustomFieldType.object;

  @example(
    #{ foo: "bar", baz: "qux" },
    #{ title: "An example of a bar object" }
  )
  value: {
    foo: string;
    baz: string;
  };

  description: "An object field for the bar";
}
