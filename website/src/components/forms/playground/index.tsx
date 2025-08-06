import { useState, useCallback, useMemo, useEffect } from "react";

// Internal utilities
import type { FormData, TransformOutput } from "@/lib/types";
import { transformWithMapping } from "@/lib/transformation";
import { schemas } from "@/lib/schemas";

// Components
import { styles } from "./styles";
import { SchemaSelector } from "./SchemaSelector";
import { FormSection } from "./FormSection";
import { TransformationSummary } from "./TransformationSummary";

// #########################################################
// URL parameter utilities
// #########################################################

const getUrlParams = () => {
  if (typeof window === "undefined") return {};
  const urlParams = new URLSearchParams(window.location.search);
  return {
    src: urlParams.get("src"),
    tgt: urlParams.get("tgt"),
  };
};

const updateUrlParams = (sourceId: string, targetId: string) => {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.set("src", sourceId);
  url.searchParams.set("tgt", targetId);

  // Update URL without causing a page reload
  window.history.replaceState({}, "", url.toString());
};

const getValidSchemaId = (id: string | null, fallbackId: string): string => {
  if (!id || !schemas[id]) {
    return fallbackId;
  }
  return id;
};

/**
 * Maps JSON data from one form schema to another using the common data format as an intermediary.
 *
 * @param data - The source form data
 * @param sourceId - The ID of the source form schema
 * @param targetId - The ID of the target form schema
 * @returns A TransformOutput object containing the transformation results
 */
function mapJson(
  data: FormData,
  sourceId: string,
  targetId: string,
): TransformOutput {
  const sourceSchema = schemas[sourceId];
  const targetSchema = schemas[targetId];

  if (!sourceSchema || !targetSchema) {
    throw new Error("Source or target schema not found");
  }

  const commonData = transformWithMapping(
    data,
    sourceSchema.mappingToCommon as FormData,
  );

  const targetData = transformWithMapping(
    commonData,
    targetSchema.mappingFromCommon as FormData,
  );

  return {
    timestamp: Date.now(),
    source: sourceId,
    target: targetId,
    commonData,
    targetData,
  };
}

export default function FormMappingPlayground() {
  // #########################################################
  // Set up state management
  // #########################################################

  // Step 1: Get initial source and target form schemas on page load
  const sourceSchema = Object.values(schemas)[0];
  const targetSchema = Object.values(schemas)[1];

  // Step 2: Read URL parameters on initial load
  const urlParams = useMemo(() => getUrlParams(), []);
  const initialSourceId = getValidSchemaId(
    urlParams.src || null,
    sourceSchema.id,
  );
  const initialTargetId = getValidSchemaId(
    urlParams.tgt || null,
    targetSchema.id,
  );

  // Step 3: Create the state for the source and target forms
  const [sourceId, setSourceId] = useState<string>(initialSourceId);
  const [targetId, setTargetId] = useState<string>(initialTargetId);
  const [sourceFormData, setSourceFormData] = useState<FormData>(
    schemas[initialSourceId].defaultData,
  );

  // Step 4: Create the state for the transformation output
  const [output, setOutput] = useState<TransformOutput | null>(null);
  const [targetFormData, setTargetFormData] = useState<FormData>({});

  // Step 5: Add collapsible state
  const [isSourceCollapsed, setIsSourceCollapsed] = useState<boolean>(true);
  const [isTargetCollapsed, setIsTargetCollapsed] = useState<boolean>(false);

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
    updateUrlParams(newId, targetId);
  };

  const handleTargetSchemaChange = (newId: string) => {
    setTargetId(newId);
    updateUrlParams(sourceId, newId);
  };

  // #########################################################
  // Render the form playground
  // #########################################################
  return (
    <div className="playground-container">
      <div className="form-container" style={styles.verticalContainer}>
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
            isCollapsed={isSourceCollapsed}
            onToggleCollapse={() => setIsSourceCollapsed(!isSourceCollapsed)}
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
            isCollapsed={isTargetCollapsed}
            onToggleCollapse={() => setIsTargetCollapsed(!isTargetCollapsed)}
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
