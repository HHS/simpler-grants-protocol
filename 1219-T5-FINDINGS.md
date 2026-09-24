# #1219-T5: Zod and Pydantic validation pass for `OppIds`

Scratch branch: `karina/1219-sdk-validation-pass`, branched off `karina/1219-add-identifiers-to-opp-model` (T1 + T2). **Nothing here is meant to merge.** The deliverable is the findings below; the code exists so they are reviewable.

Protocol source: the T1 TypeSpec, compiled fresh via `pnpm --filter @common-grants/sdk run typespec` (TypeSpec 1.16.0) into `lib/ts-sdk/tsp-output/@typespec/json-schema/schemas.yaml`, and the committed YAML bundle at `website/public/schemas/yaml/`.

---

## Headline: T1 left `lib/ts-sdk` CI red, and the path filter hides it

This is the most actionable thing the pass turned up, and it is independent of the drafts.

T1 added `identifiers?: OppIds` to `OppRef`, and `OpportunityBase` picks it up through its existing `...OppRef` spread. The shipped `OpportunityBaseSchema` in `lib/ts-sdk/src/schemas/zod/models.ts:115` does not have the field. The parity harness applies `.strict()` to the Zod schema before comparing (`__tests__/utils/fuzz-test.ts:304-307`), so every generated sample that carries `identifiers` is now rejected by Zod and accepted by the protocol:

```
FAIL  __tests__/schemas/zod/models.spec.ts > OpportunityBase Schema > should match opportunityBase.yaml
Error: Zod schema does not match JSON schema "OpportunityBase.yaml".
       9 mismatch(es) found across 35 validated sample(s)
       "message": "Unrecognized key: \"identifiers\""
```

Reproduced on a clean T1/T2 tree with the draft schemas stashed out, so it is not an artifact of this branch.

Why it has not fired yet:

- `lib/ts-sdk/tsp-output/` is gitignored (`lib/ts-sdk/.gitignore:8`), so the bundle in a fresh checkout is always rebuilt, never the stale committed one.
- `ci:sdk` is `checks && build && test`, and `build` is `tsc && pnpm typespec`. CI therefore regenerates the v0.5 bundle and *then* runs the parity suite.
- `.github/workflows/ci-lib-ts-sdk.yml` only triggers on `lib/ts-sdk/**`, and nothing else calls it. T1 touched `lib/core` and `website`, so ts-sdk CI never ran on that PR.

The next PR that touches `lib/ts-sdk` at all inherits the failure. Worth fixing ahead of the v0.9 alignment work, either by adding `identifiers` to `OpportunityBaseSchema` or by widening the ts-sdk path filter to include `lib/core/**`. Both are outside this ticket's scope (the plan puts SDK `OpportunityBase` changes with the v0.9 tickets), so nothing here touches it.

---

## Zod: the protocol shapes express cleanly

Draft: `lib/ts-sdk/src/schemas/zod/identifiers.ts`. Parity spec: `lib/ts-sdk/__tests__/schemas/zod/identifiers.spec.ts`, which has 24 tests, all passing. Eight of them are parity runs against the full set of schemas the draft covers: the four the ticket names (`OppIdFon.yaml`, `OppIdAln.yaml`, `OppIds.yaml`, `OppRef.yaml`) plus the four supporting ones (`Identifier.yaml`, `SystemId.yaml`, `IdentifierCollection.yaml`, `IdentifierStatus.yaml`), so every row in the table below is machine-checked rather than argued. Each run is 25 generated samples plus 4 to 11 hand-written boundary cases.

**Two divergences, both understood.**

