/**
 * The mock API's only route: everything under `/api/**` is handed to
 * `handleMockRequest`, which owns matching, versioning, and CORS.
 * `prerender = false` makes this the only dynamic route on an otherwise fully
 * static site.
 */

import type { APIRoute } from "astro";
import { isGateValueEnabled } from "@/lib/mock/docs-wiring";
import { handleMockRequest } from "@/lib/mock/router";

export const prerender = false;

/**
 * `ALL` rather than named `GET`/`POST` exports, so unsupported methods get the
 * router's own protocol-shaped 404 instead of Astro's.
 *
 * The endpoint must not outlive the docs that advertise it: only gated builds
 * inject the `servers:` block and enable Execute, so an ungated build — every
 * production deploy — answers 404 here rather than serving fixtures. The gate
 * value is inlined at build time by `astro.config.mjs`.
 */
export const ALL: APIRoute = ({ request }) =>
  isGateValueEnabled(import.meta.env.MOCK_API_ENABLED)
    ? handleMockRequest(request)
    : new Response(null, { status: 404 });
