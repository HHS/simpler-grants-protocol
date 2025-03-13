---
title: Overview
description: Overview of the `CommonGrants.Models` namespace.
sidebar:
  order: 0
---

The `CommonGrants.Models` namespace contains a standard models that are used by CommonGrants API routes.

## Models

Learn more about the standard models defined by the CommonGrants protocol:

### Opportunity Models

| Model                                                                | Description                                            |
| -------------------------------------------------------------------- | ------------------------------------------------------ |
| [OpportunityBase](/protocol/models/opp-base) | Base model for a funding opportunity                   |
| [OppStatus](/protocol/models/opp-status)     | Status of an opportunity                               |
| [OppTimeline](/protocol/models/opp-timeline) | Key dates in the opportunity's timeline                |
| [OppFunding](/protocol/models/opp-funding)   | Details about the funding available for an opportunity |

## Usage

The most common use for the `CommonGrants.Models` namespace is extending the `OpportunityBase` model with a set of custom fields. The quickstart has a more in depth tutorial, but here's a quick example of how you can add support for custom fields:

```typespec
import "@common-grants/core"

// Exposes the `Fields` and `Models` namespaces so that they can be accessed
// without a `CommonGrants` prefix
using CommonGrants;

model Agency extends Fields.CustomField {
  name: "Agency";
  type: Fields.CustomFieldType.string;
  value: string;
  description: "The agency managing the funding opportunity.";
}

// Create a custom Opportunity type using the template
model CustomOpportunity extends Models.OpportunityBase {
  @example(#{
    agency: #{
      name: "Agency",
      type: Fields.CustomFieldType.string,
      value: "Department of Energy",
      description: "The agency managing the funding opportunity.",
    },
  })
  customFields: {
    agency: Agency;
  };
}
```
