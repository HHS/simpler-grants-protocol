---
title: Organization relationships
description: ADR documenting the decision to use kind-keyed hierarchy arrays and distinct singular references for organization relationships.
---

Organizations need to identify a containing organization without merging the two organizations' identities. Fluxx's examples also distinguish fiscal sponsorship, trading names, replacement organizations, and duplicate records. A department's parent reference can carry the university's identifiers so downstream systems can match it without interpreting Fluxx's local ID. [ADR 0023](https://commongrants.org/governance/adr/0023-org-ids/) established that reference content.

The [design discussion](https://github.com/HHS/simpler-grants-protocol/issues/1223) explored several representations and later moved toward a typed hierarchy array. This decision weighs its native traversal against kind-keyed collections' direct access and partial updates. Fluxx's stated cardinality is concurrent different kinds, but never two of the same kind. Its parent-plus-sponsor example does not establish repeated same-kind hierarchy.

## Decision

We use an optional `relationships` container, with hierarchy grouped into kind-keyed arrays under `relationships.parents`. We keep `fiscalSponsor`, `successor`, and `duplicateOf` as distinct singular references, put current DBA names directly on the organization as a string array, and omit division.

The deciding preference is **kind-local update isolation**. [ADR 0026](https://commongrants.org/governance/adr/0026-org-profile-syncing/) uses JSON Merge Patch: arrays replace whole, objects merge recursively, omitted members remain unchanged, and `null` removes members. A typed hierarchy array requires a writer changing one kind to preserve and resend all other hierarchy entries. A keyed representation lets that writer replace just the addressed kind. Consumers can normalize buckets locally into labeled edges for traversal; writers cannot obtain kind-local array updates without preserving other entries or changing the patch mechanism.

A typed array is the strongest alternative: it provides native uniform iteration and inline kind metadata. We give kind-local writes more weight than those benefits. This weighting is a design judgment, not measured performance, a verified Fluxx writing workload, or a claim of lower total implementation cost.

We choose arrays over keyed singular references to permit same-kind multiplicity without a later value-type change and to replace hierarchy references whole rather than recursively retaining metadata. Kind-local isolation does not distinguish these two keyed options. The cost is array handling even for a single target; multiplicity is an evolution tradeoff, not demonstrated Fluxx demand.

- **Positive consequences**
  - Known-kind lookup returns the complete addressed collection directly.
  - Updating one standard or custom hierarchy kind does not require resending other kinds.
  - Sponsorship, succession, and duplicate identity remain independently addressable.
  - Arrays can represent several targets under one hierarchy kind without artificial labels.
- **Negative consequences**
  - Generic traversal must normalize standard buckets and the custom map.
  - Custom labels require external documentation rather than carrying inline kind metadata.
  - Each addressed array still replaces whole, so stale writes within that kind remain possible.
  - Broader cardinality requires consumers to handle branching and shared ancestors.
  - Reference coherence and graph integrity require provider checks beyond schema validation.

### Criteria

**Required capabilities and boundaries** take precedence over ergonomic preferences:

- Preserve dependent-to-parent direction and the reference's local ID, name, and optional matching identifiers.
- Keep hierarchy, sponsorship, succession, and duplicate identity distinct.
- Permit different relationship kinds concurrently, including a structural parent and a different fiscal sponsor.
- Preserve existing Merge Patch semantics and coherent target identity.
- Distinguish custom hierarchy kinds from nonhierarchical extensions.
- Limit this decision to organizations. Opportunities, awards, and `Award.parent` are unchanged. Organization status is handled separately in [PR 1252](https://github.com/HHS/simpler-grants-protocol/pull/1252).
- Put DBA names on the organization and omit division.

**Weighted preferences** are kind-local updates, direct known-kind access, traversal across unfamiliar kinds, and a small public model. They are not equally weighted scores.

**Same-kind multiplicity** is a deliberate evolution tradeoff, not a required capability derived from adopter evidence. Joint control is a constructed, unverified counterexample, not a supplied record. Arrays permit multiple targets without giving order a primary-parent or ranking meaning. We prioritize avoiding a later value-type change over deferring this capability; we do not attribute that choice to Fluxx or to stakeholder consensus.

### Options considered

| Option                                         | Result   | Deciding reason                                                                           |
| ---------------------------------------------- | -------- | ----------------------------------------------------------------------------------------- |
| Named singular hierarchy fields                | Rejected | One-per-kind limits require a later value-type change for multiplicity.                   |
| One typed list for every relationship category | Rejected | Loses distinct named singular links and couples all edge updates.                         |
| Kind-keyed singular hierarchy                  | Rejected | Keeps narrow writes, but limits cardinality and recursively merges references.            |
| Typed hierarchy array                          | Rejected | Native traversal and inline metadata do not outweigh replacing unrelated kinds on writes. |
| Kind-keyed hierarchy arrays                    | Selected | Isolates writes by kind while allowing multiplicity and whole-reference replacement.      |

### Representation

This is an illustrative read structure, not compiled TypeSpec or a tested payload. `OrgRef` means the existing ID, name, and optional identifiers. Its ID is read-only, so writable relationship targets require a distinct write-reference variant rather than reuse of the read type without changes.

```text
Organization additions
  dbaNames: optional string array
  relationships: optional OrgRelationships

OrgRelationships
  parents: optional OrgParents
  fiscalSponsor: optional singular OrgRef
  successor: optional singular OrgRef
  duplicateOf: optional singular OrgRef
  otherRelationships: documented nonhierarchical label -> OrgRef array

OrgParents
  parent: optional OrgRef array
  department: optional OrgRef array
  chapter: optional OrgRef array
  subsidiary: optional OrgRef array
  otherParents: documented hierarchy label -> OrgRef array
```

Both extension maps are optional. Read schemas must preserve [ADR 0024](https://commongrants.org/governance/adr/0024-optional-field-nullability/)'s absent/null/value distinction. Patch null means removal independently of read null semantics; nullable schema emission has not been verified for this structure.

### Relationship meanings

Every reference is stated on the source organization and points to its target. Hierarchy labels describe the source's relationship to its direct containing organization:

- `parent`: confirmed containment when no more specific supported subtype is known. This named fallback preserves the original parent need without forcing a subtype classification. Use the specific kind when known; do not repeat the same link as both generic parent and its subtype.
- `department`: an internal organizational unit within the target.
- `chapter`: a local or regional unit under the target's organizational structure, not merely a network member.
- `subsidiary`: a separate entity owned or controlled by the target. Several ownership interests do not automatically establish several controlling parents.
- `fiscalSponsor`: the target fiscally sponsors this organization or project. A payee designation alone is insufficient.
- `successor`: a different organization replaces the dissolved predecessor; both records represent real organizations. Renames and sponsor changes alone do not establish succession.
- `duplicateOf`: the canonical record represents the same organization, not a replacement entity.
- `dbaNames`: current trading names, not organization references or former-name history.

The thread's `supersededBy` duplicate meaning maps to `duplicateOf`; `succeededBy` maps to `successor`. The later design discussion moved away from a separately linked DBA record toward string names. These terminology and placement choices must not conflate the underlying meanings.

Custom parent labels must document containment and direction. Nonhierarchical labels belong in `otherRelationships`. Neither extension map may disguise additional fiscal sponsors, successors, or duplicate targets. Name-collision checks alone do not enforce this semantic boundary.

For duplicates, preserve the losing record and its link so an old reference can identify the canonical record. Fluxx described redirects and exclusion from listings as anticipated behavior. This ADR does not mandate automatic redirects, default listing filters, deletion, or transport behavior. That exclusion does not reject an adopter's behavior; it separates relationship semantics from its implementation. Successors must not receive duplicate treatment.

### Updates and reference integrity

| Patch input                              | Effect                                                                                     |
| ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| `relationships.parents.department` array | Replaces only that kind; omitted kinds and singular links remain unchanged.                |
| One extension-map label's array          | Replaces only that label's references.                                                     |
| `[]`                                     | Leaves a present empty collection, not automatically a read-side not-applicable assertion. |
| `null`                                   | Removes the addressed member.                                                              |

No append, element merge, or merge-by-ID behavior is introduced.

Singular reference objects still merge recursively. Providers apply the following coherence rules, including when queued proposals are accepted against current state:

1. Resolve a changed target's identity and refresh its name and provider-derived identifiers; remove stale values when unavailable.
2. Refresh metadata retained from the old target before validation, rather than treating it as contradictory sender input. A resolvable ID-only target change can succeed.
3. Reject unresolved targets and contradictory metadata explicitly supplied by the sender atomically.

Providers reject self-links and identical edges, check hierarchy cycles across kinds, and check successor and duplicate cycles separately within their known graph. An identical hierarchy edge has the same effective kind and target ID. These are provider obligations, not claims that schemas enforce them or that one provider knows a complete cross-system graph.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or requires additional handling

Required capabilities screen out incompatible shapes before preferences are weighed. There is no checkmark total or equally weighted score. Multiplicity is a chosen evolution tradeoff, not established demand.

| Criterion                                        | Weight              | Named singular | All-edge list | Keyed singular | Typed parents | Keyed arrays |
| ------------------------------------------------ | ------------------- | :------------: | :-----------: | :------------: | :-----------: | :----------: |
| Distinct named singular links                    | Required            |       ✅       |      ❌       |       ✅       |      ✅       |      ✅      |
| Existing Merge Patch semantics                   | Required            |       ✅       |      ✅       |       ✅       |      ✅       |      ✅      |
| Different kinds concurrently                     | Required            |       ✅       |      ✅       |       ✅       |      ✅       |      ✅      |
| Coherent target identity                         | Required            |       🟡       |      🟡       |       🟡       |      🟡       |      🟡      |
| Distinguish custom hierarchy from other links    | Required            |       ✅       |      🟡       |       ✅       |      ✅       |      ✅      |
| Kind-local hierarchy updates                     | Deciding preference |       ✅       |      ❌       |       ✅       |      ❌       |      ✅      |
| Direct complete known-kind access                | Preference          |       ✅       |      ❌       |       ✅       |      ❌       |      ✅      |
| Native uniform hierarchy traversal               | Preference          |       ❌       |      🟡       |       ❌       |      ✅       |      ❌      |
| Inline custom-kind metadata                      | Preference          |       ❌       |      ✅       |       ❌       |      ✅       |      ❌      |
| Same-kind multiplicity without value-type change | Evolution tradeoff  |       ❌       |      ✅       |       ❌       |      ✅       |      ✅      |

All shapes need provider checks for coherent target identity. The all-edge list also needs category classification and singular-limit enforcement. Keyed shapes require traversal normalization; the all-edge list requires filtering hierarchy from other categories. These handling costs do not make traversal impossible.

### Option 1: Named singular hierarchy fields — Rejected

:::note[Bottom line]
Named singular fields are best if direct access and one-per-kind dominate, but consumers can compromise on generic traversal and future same-kind multiplicity.
:::

- **Pros**
  - Fit Fluxx's stated cardinality and permit small member updates.
  - Keep the distinct singular links separate.
- **Cons**
  - Cannot represent several standard parents of one kind.
  - Require field-aware traversal and coherence checks for recursive reference merging.

### Option 2: One typed list for every category — Rejected

:::note[Bottom line]
One list is best if uniform enumeration of every edge dominates, but writers can compromise on update isolation and consumers on named access to singular links.
:::

- **Pros**
  - Standard and custom edges can share a typed entry shape.
  - Several same-kind edges are representable.
- **Cons**
  - A sponsor edit replaces unrelated hierarchy and identity edges.
  - Singular limits and category classification need validation.
  - Does not preserve the required separate named links.

### Option 3: Keyed singular hierarchy — Rejected

:::note[Bottom line]
Keyed singular values minimize single-target handling and retain kind-local writes, but impose one-per-kind cardinality. We reject that limit in favor of multiplicity without a later value-type change.
:::

- **Pros**
  - Kind-local access and updates without an array for the single-target case.
  - A container groups hierarchy without changing its cardinality.
- **Cons**
  - A broader same-kind case requires changing the value type.
  - Traversal requires normalization, and recursive reference merging needs coherence checks.

### Option 4: Typed hierarchy array — Rejected

:::note[Bottom line]
A typed hierarchy array provides native uniform traversal and inline kind metadata. We reject its whole-hierarchy write boundary: partial writers must preserve and resend unfamiliar kinds to change one kind.
:::

This is the later discussion's direction and the strongest alternative to keyed arrays. Each entry contains `OrgRef` content and a kind. Standard kinds cover parent, department, chapter, and subsidiary; custom kinds carry documented label metadata. The three distinct singular links remain outside the array.

- **Pros**
  - Standard and custom edges share a kind-plus-reference representation.
  - Hierarchy is immediately iterable without enumerating standard properties.
  - Broader cardinality is representable without changing the entry type.
- **Cons**
  - Changing one kind replaces all parents under Merge Patch.
  - Known-kind reads must filter for every match rather than return only the first.
  - Stale writes can overwrite intervening changes to unrelated kinds.

One-per-kind is a validation question, not something inherently impossible with an array. The emitted schema and provider enforcement still need verification. This option's advantage is native entry uniformity, not exclusive support for traversal or multiplicity.

### Option 5: Kind-keyed arrays — Selected

:::note[Bottom line]
We select keyed arrays for kind-local updates, complete known-kind access, and multiplicity without a value-type change. We accept traversal normalization and separate custom-label documentation.
:::

- **Pros**
  - Direct access returns the complete addressed kind; patches preserve other kinds.
  - Custom-label updates have the same isolation.
  - Array replacement replaces hierarchy references whole rather than recursively retaining old metadata.
  - Broader cardinality does not require a singular-to-array type change.
- **Cons**
  - Traversal must normalize standard properties and custom-map members.
  - Custom labels lack inline extensible-enum metadata.
  - Same-kind demand remains unverified, and stale writes within a kind remain possible.
  - Single-target cases still require array handling; isolation alone does not justify arrays over keyed singular values.

The preference for arrays over singular values is an evolution judgment, not a supplied repeated-kind requirement.

### Custom-kind representation

| Representation                                        | Result   | Tradeoff                                                                                       |
| ----------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| Label-to-reference-array map                          | Selected | Per-label replacement and deletion; documentation stays separate.                              |
| Typed custom list                                     | Rejected | Inline metadata, but all custom entries replace together.                                      |
| Label-to-group object with description and references | Rejected | Metadata and isolation, but an extra public model without an established inline-metadata need. |
| Fully dynamic map                                     | Rejected | Uniform standard/custom traversal, but no generated named standard properties.                 |

### Supplied examples and limits

<!-- cspell:ignore NIFA Ojai -->

Fluxx supplied an AI-assisted set of descriptions and interpretations, not published relationship JSON. The source explicitly said the Exchange did not publish relationships and that chapter and subsidiary classifications were readings of records. These examples are not independently fetched or validated by this ADR. Both candidate shapes must preserve their meanings:

- **USDA → NIFA → NIFA-eRA:** hierarchy inferred from source keys; an upward chain, not multiple parents on one record.
- **Wyoming Physics Department:** named in grants with the University of Wyoming Foundation as payee. This does not supply a resolved department record or prove fiscal sponsorship. Earlier constructed probe records are not source facts.
- **Sonora Community Hospital:** supplied subsidiary and DBA interpretation; use a hierarchy reference and a name, not two parent edges. The target still needs confirmation.
- **Mindful Citizen:** Simply Ojai and Start at Home are two supplied trading names on one entity, not two containing organizations.
- **Habitat affiliates versus United Way members:** Fluxx described Habitat's group-exemption relationship as chapter containment and United Way membership as no stored parent relationship. Similar names and distinct local EINs do not establish which applies. The correct answer can be no parent.
- **Sigma Theta Tau International Inc:** the supplied three records have different EINs and addresses and were described as chapters, not duplicates. A shared name does not establish `duplicateOf`.
- **Kaiser entities:** the supplied interpretation calls Mid-Atlantic a subsidiary of Health Plan and Hospitals and Health Plan sisters. Shared address and website alone do not establish containment between sisters.
- **Holler Health Justice → Abortion Care for Tennessee:** a reported transfer to a successor fiscal sponsor is not proof that one sponsor organization succeeded the other.
- **Monument Legacy → Monument Charitable:** reported successor transfer; replacement after dissolution still needs confirmation.
- **Saint Dominic's Family Services:** supplied rename with the same EIN, not succession. A changed name alone establishes neither successor nor duplicate identity.
- **CDOT and Alabama:** a resolved State of Colorado parent and Alabama successor were not supplied. This does not prove those records do not exist.

### Verification and operational consequences

Thirteen abstract Merge Patch checks confirm bucket isolation, array replacement, member deletion, recursive metadata carryover, and the difference between stale whole-list and different-kind bucket writes. They do not compile Core, validate generated schemas or SDKs, or exercise served records. Historical probes used older shapes and semantics and do not validate this contract.

Before implementation acceptance, test standard and custom reads, normalized traversal, chosen cardinality, map-key deletion, nullable reads, coherent target changes, and integrity rejection through downstream consumers in both SDK languages. Verify unknown-key and unknown-enum behavior; optional additions do not guarantee compatibility with older sealed validators. Establish versioning and rollback without silently discarding relationship data.

Existing OrgSync authorization governs source-record changes; a relationship grants no authority over its target. Preserve ADR 0023's public-identifier boundary and avoid exposing unauthorized target metadata. Existing change-ledger behavior applies. Target resolution and graph checks add provider work; no new transport or remote-resolution service is required. No performance or cost measurements are claimed.

### Protocol conformance

| Aspect                | Convention                                          | Conforms / Diverges                                    |
| --------------------- | --------------------------------------------------- | ------------------------------------------------------ |
| Pagination            | Existing list pagination                            | Unchanged; no new route or pagination fields           |
| Identifiers           | OrgRef ID, name, optional public identifiers        | Conforms on reads; writable target-ID variant required |
| Headers               | ADR 0026 authorization and Merge Patch content type | Conforms; existing contract unchanged                  |
| Field names           | camelCase; `other<Plural>` maps                     | Conforms: `otherParents`, `otherRelationships`         |
| Response shapes       | Existing OrgSync envelopes and revisions            | Unchanged                                              |
| Read nullability      | ADR 0024 absent/null/value                          | Conformance required; schema emission unverified       |
| Parent placement      | ADR 0023 root parent                                | Diverges; partial supersession below                   |
| Extension cardinality | Existing single-reference extension maps            | Diverges; array-valued exception below                 |

#### Parent placement and partial supersession

This decision partially supersedes ADR 0023's root-parent placement, not its reference-content or identifier decisions. It serves Fluxx's need for defined parent meanings and partial writers' need to preserve data they do not model. A single root parent with a kind could serve one hierarchy link alongside sponsorship; we group hierarchy for kind-local updates, not because those meanings cannot coexist at the root.

ADR 0023's parent placement and example require a reciprocal update when this decision lands. Its other identifier decisions remain in force.

**Lesson:** a reference's identity content does not determine the number or kinds of structural relationships. Keep identity, hierarchy labels, and cardinality explicit rather than interpreting every relationship as a parent.

#### Array-valued extension exception

We use array-valued maps for relationship extensions rather than the existing single-value extension pattern. This exception serves vendor engineers representing several targets under one documented label, but no named adopter demonstrated that need in the supplied evidence. We prioritize avoiding a future value-type change over deferring conjectured capability. It is not a verified Fluxx requirement. The exception is limited to relationship maps; existing identifier and organization-reference collections remain unchanged.
