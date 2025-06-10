import React from "react";
import { styles } from "./styles";
import type { FormData } from "./types";
import { TransformationStep } from "./TransformationStep";

interface TransformationSummaryProps {
  sourceData: FormData;
  commonData: FormData;
  targetData: FormData;
}

export const TransformationSummary: React.FC<TransformationSummaryProps> = ({
  sourceData,
  commonData,
  targetData,
}) => {
  if (!commonData || !targetData) return null;

  return (
    <div>
      <h2 style={styles.formHeader}>Behind the scenes</h2>
      <p style={{ marginBottom: "1rem" }}>
        Here's a quick summary of what's happening behind the scenes to
        translate data from the source form to the prefilled form.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <TransformationStep
          title="1. Source form data"
          description="Fetch the data from the source form using its JSON schema."
          output={sourceData}
        />
        <TransformationStep
          title="2. CommonGrants form data"
          description="Transform the source data to the CommonGrants data format using one mapping (source form to CommonGrants)."
          output={commonData}
        />
        <TransformationStep
          title="3. Prefilled form data"
          description="Use a second mapping (CommonGrants to prefilled form) to convert the CommonGrants data into the prefilled form's data format."
          output={targetData}
        />
      </div>
    </div>
  );
};
