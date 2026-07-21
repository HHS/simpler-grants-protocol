import "../models/index.tsp";
import "../responses/index.tsp";
import "../pagination.tsp";

// Define the top-level namespace for CommonGrants routes
namespace CommonGrants.Routes;

// Expose the contents of the Http and Rest namespaces
// these include the decorators @route, @get, etc.
using TypeSpec.Http;
using TypeSpec.Versioning;

/** A re-usable interface for an Organizations router
 *
 * Supports viewing organization profiles and syncing changes to them across
 * systems, following the contract in ADR-0026. Required scopes are noted per
 * operation; the scope vocabulary is documented alongside the models.
 *
 * To implement this interface, we recommend declaring a namespace,
 * instantiating the router using `alias` (instead of `extends`), and decorating
 * the namespace with `@route` and `@tag` since they aren't inherited directly
 * from the interface.
 *
 * @example Using the default type for the list operation and a custom model for
 * the read operation:
 * ```typespec
 * using TypeSpec.Http;
 *
 * @tag("Organizations")
 * @route("/orgs/")
 * namespace Organizations {
 *   alias Router = Routes.Organizations;
 *
 *   op list is Router.list;
 *   op read is Router.read<CustomOrg>;
 * }
 * ```
 */
@added(CommonGrants.Versions.v0_4)
interface Organizations {
  // ###############################
  // List organizations
  // ###############################

  /** `GET /orgs/` Get a paginated list of organizations
   *
   * Requires the `org:read` scope. To look up an organization by an external
   * identifier, filter with `registry` and `id`, like `?registry=org:us:ein&id=123456789`.
   *
   * @template T Type of the paginated response model.
   * Must be an extension of Models.OrganizationBase. Default is Models.OrganizationBase.
   */
  @summary("List organizations")
  @doc("Get a paginated list of organizations. Requires the `org:read` scope.")
  @list
  list<T extends Models.OrganizationBase = Models.OrganizationBase>(
    ...Pagination.PaginatedQueryParams,

    /** Registry code of an external identifier to filter by (e.g. `us:ein`) */
    @query registry?: string,

    /** Identifier value within the given registry to filter by */
    @query id?: string,
  ): Responses.Paginated<T> | Responses.Unauthorized;

  // ##############################
  // View an organization
  // ##############################

  /** `GET /orgs/{orgId}` View an organization profile
   *
   * Requires the `org:read` scope. Pass `at` to read the profile as of a point
   * in time, where supported.
   *
   * @template T Type of the response model.
   * Must be an extension of Models.OrganizationBase. Default is Models.OrganizationBase.
   */
  @summary("View an organization profile")
  @doc("View an organization profile by its UUID. Requires the `org:read` scope.")
  @get
  read<T extends Models.OrganizationBase = Models.OrganizationBase>(
    /** The UUID of the organization to view */
    @path
    orgId: Types.uuid,

    /** Return the profile as of the given point in time */
    @query at?: utcDateTime,
  ): Responses.Ok<T> | Responses.NotFound | Responses.Unauthorized;

  // ###############################
  // Update an organization
  // ###############################

  /** `PATCH /orgs/{orgId}` Update an organization profile
   *
   * Applies a JSON Merge Patch directly, recorded as an `accepted` change.
   * Requires the `org:write` scope. Intended for trusted, in-system edits; use
   * `POST /orgs/{orgId}/changes` to submit a change that may be reviewed first.
   */
  @summary("Update an organization profile")
  @doc("Apply a direct JSON Merge Patch edit to an organization profile, recorded as an accepted change. Requires the `org:write` scope.")
  @patch
  update(
    /** The UUID of the organization to update */
    @path
    orgId: Types.uuid,

    /** JSON Merge Patch body for the organization profile */
    @body
    patch: Models.OrgPatchData,
  ):
    | Responses.Ok<Models.OrgRevision>
    | Responses.NotFound
    | Responses.Unauthorized;

  // ###############################
  // Submit a change
  // ###############################

  /** `POST /orgs/{orgId}/changes` Submit an organization profile change
   *
   * Creates a change from a JSON Merge Patch body. A receiver may apply it
   * immediately (returning an `accepted` change) or queue it for review
   * (returning a `pending` change with a `Location` header). Requires the
   * `org.changes:write` scope.
   */
  @summary("Submit an organization profile change")
  @doc("Submit a change to an organization profile, which a receiver may apply immediately or queue for review. Requires the `org.changes:write` scope.")
  @post
  @route("/{orgId}/changes")
  submitChange(
    /** The UUID of the organization to change */
    @path
    orgId: Types.uuid,

    /** JSON Merge Patch body for the organization profile */
    @body
    patch: Models.OrgPatchData,
  ):
    | Responses.Accepted<Models.OrgRevision>
    | Responses.NotFound
    | Responses.Unauthorized;

  // ###############################
  // List changes
  // ###############################

  /** `GET /orgs/{orgId}/changes` List an organization's profile changes
   *
   * Returns a paginated list of changes, newest first, each optionally
   * including the merge patch that was submitted and a full snapshot with the
   * change applied. Requires the `org.changes:read` scope.
   */
  @summary("List organization profile changes")
  @doc("Get a paginated list of changes to an organization profile, newest first. Requires the `org.changes:read` scope.")
  @get
  @route("/{orgId}/changes")
  @list
  listChanges(
    /** The UUID of the organization whose changes to list */
    @path
    orgId: Types.uuid,

    ...Pagination.PaginatedQueryParams,
  ):
    | Responses.Paginated<Models.OrgRevision>
    | Responses.NotFound
    | Responses.Unauthorized;

  // ###############################
  // View a change
  // ###############################

  /** `GET /orgs/{orgId}/changes/{changeId}` View a change
   *
   * View a single change to an organization profile, so a submitter can poll a
   * `pending` change for its outcome. This is the resource a `POST /changes`
   * response points to with its `Location` header. Requires the
   * `org.changes:read` scope.
   */
  @summary("View an organization profile change")
  @doc("View a single change to an organization profile by its id. Requires the `org.changes:read` scope.")
  @get
  @route("/{orgId}/changes/{changeId}")
  viewChange(
    /** The UUID of the organization the change belongs to */
    @path
    orgId: Types.uuid,

    /** The id of the change to view */
    @path
    changeId: Types.uuid,
  ):
    | Responses.Ok<Models.OrgRevision>
    | Responses.NotFound
    | Responses.Unauthorized;
}
