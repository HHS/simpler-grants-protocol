import { schemas } from "./schemas";
import { transformWithMapping } from "./transformation";
import type { FormData, TransformOutput } from "./types";

export function mapJson(
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
