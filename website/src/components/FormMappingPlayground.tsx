import React, { useState, useCallback, useMemo } from "react";
import { schemas, type SchemaOption } from "../lib/schemas";

function mapJson(
  data: unknown,
  sourceId: string,
  targetId: string,
): Record<string, unknown> {
  return {
    timestamp: Date.now(),
    source: sourceId,
    target: targetId,
    payload: data,
  };
}

const styles = {
  container: {
    maxWidth: 480,
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
  const [formData, setFormData] = useState<any>(
    getSchemaById(schemas[0].id)!.defaultData,
  );
  const [outputJson, setOutputJson] = useState<string>("");

  const { formSchema } = useMemo(() => {
    const current = getSchemaById(inputId)!;
    return { formSchema: current.formSchema };
  }, [inputId, getSchemaById]);

  const handleInputChange = (key: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleTransform = (e: React.FormEvent) => {
    e.preventDefault();
    const result = mapJson(formData, inputId, targetId);
    setOutputJson(JSON.stringify(result, null, 2));
  };

  return (
    <form style={styles.container} onSubmit={handleTransform}>
      <div style={styles.row}>
        <div style={{ flex: 1 }}>
          <label style={styles.label}>Input Schema</label>
          <select
            style={styles.select}
            value={inputId}
            onChange={(e) => {
              const newId = e.target.value;
              setInputId(newId);
              setFormData(getSchemaById(newId)!.defaultData);
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

      {/* Render form fields dynamically */}
      {Object.entries(formSchema.properties ?? {}).map(([key, prop]: any) => (
        <div key={key}>
          <label style={styles.label}>{prop.title || key}</label>
          <input
            style={styles.input}
            type={
              prop.format === "date"
                ? "date"
                : prop.type === "number"
                  ? "number"
                  : "text"
            }
            value={formData[key] ?? ""}
            onChange={(e) =>
              handleInputChange(
                key,
                prop.type === "number"
                  ? Number(e.target.value)
                  : e.target.value,
              )
            }
            required={formSchema.required?.includes(key)}
          />
        </div>
      ))}

      <button type="submit" style={styles.button}>
        Transform
      </button>

      {outputJson && <pre style={styles.code}>{outputJson}</pre>}
    </form>
  );
}

/* ---------------------------------------------------------------------------
   TODOs (optional enhancements):
   - Render `targetSchema` with a read-only JsonForms instance instead of Code.
   - Provide tabs to toggle schema / form / raw data views like jsonforms.io.
   - Add Vitest unit tests for `mapJson`.
--------------------------------------------------------------------------- */
