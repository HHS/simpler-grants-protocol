/**
 * Compile-time assertions for the plugin-bound `awards` resource.
 *
 * Checked by `tsc --noEmit` only; there is no runtime test. Confirms that
 * `get`/`list`/`search` type `recipientIndividual.customFields` through the
 * plugin's compiled `AwdRecipientIndividual` schema by default, that a
 * per-call `schema` override replaces that typing for a single call, and
 * that award filter typing is retained alongside the typed item shape.
 */

import { z } from "zod";
import { definePlugin, F, withCustomFields } from "@/extensions";
import { AwardBaseSchema, AwdRecipientIndividualSchema } from "@/schemas";

const plugin = definePlugin({
  schemas: {
    AwdRecipientIndividual: {
      customFields: {
        tier: { fieldType: "string", value: z.string() },
      },
    },
  },
  routes: {
    awards: {
      search: {
        filters: { recipientRegion: { filterType: "stringArray" } },
      },
    },
  },
} as const);

const client = plugin.getClient({ baseUrl: "http://localhost" });

// Compile-only; never executed.
async function _assertions(): Promise<void> {
  // Default binding: get(), list(), and search() all type the plugin's
  // declared recipientIndividual custom field.
  const got = await client.awards.get("id");
  const gotTier: string | undefined = got.recipientIndividual?.customFields?.tier?.value;
  void gotTier;

  const list = await client.awards.list({ page: 1 });
  const listTier: string | undefined =
    list.items[0]?.recipientIndividual?.customFields?.tier?.value;
  void listTier;

  const search = await client.awards.search({
    page: 1,
    filters: { recipientRegion: F.in(["US-CA"]) },
  });
  const searchTier: string | undefined =
    search.items[0]?.recipientIndividual?.customFields?.tier?.value;
  void searchTier;

  // Per-call override: a different recipient-individual schema replaces the
  // plugin's default typing for this call only.
  const overrideSchema = AwardBaseSchema.extend({
    recipientIndividual: withCustomFields(AwdRecipientIndividualSchema, {
      tier: { fieldType: "number", value: z.number() },
    } as const).optional(),
  });
  const overridden = await client.awards.get("id", { schema: overrideSchema });
  const overriddenTier: number | undefined =
    overridden.recipientIndividual?.customFields?.tier?.value;
  void overriddenTier;

  // @ts-expect-error: the override types tier as a number, not a string.
  const wrongType: string = overridden.recipientIndividual?.customFields?.tier?.value;
  void wrongType;

  // A later call with no override reverts to the plugin's default (string) typing.
  const afterOverride = await client.awards.get("id");
  const afterOverrideTier: string | undefined =
    afterOverride.recipientIndividual?.customFields?.tier?.value;
  void afterOverrideTier;
}

void _assertions;
