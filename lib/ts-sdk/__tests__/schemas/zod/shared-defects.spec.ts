/**
 * Isolated reproductions of shared-schema defects that the award work (#1156)
 * runs into but does not own.
 *
 * Two of them block award-model parity directly, because the award models
 * reuse the offending schemas and cannot fork around them without duplicating a
 * discriminated union or a record element: the event variants under `keyDates`,
 * and `CustomField` under a recipient's `customFields`.
 *
 * The rest are the pagination and sorting envelopes the award *routes* reuse.
 * `award-routes.ts` cannot build on the shared `PaginatedQueryParams`,
 * `PaginatedBodyParams`, `PaginatedResultsInfo`, or `SortedResultsInfo` schemas
 * today because each diverges from its emitted contract, so the route layer
 * defines concrete, protocol-exact local copies instead. Those copies collapse
 * back onto the shared generics the moment #1192 fixes the originals.
 *
 * Every schema below diverges from its emitted protocol contract in one or both
 * of the same two ways, neither of which an award-only change can fix:
 *
 *   1. The objects are never sealed, so the SDK accepts unknown keys the
 *      protocol's `unevaluatedProperties: { not: {} }` rejects.
 *   2. Numeric fields omit the protocol's bounds (`page`/`pageSize` have no
 *      `.max()`; `pageSize` on results info allows `0` below the protocol's
 *      minimum of `1`).
 *
 * Their optional metadata also accepts an explicit `null` where the protocol
 * describes a plain (absent-or-value) property. That is not a divergence: the
 * SDK accepts it on read and omits it on write, so those cases are
 * `"normalized"` and check that the parsed value satisfies the protocol.
 *
 * Both divergences are shared-model concerns owned by #1192, not this
 * assignment. These cases isolate each divergence against the real shared
 * schema so award work cannot claim full parity while they stand, and so the
 * entries expire the moment #1192 lands: {@link checkZodMatchesJsonSchema}
 * fails a tracked divergence that no longer reproduces.
 *
 * The extra-key divergences are only observable with `preserveObjectPolicy`.
 * Under the default policy the harness forces root `.strict()` on the Zod
 * schema, which would reject the unknown key itself and mask the fact that the
 * production schema, as consumers use it, accepts it.
 */

import { describe, it } from "vitest";
import { expectZodMatchesJsonSchema } from "../../helper.js";
import {
  SingleDateEventSchema,
  CustomFieldSchema,
  PaginatedQueryParamsSchema,
  PaginatedBodyParamsSchema,
  PaginatedResultsInfoSchema,
  SortedResultsInfoSchema,
} from "@/schemas";

/** The issue that owns the shared-model parity fixes these cases wait on. */
const SHARED_MODELS_ISSUE = "https://github.com/HHS/simpler-grants-protocol/issues/1192";

describe("shared-schema defects blocking award parity (owned by #1192)", () => {
  // #########################################################
  // Event variants: reused by AwdTimeline.keyDates (#1156-T4)
  // #########################################################

  describe("SingleDateEventSchema vs SingleDateEvent.yaml", () => {
    const baseline = {
      name: "Award date",
      eventType: "singleDate" as const,
      date: "2026-03-01",
    };

    it("normalizes a null optional field and accepts an unknown key the protocol rejects", async () => {
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
            expect: "normalized",
          },
          {
            label: "unknown key",
            value: { ...baseline, bogus: "x" },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
        ],
        1,
        true
      );
    });
  });

  // #########################################################
  // CustomField: reused by AwdRecipientIndividual.customFields (#1156-T4)
  // #########################################################

  describe("CustomFieldSchema vs CustomField.yaml", () => {
    const baseline = {
      name: "programArea",
      fieldType: "string" as const,
      value: "Healthcare Innovation",
    };

    it("normalizes null optional fields and accepts an unknown key the protocol rejects", async () => {
      await expectZodMatchesJsonSchema(
        CustomFieldSchema,
        "CustomField.yaml",
        [
          { label: "valid custom field", value: baseline },
          { label: "null schema", value: { ...baseline, schema: null }, expect: "normalized" },
          {
            label: "null description",
            value: { ...baseline, description: null },
            expect: "normalized",
          },
          {
            label: "unknown key",
            value: { ...baseline, bogus: 1 },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
        ],
        1,
        true
      );
    });
  });
});

describe("shared pagination and sorting schemas forked by the award routes (owned by #1192)", () => {
  // #########################################################
  // Pagination input: forked as award-routes.ts RoutePaginationInputSchema
  // #########################################################

  describe.each([
    ["PaginatedQueryParamsSchema", PaginatedQueryParamsSchema, "PaginatedQueryParams.yaml"],
    ["PaginatedBodyParamsSchema", PaginatedBodyParamsSchema, "PaginatedBodyParams.yaml"],
  ] as const)("%s vs %s", (_name, schema, jsonSchemaId) => {
    const baseline = { page: 1, pageSize: 100 };

    it("normalizes a null page and accepts an out-of-range page and an unknown key the protocol rejects", async () => {
      await expectZodMatchesJsonSchema(
        schema,
        jsonSchemaId,
        [
          { label: "valid pagination input", value: baseline },
          {
            // Accepted on read and parsed to the default page.
            label: "null page",
            value: { ...baseline, page: null },
            expect: "normalized",
          },
          {
            // No `.max()`; the protocol caps page at int32.
            label: "page above int32 maximum",
            value: { ...baseline, page: 2_147_483_648 },
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
  // Results info: forked as award-routes.ts AwardPaginationInfoSchema
  // #########################################################

  describe("PaginatedResultsInfoSchema vs PaginatedResultsInfo.yaml", () => {
    const baseline = { page: 1, pageSize: 20, totalItems: 100, totalPages: 5 };

    it("normalizes null totals and accepts a zero page size and an unknown key the protocol rejects", async () => {
      await expectZodMatchesJsonSchema(
        PaginatedResultsInfoSchema,
        "PaginatedResultsInfo.yaml",
        [
          { label: "valid results info", value: baseline },
          {
            // `.min(0)`; the protocol requires at least 1.
            label: "zero page size",
            value: { ...baseline, pageSize: 0 },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
          {
            label: "null totalItems",
            value: { ...baseline, totalItems: null },
            expect: "normalized",
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
  // Sort info: forked as award-routes.ts AwardSortInfoSchema
  // #########################################################

  describe("SortedResultsInfoSchema vs SortedResultsInfo.yaml", () => {
    const baseline = { sortBy: "lastModifiedAt", sortOrder: "asc" as const };

    it("normalizes null optional fields and accepts an unknown key the protocol rejects", async () => {
      await expectZodMatchesJsonSchema(
        SortedResultsInfoSchema,
        "SortedResultsInfo.yaml",
        [
          { label: "valid sort info", value: baseline },
          {
            label: "null customSortBy",
            value: { ...baseline, customSortBy: null },
            expect: "normalized",
          },
          { label: "null errors", value: { ...baseline, errors: null }, expect: "normalized" },
          {
            label: "unknown key",
            value: { ...baseline, bogus: "x" },
            expect: "divergent",
            issue: SHARED_MODELS_ISSUE,
          },
        ],
        1,
        true
      );
    });
  });
});
