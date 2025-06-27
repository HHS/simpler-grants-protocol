## Validation scenarios

### Check Routes

- **Case 1:** Extra routes
  - **Case 1.1:** [Impl prefixed with `/common-grants/`](#route-case-11-extra-route-with-prefix) -> Error
  - **Case 1.2:** [Not prefixed with `/common-grants/`](#route-case-12-extra-route-without-prefix) -> Ignore
- **Case 2:** Missing routes
  - **Case 2.1:** [Required in base spec](#route-case-21-missing-required-route) -> Error
  - **Case 2.2:** [Optional in base spec](#route-case-22-missing-optional-route) -> Warning
- **Case 3:** Matching routes
  - Check query params -> [Check query params](#check-query-params)
  - Check request body -> [Check mime types](#check-mime-types)
  - Check response body -> [Check status codes](#check-status-codes)

### Check query params

- **Case 1:** [Extra params](#query-param-case-1-extra-param) -> Warn
- **Case 2:** Missing params
  - **Case 2.1:** [Required in base spec](#query-param-case-21-missing-required-param) -> Error
  - **Case 2.2:** [Optional in base spec](#query-param-case-21-missing-optional-param) -> Warning
- **Param case 3:** Matching params -> [Check schemas](#check-schemas)

### Check status codes

If the routes match, check whether the status codes are compatible between the base and implementation specs.

- **Case 1:** [Extra status codes](#status-code-case-1-extra-status-code) -> Ignore
- **Case 2:** [Missing status codes](#status-code-case-2-missing-status-code) -> Error
- **Case 3:** Matching status codes -> [Check mime types](#check-mime-types)

### Check mime types

- **Case 1:** [Extra mime types](#mimetype-case-1-extra-mime-type) -> Ignore
- **Case 2:** [Missing mime types](#mimetype-case-2-missing-mime-type) -> Error
- **Case 3:** Matching mime types -> [Check schemas](#check-schemas)

### Check schemas

- **Case 1:** Extra props
  - **Case 1.1:** [Additional props allowed](#schema-case-11-additional-props-allowed) -> Ignore
  - **Case 1.2:** [Additional props not allowed](#schema-case-12-additional-props-not-allowed) -> Error
  - **Case 1.3:** [Additional props follow schema](#schema-case-13-additional-props-conforms-to-schema) -> Check schemas (recursive)
- **Case 2:** Missing props
  - **Case 2.1:** [Required in base spec](#schema-case-21-missing-required-prop) -> Error
  - **Case 2.2:** [Optional in base spec](#schema-case-22-missing-optional-prop) -> Warn
- **Case 3:** Matching props
  - Check type -> [Check types](#type-case-1-base-type-not-specified)
  - Check enum -> [Check enums](#check-enums)
  - Check required status -> [Check required status](#check-required-status)

### Check types

- **Case 1:** [Base type not specified](#type-case-1-base-type-not-specified) -> Ignore
- **Case 2:** [Type mismatch](#type-case-2-type-mismatch) -> Error
- **Case 3:** [Simple type matches](#type-case-3-simple-type-matches) -> Ignore
- **Case 4:** [Complex type](#type-case-4-complex-type) -> Check schemas (recursive)

### Check enums

- **Case 1:** [Enums match](#enum-case-1-enums-match) -> Ignore
- **Case 2:** [Base type has extra](#enum-case-2-base-type-has-extra) -> Ignore
- **Case 3:** [Implementation has extra](#enum-case-3-implementation-has-extra) -> Error

### Check required status

- **Case 1:** [Required status matches](#required-status-case-1-required-status-matches) -> Ignore
- **Case 2:** [Made required](#required-status-case-2-made-required) -> Warn
- **Case 3:** [Made optional](#required-status-case-3-made-optional) -> Error

## Example scenarios

### Route checking cases

#### Route case 1.1: Extra route with prefix

- **Scenario:** An extra route is found in the implementation spec and it is prefixed with `/common-grants/`.
- **Outcome:** Error
- **Reason:** The route is prefixed with `/common-grants/`, but it doesn't exist in the base spec. Implementation-specific routes share the same path prefix as CommonGrants routes.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
  /common-grants/extra: # extra route prefixed with /common-grants/, will error
    get:
      responses:
        "200":
          description: OK
```

</details>

#### Route case 1.2: Extra route without prefix

- **Scenario:** An extra route is found in the implementation spec and it is not prefixed with `/common-grants/`.
- **Outcome:** Ignore
- **Reason:** The route is NOT prefixed with `/common-grants/`, so it an implementation-specific route that doesn't conflict with CommonGrants routes.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
  /extra: # extra route not prefixed with /common-grants/, ignored
    get:
      responses:
        "200":
          description: OK
```

</details>

#### Route case 2.1: Missing required route

- **Scenario:** A required route is missing in the implementation spec.
- **Outcome:** Error
- **Reason:** The route is required in the base spec, so it must be present in the implementation spec.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      tags: ["required"]
      responses:
        "200":
          description: OK
    post:
      tags: ["optional"]
      responses:
        "201":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test: # missing required GET /common-grants/test, will error
    post:
      responses:
        "201":
          description: OK
```

</details>

#### Route case 2.2: Missing optional route

- **Scenario:** An optional route is missing in the implementation spec.
- **Outcome:** Warning
- **Reason:** The route is optional in the base spec, so it is not required to be present in the implementation spec, but we'll raise a warning so implementers can be aware of it.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      tags: ["required"]
      responses:
        "200":
          description: OK
    post:
      tags: ["optional"]
      responses:
        "201":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths: # missing optional POST /common-grants/test, will warn
  /common-grants/test:
    get:
      tags: ["required"]
      responses:
        "200":
          description: OK
```

</details>

### Query param checking cases

#### Query param case 1: Extra param

- **Scenario:** An extra query parameter is found in the implementation spec that is not present in the base spec.
- **Outcome:** Warning
- **Reason:** Additional query parameters are allowed but should be documented.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      parameters:
        - name: required_param
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      parameters:
        - name: required_param
          in: query
          required: true
          schema:
            type: string
        - name: extra_param # extra parameter, will warn
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: OK
```

</details>

#### Query param case 2.1: Missing required param

- **Scenario:** A required query parameter from the base spec is missing in the implementation spec.
- **Outcome:** Error
- **Reason:** Required parameters must be implemented.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      parameters:
        - name: required_param
          in: query
          required: true
          schema:
            type: string
      responses:
        "200":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      parameters: [] # missing required parameter, will error
      responses:
        "200":
          description: OK
```

</details>

#### Query param case 2.2: Missing optional param

- **Scenario:** An optional query parameter from the base spec is missing in the implementation spec.
- **Outcome:** Warning
- **Reason:** Optional parameters should be implemented but their absence is not critical.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      parameters:
        - name: optional_param
          in: query
          required: false
          schema:
            type: string
      responses:
        "200":
          description: OK
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      parameters: [] # missing optional parameter, will warn
      responses:
        "200":
          description: OK
```

</details>

### Status code checking cases

#### Status code case 1: Extra status code

- **Scenario:** The implementation spec includes additional status codes not present in the base spec.
- **Outcome:** Ignore
- **Reason:** Implementations are allowed to define additional status codes.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
        "400":
          description: Bad Request
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
        "400":
          description: Bad Request
        "401": # extra status code, will be ignored
          description: Unauthorized
        "403": # extra status code, will be ignored
          description: Forbidden
```

</details>

#### Status code case 2: Missing status code

- **Scenario:** The implementation spec is missing status codes that are present in the base spec.
- **Outcome:** Error
- **Reason:** All status codes from the base spec must be implemented to ensure consistent error handling.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
        "400":
          description: Bad Request
        "404":
          description: Not Found
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
        "400":
          description: Bad Request
        # missing 404 status code, will error
```

</details>

### Mimetype checking cases

#### Mimetype case 1: Extra mimetype

- **Scenario:** The implementation spec supports additional MIME types not present in the base spec.
- **Outcome:** Ignore
- **Reason:** Implementations are allowed to define additional MIME types.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
            application/xml: # extra MIME type, will be ignored
              schema:
                type: object
```

</details>

#### Mimetype case 2: Mimetype missing

- **Scenario:** The implementation spec is missing MIME types that are present in the base spec.
- **Outcome:** Error
- **Reason:** All MIME types from the base spec must be supported to ensure consistent content negotiation.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
            application/xml:
              schema:
                type: object
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
            # missing application/xml MIME type, will error
```

</details>

### Schema checking cases

#### Schema case 1.1: Additional props allowed

- **Scenario:** The implementation spec includes additional properties in a schema where `additionalProperties` is `true` in the base spec or is the `additionalProperties` key is omitted.
- **Outcome:** Ignore
- **Reason:** Additional properties are either explicitly allowed by the base spec (i.e. `additionalProperties: true`) or are allowed by default if the base spec doesn't specify `additionalProperties`.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                additionalProperties: true
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  extra_prop: # additional property, allowed
                    type: string
                additionalProperties: true
```

</details>

#### Schema case 1.2: Additional props not allowed

- **Scenario:** The implementation spec includes additional properties in a schema where additionalProperties is false in the base spec.
- **Outcome:** Error
- **Reason:** Additional properties are explicitly forbidden by the base spec.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                additionalProperties: false
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  extra_prop: # additional property, not allowed
                    type: string
                additionalProperties: false
```

</details>

#### Schema case 1.3: Additional props conforms to schema

- **Scenario:** The implementation spec includes additional properties that conform to a schema defined in additionalProperties in the base spec.
- **Outcome:** Check schemas recursively
- **Reason:** Additional properties must conform to the schema defined in the base spec.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                additionalProperties:
                  type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  extra_prop: # additional property, must be string
                    type: string
                additionalProperties:
                  type: string
```

</details>

#### Schema case 2.1: Missing required prop

- **Scenario:** The implementation spec is missing a required property from the base spec.
- **Outcome:** Error
- **Reason:** Required properties must be implemented.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                required:
                  - name
                properties:
                  name:
                    type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  # missing required 'name' property, will error
```

</details>

#### Schema case 2.2: Missing optional prop

- **Scenario:** The implementation spec is missing an optional property from the base spec.
- **Outcome:** Warning
- **Reason:** Optional properties should be implemented but their absence is not critical.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  description: # optional property
                    type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
                  # missing optional 'description' property, will warn
```

</details>

### Type checking cases

#### Type case 1: Base type not specified

- **Scenario:** The base spec does not specify a type for a property.
- **Outcome:** Ignore
- **Reason:** Without a base type, we cannot validate the implementation type.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name: {} # no type specified
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string # type specified, but base has no type
```

</details>

#### Type case 2: Type mismatch

- **Scenario:** The implementation spec has a different type than the base spec.
- **Outcome:** Error
- **Reason:** Types must match between base and implementation specs.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  count:
                    type: integer
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  count:
                    type: string # type mismatch, will error
```

</details>

#### Type case 3: Simple type matches

- **Scenario:** The implementation spec has the same simple type as the base spec.
- **Outcome:** Ignore
- **Reason:** Simple types match exactly.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string # type matches exactly
```

</details>

#### Type case 4: Complex type

- **Scenario:** The implementation spec has a complex type (object or array) that matches the base spec.
- **Outcome:** Check schemas recursively
- **Reason:** Complex types need to be validated recursively.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    type: object
                    properties:
                      name:
                        type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  user:
                    type: object # complex type, will check recursively
                    properties:
                      name:
                        type: string
```

</details>

### Enum checking cases

#### Enum case 1: Enums match

- **Scenario:** The implementation spec has the same enum values as the base spec.
- **Outcome:** Ignore
- **Reason:** Enum values match exactly.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - active
                      - inactive
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - active
                      - inactive # enum values match exactly
```

</details>

#### Enum case 2: Base type has extra

- **Scenario:** The base spec has more enum values than the implementation spec.
- **Outcome:** Ignore
- **Reason:** The implementation can support a subset of the base spec's enum values because a valid JSON input for the implementation spec would still be valid for the base spec.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - active
                      - inactive
                      - pending
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - active
                      - inactive # subset of base enum values
```

</details>

#### Enum case 3: Implementation has extra

- **Scenario:** The implementation spec has more enum values than the base spec.
- **Outcome:** Error
- **Reason:** The implementation cannot add enum values not present in the base spec because a valid JSON input for the implementation spec would not be valid for the base spec.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - active
                      - inactive
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  status:
                    type: string
                    enum:
                      - active
                      - inactive
                      - pending # extra enum value, will error
```

</details>

### Required status checking cases

#### Required status case 1: Required status matches

- **Scenario:** The implementation spec has the same required status as the base spec.
- **Outcome:** Ignore
- **Reason:** Required status matches exactly.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                required:
                  - name
                properties:
                  name:
                    type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                required:
                  - name # required status matches
                properties:
                  name:
                    type: string
```

</details>

#### Required status case 2: Made required

- **Scenario:** The implementation spec makes a property required that was optional in the base spec.
- **Outcome:** Warning
- **Reason:** Implementations can make optional properties required because a valid JSON input for the implementation spec would still be valid for the base spec. But we'll warn because removing those optional properties from the base spec would break compatibility.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                properties:
                  name:
                    type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                required:
                  - name # made required, will warn
                properties:
                  name:
                    type: string
```

</details>

#### Required status case 3: Made optional

- **Scenario:** The implementation spec makes a property optional that was required in the base spec.
- **Outcome:** Error
- **Reason:** Making a required property optional means that a valid JSON input for the implementation spec (i.e. without that property) would not be valid for the base spec.

<details>
<summary>Base spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Base spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                required:
                  - name
                properties:
                  name:
                    type: string
```

</details>

<details>
<summary>Implementation spec example</summary>

```yaml
openapi: 3.0.0
info:
  title: Implementation spec
  version: 1.0.0
paths:
  /common-grants/test:
    get:
      responses:
        "200":
          description: OK
          content:
            application/json:
              schema:
                type: object
                # missing required array, will error
                properties:
                  name:
                    type: string
```

</details>
