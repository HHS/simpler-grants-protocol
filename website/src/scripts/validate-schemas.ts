#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { validateCommonGrantsMappings } from "../lib/validation.js";
import type { JsonValue } from "../lib/types.js";
import type { JsonSchema } from "@jsonforms/core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ValidationSummary {
  totalForms: number;
  formsWithErrors: number;
  formsWithWarnings: number;
  formsValid: number;
  errors: Array<{
    formId: string;
    error: string;
  }>;
}

interface FormInfo {
  id: string;
  title: string;
  description?: string;
  owner?: string;
  url?: string;
}

/**
 * Load form data from filesystem
 */
function loadFormData(formId: string, formLabel: string) {
  const formsDir = join(__dirname, "../content/forms");
  const formDir = join(formsDir, formId);

  // Check if form directory exists
  if (!existsSync(formDir)) {
    throw new Error(`Form directory not found: ${formDir}`);
  }

  // Load all required files
  const schemaPath = join(formDir, "json-schema.json");
  const uiPath = join(formDir, "ui-schema.json");
  const mappingToPath = join(formDir, "mapping-to-cg.json");
  const mappingFromPath = join(formDir, "mapping-from-cg.json");
  const defaultDataPath = join(formDir, "default-data.json");

  const schema = JSON.parse(readFileSync(schemaPath, "utf-8"));
  const ui = JSON.parse(readFileSync(uiPath, "utf-8"));
  const mappingTo = JSON.parse(readFileSync(mappingToPath, "utf-8"));
  const mappingFrom = JSON.parse(readFileSync(mappingFromPath, "utf-8"));
  const defaultData = JSON.parse(readFileSync(defaultDataPath, "utf-8"));

  return {
    id: formId,
    label: formLabel,
    description: "",
    owner: "",
    url: undefined,
    formSchema: schema,
    formUI: ui,
    mappingToCommon: mappingTo,
    mappingFromCommon: mappingFrom,
    defaultData,
    statistics: {
      totalQuestions: 0,
      mappedQuestions: 0,
      mappingPercentage: 0,
    },
  };
}

/**
 * Load all forms from the forms index
 */
function loadAllForms() {
  const formsIndexPath = join(__dirname, "../content/forms/index.json");
  const formsIndex: FormInfo[] = JSON.parse(
    readFileSync(formsIndexPath, "utf-8")
  );

  const schemas: Record<string, ReturnType<typeof loadFormData>> = {};

  for (const form of formsIndex) {
    try {
      const formData = loadFormData(form.id, form.title);
      schemas[form.id] = formData;
    } catch (error) {
      console.error(`Failed to load schema for form ${form.id}:`, error);
      throw error;
    }
  }

  return schemas;
}

/**
 * Validates all form schemas and provides a comprehensive report
 */
async function validateAllSchemas(): Promise<ValidationSummary> {
  console.log("🔍 Starting validation of all form schemas...\n");

  const summary: ValidationSummary = {
    totalForms: 0,
    formsWithErrors: 0,
    formsWithWarnings: 0,
    formsValid: 0,
    errors: [],
  };

  try {
    // Load all schemas
    const schemas = loadAllForms();
    summary.totalForms = Object.keys(schemas).length;

    console.log(`📋 Found ${summary.totalForms} forms to validate\n`);

    // Validate each schema
    for (const [formId, schema] of Object.entries(schemas)) {
      console.log(`\n🔍 Validating form: ${formId}`);
      console.log(`   Label: ${schema.label}`);

      try {
        // Capture console.warn output to detect validation warnings
        const originalWarn = console.warn;
        const warnings: string[] = [];

        console.warn = (...args: unknown[]) => {
          warnings.push(args.join(" "));
          originalWarn(...args);
        };

        // Run validation using the existing validation function
        validateCommonGrantsMappings({
          formId,
          formSchema: schema.formSchema as JsonSchema,
          mappingToCommon: schema.mappingToCommon as Record<string, JsonValue>,
          mappingFromCommon: schema.mappingFromCommon as Record<
            string,
            JsonValue
          >,
          defaultData: schema.defaultData,
        });

        // Restore console.warn
        console.warn = originalWarn;

        if (warnings.length > 0) {
          summary.formsWithWarnings++;
          console.log(`   ⚠️  Validation warnings: ${warnings.length}`);
          warnings.forEach((warning) => {
            console.log(`      - ${warning}`);
          });
        } else {
          summary.formsValid++;
          console.log(`   ✅ Valid`);
        }
      } catch (error) {
        summary.formsWithErrors++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        summary.errors.push({ formId, error: errorMessage });
        console.log(`   ❌ Error: ${errorMessage}`);
      }
    }
  } catch (error) {
    console.error("❌ Failed to load schemas:", error);
    summary.errors.push({
      formId: "SCHEMA_LOADING",
      error: error instanceof Error ? error.message : String(error),
    });
  }

  return summary;
}

/**
 * Prints a formatted validation summary
 */
function printSummary(summary: ValidationSummary): void {
  console.log("\n" + "=".repeat(60));
  console.log("📊 VALIDATION SUMMARY");
  console.log("=".repeat(60));

  console.log(`Total Forms: ${summary.totalForms}`);
  console.log(`✅ Valid: ${summary.formsValid}`);
  console.log(`⚠️  With Warnings: ${summary.formsWithWarnings}`);
  console.log(`❌ With Errors: ${summary.formsWithErrors}`);

  if (summary.errors.length > 0) {
    console.log("\n🚨 ERRORS:");
    summary.errors.forEach(({ formId, error }) => {
      console.log(`   ${formId}: ${error}`);
    });
  }

  const successRate =
    summary.totalForms > 0
      ? Math.round((summary.formsValid / summary.totalForms) * 100)
      : 0;

  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (summary.formsWithErrors > 0) {
    console.log("\n❌ Validation failed - some forms have errors");
    process.exit(1);
  } else if (summary.formsWithWarnings > 0) {
    console.log("\n⚠️  Validation completed with warnings");
  } else {
    console.log("\n✅ All forms validated successfully!");
  }
}

/**
 * Main function
 */
async function main(): Promise<void> {
  const startTime = Date.now();

  try {
    const summary = await validateAllSchemas();
    printSummary(summary);

    const duration = Date.now() - startTime;
    console.log(`\n⏱️  Validation completed in ${duration}ms`);
  } catch (error) {
    console.error("❌ Validation script failed:", error);
    process.exit(1);
  }
}

// Run the script if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
