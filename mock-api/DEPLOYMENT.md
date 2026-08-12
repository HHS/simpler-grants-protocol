# Deployment overhead (#1077-T5)

The "deployment overhead" rubric input for the #1077 experiment: what it actually
takes to get this Worker onto a real URL, and what is still missing before that
setup would be acceptable outside a spike.

Fold this into `FINDINGS.md` at #1077-T7.

## What exists

`.github/workflows/ci-mock-api.yml`, path-filtered to `mock-api/**` plus the
workflow file itself. Two jobs:

| Job        | Trigger                                              | Does                                                                                                                  |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `validate` | `pull_request`, `workflow_dispatch`, `workflow_call` | build → checks → generate versioned schemas → test → audit                                                            |
| `deploy`   | `workflow_dispatch` only, `needs: validate`          | `wrangler deploy` → resolve the `*.workers.dev` URL → smoke-test health + v0.3.0 list → write both to the run summary |

Deliberately a plain `wrangler deploy`, not the `wrangler versions upload
--preview-alias` flow that `ci-website-preview.yml` uses via
`.github/scripts/upload-worker-preview.sh`. That flow versions the _shared_
`common-grants` Worker; this is a separate service with its own name, so the
simpler primitive is the correct one.

## Secrets

No new secrets. Reuses the two the website preview flow already relies on, both
confirmed present on the repo:

| Secret                  | Added      |
| ----------------------- | ---------- |
| `CLOUDFLARE_API_TOKEN`  | 2026-08-06 |
| `CLOUDFLARE_ACCOUNT_ID` | 2026-08-06 |

They point at a **personal** Cloudflare account, so the deployed URL is a personal
`*.workers.dev` subdomain. Sufficient per the ticket, but it means the experiment's
one public artifact lives outside org control — the single biggest gap between this
and a productionized deploy. Moving to the org account is tracked separately.

## Cost / duration

Measured locally (Apple silicon, warm `node_modules`); CI adds checkout, Node and
pnpm setup, and a cold `pnpm install --frozen-lockfile`, which dominates:

| Step                                                         | Local   |
| ------------------------------------------------------------ | ------- |
| `build` (`wrangler deploy --dry-run`)                        | ~1s     |
| `checks` (eslint + prettier + tsc ×2)                        | ~3s     |
| `schemas` (website TypeSpec compile + versioned-schema emit) | ~3s     |
| `test` (232 tests)                                           | ~1s     |
| **validate total, excluding install**                        | **~8s** |

Worker bundle: 29.80 KiB (7.48 KiB gzipped).

The `schemas` step being only ~3s is the useful surprise here — the conformance
test's dependency on the website pipeline is cheap in wall-clock terms. The cost of
that coupling is structural, not temporal (see below).

> **Pending a real run.** The CI-measured duration of `validate` and `deploy`, and
> the deployed URL, are not filled in yet — see "Not yet verified".

## Not yet verified

**No deploy has been run.** `wrangler deploy` publishes a public service, so it
needs an explicit human decision, and two things block CI from doing it today:

1. This branch is not pushed to GitHub.
2. `workflow_dispatch` only exposes a "Run workflow" control once the workflow file
   exists on the **default branch**. This is a one-time bootstrap gate, not a
   standing requirement: once `ci-mock-api.yml` has landed on `main` once, the ref
   picker can target any branch carrying the same file, so later feature branches
   won't each need their own merge-to-`main` cycle. But today it means the deploy
   job cannot be dispatched from this branch at all — a consequence of choosing
   manual dispatch to keep the experiment cheap, not anticipated in the plan.

## Runbook: first deploy (manual, one time)

Run from the repo root. Step 1 opens a browser for Cloudflare OAuth, so it can't be
automated in a headless session.

1. Authenticate wrangler against the Cloudflare account that should own the Worker:

   ```bash
   pnpm --filter @common-grants/mock-api exec wrangler login
   ```

2. Confirm the account it picked, so the Worker doesn't land somewhere unexpected:

   ```bash
   pnpm --filter @common-grants/mock-api exec wrangler whoami
   ```

3. Deploy. This publishes a **public** Worker at
   `https://cg-mock-api.<your-subdomain>.workers.dev`:

   ```bash
   pnpm --filter @common-grants/mock-api run deploy
   ```

4. Verify the two routes the ticket names, substituting the URL wrangler printed:

   ```bash
   curl -s https://cg-mock-api.<your-subdomain>.workers.dev/ | jq
   ```

   ```bash
   curl -s https://cg-mock-api.<your-subdomain>.workers.dev/v0.3.0/common-grants/opportunities | jq '.items | length'
   ```

   Expected: the first prints `name` plus all four `supportedVersions`; the second
   prints `11`.

If attaching this to a personal account is unwanted, `wrangler deploy --temporary`
uses a throwaway preview account — but the URL is ephemeral, and #1077-T6 and
#1077-T7 need a stable origin for the docs "Try it out" and the SDK continuity
check, so they would need a real deploy anyway.

### Alternatives to deploying by hand

- Merge `ci-mock-api.yml` to `main`, then use the Actions "Run workflow" button. The
  workflow's own smoke test verifies both routes for you.
- Add a `push` trigger scoped to the experiment branch — auto-deploys, and gives up
  the "manual, therefore cheap" property the ticket asked for.

### Deployed URL

Not yet deployed.

## Gaps to flag for #1077-T7

- **Personal account.** The public URL is not org-controlled.
- **Single deployment slot.** One fixed Worker name (`cg-mock-api`) means no
  staging/per-env split; a `concurrency` group keeps deploys from racing, but that
  is a guard, not a solution.
- **Path filter misses its real dependency.** The trigger watches `mock-api/**`,
  per the ticket. But the conformance suite validates against schemas generated
  from `website/`, so a protocol or pipeline change under `lib/core/**` or
  `website/**` can break `mock-api` tests _without_ running this workflow. The
  reverse coupling is unguarded too. Widening the filter would catch it at the cost
  of running mock-api CI on most PRs.
- **No rollback path** beyond redeploying an older commit.
- **Smoke test covers two routes only** — the health route and the v0.3.0 list. The
  detail and search endpoints, the other three versions, and CORS/preflight are
  exercised by unit tests but never against the deployed Worker.
