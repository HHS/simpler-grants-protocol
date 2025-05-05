---
title: Schema mapping format
description: ADR documenting the choice to use a custom JSON mapping format for translating between platform-specific grant data formats and the CommonGrants standard.
---

We want to allow CommonGrants adopters to flexibly map existing data structures to the canonical models for opportunities, applications, etc. These mappings should be easy to read, write, and validate.

The long-term goal for these mappings is to both document the relationship between CommonGrants models and platform-specific data schemas, and to programmatically translate between the two at runtime.

## Decision

We plan to adopt a custom **JSON mapping** schema as the official format for publishing mappings between the CommonGrants model and platform-specific data representations.

This format will have its own JSON schema to validate the structure of the mapping, and will also support a set of built-in transformations that can be used to translate between the two formats.

The anticipated set of transformations includes:

- Type conversion (e.g. `string` to `number`)
- Value mapping (e.g. `posted` to `open`)
- String manipulation (e.g. `concat`, `split`, `replace`)
- Date and time manipulation (e.g. `format`, `parse`, `add`, `subtract`)

Future transformations we may add include:

- Conditional logic (e.g. `if (data.opportunity_status == "posted") { data.opportunity_title } else { data.opportunity_number }`)
- Array manipulation (e.g. `map`, `filter`, `reduce`)

For example, the following mapping:

```json
{
  "mappings": {
    "data": {
      "title": "data.opportunity_title",
      "funding": {
        "minAwardAmount": {
          "amount": {
            "numberToString": "data.summary.award_floor"
          },
          "currency": {
            "const": "USD"
          }
        },
        "maxAwardAmount": {
          "amount": {
            "numberToString": "data.summary.award_ceiling"
          },
          "currency": {
            "const": "USD"
          }
        }
      }
    }
  }
}
```

Would transform this platform-specific data:

```json
{
  "data": {
    "opportunity_title": "Research into conservation techniques",
    "summary": {
      "award_floor": "10000",
      "award_ceiling": "100000"
    }
  }
}
```

Into the following output format:

```json
{
  "data": {
    "title": "Research into conservation techniques",
    "funding": {
      "minAwardAmount": {
        "amount": "10000",
        "currency": "USD"
      },
      "maxAwardAmount": {
        "amount": "100000",
        "currency": "USD"
      }
    }
  }
}
```

### Example

Here's a more complex example of the proposed mapping format. The following examples also serve as the input and target output for each option below.

#### Platform-specific format

Let's assume that the platform currently returns information about opportunities in this format:

<details>
<summary>Platform-specific format</summary>

```json
{
  "data": {
    "agency_name": "Department of Examples",
    "opportunity_id": 12345,
    "opportunity_number": "ABC-123-XYZ-001",
    "opportunity_status": "posted",
    "opportunity_title": "Research into conservation techniques",
    "summary": {
      "applicant_types": ["state_governments"],
      "archive_date": "2025-05-01",
      "award_ceiling": 100000,
      "award_floor": 10000,
      "forecasted_award_date": "2025-09-01",
      "forecasted_close_date": "2025-07-15",
      "forecasted_post_date": "2025-05-01"
    }
  }
}
```

</details>

#### CommonGrants format

And we want to translate this data into the following format:

<details>
<summary>CommonGrants format</summary>

