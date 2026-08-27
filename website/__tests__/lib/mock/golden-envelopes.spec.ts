import { describe, it, expect } from "vitest";
import { MOCK_API_BASE_PATH, handleMockRequest } from "@/lib/mock/router";
import { REQUEST_MATRIX } from "./__fixtures__/request-matrix";
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

  it.each(REQUEST_MATRIX)(
    "matches the 3A Worker's response for $name",
    async (testCase) => {
      const golden = GOLDEN_ENVELOPES[testCase.name];

      const request = new Request(
        `https://docs.example${MOCK_API_BASE_PATH}${testCase.path}`,
        {
          method: testCase.method,
          body: testCase.body,
          headers:
            testCase.body === undefined
              ? undefined
              : { "Content-Type": "application/json" },
        },
      );

      const response = await handleMockRequest(request);
      const text = await response.text();

      expect(response.status).toBe(golden.status);
      expect(response.headers.get("Content-Type")).toBe(golden.contentType);

      if (testCase.pathEchoing) {
        // Route-miss 404s quote the request path, which lacks the `/api` base
        // here — re-insert it. Every other case compares with no normalization.
        const expected = golden.body.replace(
          `${testCase.method} ${testCase.path}`,
          `${testCase.method} ${MOCK_API_BASE_PATH}${testCase.path}`,
        );
        expect(text).toBe(expected);
      } else {
        expect(text).toBe(golden.body);
      }
    },
  );
});
