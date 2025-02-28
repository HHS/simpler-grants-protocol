---
title: Overview
description: Overview of the `CommonGrants.Fields` namespace.
sidebar:
  order: 0
---

The `CommonGrants.Fields` namespace contains a standard set of fields that are used to build more complex models.

## Fields

Learn more about the standard fields defined by the CommonGrants protocol:

| Field                                                                | Description                                       |
| -------------------------------------------------------------------- | ------------------------------------------------- |
| [Money](/simpler-grants-protocol/protocol/fields/money)              | A monetary amount with a currency code            |
| [Event](/simpler-grants-protocol/protocol/fields/event)              | A description of an event with an associated date |
| [CustomField](/simpler-grants-protocol/protocol/fields/custom-field) | A model for defining custom fields on a record    |
| [SystemMetadata](/simpler-grants-protocol/protocol/fields/metadata)  | System-managed metadata for records               |

## Usage

You can use the fields listed above (along with basic [data types](/simpler-grants-protocol/protocol/types/)) above to define custom models in your TypeSpec project.

```typespec
import "@common-grants/core"

// Exposes the `Fields` and `Types` namespaces so that they can be accessed
// without a `CommonGrants` prefix
using CommonGrants;

model Widget {
  id: Types.uuid; // CommonGrants-defined type
  description: string; // Standard TypeSpec type
  price: Fields.Money; // CommonGrants-defined field
}
```
