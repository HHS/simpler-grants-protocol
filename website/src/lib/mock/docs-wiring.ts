/**
 * Shared wiring between `scripts/inject-mock-server.ts` and
 * `pages/protocol/api-docs.astro`, so the injected `servers:` URL and the
 * Execute-button gate cannot disagree. The URL is relative because the mock is
 * served same-origin by this site. The gate keeps Execute buttons off builds
 * (production GitHub Pages) that cannot serve the endpoint.
 */

import { MOCK_API_BASE_PATH } from "./router";

/**
 * Matched explicitly rather than treating any non-blank string as truthy, so
 * `MOCK_API_ENABLED: "false"` reads as off.
 */
const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

/** True when `MOCK_API_ENABLED` is set to a truthy value (case-insensitive). */
export function isMockApiEnabled(): boolean {
  const raw = process.env.MOCK_API_ENABLED?.trim().toLowerCase();
  return raw !== undefined && TRUTHY_VALUES.has(raw);
}

/**
 * Builds the root-relative server URL for one spec, e.g. `/api/v0.4.0`. The
 * version rides in the path, so this doubles as an SDK `baseUrl`.
 */
export function serverUrlFor(version: string): string {
  return `${MOCK_API_BASE_PATH}/v${version}`;
}
