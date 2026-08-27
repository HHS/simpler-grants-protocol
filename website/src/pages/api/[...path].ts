/**
 * The mock API's only route (#1078): everything under `/api/**` is handed to
 * `handleMockRequest`, which owns matching, versioning, and CORS.
 *
 * A catch-all rather than nested `[version]/common-grants/opportunities/`
 * params, for two reasons: the version regex and the preflight branch stay in
 * one place, and the router keeps matching on `request.url` the way the 3A
 * Worker did — which is what makes the byte-identity check in
 * `__tests__/lib/mock/golden-envelopes.spec.ts` meaningful rather than a test of
 * Astro's param extraction.
 *
 * `prerender = false` makes this the only dynamic route on an otherwise fully
 * static site: `astro.config.mjs` keeps `output: "static"`, so every docs page
 * is still prerendered at build time and only this file needs a server at
 * request time. Serving it from a build requires the `@astrojs/cloudflare`
 * adapter, which #1078 adds; until then the route runs under `astro dev` and
 * in the vitest suites, which import this module directly.
 */

import type { APIRoute } from "astro";
import { handleMockRequest } from "@/lib/mock/router";

export const prerender = false;

/**
 * `ALL` rather than named `GET`/`POST` exports: the router already answers
 * unsupported methods with a protocol-shaped 404 and handles `OPTIONS`
 * preflights itself, so letting Astro reject methods first would replace those
 * envelopes with its own 404/405.
 */
export const ALL: APIRoute = ({ request }) => handleMockRequest(request);
