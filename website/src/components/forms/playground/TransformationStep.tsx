import React from "react";
import { styles } from "./styles";
import type { FormData } from "@/lib/types";

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
      <h3 style={{ ...styles.formHeader, fontSize: "1rem" }}>{title}</h3>
      {description && <p style={{ marginBottom: "0.5rem" }}>{description}</p>}
      <pre style={styles.code}>{JSON.stringify(output, null, 2)}</pre>
    </div>
  );
};
