/**
 * Fixture-backed handler for the one competition endpoint. `api.tsp` publishes
 * only `read` — `apply` exists on `Routes.Competitions` but is not
 * instantiated, so the mock deliberately answers it with a route miss. There
 * is no list route; competitions are reached from an opportunity's detail.
 */

import { getCompetitionById } from "../data/competitions";
import type { Version } from "../data/fixtures";
import { errorResponse, successResponse } from "../http/envelope";
import { isUuid } from "../http/query";

/**
 * `GET /v{version}/common-grants/competitions/{compId}` — a single
 * competition. A malformed id answers 400, not a route miss.
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
