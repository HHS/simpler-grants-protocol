import React from "react";
import { styles } from "./styles";
import type { FormData } from "./types";

interface TransformationStepProps {
  title: string;
  description?: string;
  output: FormData;
}

export const TransformationStep: React.FC<TransformationStepProps> = ({
  title,
  description,
  output,
}) => {
  return (
    <div>
      <div style={{ ...styles.formHeader, fontSize: "1rem" }}>{title}</div>
      {description && (
        <div style={{ marginBottom: "0.5rem" }}>{description}</div>
      )}
      <pre style={styles.code}>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
};
