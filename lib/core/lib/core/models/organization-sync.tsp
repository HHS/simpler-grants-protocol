import "./organization.tsp";
import "./revision.tsp";
import "@typespec/http";
import "@typespec/versioning";

// #########################################################
// Merge-patch sources
// #########################################################

/** Compile-time sources for `OrgPatchData`. Not emitted as standalone schemas.
 *
 * These mirror the org profile sub-models with two adjustments that
 * `TypeSpec.Http.MergePatchUpdate` needs to emit correct RFC 7396 schemas:
 * models that use `extends` are flattened via spread (inherited fields would
 * otherwise be referenced as the un-patched base schema), and record members
 * accept `null` so a patch can delete individual keys. Each mirror keeps the
 * name of the model it mirrors so the generated `OrgPatch{name}` schemas keep
 * stable names. If a mirrored model gains or loses a field, the change flows
 * through spread automatically; only the record-typed fields are redeclared
 * here and must be kept in sync by hand. The same applies one level down: a
 * leaf type reached from these mirrors (`Address`, `Phone`, `Identifier`,
 * `CustomField`) needs a mirror of its own if it ever gains `extends`.
 * `website/src/lib/schema/org-patch-data.test.ts` fails if either slips.
 */
namespace CommonGrants.Patch {
  /** A collection of identifiers associated with an organization.
   *
   * Extends the generic identifier collection with the base identifiers CommonGrants
   * defines for organizations. Additional registries can be published under `otherIds`.
   */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgIds {
    ...OmitProperties<Models.OrgIds, "otherIds">;

    /** Additional identifiers keyed by their registry code, for registries the
     * protocol does not define as a base identifier on the model.
     */
    otherIds?: Record<Fields.Identifier | null>;
  }

  /** A Philanthropy Classification System (PCS) term for organization types.
   *
   * See https://taxonomy.candid.org/organization-type for more information.
   */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model PCSOrgType {
    ...Fields.PCSOrgType;
  }

  /** A collection of addresses. */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model AddressCollection {
    ...OmitProperties<Fields.AddressCollection, "otherAddresses">;

    /** Additional addresses keyed by a descriptive label (e.g., "work", "home", "international"). */
    otherAddresses?: Record<Fields.Address | null>;
  }

  /** A collection of phone numbers for a person. */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model PhoneCollection {
    ...OmitProperties<Fields.PhoneCollection, "otherPhones">;

    /** Additional phone numbers not covered by the standard fields. */
    otherPhones?: Record<Fields.Phone | null>;
  }

  /** A collection of email addresses. */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model EmailCollection {
    ...OmitProperties<Fields.EmailCollection, "otherEmails">;

    /** Additional email addresses keyed by a descriptive label (e.g., "work", "personal", "support"). */
    otherEmails?: Record<Types.email | null>;
  }

  /** A collection of social media and web presence links for an organization. */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgSocialLinks {
    ...OmitProperties<Models.OrgSocialLinks, "otherSocials">;

    /** Additional social media profiles not covered by the standard fields. */
    otherSocials?: Record<url | null>;
  }

  /** The writable fields of an organization profile.
   *
   * Spreads `OrganizationBase` without its model-level example, so the
   * merge-patch derivation below validates cleanly. The `ein`, `uei`, and `duns`
   * fields are omitted because they are removed as of v0.4, the version at which
   * these syncing models are added, so they never coexist with a patch. The
   * sub-model fields are redeclared against the mirrors above so the
   * merge-patch transformation sees flattened models and deletable record keys.
   * This is a compile-time source for `OrgPatchData` and is not emitted as a
   * standalone schema.
   */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgProfileWritable {
    ...OmitProperties<
      Models.OrganizationBase,

        | "ein"
        | "uei"
        | "duns"
        | "identifiers"
        | "orgType"
        | "addresses"
        | "phones"
        | "emails"
        | "socials"
        | "customFields"
    >;

    /** Identifiers associated with the organization, keyed by registry code. */
    identifiers?: Patch.OrgIds;

    /** The organization's type within the Philanthropy Classification System (PCS). */
    orgType?: Patch.PCSOrgType;

    /** Collection of physical addresses associated with the organization. */
    addresses?: Patch.AddressCollection;

    /** Collection of phone numbers associated with the organization. */
    phones?: Patch.PhoneCollection;

    /** Collection of email addresses associated with the organization. */
    emails?: Patch.EmailCollection;

    /** Collection of the organization's social media and web presence links. */
    socials?: Patch.OrgSocialLinks;

    /** Custom fields for the organization. */
    customFields?: Record<Fields.CustomField | null>;
  }
}

// #########################################################
// Org profile syncing models
// #########################################################

namespace CommonGrants.Models {
  /** A JSON Merge Patch (RFC 7396) body for updating an organization profile.
   *
   * Derived from `OrganizationBase`: every field is optional, fields that can
   * be cleared accept `null` to unset them, record keys can be deleted by
   * setting them to `null`, and read-only fields like `id` are excluded.
   * Sent as `application/merge-patch+json`.
   */
  @example(Examples.OrgPatch.patch)
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgPatchData
    is TypeSpec.Http.MergePatchUpdate<
      CommonGrants.Patch.OrgProfileWritable,
      "OrgPatch{name}"
    >;

  /** A single change to an organization profile, recorded in the change ledger.
   *
   * The `patch` is an `OrgPatchData` merge patch, and the `snapshot` is the
   * organization profile with that change applied.
   */
  @example(Examples.OrgRevision.accepted)
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgRevision is RevisionT<OrganizationBase, OrgPatchData>;

  /** Example of the OrgPatchData merge patch */
  namespace Examples.OrgPatch {
    const patch = #{
      name: "Example Nonprofit (Renamed)",
      mission: "To expand access to community health resources.",
      yearFounded: null,
      socials: #{ website: null },
      emails: #{ primary: "info@example.org" },
      customFields: #{ legacyCode: null },
    };
  }

  /** Examples of the OrgRevision model */
  namespace Examples.OrgRevision {
    const accepted = #{
      id: "01912a8b-7c3d-7890-abcd-ef1234567890",
      status: #{
        value: RevisionStatusOptions.accepted,
        description: "The change was applied.",
      },
      source: "grants.gov",
      patch: #{ mission: "To provide support and resources to the community." },
      snapshot: Organization.exampleOrg,
      createdAt: utcDateTime.fromISO("2026-06-20T14:30:00Z"),
      lastModifiedAt: utcDateTime.fromISO("2026-06-20T14:30:00Z"),
    };
  }
}
