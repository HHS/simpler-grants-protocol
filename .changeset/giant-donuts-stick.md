---
"@common-grants/core": minor
---

Adds apply routes and models

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
