import React, { useState, useCallback, useMemo } from "react";
import { schemas, type SchemaOption } from "../lib/schemas";
import { JsonForms } from "@jsonforms/react";
import { vanillaRenderers, vanillaCells } from "@jsonforms/vanilla-renderers";
import { transformWithMapping } from "../lib/transformation";

type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

type FormData = Record<string, JsonValue>;

function mapJson(data: FormData, sourceId: string, targetId: string): FormData {
  // Get the source and target schemas
  const sourceSchema = schemas.find((s) => s.id === sourceId);
  const targetSchema = schemas.find((s) => s.id === targetId);

  if (!sourceSchema || !targetSchema) {
    throw new Error("Source or target schema not found");
  }

  // Step 1: Transform source data to common format
  const commonData = transformWithMapping(
    data,
    sourceSchema.mappings.mappingToCommon as FormData,
  );

  // Step 2: Transform common format to target format
  const targetData = transformWithMapping(
    commonData,
    targetSchema.mappings.mappingFromCommon as FormData,
  );

  return {
    timestamp: Date.now(),
    source: sourceId,
    target: targetId,
    commonData: commonData as FormData,
    targetData: targetData as FormData,
  };
}

const styles = {
  container: {
    maxWidth: 1200,
    margin: "2rem auto",
    padding: "2rem",
    borderRadius: "1rem",
    background: "#fff",
    boxShadow: "0 2px 16px rgba(0,0,0,0.08)",
    fontFamily: "system-ui, sans-serif",
    display: "flex",
    flexDirection: "column" as const,
    gap: "1.5rem",
  },
  formContainer: {
    display: "flex",
    gap: "2rem",
  },
  formSection: {
    flex: 1,
    padding: "1rem",
    borderRadius: "0.5rem",
    background: "#f8f9fa",
  },
  formHeader: {
    marginBottom: "1rem",
    fontSize: "1.2rem",
    fontWeight: 600,
    color: "#333",
  },
  row: {
    display: "flex",
    gap: "1rem",
  },
  label: {
    fontWeight: 600,
    marginBottom: 4,
    display: "block",
  },
  select: {
    padding: "0.5rem",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 16,
    width: "100%",
  },
  input: {
    padding: "0.5rem",
    borderRadius: 6,
    border: "1px solid #ccc",
    fontSize: 16,
    width: "100%",
  },
  button: {
    padding: "0.75rem 1.5rem",
    borderRadius: 6,
    border: "none",
    background: "#1976d2",
    color: "#fff",
    fontWeight: 700,
    fontSize: 16,
    cursor: "pointer",
    alignSelf: "flex-start",
  },
  code: {
    background: "#f5f5f5",
    borderRadius: 6,
    padding: "1rem",
    fontFamily: "monospace",
    fontSize: 14,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-all" as const,
  },
};

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

  return (
    <div style={styles.container}>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Input Schema</label>
          <select
            style={styles.select}
            value={inputId}
            onChange={(e) => {
              const newId = e.target.value;
              setInputId(newId);
              setFormData(getSchemaById(newId)!.defaultData as FormData);
            }}
          >
            {schemas.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Target Schema</label>
          <select
            style={styles.select}
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {schemas.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={styles.formContainer}>
        <div style={styles.formSection}>
          <div style={styles.formHeader}>Input Form</div>
          <JsonForms
            schema={formSchema}
            uischema={formUI}
            data={formData}
            renderers={vanillaRenderers}
            cells={vanillaCells}
            onChange={({ data }) => setFormData(data as FormData)}
          />
        </div>

        <div style={styles.formSection}>
          <div style={styles.formHeader}>Target Form (Read Only)</div>
          <JsonForms
            schema={targetFormSchema}
            uischema={targetFormUI}
            data={targetFormData}
            renderers={vanillaRenderers}
            cells={vanillaCells}
            readonly={true}
          />
        </div>
      </div>

      <button type="button" style={styles.button} onClick={handleTransform}>
        Transform
      </button>

      {outputJson && (
        <div>
          <div style={styles.formHeader}>Transformation Steps</div>
          <div
            style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
          >
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
                {JSON.stringify(JSON.parse(outputJson).commonData, null, 2)}
              </pre>
            </div>
            <div>
              <div style={{ ...styles.formHeader, fontSize: "1rem" }}>
                3. Target Format
              </div>
              <pre style={styles.code}>
                {JSON.stringify(JSON.parse(outputJson).targetData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------------------
   TODOs (optional enhancements):
   - Render `targetSchema` with a read-only JsonForms instance instead of Code.
   - Provide tabs to toggle schema / form / raw data views like jsonforms.io.
   - Add Vitest unit tests for `mapJson`.
--------------------------------------------------------------------------- */