```json
{
  "data": {
    "id": "30a12e5e-5940-4c08-921c-17a8960fcf4b",
    "title": "Research into conservation techniques",
    "status": {
      "value": "open",
      "description": "The opportunity is currently accepting applications"
    },
    "funding": {
      "minAwardAmount": {
        "amount": "10000",
        "currency": "USD"
      },
      "maxAwardAmount": {
        "amount": "100000",
        "currency": "USD"
      }
    },
    "keyDates": {
      "appOpens": {
        "name": "Open Date",
        "date": "2025-05-01",
        "description": "Applications begin being accepted"
      },
      "appDeadline": {
        "name": "Application Deadline",
        "date": "2025-07-15",
        "description": "Final submission deadline for all grant applications"
      },
      "otherDates": {
        "forecastedAwardDate": {
          "name": "Forecasted award date",
          "date": "2025-09-01",
          "description": "When we expect to announce awards for this opportunity."
        }
      }
    },
    "customFields": {
      "legacyId": {
        "name": "Legacy ID",
        "type": "number",
        "value": 12345,
        "description": "Unique identifier in legacy database"
      },
      "agencyName": {
        "name": "Agency",
        "type": "string",
        "value": "Department of Examples",
        "description": "Agency hosting the opportunity"
      },
      "applicantTypes": {
        "name": "Applicant types",
        "type": "array",
        "value": ["state_governments"],
        "description": "Types of applicants eligible to apply"
      }
    }
  }
}
```

</details>

#### Mapping

<details>
<summary>Proposed mapping</summary>

```json
{
  "mappings": {
    "data": {
      "title": "data.opportunity_title",
      "status": {
        "value": {
          "match": {
            "field": "data.opportunity_status",
            "case": {
              "forecasted": "forecasted",
              "posted": "open",
              "archived": "closed"
            },
            "default": "custom"
          }
        },
        "description": {
          "const": "The opportunity is currently accepting applications"
        }
      },
      "funding": {
        "minAwardAmount": {
          "amount": {
            "numberToString": "data.summary.award_floor"
          },
          "currency": { "const": "USD" }
        },
        "maxAwardAmount": {
          "amount": {
            "numberToString": "data.summary.award_ceiling"
          },
          "currency": { "const": "USD" }
        }
      },
      "keyDates": {
        "appOpens": {
          "date": "data.summary.forecasted_post_date",
          "name": { "const": "Open Date" },
          "description": { "const": "Applications begin being accepted" }
        },
        "appDeadline": {
          "date": "data.summary.forecasted_close_date",
          "name": { "const": "Application Deadline" },
          "description": {
            "const": "Final submission deadline for all grant applications"
          }
        },
        "otherDates": {
          "forecastedAwardDate": {
            "date": "data.summary.forecasted_award_date",
            "name": { "const": "Forecasted award date" },
            "description": {
              "const": "When we expect to announce awards for this opportunity."
            }
          }
        }
      },
      "customFields": {
        "legacyId": {
          "value": "data.opportunity_id",
          "name": { "const": "Legacy ID" },
          "type": { "const": "number" },
          "description": { "const": "Unique identifier in legacy database" }
        },
        "agencyName": {
          "value": "data.agency_name",
          "name": { "const": "Agency" },
          "type": { "const": "string" },
          "description": { "const": "Agency hosting the opportunity" }
        },
        "applicantTypes": {
          "value": "data.summary.applicant_types",
          "name": { "const": "Applicant types" },
          "type": { "const": "array" },
          "description": { "const": "Types of applicants eligible to apply" }
        }
      }
    }
  }
}
```

</details>

### Consequences

- **Positive consequences**
  - Easy to read and write for both technical and non-technical users
  - JSON-based format makes it easy to serialize and deserialize between languages
  - Allows CommonGrants.org to display mappings across forms or data schemas in a registry-style UI
- **Negative consequences**
  - Less expressive than jq for executing complex transformations
  - Requires custom code to apply transformations in each new language or SDK
  - Adding support for new transformations would require updating the mapping format and each SDK

### Criteria

- **Human-readable:** The mapping format is relatively easy for humans to understand and generate.
- **Serializable:** The mapping format can be serialized and parsed into multiple formats (e.g. native data types in each language, JSON, YAML, string)
- **Easy to generate:** It's easy to generate a mapping either by hand, or programmatically given two JSON inputs.
- **Easy to validate:** It's easy to validate that a given mapping matches the expected format, and correctly maps to a given input or output schema.
- **Supports transformations:** The mapping format supports common transformations that will be applied to source data during the translation, e.g. concat, toUpperCase, etc.
- **Support for multiple runtimes:** The mapping can be defined once but used across multiple languages through existing libraries or SDKs.

