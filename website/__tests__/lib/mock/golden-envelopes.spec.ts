import { describe, it, expect } from "vitest";
import { MOCK_API_BASE_PATH, handleMockRequest } from "@/lib/mock/router";
import { VERSION_HEADER } from "@/lib/mock/http/version";
import { REQUEST_MATRIX, type MatrixCase } from "./__fixtures__/request-matrix";
import goldenEnvelopesJson from "./__fixtures__/golden-envelopes.json";
import type { GoldenEnvelope } from "./__fixtures__/capture-golden";

/**
 * Byte-identity with the 3A standalone Worker (#1078): the request matrix is
 * replayed against this site's router and the raw response text is compared
 * to output captured from the Worker, pinning key order, whitespace, and
 * exact wording — differences a structural compare would miss. The corpus
 * covers only the opportunity endpoints, the surface both hosts share.
 *
 * This pins the router's contract, not necessarily what a caller sees: host
 * middleware can intercept first (Astro's `checkOrigin` answers 403 to some
 * non-GET requests; Vite answers OPTIONS preflights in dev). `pathEchoing`
 * cases re-insert the `/api` base before comparing.
 */

const GOLDEN_ENVELOPES: Record<string, GoldenEnvelope> = goldenEnvelopesJson;

const PINNED_CASES = REQUEST_MATRIX.filter((c) => c.siteStatus === undefined);
const DIVERGENT_CASES = REQUEST_MATRIX.filter(
  (c) => c.siteStatus !== undefined,
);

/** Matrix paths carry `/v{version}`; this site takes it as `CG-Version`. */
const PATH_VERSION = /^\/v([^/]+)(\/common-grants.*)$/;

function siteRequest(testCase: MatrixCase): {
  request: Request;
  unversionedPath: string;
} {
  const match = PATH_VERSION.exec(testCase.path);
  if (!match) throw new Error(`Matrix path has no version: ${testCase.path}`);
  const [, version, unversionedPath] = match;

  const headers = new Headers({ [VERSION_HEADER]: version });
  if (testCase.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  return {
    unversionedPath,
    request: new Request(
      `https://docs.example${MOCK_API_BASE_PATH}${unversionedPath}`,
      { method: testCase.method, body: testCase.body, headers },
    ),
  };
}

describe("golden envelope byte-identity", () => {
  it("has a golden entry for every REQUEST_MATRIX case", () => {
    const missing = REQUEST_MATRIX.map((testCase) => testCase.name).filter(
      (name) => !(name in GOLDEN_ENVELOPES),
    );

    expect(missing).toEqual([]);
  });

  it("has no golden entries orphaned by the current REQUEST_MATRIX", () => {
    const matrixNames = new Set(
      REQUEST_MATRIX.map((testCase) => testCase.name),
    );
    const orphans = Object.keys(GOLDEN_ENVELOPES).filter(
      (name) => !matrixNames.has(name),
    );

    expect(orphans).toEqual([]);
  });

  it.each(PINNED_CASES)(
    "matches the 3A Worker's response for $name",
    async (testCase) => {
      const golden = GOLDEN_ENVELOPES[testCase.name];
      const { request, unversionedPath } = siteRequest(testCase);

      const response = await handleMockRequest(request);
      const text = await response.text();

      expect(response.status).toBe(golden.status);
      expect(response.headers.get("Content-Type")).toBe(golden.contentType);

      if (testCase.pathEchoing) {
        // Route-miss 404s quote the request path. The Worker's carried the
        // version and lacked the `/api` base; this site's has the base and no
        // version, so rewrite the golden text to match.
        const expected = golden.body.replace(
          `${testCase.method} ${testCase.path}`,
          `${testCase.method} ${MOCK_API_BASE_PATH}${unversionedPath}`,
        );
        expect(text).toBe(expected);
      } else {
        expect(text).toBe(golden.body);
      }
    },
  );

  it.each(DIVERGENT_CASES)(
    "answers $name with a version error where the Worker answered 404",
    async (testCase) => {
      const { request } = siteRequest(testCase);

      const response = await handleMockRequest(request);

      expect(response.status).toBe(testCase.siteStatus);
    },
  );
});
