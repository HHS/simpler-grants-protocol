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
 * `OrgParents` and `OrgRelationships` are redeclared to use it. It must not
 * reuse the name `OrgRef`: the changelog keys models by bare name, so a
 * v0.5 `Patch.OrgRef` would erase `Models.OrgRef` from earlier versions. Their
 * singular object members spread inline for the reason given in
 * `organization.tsp`: the merge-patch transformation makes them nullable,
 * and OpenAPI 3.0 cannot make a referenced object nullable.
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

  /** A writable reference to a relationship's target organization.
   *
   * Unlike `Models.OrgRef`, whose `id` is read-only, `id` is writable here so a
   * patch can name the target, and `name` is optional so the target can be
   * named by ID alone. The provider resolves the target, refreshes its name and
   * provider-derived identifiers, and rejects an unresolved target or
   * contradictory metadata the sender supplies.
   */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgTargetRef {
    /** The target organization's unique identifier. */
    id: Types.uuid;

    /** The target organization's legal name, checked against the target when supplied. */
    name?: string;

    // Mirrors `Patch.OrgIds` member by member rather than spreading it, so each
    // identifier is also inline and a singular target can delete one with
    // `null` under OpenAPI 3.0. For the same reason, each base identifier's
    // `id` is a plain string carrying its named scalar's constraints and
    // example rather than a reference to the scalar.
    // `org-patch-data.test.ts` fails if either drifts.
    /** Identifiers associated with the target organization, checked against the target when supplied. */
    identifiers?: {
      /** The organization's Employer Identification Number (EIN), assigned by the IRS. */
      `org:us:ein`?: {
        ...PickProperties<Models.OrgIdEin, "registry">;

        /** The primary identifier string, when the registry has a single canonical value.
         *
         * May be omitted for registries with no natural primary; consumers should read
         * `allIds` in that case.
         */
        @pattern("^[0-9]{9}$")
        @example("123456789")
        id?: string;

        ...PickProperties<Models.OrgIdEin, "allIds">;
      };

      /** The organization's Unique Entity Identifier (UEI) from SAM.gov. */
      `org:us:uei`?: {
        ...PickProperties<Models.OrgIdUei, "registry">;

        /** The primary identifier string, when the registry has a single canonical value.
         *
         * May be omitted for registries with no natural primary; consumers should read
         * `allIds` in that case.
         */
        @pattern("^[A-HJ-NP-Z0-9]{12}$")
        @example("AB0123456789")
        id?: string;

        ...PickProperties<Models.OrgIdUei, "allIds">;
      };

      /** The organization's Data Universal Numbering System (DUNS) number. */
      `org:xi:duns`?: {
        ...PickProperties<Models.OrgIdDuns, "registry">;

        /** The primary identifier string, when the registry has a single canonical value.
         *
         * May be omitted for registries with no natural primary; consumers should read
         * `allIds` in that case.
         */
        @pattern("^[0-9]{9}$")
        @example("123456789")
        id?: string;

        ...PickProperties<Models.OrgIdDuns, "allIds">;
      };

      /** The hosting system's own identifier for this record. */
      systemId?: {
        ...PickProperties<Fields.SystemId, "registry">;

        /** The primary identifier string, when the registry has a single canonical value.
         *
         * May be omitted for registries with no natural primary; consumers should read
         * `allIds` in that case.
         */
        @format("uuid")
        @example("30a12e5e-5940-4c08-921c-17a8960fcf4b")
        id?: string;

        ...PickProperties<Fields.SystemId, "allIds">;
      };

      /** Additional identifiers keyed by their registry code, for registries the
       * protocol does not define as a base identifier on the model.
       */
      otherIds?: Record<
        | {
            ...Fields.Identifier;
          }
        | null>;
    };
  }

  /** Organizations that directly contain an organization, grouped by hierarchy kind.
   *
   * Each kind holds an array so several targets can share a kind; array order
   * carries no primary-parent or ranking meaning. Use the most specific known
   * kind, and do not repeat a target as both `parent` and a more specific kind.
   */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgParents {
    /** Confirmed containment when no more specific supported kind is known. */
    parent?: Patch.OrgTargetRef[];

    /** An internal organizational unit within the target, such as a division or school. */
    department?: Patch.OrgTargetRef[];

    /** A local or regional unit under the target's organizational structure, not merely a member of its network. */
    chapter?: Patch.OrgTargetRef[];

    /** A separate entity owned or controlled by the target. */
    subsidiary?: Patch.OrgTargetRef[];

    /** Additional hierarchy kinds, keyed by a documented label that describes containment by the target. */
    otherParents?: Record<Patch.OrgTargetRef[] | null>;
  }

  /** An organization's relationships to other organizations.
   *
   * Every reference is stated on this organization and points to its target.
   * Hierarchy is grouped by kind under `parents`; fiscal sponsorship,
   * succession, and duplicate identity are distinct singular references. A
   * relationship confers no authority over its target.
   */
  @Versioning.added(CommonGrants.Versions.v0_5)
  model OrgRelationships {
    /** Organizations that directly contain this organization, grouped by hierarchy kind. */
    parents?: {
      ...Patch.OrgParents;
    };

    /** The organization that fiscally sponsors this organization or project. A payee designation alone does not establish sponsorship. */
    fiscalSponsor?: {
      ...Patch.OrgTargetRef;
    };

    /** A different organization that replaces this dissolved organization. A rename or sponsor change alone does not establish succession. */
    successor?: {
      ...Patch.OrgTargetRef;
    };

    /** The canonical record of the same organization, when this record is a duplicate of it. */
    duplicateOf?: {
      ...Patch.OrgTargetRef;
    };

    /** Additional nonhierarchical relationships, keyed by a documented label. Must not hold containment, fiscal sponsors, successors, or duplicate targets. */
    otherRelationships?: Record<Patch.OrgTargetRef[] | null>;
  }

  /** The writable fields of an organization profile.
   *
   * Spreads `OrganizationBase` without its model-level example, so the
   * merge-patch derivation below validates cleanly. The `ein`, `uei`, and `duns`
   * fields are omitted because they are removed as of v0.4, the version at which
   * these syncing models are added, so they never coexist with a patch. The
   * sub-model fields are redeclared against the mirrors above so the
   * merge-patch transformation sees flattened models and deletable record keys.
   * `dbaNames` is redeclared without its read-side `null`, which the
   * transformation adds back once.
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
      | "dbaNames"
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

    /** Names the organization currently does business as, alongside its legal `name`. Not a history of former names. */
    @Versioning.added(CommonGrants.Versions.v0_5)
    dbaNames?: string[];

    /** The organization's relationships to other organizations, such as containing organizations or a fiscal sponsor. */
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