### Options considered

- JSON mapping
- Declarative schema overlay (e.g., JSON Schema \+ annotations)
- JQ
- Custom DSL

## Evaluation

### Side-by-side comparison

| Criteria                      | JSON mapping | Schema overlay | JQ  | Custom DSL |
| :---------------------------- | :----------: | :------------: | :-: | :--------: |
| Human readable                |      ✅      |       🟡       | ✅  |     🟡     |
| Serializable                  |      ✅      |       ✅       | ❌  |     ❌     |
| Easy to generate              |      ✅      |       ✅       | ✅  |     🟡     |
| Easy to validate              |      ✅      |       🟡       | ❌  |     ❌     |
| Supports transformations      |      🟡      |       🟡       | ✅  |     🟡     |
| Support for multiple runtimes |      🟡      |       🟡       | ✅  |     ❌     |

### Option 1: JSON Mapping

Custom mapping format written in JSON (or YAML) with keywords reserved for common transformation functions, such as "concat", "match", "toUppercase", "toLowerCase", etc.

:::note[Bottom line]

JSON mapping is best if:

- we want a readable mapping format that is easily generated, validated, and serialized,
- but we're willing to sacrifice the expressiveness and transformation capabilities that jq provides by default.

:::

#### Example

<details>
<summary>JSON mapping example</summary>

```json
{
  "mappings": {
    "data": {
      "title": "data.opportunity_title",
      "status": {
        "value": {
          "match": {
            "field": "data.opportunity_status",
            "case": {
              "forecasted": "forecasted",
              "posted": "open",
              "archived": "closed"
            },
            "default": "custom"
          }
        },
        "description": {
          "const": "The opportunity is currently accepting applications"
        }
      },
      "funding": {
        "minAwardAmount": {
          "amount": {
            "numberToString": "data.summary.award_floor"
          },
          "currency": { "const": "USD" }
        },
        "maxAwardAmount": {
          "amount": {
            "numberToString": "data.summary.award_ceiling"
          },
          "currency": { "const": "USD" }
        }
      },
      "keyDates": {
        "appOpens": {
          "date": "data.summary.forecasted_post_date",
          "name": { "const": "Open Date" },
          "description": { "const": "Applications begin being accepted" }
        },
        "appDeadline": {
          "date": "data.summary.forecasted_close_date",
          "name": { "const": "Application Deadline" },
          "description": {
            "const": "Final submission deadline for all grant applications"
          }
        },
        "otherDates": {
          "forecastedAwardDate": {
            "date": "data.summary.forecasted_award_date",
            "name": { "const": "Forecasted award date" },
            "description": {
              "const": "When we expect to announce awards for this opportunity."
            }
          }
        }
      },
      "customFields": {
        "legacyId": {
          "value": "data.opportunity_id",
          "name": { "const": "Legacy ID" },
          "type": { "const": "number" },
          "description": { "const": "Unique identifier in legacy database" }
        },
        "agencyName": {
          "value": "data.agency_name",
          "name": { "const": "Agency" },
          "type": { "const": "string" },
          "description": { "const": "Agency hosting the opportunity" }
        },
        "applicantTypes": {
          "value": "data.summary.applicant_types",
          "name": { "const": "Applicant types" },
          "type": { "const": "array" },
          "description": { "const": "Types of applicants eligible to apply" }
        }
      }
    }
  }
}
```

</details>

#### Pros and cons

- **Pros**
  - Relatively simple structure that is easy to read and diff
  - Can be easily validated with a JSON Schema
  - Serializes to multiple formats (JSON, YAML, string) and deserializes to native data types (e.g. python dict, javascript object, etc.)
- **Cons**
  - Requires a custom runtime to apply transformations in each new language or SDK
  - Less expressive and offers less support for custom transformations than jq

### Option 2: Schema Overlay

Overlay the JSON schema for the output data with custom annotations (e.g. `x-map-from`) that supports simple mapping and transformation logic.

:::note[Bottom line]

