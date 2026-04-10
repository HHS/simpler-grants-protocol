# Audit Exceptions

High-severity transitive vulnerabilities suppressed via `pnpm.auditConfig.ignoreGhsas` in template `package.json` files. These are unfixable on our end — only the upstream maintainers can update their pinned transitive dependencies.

Each entry documents the GHSA, severity, affected package, issue, and dependency path. Moderate and low severity findings are filtered by `--audit-level=high` in CI and do not need suppression.

For background on the audit policy, see [DEPENDENCY_MANAGEMENT.md](./DEPENDENCY_MANAGEMENT.md).

---

## `templates/quickstart`

All 4 exceptions trace back to `@typespec/compiler`'s transitive dependencies.

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-83g3-92jg-28cx | High | node-tar | Arbitrary file write via hardlink/symlink chain | `@typespec/compiler > tar` |
| GHSA-qffp-2rhf-9h96 | High | node-tar | Hardlink path traversal via drive-relative linkpath | `@typespec/compiler > tar` |
| GHSA-9ppj-qmqm-q256 | High | node-tar | Symlink path traversal via drive-relative linkpath | `@typespec/compiler > tar` |
| GHSA-c2c7-rcm5-vvqj | High | picomatch | ReDoS via extglob quantifiers | `@typespec/compiler > globby > fast-glob > micromatch > picomatch` |

**Remediation:** Remove these entries when `@typespec/compiler` updates `tar` to >=7.5.11 and `picomatch` to >=2.3.2.

---

## `templates/express-js`

### via express

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-37ch-88jc-xwx2 | High | path-to-regexp | ReDoS via multiple route params | `express > path-to-regexp` |

**Remediation:** Remove when `express` updates `path-to-regexp` to >=0.1.13, or upgrade to Express v5.

### via vitest

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-v2wj-q39q-566r | High | vite | `server.fs.deny` bypass with queries | `vitest > vite` |
| GHSA-p9ff-h696-f583 | High | vite | Arbitrary file read via dev server WebSocket | `vitest > vite` |
| GHSA-mw96-cpmx-2vgc | High | rollup | Arbitrary file write via path traversal | `vitest > vite > rollup` |
| GHSA-c2c7-rcm5-vvqj | High | picomatch | ReDoS via extglob quantifiers | `@vitest/eslint-plugin > @typescript-eslint/utils > ... > picomatch` |

**Remediation:** Remove when `vitest` updates to `vite` >=7.3.2, `rollup` >=4.60.1, and `picomatch` >=4.0.4.

### via @typespec/compiler

| GHSA | Severity | Package | Issue | Dependency path |
|------|----------|---------|-------|-----------------|
| GHSA-3ppc-4f35-3m26 | High | minimatch | ReDoS via repeated wildcards | `@typespec/compiler > minimatch` |
| GHSA-7r86-cg39-jmmj | High | minimatch | ReDoS via non-adjacent backtracking | `@typespec/compiler > minimatch` |
| GHSA-23c5-xmqv-rm74 | High | minimatch | ReDoS via nested extglobs | `@typespec/compiler > minimatch` |
| GHSA-83g3-92jg-28cx | High | node-tar | Arbitrary file write via hardlink/symlink chain | `@typespec/compiler > tar` |
| GHSA-qffp-2rhf-9h96 | High | node-tar | Hardlink path traversal via drive-relative linkpath | `@typespec/compiler > tar` |
| GHSA-9ppj-qmqm-q256 | High | node-tar | Symlink path traversal via drive-relative linkpath | `@typespec/compiler > tar` |
| GHSA-25h7-pfq9-p65f | High | flatted | Unbounded recursion DoS in `parse()` | `@typespec/compiler > flatted` |
| GHSA-rf6f-7fwh-wjgh | High | flatted | Prototype pollution via `parse()` | `@typespec/compiler > flatted` |

**Remediation:** Remove when `@typespec/compiler` updates its transitive dependencies.
