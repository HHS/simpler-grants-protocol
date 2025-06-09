import React from "react";
import { JsonForms } from "@jsonforms/react";
import { vanillaRenderers, vanillaCells } from "@jsonforms/vanilla-renderers";
import { styles } from "./styles";
import type { FormData } from "./types";

interface FormSectionProps {
  title: string;
  schema: any;
  uischema: any;
  data: FormData;
  onChange?: (data: FormData) => void;
  readonly?: boolean;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  schema,
  uischema,
  data,
  onChange,
  readonly = false,
}) => (
  <div style={styles.formSection}>
    <div style={styles.formHeader}>{title}</div>
    <JsonForms
      schema={schema}
      uischema={uischema}
      data={data}
      renderers={vanillaRenderers}
      cells={vanillaCells}
      onChange={onChange ? ({ data }) => onChange(data as FormData) : undefined}
      readonly={readonly}
    />
  </div>
);
