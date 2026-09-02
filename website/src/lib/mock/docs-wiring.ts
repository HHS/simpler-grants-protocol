/**
 * Shared by `scripts/inject-mock-server.ts` and `pages/protocol/api-docs.astro`
 * so the injected `servers:` URL and the directory the docs read specs from
 * can't disagree. URLs are relative — the mock is same-origin.
 */

import { MOCK_API_BASE_PATH } from "./router";

/**
 * Builds the root-relative server URL for one spec, e.g. `/api/v0.4.0`. The
 * version rides in the path, so this doubles as an SDK `baseUrl`.
 */
export function serverUrlFor(version: string): string {
  return `${MOCK_API_BASE_PATH}/v${version}`;
}

/**
 * Public directory holding the mock-advertising spec copies, written each build
 * by `scripts/inject-mock-server.ts`. A sibling of `public/openapi/` rather than
 * an edit of it: those specs are tracked build output, so rewriting them in
 * place left artifacts we must never commit.
 */
export const MOCK_SPEC_DIR_NAME = "openapi-mock";

/** Root-relative directory the docs page loads specs from. */
export const SPEC_DIR_URL = `/${MOCK_SPEC_DIR_NAME}`;
