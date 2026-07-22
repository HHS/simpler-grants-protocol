import "./organization.tsp";
import "./revision.tsp";
import "@typespec/http";
import "@typespec/versioning";

// #########################################################
// Merge-patch source
// #########################################################

namespace CommonGrants {
  /** The writable fields of an organization profile.
   *
   * Spreads `OrganizationBase` without its model-level example, so the
   * merge-patch derivation below validates cleanly. The `ein`, `uei`, and `duns`
   * fields are omitted because they are removed as of v0.4, the version at which
   * these syncing models are added, so they never coexist with a patch. This is
   * a compile-time source for `OrgPatchData` and is not emitted as a standalone
   * schema.
   */
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgProfileWritable {
    ...OmitProperties<Models.OrganizationBase, "ein" | "uei" | "duns">;
  }
}

// #########################################################
// Org profile syncing models
// #########################################################

namespace CommonGrants.Models {
  /** A JSON Merge Patch (RFC 7396) body for updating an organization profile.
   *
   * Derived from `OrganizationBase`: every field is optional, fields that can
   * be cleared accept `null` to unset them, and read-only fields like `id` are excluded.
   * Sent as `application/merge-patch+json`.
   */
  @example(Examples.OrgPatch.patch)
  @Versioning.added(CommonGrants.Versions.v0_4)
  model OrgPatchData
    is TypeSpec.Http.MergePatchUpdate<
      CommonGrants.OrgProfileWritable,
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
