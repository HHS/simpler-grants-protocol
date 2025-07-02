import type { JsonSchema } from "@jsonforms/core";
import type { VerticalLayout } from "@jsonforms/core";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type FormData = Record<string, JsonValue>;

export type FormSchemaMap = Record<string, FormSchema>;

export type FormSchema = {
  id: string;
  label: string;
  description: string;
  owner: string;
  url?: string;
  formSchema: JsonSchema;
  formUI: VerticalLayout;
  defaultData: FormData;
  mappingToCommon: Record<string, unknown>;
  mappingFromCommon: Record<string, unknown>;
  statistics: {
    totalQuestions: number;
    mappedQuestions: number;
    mappingPercentage: number;
  };
};

export type TransformOutput = {
  timestamp: number;
  source: string;
  target: string;
  commonData: FormData;
  targetData: FormData;
};
