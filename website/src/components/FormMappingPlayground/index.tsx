import { useState, useCallback, useMemo, useEffect } from "react";

// Internal utilities
import type { FormData, TransformOutput } from "./types";
import { mapJson } from "./utils";
import { schemas } from "./schemas";

// Components
import { styles } from "./styles";
import { SchemaSelector } from "./SchemaSelector";
import { FormSection } from "./FormSection";
import { TransformationSummary } from "./TransformationSummary";

export default function FormMappingPlayground() {
  // #########################################################
  // Set up state management
  // #########################################################

  // Step 1: Get initial source and target form schemas on page load
  const sourceSchema = Object.values(schemas)[0];
  const targetSchema = Object.values(schemas)[1];

  // Step 2: Create the state for the source and target forms
  const [sourceId, setSourceId] = useState<string>(sourceSchema.id);
  const [targetId, setTargetId] = useState<string>(targetSchema.id);
  const [sourceFormData, setSourceFormData] = useState<FormData>(
    sourceSchema.defaultData
  );

  // Step 3: Create the state for the transformation output
  const [output, setOutput] = useState<TransformOutput | null>(null);
  const [targetFormData, setTargetFormData] = useState<FormData>({});

  // #########################################################
  // Get the source form details
  // #########################################################
  const { sourceFormSchema, sourceFormUI, sourceFormName } = useMemo(() => {
    const current = schemas[sourceId];
    return {
      sourceFormSchema: current.formSchema,
      sourceFormUI: current.formUI,
      sourceFormName: current.label,
    };
  }, [sourceId]);

  // #########################################################
  // Get the target form details
  // #########################################################
  const { targetFormSchema, targetFormUI, targetFormName } = useMemo(() => {
    const current = schemas[targetId];
    return {
      targetFormSchema: current.formSchema,
      targetFormUI: current.formUI,
      targetFormName: current.label,
    };
  }, [targetId]);

  // #########################################################
  // Transform the data
  // #########################################################
  const transformData = useCallback(() => {
    const result = mapJson(sourceFormData, sourceId, targetId);
    setOutput(result);
    setTargetFormData(result.targetData as FormData);
  }, [sourceFormData, sourceId, targetId]);

  useEffect(() => {
    transformData();
  }, [transformData]);

  // #########################################################
  // Handle schema changes
  // #########################################################
  const handleSourceSchemaChange = (newId: string) => {
    setSourceId(newId);
    setSourceFormData(schemas[newId].defaultData);
  };

  const handleTargetSchemaChange = (newId: string) => {
    setTargetId(newId);
  };

  // #########################################################
  // Render the form playground
  // #########################################################
  return (
    <div className="playground-container">
      <div className="form-container">
        <div style={styles.formGroup}>
          <SchemaSelector
            label="Source form"
            value={sourceId}
            onChange={handleSourceSchemaChange}
          />
          <FormSection
            type="source"
            formName={sourceFormName}
            schema={sourceFormSchema}
            uischema={sourceFormUI}
            data={sourceFormData}
            onChange={setSourceFormData}
          />
        </div>

        <div style={styles.formGroup}>
          <SchemaSelector
            label="Form to prefill"
            value={targetId}
            onChange={handleTargetSchemaChange}
          />
          <FormSection
            type="prefilled"
            formName={targetFormName}
            schema={targetFormSchema}
            uischema={targetFormUI}
            data={targetFormData}
            readonly={false}
          />
        </div>
      </div>

      <TransformationSummary
        sourceData={sourceFormData}
        commonData={output?.commonData ?? {}}
        targetData={output?.targetData ?? {}}
      />
    </div>
  );
}
