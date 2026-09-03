/**
 * The mock API's only route: everything under `/api/**` is handed to
 * `handleMockRequest`, which owns matching, versioning, and CORS.
 * `prerender = false` makes this the only dynamic route on an otherwise fully
 * static site.
 */

import type { APIRoute } from "astro";
import { handleMockRequest } from "@/lib/mock/router";

export const prerender = false;

/**
 * `ALL` rather than named `GET`/`POST` exports, so unsupported methods get the
 * router's own protocol-shaped 404 instead of Astro's.
 */
export const ALL: APIRoute = ({ request }) => handleMockRequest(request);
