---
"@common-grants/sdk": patch
"@common-grants/cli": patch
---

Bump zod to v4. zod is a runtime dependency of the published SDK and CLI; this updates its declared range (`^3.25.76` → `^4.4.3`) and adapts internal usage to v4 (two-argument `z.record(z.string(), …)`, `ZodType`/`ZodObject` generic signatures, and the `Invalid URL` message wording). No public API changes.
