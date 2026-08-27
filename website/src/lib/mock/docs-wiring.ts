/**
 * How the rendered docs wire themselves to the mock API (#1078).
 *
 * Single source of truth for the two consumers that have to agree on whether the
 * mock is wired in: `scripts/inject-mock-server.ts` (which writes a `servers:`
 * block into each rendered spec, and is the only caller of `serverUrlFor`) and
 * `pages/protocol/api-docs.astro` (which turns on Swagger UI's Execute button).
 * A spec pointing at the mock with Execute disabled, or an Execute button with no
 * server to call, are both broken states.
 *
 * **Why the URL is relative.** The mock is served same-origin by this very site
 * (`pages/api/[...path].ts`), so there is no origin to configure — which is the
 * whole point of the integrated shape. The standalone-Worker experiment needed a
 * `MOCK_API_URL` env var carrying a full `https://<worker>.workers.dev` origin
 * (#1077); here the path alone is enough, and it is built from the router's
 * own `MOCK_API_BASE_PATH` so the specs cannot advertise a path the endpoint
 * doesn't serve.
 *
 * **Why it is still gated.** Production docs deploy to GitHub Pages, which
 * cannot run this endpoint at all. Injecting unconditionally would put Execute
 * buttons on commongrants.org that answer 404 — worse than today's disabled
 * button, and it would ship a visible regression alongside an experiment that
 * may never merge. So the wiring is keyed to `MOCK_API_ENABLED`, set by the
 * PR-preview build and deliberately absent everywhere else: previews get a
 * working playground, production stays byte-identical to today. The gate is a
 * bare boolean rather than 3A's URL because there is no longer a URL to pass.
 */

import { MOCK_API_BASE_PATH } from "./router";

/**
 * Values that turn the wiring on. Matched explicitly rather than treating any
 * non-blank string as truthy: `MOCK_API_ENABLED: "false"` is the natural way to
 * spell "off" for a boolean-named variable, and a presence check would read it as
 * ON — silently putting Execute buttons on a build meant to be inert.
 */
const TRUTHY_VALUES = new Set(["1", "true", "yes", "on"]);

/**
 * Whether this build should wire the docs to the mock API.
 *
 * @returns True when `MOCK_API_ENABLED` is set to one of `1`, `true`, `yes`, or
 * `on` (case-insensitive). Anything else — unset, blank, `false`, `0` — is off.
 */
export function isMockApiEnabled(): boolean {
  const raw = process.env.MOCK_API_ENABLED?.trim().toLowerCase();
  return raw !== undefined && TRUTHY_VALUES.has(raw);
}

/**
 * Builds the same-origin, version-prefixed server URL for one spec.
 *
 * The mock selects its protocol version by path prefix, so this doubles as the
 * SDK's `baseUrl`: `https://<preview>/api/v0.4.0` works unchanged, because
 * `Client.url()` simply concatenates base + path.
 *
 * @param version - Protocol version, e.g. `"0.4.0"`.
 * @returns A root-relative URL, e.g. `/api/v0.4.0`.
 */
export function serverUrlFor(version: string): string {
  return `${MOCK_API_BASE_PATH}/v${version}`;
}
