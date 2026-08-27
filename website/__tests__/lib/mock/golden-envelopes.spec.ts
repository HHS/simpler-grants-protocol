import { describe, it, expect } from "vitest";
import { MOCK_API_BASE_PATH, handleMockRequest } from "@/lib/mock/router";
import { REQUEST_MATRIX } from "./__fixtures__/request-matrix";
import goldenEnvelopesJson from "./__fixtures__/golden-envelopes.json";
import type { GoldenEnvelope } from "./__fixtures__/capture-golden";

/**
 * Byte-identity between this site's Astro mock endpoint and the 3A standalone
 * Worker (#1078).
 *
 * `mock-api/` — the 3A Worker this site is meant to reproduce — is not on this
 * branch (see `capture-golden.ts`), so its actual output was captured once and
 * checked in as `golden-envelopes.json`. Comparing raw response text (not
 * parsed-and-deep-equal JSON) against that corpus is the only way to catch
 * regressions a structural comparison would miss entirely: key order,
 * whitespace, and exact error phrasing. Those aren't cosmetic here — the AC is
 * that a caller (browser "Try it out", copied `curl`, or the TS SDK) cannot
 * tell the two hosts apart, and any of those differences would be observable
 * to such a caller.
 *
 * Scope of the guarantee: this drives `handleMockRequest` directly, so it pins
 * *the router's* output. That is not quite the same as what reaches a caller,
 * because the integrated shape puts host middleware in front of the kernel —
 * something the standalone Worker had nothing of. Replaying this same matrix
 * over HTTP against `astro dev` (30/31 byte-identical) surfaced two
 * interceptions that never reach the router at all:
 *
 *  1. `security.checkOrigin`, Astro's CSRF guard, is on by default and answers
 *     403 to a non-GET/HEAD request that carries no `Origin` header, or that is
 *     cross-origin with a form-ish content type. So `PUT`/`DELETE` get a bare
 *     403 where the Worker gave a protocol-shaped 404. Everything the mock
 *     actually serves is unaffected: GET list/detail pass, and `POST /search`
 *     with `Content-Type: application/json` passes even cross-origin, so the TS
 *     SDK and a copied `curl` still work. This one applies to built SSR output
 *     too, not just dev — #1078 decides whether to set `checkOrigin: false`.
 *  2. Under `astro dev` only, Vite's own CORS middleware answers `OPTIONS`
 *     preflights before the route, with its own header set — and no
 *     `Access-Control-Allow-Origin` at all — so `preflightResponse()` is
 *     bypassed there. Consequence: a *browser* making a cross-origin
 *     `POST /search` (JSON bodies are non-simple, so the browser preflights
 *     first) is blocked in dev, even though the same request from `curl`
 *     succeeds and this suite is green. Same-origin "Try it out" on the docs
 *     site is unaffected, since same-origin requests never preflight. No Vite in
 *     a built deploy, so #1078 re-checks the preflight on the real preview.
 *
 * So read this suite for what it is: the router's contract, pinned exactly. What
 * a real caller receives is only the same thing where nothing intercepts first —
 * which for the three served endpoints, over `astro dev`, it does not.
 *
 * Both are recorded as findings for #1078 rather than worked around here:
 * "the host framework can rewrite the kernel's envelopes" is a real difference
 * between the integrated and standalone shapes, and the point of the experiment.
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
        // ONLY permitted deviation: the Worker's route-miss 404s quote the
        // request path back (`GET /v0.4.0/common-grants/awards`), but that path
        // lacks the `/api` base this site's endpoint lives under. Re-insert the
        // base into the golden text before comparing — every other case is
        // compared with zero normalization.
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
