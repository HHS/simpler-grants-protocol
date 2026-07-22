import "../fields/index.tsp";
import "../types.tsp";

namespace CommonGrants.Models;

using Fields;
using Types;

// #########################################################
// RevisionStatus
// #########################################################

/** The set of values accepted for a revision's status:
 * - `pending`: Non-terminal. The change is queued for review.
 * - `accepted`: Terminal. The change was applied, either immediately via a
 *   direct `PATCH` or after a `pending` change was approved.
 * - `denied`: Terminal. The change was rejected, with a reason.
 * - `superseded`: Terminal. A competing change was accepted first, so this
 *   change no longer applies.
 * - `custom`: An implementation-defined status. The receiver documents whether
 *   it is terminal.
 *
 * A revision moves once from `pending` into a terminal state; a terminal
 * revision is never restated. How a receiver resolves a `pending` change (a
 * human review, a policy engine, a batch job) is out of scope for this contract.
 */
@Versioning.added(CommonGrants.Versions.v0_4)
enum RevisionStatusOptions {
  pending,
  accepted,
  denied,
  superseded,
  custom,
}

/** The status of a revision, including its lifecycle state and an optional
 * human-readable description.
 */
@example(Examples.Revision.acceptedStatus)
@example(Examples.Revision.customStatus)
@Versioning.added(CommonGrants.Versions.v0_4)
model RevisionStatus {
  /** The status of the revision, from a predefined set of options */
  value: RevisionStatusOptions;

  /** A custom value for the status */
  customValue?: string;

  /** A human-readable description of the status */
  description?: string;
}

// #########################################################
// Revision
// #########################################################

/** A template for building a typed revision record.
 *
 * Maintainers bind `RevisionT` to a specific resource's snapshot and patch
 * types so `patch` and `snapshot` are typed rather than open objects, as in
 * `OrgRevision is RevisionT<OrganizationBase, OrgPatchData>`. The untyped
 * `Revision` is the general form, and the field-level semantics documented on
 * its properties apply to every binding.
 *
 * @template SnapshotT The type of the full record snapshot (for example
 * `OrganizationBase`).
 * @template PatchT The type of the merge patch body (for example `OrgPatchData`).
 */
@Versioning.added(CommonGrants.Versions.v0_4)
model RevisionT<SnapshotT, PatchT> {
  /** Globally unique id for the revision */
  @visibility(Lifecycle.Read)
  id: uuid;

  /** The lifecycle status of the change */
  status: RevisionStatus;

  /** The source system the change came from */
  source?: string;

  /** The merge patch that was submitted */
  patch?: PatchT;

  /** A full snapshot of the record with the change applied */
  snapshot?: SnapshotT;

  // createdAt = when the change was submitted (immutable, orders the ledger)
  // lastModifiedAt = when the status last changed
  ...SystemMetadata;
}

/** A record of a single change to a resource.
 *
 * A revision captures the merge patch that was submitted, a snapshot of the
 * record with the change applied, and the lifecycle status of the change.
 * Revisions make up a change ledger: `createdAt` marks when the change was
 * submitted and orders the ledger, while `lastModifiedAt` marks when the
 * `status` last changed. The submission facts (`patch` and `source`) never
 * change, but the `status` can transition until it reaches a terminal state.
 *
 * Here `patch` and `snapshot` are open objects. A concrete resource binds its
 * own types with `RevisionT` (see `OrgRevision`, which binds `OrganizationBase`
 * and `OrgPatchData`).
 */
@example(Examples.Revision.revision)
@Versioning.added(CommonGrants.Versions.v0_4)
model Revision is RevisionT<unknown, unknown>;

// #########################################################
// Examples
// #########################################################

/** Examples of the Revision and RevisionStatus models */
namespace Examples.Revision {
  const acceptedStatus = #{
    value: RevisionStatusOptions.accepted,
    description: "The change was applied.",
  };

  const customStatus = #{
    value: RevisionStatusOptions.custom,
    customValue: "escalated",
    description: "The change was escalated for additional review.",
  };

  const revision = #{
    id: "01912a8b-7c3d-7890-abcd-ef1234567890",
    status: acceptedStatus,
    source: "grants.gov",
    patch: #{ mission: "To expand access to community health resources." },
    snapshot: #{
      id: "01912a8b-7c3d-7890-abcd-ef1234567890",
      name: "Example Nonprofit",
      mission: "To expand access to community health resources.",
    },
    createdAt: utcDateTime.fromISO("2026-06-20T14:30:00Z"),
    lastModifiedAt: utcDateTime.fromISO("2026-06-20T14:30:00Z"),
  };
}
