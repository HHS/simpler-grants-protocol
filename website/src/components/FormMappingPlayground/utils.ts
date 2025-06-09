import { schemas } from "./schemas";
import { transformWithMapping } from "./transformation";
import type { FormData } from "./types";

export type TransformOutput = {
  timestamp: number;
  source: string;
  target: string;
  commonData: FormData;
  targetData: FormData;
};

export function mapJson(
  data: FormData,
  sourceId: string,
  targetId: string,
): TransformOutput {
  const sourceSchema = schemas.find((s) => s.id === sourceId);
  const targetSchema = schemas.find((s) => s.id === targetId);

  if (!sourceSchema || !targetSchema) {
    throw new Error("Source or target schema not found");
  }

  const commonData = transformWithMapping(
    data,
    sourceSchema.mappings.mappingToCommon as FormData,
  );

  const targetData = transformWithMapping(
    commonData,
    targetSchema.mappings.mappingFromCommon as FormData,
  );

  return {
    timestamp: Date.now(),
    source: sourceId,
    target: targetId,
    commonData,
    targetData,
  };
}
