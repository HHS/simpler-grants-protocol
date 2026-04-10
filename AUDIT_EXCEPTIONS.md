# Audit Exceptions

Transitive vulnerabilities suppressed via `pnpm.auditConfig.ignoreGhsas` in template `package.json` files. These are unfixable on our end — only the upstream maintainers can update their pinned transitive dependencies.

Each entry documents the GHSA, severity, affected package, dependency path, and what needs to happen upstream before the exception can be removed.

For background on the audit CI step, see [DEPENDENCY_MANAGEMENT.md](./DEPENDENCY_MANAGEMENT.md).

---

## `templates/quickstart`

All 7 exceptions trace back to `@typespec/compiler`'s transitive dependencies.

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-83g3-92jg-28cx | High | node-tar | Arbitrary file write via hardlink/symlink chain | `@typespec/compiler > ... > node-tar` |
| GHSA-qffp-2rhf-9h96 | High | node-tar | Hardlink path traversal via drive-relative linkpath | Same as above |
| GHSA-9ppj-qmqm-q256 | High | node-tar | Symlink path traversal via drive-relative linkpath | Same as above |
| GHSA-c2c7-rcm5-vvqj | High | picomatch | ReDoS via extglob quantifiers | `@typespec/compiler > globby > fast-glob > micromatch > picomatch` |
| GHSA-2g4f-4pwh-qvx6 | Medium | ajv | ReDoS when using `$data` option | `@typespec/compiler > ... > ajv` |
| GHSA-3v7f-55p6-f55p | Medium | picomatch | Method injection in POSIX character classes | Same path as picomatch above |
| GHSA-48c2-rrv3-qjmp | Medium | yaml | Stack overflow via deeply nested collections | `@typespec/compiler > yaml` |

**Remediation:** Remove when `@typespec/compiler` updates its transitive dependencies (node-tar, picomatch >=2.3.2, ajv, yaml >=2.8.3).

---

## `templates/express-js`

### via express / supertest

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-37ch-88jc-xwx2 | High | path-to-regexp | ReDoS via multiple route params | `express > path-to-regexp` |
| GHSA-w7fw-mjwx-w883 | Low | qs | arrayLimit bypass DoS in comma parsing | `supertest > superagent > qs` |

**Remediation:** Remove when `express` updates `path-to-regexp` to >=0.1.13 and `superagent` updates `qs` to >=6.15.1.

### via vitest

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-v2wj-q39q-566r | High | vite | `server.fs.deny` bypass with queries | `vitest > vite` |
| GHSA-p9ff-h696-f583 | High | vite | Arbitrary file read via dev server WebSocket | `vitest > vite` |
| GHSA-4w7w-66w2-5vf9 | Medium | vite | Path traversal in optimized deps `.map` handling | `vitest > vite` |
| GHSA-mw96-cpmx-2vgc | High | rollup | Arbitrary file write via path traversal | `vitest > vite > rollup` |
| GHSA-c2c7-rcm5-vvqj | High | picomatch | ReDoS via extglob quantifiers | `vitest > picomatch` |
| GHSA-3v7f-55p6-f55p | Medium | picomatch | Method injection in POSIX character classes | `vitest > picomatch` |

**Remediation:** Remove when `vitest` updates to `vite` >=7.3.2, `rollup` >=4.60.1, and `picomatch` >=4.0.4.

### via @typespec/compiler

| GHSA | Severity | Package | Issue |
|------|----------|---------|-------|
| GHSA-3ppc-4f35-3m26 | High | minimatch | ReDoS via repeated wildcards |
| GHSA-7r86-cg39-jmmj | High | minimatch | ReDoS via non-adjacent backtracking |
| GHSA-23c5-xmqv-rm74 | High | minimatch | ReDoS via nested extglobs |
| GHSA-83g3-92jg-28cx | High | node-tar | Arbitrary file write via hardlink/symlink chain |
| GHSA-qffp-2rhf-9h96 | High | node-tar | Hardlink path traversal via drive-relative linkpath |
| GHSA-9ppj-qmqm-q256 | High | node-tar | Symlink path traversal via drive-relative linkpath |
| GHSA-25h7-pfq9-p65f | High | flatted | Unbounded recursion DoS in `parse()` |
| GHSA-rf6f-7fwh-wjgh | High | flatted | Prototype pollution via `parse()` |
| GHSA-2g4f-4pwh-qvx6 | Medium | ajv | ReDoS when using `$data` option |
| GHSA-f886-m6hf-6m8v | Medium | brace-expansion | Zero-step sequence causes process hang |
| GHSA-48c2-rrv3-qjmp | Medium | yaml | Stack overflow via deeply nested collections |

**Remediation:** Remove when `@typespec/compiler` updates its transitive dependencies.
