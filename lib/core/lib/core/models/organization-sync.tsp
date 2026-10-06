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
 *
 * The relationship models are the exception: `OrgTargetRef` is a distinct
 * writable reference rather than a mirror, because the read `Models.OrgRef`
 * has a read-only `id` that the merge-patch transformation would drop, and
 * the relationship entries and `OrgRelationships` are redeclared to use it.
 * It must not reuse the name `OrgRef`: the changelog keys models by bare name,
 * so a v0.5 `Patch.OrgRef` would erase `Models.OrgRef` from earlier versions.
 * Every relationship list is an array, so a patch replaces it whole and its
 * entries are never merged.
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

  /** A writable reference to a relationship's other organization.
   *
   * Unlike `Models.OrgRef`, whose `id` is read-only, `id` is writable here so a
   * patch can name the other organization, and `name` is optional so it can be
   * named by `id` alone. Schema validation checks only this shape; it does not
   * fill in the organization's `name` or `identifiers`.
   */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgTargetRef {
    /** The other organization's unique identifier. */
    id: Types.uuid;

    /** The other organization's legal name. */
    name?: string;

    // Spreads each identifier inline rather than referencing `Patch.OrgIds`:
    // inside a replaced list, a referenced model would be emitted as one more
    // standalone `OrgPatch*ReplaceOnly` schema.
    /** Identifiers associated with the other organization, keyed by registry code. */
    identifiers?: {
      /** The organization's Employer Identification Number (EIN), assigned by the IRS. */
      `org:us:ein`?: {
        ...Models.OrgIdEin;
      };

      /** The organization's Unique Entity Identifier (UEI) from SAM.gov. */
      `org:us:uei`?: {
        ...Models.OrgIdUei;
      };

      /** The organization's Data Universal Numbering System (DUNS) number. */
      `org:xi:duns`?: {
        ...Models.OrgIdDuns;
      };

      /** The hosting system's own identifier for this record. */
      systemId?: {
        ...Fields.SystemId;
      };

      /** Additional identifiers keyed by their registry code, for registries the
       * protocol does not define as a base identifier on the model.
       */
      otherIds?: Record<{
        ...Fields.Identifier;
      }>;
    };
  }

  /** A relationship from this organization to another organization, as written.
   *
   * Matches `Models.OrgRelationshipT`, except that `org` is a writable
   * `Patch.OrgTargetRef`.
   *
   * @template Kind The standard subtypes accepted for `kind.value`.
   */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgRelationshipT<Kind> {
    /** The other organization, which a writer can name by `id` alone. */
    org: Patch.OrgTargetRef;

    ...OmitProperties<Models.OrgRelationshipT<Kind>, "org">;
  }

  /** A parent or child relationship, as written. */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgHierarchyRelationship
    is Patch.OrgRelationshipT<Models.OrgHierarchyKindOptions>;

  /** A succession relationship, as written. */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgSuccessionRelationship
    is Patch.OrgRelationshipT<Models.OrgSuccessionKindOptions>;

  /** A record replacement relationship, as written. */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgRecordRelationship
    is Patch.OrgRelationshipT<Models.OrgRecordKindOptions>;

  /** A relationship outside the named categories, as written. */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgOtherRelationship
    is Patch.OrgRelationshipT<Models.OrgOtherKindOptions>;

  /** An organization's relationships to other organizations, as written.
   *
   * Each list is replaced whole by a patch that addresses it; there is no
   * append or per-entry change.
   */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgRelationships {
    /** Organizations above this one, such as a containing organization or a fiscal sponsor. */
    parents?: Patch.OrgHierarchyRelationship[];

    /** Organizations below this one, such as its chapters or sponsored projects. */
    children?: Patch.OrgHierarchyRelationship[];

    /** Organizations that carry on all or part of this one. */
    succeededBy?: Patch.OrgSuccessionRelationship[];

    /** Organizations whose work this one carries on in whole or in part. */
    succeeds?: Patch.OrgSuccessionRelationship[];

    /** Records to use instead of this record. */
    recordReplacedBy?: Patch.OrgRecordRelationship[];

    /** Records that this record is used instead of. */
    recordReplaces?: Patch.OrgRecordRelationship[];

    /** Connections outside the categories above, which need not have a direction. */
    otherRelationships?: Patch.OrgOtherRelationship[];
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
      | "relationships"
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

    // Spread inline: OpenAPI 3.0 cannot make a referenced object nullable, so
    // a reference would reject the `null` that removes every list.
    /** The organization's relationships to other organizations. */
    @Versioning.added(CommonGrants.Versions.v0_5)
    relationships?: {
      ...Patch.OrgRelationships;
    };

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
  model OrgPatchData is TypeSpec.Http.MergePatchUpdate<
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
