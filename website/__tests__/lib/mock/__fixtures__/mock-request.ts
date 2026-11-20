/**
 * Builds requests for the mock as a client would send them under ADR 0032:
 * the path carries no version, and `CG-Version` selects one.
 */

import { MOCK_API_BASE_PATH } from "@/lib/mock/router";
import { VERSION_HEADER } from "@/lib/mock/http/version";

/** `https://docs.example/api/common-grants{path}`; the host is a placeholder. */
export function mockUrl(path: string): string {
  return `https://docs.example${MOCK_API_BASE_PATH}/common-grants${path}`;
}

/**
 * A request for `path` (below `/common-grants`) that sends `version` as
 * `CG-Version`, or no header when `version` is `undefined`.
 */
export function mockRequest(
  path: string,
  version: string | undefined,
  init: RequestInit = {},
): Request {
  const headers = new Headers(init.headers);
  if (version !== undefined) headers.set(VERSION_HEADER, version);
  return new Request(mockUrl(path), { ...init, headers });
}

/** A request for `/opportunities{suffix}` served in `version`. */
export function opportunitiesRequest(
  version: string | undefined,
  suffix = "",
  init?: RequestInit,
): Request {
  return mockRequest(`/opportunities${suffix}`, version, init);
}
