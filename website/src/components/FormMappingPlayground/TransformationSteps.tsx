import React from "react";
import { styles } from "./styles";
import type { FormData } from "./types";

interface TransformationStepsProps {
  formData: FormData;
  outputJson: string;
}

export const TransformationSteps: React.FC<TransformationStepsProps> = ({
  formData,
  outputJson,
}) => {
  if (!outputJson) return null;

  const parsedOutput = JSON.parse(outputJson);

  return (
    <div>
      <div style={styles.formHeader}>Transformation Steps</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div>
          <div style={{ ...styles.formHeader, fontSize: "1rem" }}>
            1. Source Data
          </div>
          <pre style={styles.code}>{JSON.stringify(formData, null, 2)}</pre>
        </div>
        <div>
          <div style={{ ...styles.formHeader, fontSize: "1rem" }}>
            2. Common Format
          </div>
          <pre style={styles.code}>
            {JSON.stringify(parsedOutput.commonData, null, 2)}
          </pre>
        </div>
        <div>
          <div style={{ ...styles.formHeader, fontSize: "1rem" }}>
            3. Target Format
          </div>
          <pre style={styles.code}>
            {JSON.stringify(parsedOutput.targetData, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};
