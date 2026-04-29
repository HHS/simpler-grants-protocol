import type { JsonSchema, VerticalLayout } from "@jsonforms/core";
import type { FormItem } from "@/lib/forms";
import type { FormData, FormSchema } from "@/lib/types";

/**
 * Converts a TypeSpec FormItem and its generated example JSON string
 * into the FormSchema shape expected by the playground.
 */
export function buildFormSchema(
  item: FormItem,
  exampleJson: string,
): FormSchema {
  return {
    id: item.id,
    label: item.label,
    description: item.description,
    owner: "",
    ...(item.url !== undefined && { url: item.url }),
    formSchema: item.rawSchema as JsonSchema,
    formUI: item.uiSchema as unknown as VerticalLayout,
    defaultData: JSON.parse(exampleJson) as FormData,
    mappingToCommon: item.mappingToCg,
    mappingFromCommon: item.mappingFromCg,
  };
}
