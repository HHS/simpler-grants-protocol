# @common-grants/core

## 0.2.3

### Patch Changes

- 72bd1ec: Updates dependencies

## 0.2.2

### Patch Changes

- 300e191: Fix bug in phone number validation logic

## 0.2.1

### Patch Changes

- e50db9c: Fix version decorators for OpenAPI spec.

  Decorates the routes, schemas, and properties that were added in v0.2.0 with the `@Versioning.added()` decorator. This ensures that those items are omitted from the v0.1.0 OpenAPI spec when it is generated from the TypeSpec project.

## 0.2.0

### Minor Changes

- 66b75a7: Adds apply routes and models

  Adds the following routes for to support apply:
  - Competitions
    - `GET /common-grants/competitions/{compId}` View competition details
  - Applications
    - `POST /common-grants/applications/start` Start an application
    - `GET /common-grants/applications/{appId}` View an application
    - `PUT /common-grants/applications/{appId}/forms/{formId}` Respond to a form
    - `GET /common-grants/applications/{appId}/forms/{formId}` View form responses
    - `PUT /common-grants/applications/{appId}/submit` Submit an application
  - Forms
    - `GET /common-grants/forms` List forms
    - `GET /common-grants/forms/{formId}` View form details

  Adds the following models used by the apply routes:
  - Application
    - `ApplicationBase`
    - `ApplicationStatus`
    - `ApplicationStatusOptions`
  - Form
    - `FormBase`
    - `FormJsonSchema`
    - `FormUISchema`
  - Form Response
    - `FormResponseBase`
    - `FormResponseStatus`
    - `FormResponseStatusOptions`
  - Competition
    - `CompetitionBase`
    - `CompetitionStatus`
    - `CompetitionStatusOptions`
    - `CompetitionForms`
    - `CompetitionTimeline`
  - Mappings
    - `MappingSchema`
    - `MappingFunction`
    - `MappingConstantFunction`
    - `MappingFieldFunction`
    - `MappingSwitchFunction`
  - Applicant Types
    - `ApplicantType`
    - `ApplicantTypeOptions`

## 0.1.1

### Patch Changes

- 81ab1fe: Updates TypeSpec package versions in dependencies

  **Note:** We are pinning `@typespec/json-schema` at v1.0.0 because v1.1.0 has a bug in it. See this [issue](https://github.com/microsoft/typespec/issues/7828) for more details.

## 0.1.0

### Minor Changes

- a94b159: Publish first `@common-grants/core` release
