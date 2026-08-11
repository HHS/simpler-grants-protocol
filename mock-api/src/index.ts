/**
 * Standalone Cloudflare Worker serving deterministic CommonGrants mock data.
 *
 * Scaffold only: the opportunity routes land in #1077-T3, which reuses this
 * pure `fetch(Request) => Response` shape.
 */

import { SUPPORTED_VERSIONS } from "./data/fixtures";

const SERVICE_NAME = "@common-grants/mock-api";

function healthResponse(): Response {
  return Response.json({
    name: SERVICE_NAME,
    supportedVersions: SUPPORTED_VERSIONS,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { pathname } = new URL(request.url);

    if (pathname === "/") {
      return healthResponse();
    }

    return new Response("Not Found", { status: 404 });
  },
} satisfies ExportedHandler;
