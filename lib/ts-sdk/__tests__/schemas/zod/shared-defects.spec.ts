/**
 * Isolated reproductions of shared-schema defects that block award parity.
 *
 * The award models (#1156) reuse schemas the SDK already ships — the event
 * variants under `keyDates`, and `CustomField` under a recipient's
 * `customFields`. Those existing schemas diverge from their emitted protocol
 * contracts in two ways that no award-only change can fix:
 *
 *   1. Optional metadata is `.nullish()`, so the SDK accepts an explicit `null`
 *      where the protocol describes a plain (absent-or-string) property.
 *   2. The objects are built with `.extend()` and never sealed, so the SDK
 *      accepts unknown keys the protocol's `unevaluatedProperties: { not: {} }`
 *      rejects.
 *
 * Both are shared-model concerns owned by #1192, not this assignment. These
 * cases isolate each divergence against the real composed schema so award work
 * cannot claim full parity while they stand, and so the entries expire the
 * moment #1192 lands: {@link checkZodMatchesJsonSchema} fails a tracked
 * divergence that no longer reproduces.
 *
 * The extra-key divergences are only observable with `preserveObjectPolicy`.
 * Under the default policy the harness forces root `.strict()` on the Zod
 * schema, which would reject the unknown key itself and mask the fact that the
 * production schema, as consumers use it, accepts it.
 */

import { describe, it } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper";
import { SingleDateEventSchema, CustomFieldSchema } from "@/schemas";

/** The issue that owns the shared-model parity fixes these cases wait on. */
const SHARED_MODELS_ISSUE = "https://github.com/HHS/simpler-grants-protocol/issues/1192";

describe("shared-schema defects blocking award parity (owned by #1192)", () => {
  // #########################################################
  // Event variants — reused by AwdTimeline.keyDates (#1156-T4)
  // #########################################################

  describe("SingleDateEventSchema vs SingleDateEvent.yaml", () => {
    const baseline = {
      name: "Award date",
      eventType: "singleDate" as const,
      date: "2026-03-01",
    };

    it("accepts a null optional field and an unknown key the protocol rejects", async () => {
      await expectZodMatchesJsonSchema(
        SingleDateEventSchema,
        "SingleDateEvent.yaml",
        [
          // Control: the baseline agrees on both sides.
          { label: "valid single-date event", value: baseline },
          // Each divergent value is one field off the baseline.
          {
            label: "null description",
            value: { ...baseline, description: null },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
          {
            label: "unknown key",
            value: { ...baseline, bogus: "x" },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
        ],
        2,
        true
      );
    });
  });

  // #########################################################
  // CustomField — reused by AwdRecipientIndividual.customFields (#1156-T4)
  // #########################################################

  describe("CustomFieldSchema vs CustomField.yaml", () => {
    const baseline = {
      name: "programArea",
      fieldType: "string" as const,
      value: "Healthcare Innovation",
    };

    it("accepts null optional fields and an unknown key the protocol rejects", async () => {
      await expectZodMatchesJsonSchema(
        CustomFieldSchema,
        "CustomField.yaml",
        [
          { label: "valid custom field", value: baseline },
          {
            label: "null schema",
            value: { ...baseline, schema: null },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
          {
            label: "null description",
            value: { ...baseline, description: null },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
          {
            label: "unknown key",
            value: { ...baseline, bogus: 1 },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
        ],
        3,
        true
      );
    });
  });
});