Schema overlay is best if:

- we want to co-locate mapping logic with output data validation,
- but we're less concerned with readability and validation of the mapping itself

:::

#### Example

<details>
<summary>Schema overlay example</summary>

```json
{
  "type": "object",
  "properties": {
    "data": {
      "type": "object",
      "properties": {
        "title": {
          "type": "string",
          "x-map-from": "data.opportunity_title"
        },
        "status": {
          "type": "object",
          "properties": {
            "value": {
              "type": "string",
              "x-map-from": {
                "field": "data.opportunity_status",
                "case": {
                  "forecasted": "forecasted",
                  "posted": "open",
                  "archived": "closed"
                },
                "default": "custom"
              }
            },
            "description": {
              "type": "string",
              "x-map-from": {
                "const": "The opportunity is currently accepting applications"
              }
            }
          }
        },
        "funding": {
          "type": "object",
          "properties": {
            "minAwardAmount": {
              "type": "object",
              "properties": {
                "amount": {
                  "type": "string",
                  "x-map-from": "data.summary.award_floor"
                },
                "currency": {
                  "type": "string",
                  "const": "USD"
                }
              }
            },
            "maxAwardAmount": {
              "type": "object",
              "properties": {
                "amount": {
                  "type": "string",
                  "x-map-from": "data.summary.award_ceiling"
                },
                "currency": {
                  "type": "string",
                  "const": "USD"
                }
              }
            }
          }
        },
        "keyDates": {
          "type": "object",
          "properties": {
            "appOpens": {
              "type": "object",
              "properties": {
                "date": {
                  "type": "string",
                  "x-map-from": "data.summary.forecasted_post_date"
                },
                "name": {
                  "type": "string",
                  "const": "Open Date"
                },
                "description": {
                  "type": "string",
                  "const": "Applications begin being accepted"
                }
              }
            },
            "appDeadline": {
              "type": "object",
              "properties": {
                "date": {
                  "type": "string",
                  "x-map-from": "data.summary.forecasted_close_date"
                },
                "name": {
                  "type": "string",
                  "const": "Application Deadline"
                },
                "description": {
                  "type": "string",
                  "const": "Final submission deadline for all grant applications"
                }
              }
            },
            "otherDates": {
              "type": "object",
              "properties": {
                "forecastedAwardDate": {
                  "type": "object",
                  "properties": {
                    "date": {
                      "type": "string",
                      "x-map-from": "data.summary.forecasted_award_date"
                    },
                    "name": {
                      "type": "string",
                      "const": "Forecasted award date"
                    },
                    "description": {
                      "type": "string",
                      "const": "When we expect to announce awards for this opportunity."
                    }
                  }
                }
              }
            }
          }
        },
        "customFields": {
          "type": "object",
          "properties": {
            "legacyId": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "number",
                  "x-map-from": "data.opportunity_id"
                },
                "name": {
                  "type": "string",
                  "const": "Legacy ID"
                },
                "type": {
                  "type": "string",
                  "const": "number"
                },
                "description": {
                  "type": "string",
                  "const": "Unique identifier in legacy database"
                }
              }
            },
            "agencyName": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "string",
                  "x-map-from": "data.agency_name"
                },
                "name": {
                  "type": "string",
                  "const": "Agency"
                },
                "type": {
                  "type": "string",
                  "const": "string"
                },
                "description": {
                  "type": "string",
                  "const": "Agency hosting the opportunity"
                }
              }
            },
            "applicantTypes": {
              "type": "object",
              "properties": {
                "value": {
                  "type": "array",
                  "x-map-from": "data.summary.applicant_types"
                },
                "name": {
                  "type": "string",
                  "const": "Applicant types"
                },
                "type": {
                  "type": "string",
                  "const": "array"
                },
                "description": {
                  "type": "string",
                  "const": "Types of applicants eligible to apply"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

</details>

#### Pros and cons

- **Pros**
  - Co-locates mapping with the schema for the transformation output
  - Potential for integration with TypeSpec and other JSON schema tools
  - Serializes to multiple formats (JSON, YAML, string) and deserializes to native data types (e.g. python dict, javascript object, etc.)
- **Cons**
  - Requires a custom runtime to apply transformations in each new language or SDK
  - Less expressive and offers less support for custom transformations than jq
  - More verbose and harder to read than a custom JSON mapping format or a DSL
  - Harder to validate the mapping itself if we're using custom annotations

### Option 3: JQ

Adopt jq as the official mapping format and provide a jq wrapper that injects custom functions for common transformation tasks, like type conversion, lookups, etc. at runtime.

:::note[Bottom line]

JQ is best if:

- we want powerful, executable mapping logic with existing support in many languages,
- but we're willing to compromise on the ability to serialize and validate the mapping itself.

:::

#### Example

<details>
<summary>JQ example</summary>

```
{
  data: {
    title: .data.opportunity_title,
    status: {
      value: (
         { "posted": "open", "forecasted": "forecasted", "archived": "" }
         [.data.opportunity_status] // "custom"
      ),
      description: "The opportunity is currently accepting applications"
    },
    funding: {
      minAwardAmount: {
        amount: (.data.summary.award_floor | tostring),
        currency: "USD"
      },
      maxAwardAmount: {
        amount: (.data.summary.award_ceiling | tostring),
        currency: "USD"
      }
    },
    keyDates: {
      appOpens: {
        name: "Open Date",
        date: .data.summary.forecasted_post_date,
        description: "Applications begin being accepted"
      },
      appDeadline: {
        name: "Application Deadline",
        date: .data.summary.forecasted_close_date,
        description: "Final submission deadline for all grant applications"
      },
      otherDates: {
        forecastedAwardDate: {
          name: "Forecasted award date",
          date: .data.summary.forecasted_award_date,
          description: "When we expect to announce awards for this opportunity."
        }
      }
    },
    customFields: {
      legacyId: {
        name: "Legacy ID",
        type: "number",
        value: .data.opportunity_id,
        description: "Unique identifier in legacy database"
      },
      agencyName: {
        name: "Agency",
        type: "string",
        value: .data.agency_name,
        description: "Agency hosting the opportunity"
      },
      applicantTypes: {
        name: "Applicant types",
        type: "array",
        value: .data.summary.applicant_types,
        description: "Types of applicants eligible to apply"
      }
    }
  }
}
```

</details>

#### Pros and cons

- **Pros**
  - Very expressive, supports filters, conditionals, transformation logic
  - Most languages have existing support for the jq runtime
  - More succinct than JSON-based formats
- **Cons**
  - Doesn't easily serialize to formats other than string or plain text
  - Better suited for executing transformations than documenting field mappings
  - The flexibility of jq makes it harder to standardize across mappings

### Option 4: Custom DSL

:::note[Bottom line]

A custom DSL is only worth pursuing if existing formats can't express our needs and we are ready to invest in language design

:::

#### Example

<details>
<summary>Custom DSL example</summary>

```
map data.title from data.opportunity_title
map data.status.value = mapValue(data.opportunity_status, { posted: "open" })
map data.status.description = "The opportunity is currently accepting applications"
map data.funding.minAwardAmount.amount from data.summary.award_floor
map data.funding.maxAwardAmount.amount from data.summary.award_ceiling
map data.keyDates.appOpens.date from data.summary.forecasted_post_date
map data.keyDates.appDeadline.date from data.summary.forecasted_close_date
map data.keyDates.otherDates.forecastedAwardDate.date from data.summary.forecasted_award_date
map data.customFields.legacyId.value from data.opportunity_id
map data.customFields.agencyName.value from data.agency_name
map data.customFields.applicantTypes.value from data.summary.applicant_types
```

</details>

#### Pros and cons

- **Pros**
  - Tailored to our needs
  - Can be designed for domain experts
- **Cons**
  - High cost to design, build, document, and maintain
  - Hard to integrate with existing tools
  - Wouldn't be easy to serialize or validate
