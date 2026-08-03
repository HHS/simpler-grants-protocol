---
"@common-grants/sdk": minor
"@common-grants/cli": patch
---

Bump zod to v4. zod is a runtime dependency of the published SDK and CLI; this updates its declared range (`^3.25.76` → `^4.4.3`), adapts internal usage to v4 (two-argument `z.record(z.string(), …)`, `ZodType`/`ZodObject` generic signatures, `ZodSafeParseResult`, and the `Invalid URL` message wording), and replaces the forms v4 deprecates (`z.ZodTypeAny` / `z.ZodSchema` → `z.ZodType`, `z.string().uuid()` / `.url()` / `.email()` and `.date()` / `.time()` / `.datetime()` → their top-level and `z.iso.*` equivalents, `.passthrough()` → `.loose()`, `.merge(B)` → `.extend(B.shape)`). No public API changes.

The SDK is `minor` rather than `patch` because zod reaches consumers through its exported schema types: a consumer on zod 3 passing their own schema into an SDK generic gets a type error, and a consumer pinning zod 3 via an override cannot compile the SDK's declarations at all. Plugins depending on the SDK need a matching zod bump. The CLI stays `patch` — it ships as a `cg` executable with no importable typed surface, so its zod version is not observable to consumers.
