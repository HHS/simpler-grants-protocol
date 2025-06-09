import { useState, useCallback, useMemo, useEffect } from "react";
import { schemas, type SchemaOption } from "./schemas";
import type { FormData } from "./types";
import { styles } from "./styles";
import { SchemaSelector } from "./SchemaSelector";
import { FormSection } from "./FormSection";
import { TransformationSummary } from "./TransformationSummary";
import { mapJson, type TransformOutput } from "./utils";

export default function FormMappingPlayground() {
  const getSchemaById = useCallback(
    (id: string): SchemaOption | undefined => schemas.find((s) => s.id === id),
    [],
  );

  const [inputId, setInputId] = useState<string>(schemas[0].id);
  const [targetId, setTargetId] = useState<string>(schemas[1].id);
  const [formData, setFormData] = useState<FormData>(
    getSchemaById(schemas[0].id)!.defaultData as FormData,
  );
  const [output, setOutput] = useState<TransformOutput | null>(null);
  const [targetFormData, setTargetFormData] = useState<FormData>({});

  const { formSchema, formUI, formName } = useMemo(() => {
    const current = getSchemaById(inputId)!;
    return {
      formSchema: current.formSchema,
      formUI: current.formUI,
      formName: current.label,
    };
  }, [inputId, getSchemaById]);

  const { targetFormSchema, targetFormUI, targetFormName } = useMemo(() => {
    const current = getSchemaById(targetId)!;
    return {
      targetFormSchema: current.formSchema,
      targetFormUI: current.formUI,
      targetFormName: current.label,
    };
  }, [targetId, getSchemaById]);

  const transformData = useCallback(() => {
    const result = mapJson(formData, inputId, targetId);
    setOutput(result);
    setTargetFormData(result.targetData as FormData);
  }, [formData, inputId, targetId]);

  useEffect(() => {
    transformData();
  }, [transformData]);

  const handleInputSchemaChange = (newId: string) => {
    setInputId(newId);
    setFormData(getSchemaById(newId)!.defaultData as FormData);
  };

  const handleTargetSchemaChange = (newId: string) => {
    setTargetId(newId);
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <SchemaSelector
          label="Source form"
          value={inputId}
          onChange={handleInputSchemaChange}
        />
        <SchemaSelector
          label="Form to prefill"
          value={targetId}
          onChange={handleTargetSchemaChange}
        />
      </div>

      <div style={styles.formContainer}>
        <FormSection
          type="source"
          formName={formName}
          schema={formSchema}
          uischema={formUI}
          data={formData}
          onChange={setFormData}
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

      <TransformationSummary
        sourceData={formData}
        commonData={output?.commonData ?? {}}
        targetData={output?.targetData ?? {}}
      />
    </div>
  );
}
