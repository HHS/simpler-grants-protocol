import React from "react";
import { JsonForms } from "@jsonforms/react";
import {
  JsonFormsStyleContext,
  vanillaRenderers,
  vanillaCells,
  vanillaStyles,
} from "@jsonforms/vanilla-renderers";
import { styles } from "./styles";
import "./form-styles.css";
import type { FormData } from "./types";
import type { JsonSchema, VerticalLayout } from "@jsonforms/core";

const styleContextValue = {
  styles: [
    ...vanillaStyles, // keep defaults
    { name: "control.input", classNames: ["form-input", "rounded"] },
    { name: "control.select", classNames: ["form-select", "rounded"] },
    { name: "control.textarea", classNames: ["form-textarea", "rounded"] },
    { name: "array.button", classNames: ["btn", "btn-primary"] },
    { name: "array.item", classNames: ["form-array-item", "rounded"] },
    { name: "array.layout", classNames: ["form-array-layout"] },
    { name: "control.label", classNames: ["form-label", "font-semibold"] },
    {
      name: "control.validation",
      classNames: ["form-validation", "text-red-500"],
    },
    {
      name: "control.description",
      classNames: ["form-description", "text-gray-600"],
    },
    { name: "group.layout", classNames: ["form-group", "rounded"] },
    { name: "group.label", classNames: ["form-group-label", "font-bold"] },
  ],
};

interface FormSectionProps {
  formName: string;
  type: "source" | "prefilled";
  schema: JsonSchema;
  uischema: VerticalLayout;
  data: FormData;
  onChange?: (data: FormData) => void;
  readonly?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  formName,
  type,
  schema,
  uischema,
  data,
  onChange,
  readonly = false,
}) => (
  <div style={styles.formSection}>
    <h2 style={styles.formHeader}>{`${formName} (${type})`}</h2>
    <p>
      {type === "source"
        ? "Changes here will be reflected in the prefilled form."
        : "The prefilled answers can be edited freely."}
    </p>
    <JsonFormsStyleContext.Provider value={styleContextValue}>
      <JsonForms
        schema={schema}
        uischema={uischema}
        data={data}
        renderers={vanillaRenderers}
        cells={vanillaCells}
        onChange={
          onChange ? ({ data }) => onChange(data as FormData) : undefined
        }
        readonly={readonly}
      />
    </JsonFormsStyleContext.Provider>
  </div>
);
