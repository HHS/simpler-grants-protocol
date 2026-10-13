import { describe, expect, it } from "vitest";
import { z } from "zod";
import * as AwardConstants from "@/constants";
import { withCustomFields } from "@/extensions";
import { EXTENSIBLE_SCHEMA_MAP } from "@/extensions/types";
import * as AwardSchemas from "@/schemas";
import type * as AwardTypes from "@/types";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;

type Assert<Condition extends true> = Condition;

describe("award public API", () => {
  it("exports award schemas, inferred types and constants with recipient extensions", () => {
    type PublicAwardTypes = [
      AwardTypes.AwdStatusOptions,
      AwardTypes.AwdStatus,
      AwardTypes.AwdFunding,
      AwardTypes.AwdTimeline,
      AwardTypes.AwdIdFain,
      AwardTypes.AwdIds,
      AwardTypes.AwdRef,
      AwardTypes.AwdRecipientIndividual,
      AwardTypes.AwardBase,
      AwardTypes.Award,
    ];
    type AwardBaseMatchesSchema = Assert<
      Equal<AwardTypes.AwardBase, z.infer<typeof AwardSchemas.AwardBaseSchema>>
    >;
    type AwardIsConvenienceAlias = Assert<Equal<AwardTypes.Award, AwardTypes.AwardBase>>;

    const typeAssertions: [PublicAwardTypes[0], AwardBaseMatchesSchema, AwardIsConvenienceAlias] = [
      "awarded",
      true,
      true,
    ];
    const publicAwardSchemas = [
      AwardSchemas.AwdStatusOptionsEnum,
      AwardSchemas.AwdStatusSchema,
      AwardSchemas.AwdFundingSchema,
      AwardSchemas.AwdTimelineSchema,
      AwardSchemas.AwdIdFainSchema,
      AwardSchemas.AwdIdsSchema,
      AwardSchemas.AwdRefSchema,
      AwardSchemas.AwdRecipientIndividualSchema,
      AwardSchemas.AwardBaseSchema,
    ];

    expect(publicAwardSchemas).not.toContain(undefined);
    expect("AwardSchema" in AwardSchemas).toBe(false);
    expect(typeAssertions).toEqual(["awarded", true, true]);
    expect(AwardConstants.AwdStatusOptions).toEqual({
      awarded: "awarded",
      completed: "completed",
      cancelled: "cancelled",
      custom: "custom",
    });
    const awardedStatus: AwardTypes.AwdStatusOptions = AwardConstants.AwdStatusOptions.awarded;
    expect(awardedStatus).toBe("awarded");
    expect(EXTENSIBLE_SCHEMA_MAP.AwdRecipientIndividual).toBe(
      AwardSchemas.AwdRecipientIndividualSchema
    );

    const ExtendedRecipientSchema = withCustomFields(EXTENSIBLE_SCHEMA_MAP.AwdRecipientIndividual, {
      legacyRecipientId: { fieldType: "string" },
    } as const);
    const recipient = ExtendedRecipientSchema.parse({
      customFields: {
        legacyRecipientId: {
          fieldType: "string",
          value: "recipient-42",
        },
      },
    });

    expect(recipient.customFields?.legacyRecipientId).toEqual({
      name: "legacyRecipientId",
      fieldType: "string",
      value: "recipient-42",
    });
    expect(() => ExtendedRecipientSchema.parse({ customFields: null })).toThrow();
    expect(() => ExtendedRecipientSchema.parse({ customFields: { unregistered: 1 } })).toThrow();

    const recipientWithUnregisteredField = ExtendedRecipientSchema.parse({
      customFields: {
        unregistered: {
          name: "unregistered",
          fieldType: "number",
          value: 42,
        },
      },
    });
    expect(recipientWithUnregisteredField.customFields?.unregistered).toEqual({
      name: "unregistered",
      fieldType: "number",
      value: 42,
    });
  });
});
