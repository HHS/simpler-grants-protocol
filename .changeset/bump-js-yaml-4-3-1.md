---
"@common-grants/cli": patch
"@common-grants/sdk": patch
---

Bump js-yaml from 4.3.0 to 4.3.1, resolving a high-severity advisory where `!!omap` resolution consumes quadratic CPU on a crafted document (GHSA-5p4m-2wfm-xmqj). js-yaml is a runtime dependency of the CLI and a dev dependency of the SDK.