1. **`.nullish()` optionals accept an explicit `null` that the protocol rejects**, because the protocol declares fields optional but not nullable. Present on all seven object schemas. Same ADR-0024 family as the existing `OpportunityBase` entries, owned by [#1192](https://github.com/HHS/simpler-grants-protocol/issues/1192).
2. **`IdentifierCollection` cannot be matched at all, and no draft can fix it.** It is the one schema here the protocol leaves open (no `unevaluatedProperties`), and the harness unconditionally seals the Zod side with `.strict()` before comparing (`__tests__/utils/fuzz-test.ts:304-307`). So the SDK rejects an unknown key the protocol accepts no matter how the schema is written, and sealing the draft would not change the outcome. This is a limitation of the parity harness, not of Zod or of the draft: **the harness cannot validate any open protocol schema.** It has no owning issue yet and is tracked against #1219 in the spec until it gets one.

Both are recorded with the harness's known-divergence mechanism, so each entry fails once its cause is fixed and cannot outlive it.

Everything else agrees on both sides:

| Protocol construct | Zod | Agrees |
| --- | --- | --- |
| `unevaluatedProperties: {not: {}}` | `.strict()` | yes |
| `registry.code` as `const` | `z.literal("opp:us:fon")` | yes |
| `allOf: [IdentifierCollection]` + own properties | `.extend()` then `.strict()` | yes |
| Colon-bearing keys (`opp:us:fon`) | plain `z.object` keys, quoted | yes |
| `otherIds` as `Record<Identifier>` | `z.record(z.string(), IdentifierSchema)` | yes |
| `SystemId.id` as `uuid` | `UuidSchema` | yes |
| `allIds[].id` + `.status` required | required in a `.strict()` object | yes |
| No `required` on `IdentifierT`, so `{}` is valid | every field `.nullish()` | yes |
| `IdentifierStatus` as a two-member enum | `z.enum(["active", "archived"])` | yes |
| `IdentifierCollection` left open | non-`.strict()` `z.object` | no, see divergence 2 |

Two notes for the v0.9 tickets:

- **`allOf` flattening is safe here, but only here.** `unevaluatedProperties: {not: {}}` on `OppIds` sees `systemId` and `otherIds` through the `allOf` and allows them, so flattening with `.extend()` is equivalent. That equivalence depends on the sealed collection being the *only* sealing subschema. A second `allOf` branch would break it, and Zod has no way to express the difference.
- **The `IdentifierT<Id, Code>` template survives the trip.** A single `identifierT(code, id)` factory generates all four instantiations with full types and no `any`. The generic TypeSpec template maps onto Zod one-to-one.
- **A non-`.strict()` `z.object` strips unknown keys rather than rejecting them.** That is what `IdentifierCollectionSchema` does, so an extension key survives validation but is dropped from the parsed value, which is the Zod-side analogue of the Pydantic `otherIds` loss below. It costs nothing today, because every concrete collection seals it via `.extend().strict()` and it is never used unsealed on the wire, but it is worth knowing before anything exposes an open collection directly.

---

## Pydantic: the generator loses three things the protocol guarantees

Generated with `datamodel-code-generator` 0.45.0 from `website/public/schemas/yaml` using the exact flags in `lib/python-sdk/generated/scripts/generate_models.sh`. Hand-draft: `lib/python-sdk/drafts/identifier_models.py`. Both were exercised against the same inputs; the hand-draft matches the protocol on every row below.

### 1. `otherIds` silently discards all of its data (the serious one)

`IdentifierCollection.otherIds` is `Record<Identifier>` in TypeSpec, which the emitter renders as `unevaluatedProperties: {$ref: Identifier.yaml}` over `properties: {}`. `datamodel-codegen` does not understand that form and emits:

```python
RecordIdentifier = CommonGrantsBaseModel          # a bare model, no fields

class IdentifierCollection(CommonGrantsBaseModel):
    other_ids: Optional[RecordIdentifier] = Field(default=None, alias='otherIds')
```

`CommonGrantsBaseModel` does not set `extra`, so Pydantic's default `extra="ignore"` applies. Observed:

```
input : {"otherIds": {"opp:custom:thing": {"registry": {"code": "opp:custom:thing"}, "id": "abc"}}}
output: {"otherIds": {}}
```

Every extension identifier validates and is then thrown away. This is data loss in the round-trip, not just a weak type. The hand-draft uses `dict[str, Identifier]` and round-trips the value intact.

Root cause is on the emitter side, not the generator: `additionalProperties: {$ref: Identifier.yaml}` would generate `dict[str, Identifier]` correctly. Worth checking whether `@typespec/json-schema` can be told to emit `additionalProperties` for `Record<T>`, since this affects every `Record<T>` in the protocol, not just `otherIds`.

### 2. Sealed objects are not sealed at runtime

`unevaluatedProperties: {not: {}}` is carried through as inert metadata:

```python
registry: Optional[Registry] = Field(
    default=None,
    json_schema_extra={'unevaluatedProperties': {'not': {}}},   # documentation only
)
```

Nothing sets `extra="forbid"`, so unknown keys are accepted and dropped:

| input | protocol | generated | hand-draft |
| --- | --- | --- | --- |
| `OppIdFon {"id": "X", "nope": 1}` | reject | accept, emits `{"id": "X"}` | reject |
| `OppIds {"opp:us:xyz": {...}}` | reject | accept, emits `{}` | reject |
| `OppIdFon {"registry": {"code": "opp:us:fon", "nope": 1}}` | reject | accept | reject |

Fixable in one place by setting `extra="forbid"` on `CommonGrantsBaseModel`, but that changes behaviour for every existing model, so it needs its own decision.

### 3. An optional `const` becomes a required field with a default

`registry.code` is optional in the schema and constrained by `const`. The generator collapses that to a non-optional `Literal` with a default:

```python
class Registry(CommonGrantsBaseModel):
    code: Literal['opp:us:fon'] = Field(default='opp:us:fon', ...)
```

So the model invents a registry code the producer never sent:

```
input : {"registry": {}}
output: {"registry": {"code": "opp:us:fon"}}     # hand-draft: {"registry": {}}
```

Harmless for FON and ALN, where the code is the only legal value. Worth watching if a future identifier ever has an optional discriminator that is not a single `const`.

### What the generator got right

- **Colon-keyed aliases work.** `Field(alias="opp:us:fon")` survives `CommonGrantsBaseModel`'s camelCase `AliasGenerator`, because a field-level alias defaults to `alias_priority=2` and the generator does not override it. Verified by round-tripping the full `OppIds` example by alias. This was the open question in the ticket, and the answer is that no special handling is needed on either the generated or hand-written side.
- `OppIds` correctly inherits from `IdentifierCollection` rather than flattening.
- `Literal` const enforcement, `allIds` required fields, and `systemId.id` UUID parsing all behave.

### Smaller Pydantic notes

- `OppRef.id` is typed `uuid.Uuid`, a `RootModel[UUID]` wrapper, so callers read `ref.id.root` instead of a plain `UUID`. It serializes correctly, but it diverges from hand-written `opp_base.py`, which uses `UUID` directly. The generated module also does `from . import uuid`, shadowing the stdlib module inside that file.
- `Registry` and `AllId` are re-emitted per file (`OppIdFon.py`, `OppIdAln.py`, `SystemId.py`, `Identifier.py` each define their own) despite `--reuse-model`, because the `const` on `code` makes them structurally distinct. Expect four near-identical classes per registry-typed identifier.
- Explicit `null` on an optional field is accepted, exactly as in Zod, because `Optional[X] = None` is nullable. Same ADR-0024 gap (#1192) on both SDKs, so a fix should land on both together.

---

## Environment gap worth recording

This machine has no Poetry and no Python ≥ 3.11 (only the system 3.9.6), so `lib/python-sdk`'s own gates, `make checks` (black + ruff + pyright) and `make test`, **could not be run**. The generator and both model sets were exercised in a throwaway 3.9 virtualenv with a `StrEnum` shim, which is enough to compare validation semantics but is not a substitute for the package's checks. `lib/python-sdk/drafts/identifier_models.py` is therefore unlinted and untyped-checked. It is also outside `common_grants_sdk`, so nothing imports it.

`lib/ts-sdk` gates were run in full: `pnpm --filter @common-grants/sdk run checks` passes (eslint, prettier, `tsc --noEmit`).

---

## Suggested follow-ups

1. **Fix the ts-sdk parity break from T1**: add `identifiers` to `OpportunityBaseSchema`, or widen the ts-sdk CI path filter to `lib/core/**` so a protocol change cannot land this silently again. The second is worth doing regardless.
2. **Decide whether `Record<T>` should emit `additionalProperties`** instead of `unevaluatedProperties`. This is the only finding that costs real data, and it is protocol-wide.
3. **Decide on `extra="forbid"` for `CommonGrantsBaseModel`**, so the protocol's sealed objects are sealed in Python.
4. **Fold the identifier models into the #1192 ADR-0024 work**, since the nullish gap reproduces identically in both SDKs.
5. **File an issue for the parity harness's forced `.strict()`**, which makes every open protocol schema unmatchable. Today `IdentifierCollection` is the only one in this draft that hits it, but the harness will report a false divergence for any future open schema, and the `expect: "divergent"` entry covering it currently points at #1219 for want of a better home.
