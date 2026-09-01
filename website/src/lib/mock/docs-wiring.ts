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

/**
 * Reads one raw gate value. Split out from `isMockApiEnabled` for the `/api`
 * route, which cannot reach `process.env`: inside the deployed Worker it is
 * empty, so the route gets the value inlined at build time (see
 * `astro.config.mjs`) and parses it with this.
 */
export function isGateValueEnabled(value: string | undefined): boolean {
  const raw = value?.trim().toLowerCase();
  return raw !== undefined && TRUTHY_VALUES.has(raw);
}

/** True when `MOCK_API_ENABLED` is set to a truthy value (case-insensitive). */
export function isMockApiEnabled(): boolean {
  return isGateValueEnabled(process.env.MOCK_API_ENABLED);
}

/**
 * Builds the root-relative server URL for one spec, e.g. `/api/v0.4.0`. The
 * version rides in the path, so this doubles as an SDK `baseUrl`.
 */
export function serverUrlFor(version: string): string {
  return `${MOCK_API_BASE_PATH}/v${version}`;
}

/**
 * Public directory holding the mock-advertising copies of the specs, written by
 * `scripts/inject-mock-server.ts` on gated builds only. A sibling of
 * `public/openapi/` rather than an edit of it: those specs are generated from
 * the TypeSpec source and tracked, and rewriting them in place left the
 * working tree dirty with artifacts that must never be committed.
 */
export const MOCK_SPEC_DIR_NAME = "openapi-mock";

/** Root-relative directory the docs page loads specs from. */
export function specDirFor(mockEnabled: boolean): string {
  return mockEnabled ? `/${MOCK_SPEC_DIR_NAME}` : "/openapi";
}
