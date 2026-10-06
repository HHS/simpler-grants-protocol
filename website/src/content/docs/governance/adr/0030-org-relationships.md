---
title: Organization relationships
description: ADR documenting the decision to represent an organization's relationships to other organizations as lists of relationship objects, one per category and direction, plus a list for other connections.
---

An organization record often needs to point to other organizations: the network a local chapter belongs to, the foundation that fiscally sponsors a project, the organization that carried on its work after a merger, or the record that a duplicate record should give way to. [ADR 0023](https://commongrants.org/governance/adr/0023-org-ids/) decided what a reference to another organization carries: its `id`, `name`, and optional `identifiers`. This decision covers where those references go, how a relationship's type is stated, and what a relationship can say about itself, such as when it started.

Here is a literacy project that is a chapter of a national network and is fiscally sponsored by a local foundation:

```json
{
  "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
  "name": "Riverside Reading Project",
  "relationships": {
    "parents": [
      {
        "org": {
          "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
          "name": "National Reading Network"
        },
        "kind": { "value": "chapter" }
      },
      {
        "org": {
          "id": "01912a8b-7c3d-7892-abcd-ef1234567892",
          "name": "Riverside Community Foundation"
        },
        "kind": { "value": "fiscalSponsor" },
        "startDate": "2024-07-01",
        "status": "active"
      }
    ]
  }
}
```

The list name, `parents`, gives the relationship's category and direction: each `org` is above this organization. `kind` optionally narrows that to a subtype. `org` identifies the other organization, while `startDate`, `endDate`, and `status` describe the relationship itself.

## Decision

We add an optional `relationships` object to `OrganizationBase` with seven optional lists. Every entry in every list is a relationship object with a required `org` and optional `kind`, `startDate`, `endDate`, and `status`. Names the organization currently does business as stay on the organization in an optional `dbaNames` list of strings. They are not relationships or a history of former names.

| List                 | Category   | Each entry says                                                     | Standard `kind` values                                           |
| -------------------- | ---------- | ------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `parents`            | Hierarchy  | `org` is above this organization                                    | `chapter`, `department`, `branch`, `subsidiary`, `fiscalSponsor` |
| `children`           | Hierarchy  | `org` is below this organization                                    | Same as `parents`                                                |
| `succeededBy`        | Succession | `org` carries on all or part of this organization                   | `merger`, `acquisition`, `divestiture`, `split`                  |
| `succeeds`           | Succession | This organization carries on all or part of `org`                   | Same as `succeededBy`                                            |
| `recordReplacedBy`   | Record     | `org`'s record should be used instead of this record                | `duplicate`, `merged`                                            |
| `recordReplaces`     | Record     | This record should be used instead of `org`'s record                | Same as `recordReplacedBy`                                       |
| `otherRelationships` | Other      | This organization is connected to `org`, possibly with no direction | None                                                             |

Every list also accepts a `custom` kind. List order carries no meaning, such as a primary parent.

- **Positive consequences**
  - A consumer following parents or children reads one list per organization and finds every entry the provider supplied there, whatever subtype each entry uses.
  - Each named list gives its entries' category and direction, so an entry there with no `kind`, or with a `kind` the consumer doesn't recognize, is still usable. `otherRelationships` entries need neither a direction nor a `kind`.
  - Dates and status describe the relationship without being mixed into the other organization's identity.
  - A subtype can repeat, such as the two organizations formed by a split.
  - A provider can state a relationship from whichever organization's record it maintains.
- **Negative consequences**
  - Under JSON Merge Patch, changing one entry means sending the whole list again. A writer that understands only some entries must still send the rest unchanged, and two writers updating the same list can overwrite each other.
  - Reading only one subtype means filtering the list.
  - Each entry nests the reference one level deeper, under `org`.
  - Because both directions can be stated, two records can disagree. The protocol doesn't require them to match.
  - Consumers can't assume one parent per subtype or a `kind` on every entry.

### Criteria

**Required capabilities and boundaries** screen out shapes before preferences are weighed:

- Keep the reference content from ADR 0023.
- Keep hierarchy, succession, and record replacement distinct, with room for other connections.
- Allow several relationships in a category at once, whether they have different subtypes (a chapter parent and a fiscal sponsor) or the same one (the two organizations formed by a split).
- Use the existing Merge Patch semantics, with no new patch mechanism.
- Limit the change to organizations. Opportunities, awards, and `Award.parent` are unchanged, and organization status is handled separately in [PR 1252](https://github.com/HHS/simpler-grants-protocol/pull/1252).

**Preferences**, from most to least weight:

1. A consumer can follow the supplied parents or children across mixed subtypes without knowing each level's label. This is the deciding preference.
2. Facts about a relationship stay separate from facts about the other organization.
3. A writer can change one category without resending the others.
4. A writer can change one subtype without resending the others.
5. A consumer can read one subtype without filtering.
6. The public model stays small.

### Options considered

| Option                                              | Result   | Deciding reason                                                                                                           |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------- |
| Named single references                             | Rejected | One target per field can't hold a split or several parents, and there's no place for dates or status.                     |
| Parents grouped by kind                             | Rejected | Allows one-kind writes, but a consumer following parents must gather every group.                                         |
| Lists with `kind` beside the reference's fields     | Rejected | Walks well, but mixes relationship facts into the other organization's fields.                                            |
| One list for every relationship                     | Rejected | Every change sends every relationship again, and each entry must carry its category, plus its direction where it has one. |
| Lists by category and direction, with `org` wrapped | Selected | Mixed subtypes read from one list, separate relationship facts, and independent categories.                               |

### Representation

```tsp
/** Subtypes of a parent or child relationship */
enum OrgHierarchyKindOptions {
  chapter,
  department,
  branch,
  subsidiary,
  fiscalSponsor,
  custom,
}

/** Subtypes of organizational succession */
enum OrgSuccessionKindOptions {
  merger,
  acquisition,
  divestiture,
  split,
  custom,
}

/** Subtypes of record replacement */
enum OrgRecordKindOptions {
  duplicate,
  merged,
  custom,
}

/** Other relationships define no standard subtypes */
enum OrgOtherKindOptions {
  custom,
}

/** Whether a relationship is in effect, as stated by the provider */
enum OrgRelationshipStatus {
  active,
  inactive,
}

/** A relationship from this organization to another organization */
model OrgRelationshipT<TKind> {
  /** The other organization */
  org: OrgRef;

  /** The relationship's subtype within the category its list names */
  kind?: Fields.ExtensibleEnumT<TKind>;

  /** When the relationship started */
  startDate?: Types.isoDate;

  /** When the relationship ended */
  endDate?: Types.isoDate;

  /** Whether the relationship is in effect, as stated by the provider */
  status?: OrgRelationshipStatus;
}

/** An organization's relationships to other organizations */
model OrgRelationships {
  /** Organizations above this one, such as a containing organization or a fiscal sponsor */
  parents?: OrgRelationshipT<OrgHierarchyKindOptions>[];

  /** Organizations below this one, such as its chapters or sponsored projects */
  children?: OrgRelationshipT<OrgHierarchyKindOptions>[];

  /** Organizations that carry on all or part of this one */
  succeededBy?: OrgRelationshipT<OrgSuccessionKindOptions>[];

  /** Organizations whose work this one carries on in whole or in part */
  succeeds?: OrgRelationshipT<OrgSuccessionKindOptions>[];

  /** Records to use instead of this record */
  recordReplacedBy?: OrgRelationshipT<OrgRecordKindOptions>[];

  /** Records that this record is used instead of */
  recordReplaces?: OrgRelationshipT<OrgRecordKindOptions>[];

  /** Connections outside the categories above, which need not have a direction */
  otherRelationships?: OrgRelationshipT<OrgOtherKindOptions>[];
}

model OrganizationBase {
  // ...existing fields

  /** Names the organization currently does business as, alongside its legal name */
  dbaNames?: string[];

  /** The organization's relationships to other organizations */
  relationships?: OrgRelationships;
}
```

`OrgRef` is the existing reference model. `org` and list entries are required. Every other member is optional and, like most optional fields on existing models, isn't nullable: a reader finds it omitted or with a value, never `null`. Model names, and the use of one template for every list, are implementation choices; this ADR decides the wire shape.

### Relationship objects

- **`org`** is required. On reads it is an `OrgRef`. Because `OrgRef.id` is read-only, the write shape keeps `org.id` writable, and a writer can identify a target by `id` alone.
- **`kind`** is optional in every list, including `otherRelationships`. It uses the protocol's [extensible enum](/protocol/fields/extensible-enum/): either a standard `value`, or `"value": "custom"` with the subtype in `customValue`. As elsewhere in the protocol, `description` is optional. A custom kind in a named list adds a subtype to that list's category. `otherRelationships` defines no standard values, so a kind stated there is always custom.
- **`startDate`** and **`endDate`** are optional ISO dates, with the same names and type as `DateRangeEvent`.
- **`status`** is optional and is `active` or `inactive`. It describes the relationship, not either organization. It has no default and isn't derived from the dates: an entry with a past `endDate` and no `status` hasn't stated a status. The protocol requires no particular combination of dates and status.

An entry with only `org` is valid in every list.

### Why one list per category and direction

The deciding consideration is how consumers follow relationships across levels. Subtypes change from level to level, and providers won't always label the same level the same way. A federal department might contain an agency, which contains a center, which contains a division, while a sibling agency uses institutes, offices, and branches at the same depths. A consumer walking up from a division can't know which label the next level uses, so it reads every parent the record supplies anyway. If parents were grouped by kind, that consumer would have to gather every group, including custom groups it has never seen, and a provider's choice of label would change where a parent appears in the payload. In a single list, the label is a value on the entry, and a provider that is unsure of the subtype can leave it out.

The cost falls on writes. [ADR 0026](https://commongrants.org/governance/adr/0026-org-profile-syncing/) uses JSON Merge Patch, which replaces arrays whole. Grouping by kind would let a writer replace one kind's parents without touching the others; a single list makes the writer send every parent. Updating one kind on its own is a convenience rather than a requirement, since a writer can still make any change by sending the full list.

Separate lists keep categories independent: changing `parents` never touches succession or record entries, and a consumer walking a hierarchy never filters them out.

`org` wraps the reference instead of placing `kind`, dates, and status beside its fields. The reference describes the other organization; the remaining fields describe the relationship.

### Hierarchy

- `parents` and `children` cover more than containment. `fiscalSponsor` is a hierarchy kind, so one organization can list a chapter parent and a different fiscal sponsor in the same `parents` list. Consumers shouldn't treat every parent as an owner or container.
- There is no generic `parent` kind. An entry without `kind` already states a parent relationship without a subtype.
- Providers can use a custom kind for other organizational labels, such as division or agency, or omit `kind` when no subtype is known.

### Succession and record replacement

Succession is about organizations; record replacement is about records in a provider's system. A `merger` in `succeededBy` means organizations combined, while a `merged` entry in `recordReplacedBy` means a provider combined records. A provider's workflow may treat `duplicate` and `merged` records alike; the protocol doesn't require the two to be exclusive. This decision doesn't prescribe how a provider merges, deletes, or redirects records.

### Both directions

Each named category has a list for each direction, and a provider can expose either or both. The protocol doesn't require reverse entries, complete lists, or agreement between the two sides, and it doesn't ask providers to store or maintain a relationship graph. `otherRelationships` is a single list because its connections need not have a direction.

### Updates

[ADR 0026](https://commongrants.org/governance/adr/0026-org-profile-syncing/)'s JSON Merge Patch applies unchanged:

| Patch body                                  | Effect                                                       |
| ------------------------------------------- | ------------------------------------------------------------ |
| `{ "relationships": { "parents": [...] } }` | Replaces the whole `parents` list; other lists are unchanged |
| `{ "relationships": { "parents": [] } }`    | Leaves an empty `parents` list; other lists are unchanged    |
| `{ "relationships": { "parents": null } }`  | Removes `parents`; other lists are unchanged                 |
| `{ "relationships": null }`                 | Removes every relationship list                              |

To change one relationship, a writer sends the full list with that entry updated. This patch ends the sponsorship from the opening example and leaves every other list unchanged:

```json
{
  "relationships": {
    "parents": [
      {
        "org": { "id": "01912a8b-7c3d-7891-abcd-ef1234567891" },
        "kind": { "value": "chapter" }
      },
      {
        "org": { "id": "01912a8b-7c3d-7892-abcd-ef1234567892" },
        "kind": { "value": "fiscalSponsor" },
        "startDate": "2024-07-01",
        "endDate": "2026-06-30",
        "status": "inactive"
      }
    ]
  }
}
```

This patch names its targets by `id` alone, which the write shape allows. Reads still return a full `OrgRef` for each `org`. Schema validation only checks shape; it doesn't fill in a target's `name` or identifiers.

In a patch, `null` removes the addressed member, as in JSON Merge Patch; reads never carry `null`. Because a patch replaces a list whole, an entry in that list leaves out an optional member rather than setting it to `null`.

## Evaluation

### Side-by-side

- ✅ Criterion met
- ❌ Criterion not met
- 🟡 Partially met or requires additional handling

| Criterion                          | Weight     | Named single | Grouped by kind | Kind beside fields | One list | Selected |
| ---------------------------------- | ---------- | :----------: | :-------------: | :----------------: | :------: | :------: |
| Distinct categories                | Required   |      ✅      |       ✅        |         ✅         |    🟡    |    ✅    |
| Several relationships per category | Required   |      ❌      |       ✅        |         ✅         |    ✅    |    ✅    |
| Existing Merge Patch semantics     | Required   |      ✅      |       ✅        |         ✅         |    ✅    |    ✅    |
| Follow supplied mixed subtypes     | Deciding   |      🟡      |       🟡        |         ✅         |    🟡    |    ✅    |
| Relationship facts kept separate   | Preference |      ❌      |       ❌        |         🟡         |    ✅    |    ✅    |
| Change one category alone          | Preference |      ✅      |       ✅        |         ✅         |    ❌    |    ✅    |
| Change one subtype alone           | Preference |      ✅      |       ✅        |         ❌         |    ❌    |    ❌    |
| Read one subtype without filtering | Preference |      ✅      |       ✅        |         ❌         |    ❌    |    ❌    |
| Small public model                 | Preference |      ✅      |       🟡        |         🟡         |    ✅    |    🟡    |

There is no checkmark total or equally weighted score. Named single references fail a required capability. Among the rest, the selected shape and the kind-beside-fields shape are the only ones that read mixed subtypes from one list, and the selected shape also keeps relationship facts apart from organization facts.

### Option 1: Named single references — Rejected

:::note[Bottom line]
Named single references are best if:

- we want the smallest model with direct access to each relationship
- but can compromise on several relationships per category and on relationship dates and status
  :::

ADR 0023's single `parent`, extended with one field per other relationship:

```json
{
  "parent": {
    "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
    "name": "National Reading Network"
  },
  "fiscalSponsor": {
    "id": "01912a8b-7c3d-7892-abcd-ef1234567892",
    "name": "Riverside Community Foundation"
  }
}
```

- **Pros**
  - Smallest model; each relationship is read or written by name.
  - Fits organizations with at most one relationship of each type.
- **Cons**
  - Can't hold two parents, or the two organizations formed by a split, without changing a field's type later.
  - No place for a relationship's subtype, dates, or status.
  - A consumer walking upward checks each named field.

### Option 2: Parents grouped by kind — Rejected

:::note[Bottom line]
Grouping parents by kind is best if:

- we want writers to replace one kind of parent without resending the others, and consumers to read one kind directly
- but can compromise on consumers gathering every group to follow parents
  :::

An earlier draft of this ADR selected this shape: `parents` is an object that maps each kind to a list of references, with custom kinds in an `otherParents` map, and sponsorship, succession, and duplicates as single references:

```json
{
  "relationships": {
    "parents": {
      "chapter": [
        {
          "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
          "name": "National Reading Network"
        }
      ],
      "otherParents": {
        "region": [
          {
            "id": "01912a8b-7c3d-7895-abcd-ef1234567895",
            "name": "Western Region"
          }
        ]
      }
    },
    "fiscalSponsor": {
      "id": "01912a8b-7c3d-7892-abcd-ef1234567892",
      "name": "Riverside Community Foundation"
    }
  }
}
```

- **Pros**
  - Replacing one kind's list leaves the other kinds unchanged.
  - Reading a known kind returns that kind's entries directly.
- **Cons**
  - A consumer following parents must gather every standard and custom group, including groups it doesn't recognize.
  - A provider's choice of label decides where a parent appears, so the same level can land in different places from different providers.
  - Every parent needs a key, so a parent with no known subtype needs a generic group of its own.
  - As drafted, values are bare references with no dates or status. Grouping relationship objects instead would fix that, but not the walk.

### Option 3: Lists with `kind` beside the reference's fields — Rejected

:::note[Bottom line]
Putting `kind` beside the reference's fields is best if:

- we want the flattest entries
- but can compromise on relationship facts sitting beside the other organization's identity
  :::

The same lists as the selected option, but each entry is the reference itself with relationship fields added:

```json
{
  "relationships": {
    "parents": [
      {
        "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
        "name": "National Reading Network",
        "kind": { "value": "chapter" }
      },
      {
        "id": "01912a8b-7c3d-7892-abcd-ef1234567892",
        "name": "Riverside Community Foundation",
        "kind": { "value": "fiscalSponsor" },
        "status": "active"
      }
    ]
  }
}
```

- **Pros**
  - One less level of nesting than the selected option.
  - Reads mixed subtypes from one list, as the selected option does.
- **Cons**
  - `status`, dates, and `kind` sit beside the organization's `id`, `name`, and `identifiers`, so `status` reads as if it were the organization's own status.
  - A field later added to `OrgRef` could collide with a relationship field.

### Option 4: One list for every relationship — Rejected

:::note[Bottom line]
One list is best if:

- we want a single collection for all relationship entries
- but can compromise on every change resending every relationship
  :::

```json
{
  "relationships": [
    {
      "category": "parent",
      "org": {
        "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
        "name": "National Reading Network"
      },
      "kind": { "value": "chapter" }
    },
    {
      "category": "succeededBy",
      "org": {
        "id": "01912a8b-7c3d-7893-abcd-ef1234567893",
        "name": "Riverside Reading East"
      },
      "kind": { "value": "split" }
    }
  ]
}
```

- **Pros**
  - Every supplied relationship is in one place.
  - Smallest container.
- **Cons**
  - Changing any relationship replaces all of them under Merge Patch, so ending a sponsorship also sends every succession and record entry again.
  - Each entry must carry its category, plus its direction where it has one, and consumers filter by category before following parents or children.

### Option 5: Lists by category and direction, with `org` wrapped — Selected

:::note[Bottom line]
We select lists by category and direction because:

- a consumer follows the supplied parents or children across mixed subtypes from one list, and relationship facts stay separate from organization facts
- and we accept resending a whole list to change one entry, and filtering to read one subtype
  :::

The opening example shows mixed parent subtypes. A split lists both resulting organizations in `succeededBy`:

```json
{
  "relationships": {
    "succeededBy": [
      {
        "org": {
          "id": "01912a8b-7c3d-7893-abcd-ef1234567893",
          "name": "Riverside Reading East"
        },
        "kind": { "value": "split" },
        "startDate": "2026-01-01"
      },
      {
        "org": {
          "id": "01912a8b-7c3d-7894-abcd-ef1234567894",
          "name": "Riverside Reading West"
        },
        "kind": { "value": "split" },
        "startDate": "2026-01-01"
      }
    ]
  }
}
```

- **Pros**
  - Each named list holds the supplied relationships of one category and direction, whatever their subtypes; `otherRelationships` holds connections outside those categories.
  - Categories update independently.
  - Relationship dates and status have a place that can't be confused with the other organization's fields.
- **Cons**
  - Changing one entry means sending its whole list.
  - Reading one subtype requires filtering.
  - Entries nest the reference under `org`.

### Direction options

| Representation                                                    | Result   | Tradeoff                                                                                        |
| ----------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------- |
| Both directions for each named category                           | Selected | A relationship can be stated on either organization's record; the two sides needn't match.      |
| One direction only (`parents`, `succeededBy`, `recordReplacedBy`) | Rejected | Smaller, but a provider that records relationships from the other side has nowhere to put them. |

A network can list its chapters without each chapter listing the network:

```json
{
  "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
  "name": "National Reading Network",
  "relationships": {
    "children": [
      {
        "org": {
          "id": "01912a8b-7c3d-7890-abcd-ef1234567890",
          "name": "Riverside Reading Project"
        },
        "kind": { "value": "chapter" }
      }
    ]
  }
}
```

### Fiscal sponsorship options

| Representation                                                                  | Result   | Tradeoff                                                                                                         |
| ------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| `fiscalSponsor` kind in `parents` and `children`                                | Selected | Sponsors appear in the same walk as other parents; consumers can't assume every parent contains its child.       |
| Separate sponsorship lists, such as `fiscallySponsoredBy` and `fiscalSponsorOf` | Rejected | Keeps sponsorship apart from structure, but adds a list pair for one subtype that an upward walk must also read. |

The rejected shape would look like this:

```json
{
  "relationships": {
    "parents": [
      {
        "org": {
          "id": "01912a8b-7c3d-7891-abcd-ef1234567891",
          "name": "National Reading Network"
        },
        "kind": { "value": "chapter" }
      }
    ],
    "fiscallySponsoredBy": [
      {
        "org": {
          "id": "01912a8b-7c3d-7892-abcd-ef1234567892",
          "name": "Riverside Community Foundation"
        }
      }
    ]
  }
}
```

### Operational consequences

Optional additions don't guarantee compatibility with older validators that reject unknown properties or enum values. Versioning and rollback must not silently discard relationship data.

Existing OrgSync authorization governs changes to an organization's record; a relationship grants no authority over its target. ADR 0023's boundary of publicly available identifiers still applies, so a provider avoids exposing target details the reader isn't authorized to see. Existing change-ledger behavior applies.

### Protocol conformance

| Aspect           | Convention                                                      | Conforms / Diverges                              |
| ---------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| Pagination       | ADR 0011 list pagination                                        | Unchanged; no new route or pagination fields     |
| Identifiers      | ADR 0023 `OrgRef`: `id`, `name`, optional `identifiers`         | Conforms on reads; writes keep `org.id` writable |
| Headers          | ADR 0026 authorization and Merge Patch content type             | Conforms; unchanged                              |
| Field names      | camelCase                                                       | Conforms                                         |
| Dates            | `startDate` and `endDate` as `isoDate`, as in `DateRangeEvent`  | Conforms; both optional here                     |
| Subtypes         | Extensible enum `value`, `customValue`, `description`           | Conforms                                         |
| Status           | Closed enum for a sub-object's lifecycle, as `IdentifierStatus` | Conforms; values `active` and `inactive`         |
| Response shapes  | Existing OrgSync envelopes and revisions                        | Unchanged                                        |
| Read nullability | Optional fields not nullable, as on most existing models        | Conforms; no member accepts `null` on reads      |
| Updates          | ADR 0026 JSON Merge Patch                                       | Conforms; lists replace whole                    |
| Parent location  | ADR 0023 `parent` on the organization                           | Diverges; see below                              |
| `other` prefix   | `other<Plural>` maps keyed by label, such as `otherIds`         | Diverges for `otherRelationships`; see below     |

#### Parent location

ADR 0023 decided a single `parent` reference on the organization. This decision moves parents into `relationships.parents`, where each entry wraps the same reference under `org`. A single `parent` holds one target with no subtype or dates: it can't hold a chapter parent and a fiscal sponsor together, or say when a sponsorship ended. The change serves vendor engineers whose organizations have more than one parent, and the consumers who walk those structures.

ADR 0023 now opens with a notice that points here, and its example shows the new location. Its reference content and identifier decisions stay in force. `Award.parent` is a separate award concept and is unchanged.

**Lesson:** what a reference carries doesn't settle how many relationships an organization has or what they mean. ADR 0023 decided the first; this ADR decides the second.

#### `otherRelationships` as a list

Elsewhere, `other<Plural>` members are maps keyed by a label, such as `otherIds` and `otherOrgs`. `otherRelationships` is instead a list of the same relationship objects the named lists use. A map would need a label for every entry, but a subtype is optional here, and an entry with only `org` is valid. Sharing the entry shape also lets one parser handle every list. The exception applies only to `otherRelationships`; existing `other<Plural>` maps are unchanged.
