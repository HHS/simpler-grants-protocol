---
title: Organization relationships
description: ADR evaluating typed parent arrays and kind-keyed collections for organization relationships.
---

Organizations need to identify a containing organization without merging the two organizations' identities. Fluxx's examples also distinguish fiscal sponsorship, trading names, replacement organizations, and duplicate records. A department's parent reference can carry the university's identifiers so downstream systems can match it without interpreting Fluxx's local ID. [ADR 0023](https://commongrants.org/governance/adr/0023-org-ids/) established that reference content.

The design question is whether a typed `parents` array or kind-keyed collections best balance uniform traversal, direct access, and partial updates. The [design discussion](https://github.com/HHS/simpler-grants-protocol/issues/1223) explored several representations. The later discussion moved toward a typed hierarchy array; this draft weighs that direction against kind-keyed arrays rather than treating either as an accepted design. Fluxx's stated cardinality is concurrent different kinds, but never two of the same kind. Its parent-plus-sponsor example does not establish repeated same-kind hierarchy.

## Decision

**Recommendation for review:** use an optional `relationships` container, with hierarchy grouped into named arrays under `relationships.parents`. Keep `fiscalSponsor`, `successor`, and `duplicateOf` as separate singular references. Put current DBA names directly on the organization as a string array. This is a proposed decision, not a record of stakeholder acceptance.

The deciding preference is **kind-local update isolation**. [ADR 0026](https://commongrants.org/governance/adr/0026-org-profile-syncing/) uses JSON Merge Patch: arrays replace whole, objects merge recursively, omitted members remain unchanged, and `null` removes members. A typed hierarchy array requires a writer changing one kind to preserve and resend all other hierarchy entries. A keyed representation lets that writer replace just the addressed kind. Consumers can normalize buckets locally into labeled edges for traversal; writers cannot obtain kind-local array updates without preserving other entries or changing the patch mechanism.

A typed array remains the strongest alternative when native uniform iteration and inline kind metadata outweigh narrow writes. This recommendation does not claim measured performance, a verified Fluxx writing workload, or lower total implementation cost.

Against keyed singular references, arrays can represent broader same-kind relationships, avoid a later singular-to-array change, and replace hierarchy references whole rather than recursively retaining metadata. Kind-local isolation itself does not distinguish keyed arrays from keyed singular values. If one-per-kind is the protocol rule, singular values remain a credible smaller alternative; arrays limited to one entry must earn their extra handling through evolution flexibility and whole-reference replacement.

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

**Broader same-kind hierarchy** is a proposed capability, not demonstrated adopter demand. Joint control is a constructed, unverified counterexample, not one of the supplied records. The recommendation permits it without giving array order a primary-parent or ranking meaning. Accepting this capability would prioritize avoiding a later value-type change over deferring capability no adopter has requested. Neither Fluxx's one-per-kind position nor the later potentially-multiple-parent discussion establishes this choice as accepted.

### Options considered

1. Named singular hierarchy fields, with separate singular links.
2. One typed list containing every relationship category.
3. Hierarchy keyed by kind with singular reference values.
4. A typed hierarchy array, with separate singular links.
5. Hierarchy keyed by kind with array values, with separate singular links (recommended).

### Proposed representation

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

Both extension maps are optional. Read schemas must preserve [ADR 0024](https://commongrants.org/governance/adr/0024-optional-field-nullability/)'s absent/null/value distinction. Patch null means removal independently of read null semantics; nullable schema emission has not been verified for this proposal.

### Relationship meanings

Every reference is stated on the source organization and points to its target. Hierarchy labels describe the source's relationship to its direct containing organization:

- `parent`: confirmed containment when no more specific supported subtype is known. This proposed named fallback preserves the original parent need without forcing a subtype classification. Use the specific kind when known; do not repeat the same link as both generic parent and its subtype.
- `department`: an internal organizational unit within the target.
- `chapter`: a local or regional unit under the target's organizational structure, not merely a network member.
- `subsidiary`: a separate entity owned or controlled by the target. Several ownership interests do not automatically establish several controlling parents.
- `fiscalSponsor`: the target fiscally sponsors this organization or project. A payee designation alone is insufficient.
- `successor`: a different organization replaces the dissolved predecessor; both records represent real organizations. Renames and sponsor changes alone do not establish succession.
- `duplicateOf`: the canonical record represents the same organization, not a replacement entity.
- `dbaNames`: current trading names, not organization references or former-name history.

The thread's `supersededBy` duplicate meaning maps to `duplicateOf`; `succeededBy` maps to the proposed `successor` name. The later design discussion moved away from a separately linked DBA record toward string names. These terminology and placement choices must not conflate the underlying meanings.

Custom parent labels must document containment and direction. Nonhierarchical labels belong in `otherRelationships`. Neither extension map may disguise additional fiscal sponsors, successors, or duplicate targets. Name-collision checks alone do not enforce this semantic boundary.

For duplicates, preserve the losing record and its link so an old reference can identify the canonical record. Fluxx described redirects and exclusion from listings as anticipated behavior. This ADR does not mandate automatic redirects, default listing filters, deletion, or transport behavior. That exclusion does not reject an adopter's behavior; it separates relationship semantics from its implementation. Successors must not receive duplicate treatment.

### Updates and reference integrity

A patch to `relationships.parents.department` replaces that array only. Other kinds and singular links remain unchanged when omitted. A patch to one extension-map label replaces that label's array. `[]` leaves a present empty collection; `null` removes the member. No append, element merge, or merge-by-ID behavior is introduced. An empty collection must not automatically be equated with a read-side not-applicable assertion.

Singular reference objects still merge recursively. When a target changes, providers resolve its identity and refresh its name and provider-derived identifiers, removing stale values when unavailable. Reject unresolved targets and contradictory metadata explicitly supplied by the sender atomically. Metadata retained from the old target by merging is refreshed before validation, not treated as contradictory sender input. Thus a resolvable ID-only target change can succeed. The same coherence checks apply when queued proposals are accepted against current state.

Proposed integrity checks reject self-links and identical edges, check hierarchy cycles across kinds, and check successor and duplicate cycles separately within the provider's known graph. An identical hierarchy edge has the same effective kind and target ID. These are proposed provider obligations, not claims that schemas enforce them or that one provider knows a complete cross-system graph.

## Evaluation

### Side-by-side

Required correctness screens come before preferences. There is no total score. “Multiple” describes what a shape can represent, not established demand.

| Criterion                      | Named singular   | All-edge list                           | Keyed singular         | Typed parents               | Keyed arrays          |
| ------------------------------ | ---------------- | --------------------------------------- | ---------------------- | --------------------------- | --------------------- |
| Distinct named singular links  | Separate members | Extra category limits; no named members | Separate members       | Separate members            | Separate members      |
| Existing Merge Patch           | Preserved        | Preserved                               | Preserved              | Preserved                   | Preserved             |
| Different kinds concurrently   | Yes              | Yes                                     | Yes                    | Yes                         | Yes                   |
| Same-kind hierarchy (proposed) | No               | Representable                           | No                     | Representable               | Representable         |
| Known-kind access              | Direct reference | Filter all matches                      | Direct reference       | Filter all matches          | Direct complete array |
| Hierarchy update boundary      | Member           | All relationships                       | Kind                   | All parents                 | Kind                  |
| Uniform traversal              | Normalize fields | Iterate and classify                    | Normalize buckets      | Native labeled entries      | Normalize buckets     |
| Custom kinds                   | Extension map    | Typed entries                           | Label-to-reference map | Typed entries with metadata | Label-to-array map    |

### Option 1: Named singular hierarchy fields

:::note[Bottom line]
Named singular fields are best if direct access and one-per-kind dominate, but consumers can compromise on generic traversal and future same-kind multiplicity.
:::

- **Pros**
  - Fit Fluxx's stated cardinality and permit small member updates.
  - Keep the distinct singular links separate.
- **Cons**
  - Cannot represent several standard parents of one kind.
  - Require field-aware traversal and coherence checks for recursive reference merging.

### Option 2: One typed list for every category

:::note[Bottom line]
One list is best if uniform enumeration of every edge dominates, but writers can compromise on update isolation and consumers on named access to singular links.
:::

- **Pros**
  - Standard and custom edges can share a typed entry shape.
  - Several same-kind edges are representable.
- **Cons**
  - A sponsor edit replaces unrelated hierarchy and identity edges.
  - Singular limits and category classification need validation.
  - Does not preserve the proposed separate named links, so it is not recommended.

### Option 3: Keyed singular hierarchy

:::note[Bottom line]
Keyed singular values are best if one-per-kind becomes the rule, but consumers can compromise on native uniform traversal and a later value-type change.
:::

- **Pros**
  - Kind-local access and updates without an array for the single-target case.
  - A container groups hierarchy without changing its cardinality.
- **Cons**
  - A broader same-kind case requires changing the value type.
  - Traversal requires normalization, and recursive reference merging needs coherence checks.

### Option 4: Typed hierarchy array

:::note[Bottom line]
A typed hierarchy array is best if native uniform traversal and inline kind metadata dominate, but partial writers can preserve and resend unfamiliar hierarchy entries.
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

### Option 5: Kind-keyed arrays (recommended)

:::note[Bottom line]
Keyed arrays are best if narrow updates and broader relationships dominate, but consumers can normalize buckets and obtain custom-label documentation separately.
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
  - If one-per-kind is selected, isolation does not justify arrays over keyed singular values.

The recommendation gives the earlier synchronization concern more weight than native wire iteration. The preference for arrays over singular values remains an evolution judgment, not a supplied repeated-kind requirement.

### Custom-kind representation

A label-to-reference-array map preserves per-label replacement and deletion. A typed custom list preserves inline kind metadata but replaces all custom entries together. A label-to-group object with description and references can combine metadata and isolation but adds a public model and traversal rule; defer it without an established inline-metadata need. A fully dynamic map makes standard and custom traversal uniform but gives up generated named standard properties.

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
| Parent placement      | ADR 0023 root parent                                | Diverges; partial-supersession proposal below          |
| Extension cardinality | Existing single-reference extension maps            | Diverges; proposed array-valued exception below        |

#### Parent placement and partial supersession

The proposal changes ADR 0023's root-parent placement, not its reference-content or identifier decisions. It serves Fluxx's need for defined parent meanings and partial writers' need to preserve data they do not model. A single root parent with a kind could serve one hierarchy link alongside sponsorship; grouping is recommended for kind-local updates, not because those meanings cannot coexist at the root.

If accepted, amend ADR 0023's parent placement and example with a reciprocal link to this decision. Its other identifier decisions remain in force. No change to ADR 0023 is represented as accepted by this draft.

**Lesson:** a reference's identity content does not determine the number or kinds of structural relationships. Keep identity, hierarchy labels, and cardinality explicit rather than interpreting every relationship as a parent.

#### Proposed array-valued extension exception

Array-valued relationship maps differ from existing single-value extension maps. They would serve vendor engineers representing several targets under one documented label, but no named adopter demonstrated that need in the supplied evidence. Accepting the exception would prioritize avoiding a future value-type change over deferring conjectured capability. It is not a verified Fluxx requirement. Existing identifier and organization-reference collections remain unchanged; if this tradeoff is rejected, use single-value extensions or revisit the proposed capability rather than treating it as approved.
