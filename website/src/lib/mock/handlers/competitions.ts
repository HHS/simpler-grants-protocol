/**
 * Deterministic, fixture-backed handler for the one competition endpoint
 * (#334).
 *
 * **Why there is only one.** `Routes.Competitions` declares two operations,
 * `read` and `apply`, but `lib/core/lib/api.tsp` instantiates only `read`:
 *
 *     namespace Competitions {
 *       alias Router = Routes.Competitions;
 *       @added(Versions.v0_2) op read is Router.read;
 *     }
 *
 * So `POST /competitions/{compId}/apply` is not part of the CommonGrants API
 * surface — it is a template a downstream implementation may instantiate. The
 * mock serves the published surface, so `apply` gets the same protocol-shaped
 * route-miss 404 as any other unmatched path. Implementing it would have the
 * playground demonstrate an endpoint the specs don't document, which is the
 * mirror image of the 404s this ticket exists to remove.
 *
 * There is likewise no `list`: the spec has no `GET /competitions`. A visitor
 * reaches a competition through the `competitions` array on an opportunity's
 * detail response, which is why those nested previews carry ids that resolve
 * here — asserted in `__tests__/lib/mock/data/cross-resource.spec.ts`.
 */

import { getCompetitionById } from "../data/competitions";
import type { Version } from "../data/fixtures";
import { errorResponse, successResponse } from "../http/envelope";
import { isUuid } from "../http/query";

/**
 * `GET /v{version}/common-grants/competitions/{compId}` — a single competition.
 *
 * @param compId - The path segment as received; validated as UUID-shaped here
 * rather than in the router, so a malformed id answers 400 (not a route miss).
 * @param version - Protocol version; competition models are unshaped across
 * v0.2–v0.4, so this is taken only to keep one signature across handlers.
 */
export function getCompetition(compId: string, version: Version): Response {
  void version;
  if (!isUuid(compId)) {
    return errorResponse(400, "Invalid competition id", [
      { field: "compId", message: "Must be a valid UUID" },
    ]);
  }

  const competition = getCompetitionById(compId);
  if (!competition) {
    return errorResponse(404, "Competition not found", [
      { field: "compId", message: `No competition found with id ${compId}` },
    ]);
  }

  return successResponse({ data: competition });
}
