import React, { useState, useCallback, useMemo } from "react";
import { schemas, type SchemaOption } from "./schemas";
import type { FormData } from "./types";
import { styles } from "./styles";
import { SchemaSelector } from "./SchemaSelector";
import { FormSection } from "./FormSection";
import { TransformButton } from "./TransformButton";
import { TransformationSteps } from "./TransformationSteps";
import { mapJson } from "./utils";

export default function FormMappingPlayground() {
  const getSchemaById = useCallback(
    (id: string): SchemaOption | undefined => schemas.find((s) => s.id === id),
    []
  );

  const [inputId, setInputId] = useState<string>(schemas[0].id);
  const [targetId, setTargetId] = useState<string>(schemas[1].id);
  const [formData, setFormData] = useState<FormData>(
    getSchemaById(schemas[0].id)!.defaultData as FormData
  );
  const [outputJson, setOutputJson] = useState<string>("");
  const [targetFormData, setTargetFormData] = useState<FormData>({});

  const { formSchema, formUI } = useMemo(() => {
    const current = getSchemaById(inputId)!;
    return { formSchema: current.formSchema, formUI: current.formUI };
  }, [inputId, getSchemaById]);

  const { targetFormSchema, targetFormUI } = useMemo(() => {
    const current = getSchemaById(targetId)!;
    return {
      targetFormSchema: current.formSchema,
      targetFormUI: current.formUI,
    };
  }, [targetId, getSchemaById]);

  const handleTransform = (e: React.FormEvent) => {
    e.preventDefault();
    const result = mapJson(formData, inputId, targetId);
    setOutputJson(JSON.stringify(result, null, 2));
    setTargetFormData(result.targetData as FormData);
  };

  const handleInputSchemaChange = (newId: string) => {
    setInputId(newId);
    setFormData(getSchemaById(newId)!.defaultData as FormData);
  };

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <SchemaSelector
          label="Input Schema"
          value={inputId}
          onChange={handleInputSchemaChange}
        />
        <SchemaSelector
          label="Target Schema"
          value={targetId}
          onChange={setTargetId}
        />
      </div>

      <div style={styles.formContainer}>
        <FormSection
          title="Input Form"
          schema={formSchema}
          uischema={formUI}
          data={formData}
          onChange={setFormData}
        />
        <FormSection
          title="Target Form (Read Only)"
          schema={targetFormSchema}
          uischema={targetFormUI}
          data={targetFormData}
          readonly={true}
        />
      </div>

      <TransformButton onClick={handleTransform} />
      <TransformationSteps formData={formData} outputJson={outputJson} />
    </div>
  );
}
