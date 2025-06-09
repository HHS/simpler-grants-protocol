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
      <p>
        Here's a quick summary of what's happening behind the scenes to
        translate data from the source form to the prefilled form.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <TransformationStep
          title="1. Source form data"
          description="Fetch the data from the source form using JSON form schema."
          output={sourceData}
        />
        <TransformationStep
          title="2. CommonGrants form data"
          description="Transform the source data to CommonGrants using the source form mapping."
          output={commonData}
        />
        <TransformationStep
          title="3. Target form data"
          description="Transform from the CommonGrants data to the target format using its mapping and prefill the target form."
          output={targetData}
        />
      </div>
    </div>
  );
};
