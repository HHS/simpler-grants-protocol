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

export interface FormSectionProps {
  formName: string;
  type: "source" | "prefilled";
  schema: JsonSchema;
  uischema: VerticalLayout;
  data: FormData;
  onChange?: (data: FormData) => void;
  readonly?: boolean;
  isCollapsed?: boolean;
  onToggleCollapse: () => void;
}

export const FormSection: React.FC<FormSectionProps> = ({
  formName,
  type,
  schema,
  uischema,
  data,
  onChange,
  readonly = false,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const getFormDescription = () => {
    switch (type) {
      case "source":
        return "Expand this source form to make changes that will be reflected in the prefilled form below.";
      case "prefilled":
        return "This form shows the prefilled data from the source form. You can edit these values freely.";
      default:
        return "";
    }
  };

  return (
    <details style={styles.formSection} open={!isCollapsed}>
      <summary
        style={styles.formHeader}
        onClick={(e) => {
          e.preventDefault();
          onToggleCollapse();
        }}
      >
        <div>
          <h2
            style={{ fontSize: "1rem", margin: 0 }}
          >{`${formName} (${type})`}</h2>
          <p
            style={{
              fontSize: "0.875rem",
              margin: "0.25rem 0 0 0",
              opacity: 0.8,
            }}
          >
            {getFormDescription()}
          </p>
        </div>
      </summary>
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
    </details>
  );
};
