/**
 * The one list of verbs the mock implements. A leaf module so `cors.ts`, the
 * router and the api-docs page can all read it without an import cycle —
 * `router.ts` already imports `cors.ts`.
 *
 * `OPTIONS` is absent on purpose: `handleMockRequest` answers preflights before
 * routing, so it is not a handler verb. `cors.ts` appends it to its own header.
 *
 * Adding a verb to a resource router means adding it here, or
 * `router.spec.ts`'s allowlist test fails.
 */
export const SUPPORTED_METHODS = ["GET", "POST", "PUT", "PATCH"] as const;
