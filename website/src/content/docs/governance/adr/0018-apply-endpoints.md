---
title: Apply endpoints
description: ADR documenting the decision to define two sets of endpoints for supporting third-party application submissions and form mapping + prefill
---

We want to allow grant platforms to accept third-party application submissions and enable applicants to re-use content across different application forms. This would reduce duplicate data entry for applicants and remove barriers for tools that aim to simplify the application process.

The endpoints we define to support this use case should promote standardization and interoperability across platforms, while granting funders flexibility over the structure and content of their applications.

## Decision

In order to balance flexibility with interoperability, we've decided to define two sets of endpoints:

1. A set of endpoints for submitting arbitrary form data and validating it against a platform-defined form schema.
2. A set of endpoints for mapping platform-defined form schemas to a common data model, which can be used to prefill forms or reuse data across applications.

### Examples

:::note

All of the following examples assume that the endpoints are prefixed with `/common-grants/`. The exact paths and methods may change upon implementation.

:::

#### Form submissions

For example this might include defining the following endpoints (or something similar) for third-party form submissions and applications support:

| Method | Path                                   | Summary                                       |
| :----- | :------------------------------------- | :-------------------------------------------- |
| `GET`  | `/opportunities/<oppId>/competitions`  | Get a list of competitions for an opportunity |
| `GET`  | `/competitions/<competitionId>`        | Get competition details, including forms      |
| `POST` | `/applications/start`                  | Start an application                          |
| `PUT`  | `/applications/<appId>/forms/<formId>` | Create or update a form response              |
| `GET`  | `/applications/<appId>/forms/<formId>` | Fetch a form response                         |
| `POST` | `/applications/<appId>/submit`         | Submit and validate an application            |

#### Form mapping + prefill

And the following set of endpoints (or something similar) for form mapping + prefill:

| Method | Path                                          | Summary                                                 |
| :----- | :-------------------------------------------- | :------------------------------------------------------ |
| `GET`  | `/forms/<formId>/mappings`                    | Get a list of supported mappings                        |
| `GET`  | `/forms/<formId>/mappings/<mappingId>`        | Get a mapping from one form to another schema           |
| `PUT`  | `/applications/<appId>/forms/<formId>/export` | Export a form response to another format with a mapping |
| `PUT`  | `/applications/<appId>/forms/<formId>/import` | Prefill a given form with external data using a mapping |

### Consequences

- **Positive consequences**
  - Allows platforms to customize their application forms while still enabling data exchange via common mappings.
  - Platforms can implement basic submission endpoints first, then layer in mapping and prefill as needed.
  - Changes to the CommonGrants data model only require updating mappings, not reworking every form schema.
  - Leaves room to define a default "common application" as one of the supported form schemas that other forms can map to and from, enabling reuse and simplification.
- **Negative consequences**
  - Keeping mappings accurate and up-to-date can become burdensome, especially at scale.
  - Mappings between incompatible form schemas may result in lossy or confusing translations.
  - Requires careful management to avoid leaking sensitive data or introducing mapping errors.
  - This approach alone doesn't solve the core need of being considered for multiple opportunities with a single application. That requires coordinated policy and review logic across platforms and funders.

### Criteria

- **Easy to adopt:** Platforms could support this mechanism for third-party application submissions without majorly changing their existing application process or codebase.
- **Provides flexibility:** Provides platforms with flexibility around how data is represented internally and provides funders with the ability to define custom fields or form questions.
- **Supports third-party form submission:** Standardizes how platforms support form submissions from third-parties, enabling grant seekers to apply for opportunities across platforms.
- **Standardizes application content:** Standardizes questions across application forms, reducing duplication of questions that are semantically equivalent but formatted differently.
- **Supports re-using content:** Enables applicants to automatically pre-populate or re-use information from previous applications or a central profile.

### Options considered

- Single common app endpoint
- Arbitrary form endpoints
- Question bank endpoints
- Profile import / export endpoints
- Form mapping / prefill endpoints

## Evaluation

### Side-by-side comparison

| Criteria                         | Common app | Arbitrary forms | Question bank | Profile import | Form mapping |
| :------------------------------- | ---------- | --------------- | ------------- | -------------- | ------------ |
| Easy to adopt and implement      | ❌         | 🟢              | ❌            | 🟡             | 🟢           |
| Provides platforms flexibility   | ❌         | 🟢              | 🟡            | 🟡             | 🟢           |
| Third-party form submission      | 🟢         | 🟢              | 🟡            | ❌             | 🟡           |
| Standardizes application content | 🟢         | ❌              | 🟢            | 🟡             | 🟡           |
| Supports re-using content        | 🟢         | ❌              | 🟢            | 🟡             | 🟢           |

### Option 1: Single common app

Define an apply endpoint (e.g. `POST /common-grants/opportunities/<id>/apply`) that expects a request payload that matches a single common application structure, with optional "custom questions". We might call this the JustFund approach because they are a Grant Management System that requires all participating funders to adopt the JustFund common application.

:::tip[Bottom line]

This approach only makes sense if we imagine multiple grant platforms (and their funders) agreeing to adopt a single application process, and that seems unlikely based on initial conversations.

:::

#### Pros and cons

- **Pros**
  - Makes the concept of a "common application" clearly defined.
  - Makes it extremely easy for grant seekers to apply to multiple opportunities, and do so across grant platforms.
- **Cons**
  - Very small likelihood of adoption. This approach was described by several stakeholders as the reason past standardization efforts failed.
  - Requires significant changes both to existing application processes.
  - Would likely inspire a lot of debate over which questions are in the common application.
  - Wouldn't meet the needs of most funders.

### Option 2: Arbitrary forms

Define a set of apply endpoints that support submitting responses to arbitrary forms. The request payload for these endpoints would likely consist of the ID for or a link to a form with a known JSON schema, and the response data for a form that matches this schema. Theoretically, one of the accepted forms could be a "common application" but the endpoints would be agnostic to the form being submitted.

:::tip[Bottom line]

This approach is best if we:

- Want to standardize how third-party application submissions are supported across platforms in the least opinionated way,
- And can compromise on standardizing or re-using the content across forms.

:::

#### Pros and cons

- **Pros**
  - Separates standardization of application endpoints from application content
  - Standardizes how applications can be submitted across platforms, without requiring funders to change their underlying applications.
  - Still allows us to promote a common application as one of the supported forms.
- **Cons**
  - Doesn't make any progress toward standardizing forms themselves.
  - Still requires existing grant platforms to change their workflow to support third-party form submissions.
  - Platforms may be resistant to accepting third-party submissions.

### Option 3: Question bank

Define a set of endpoints for writing data to and retrieving data from a central "question bank" that could be used to pre-populate forms when applicants are applying. Within this approach, the "common app" could be a default collection of questions selected from the question bank. We might call this the "PDC approach" because this is the direction the Philanthropy Data Commons has moved in after first attempting to define a single "common app".

:::tip[Bottom line]

This approach is best if:

- We wanted to maximize re-use of content across forms, while still enabling funders and platforms to create custom forms to meet their needs.
- And we think platforms will adopt a uniform "question bank" and agree to standardize how the answers to those questions are updated, stored, and mapped to forms internally.

:::

#### Pros and cons

- **Pros**
  - Balances the flexibility of platform-specific forms with content re-use across forms.
  - Promotes convergence on a common set of application questions.
  - Enables us to propose a "common application" while also mapping that content to questions shared by other forms.
- **Cons**
  - There's some ambiguity around what constitutes a "question" especially when question content is inherently hierarchical (e.g. is "organization address" vs. "organization street address line 1" and "organization zip code").
  - More opinionated about how form content is stored within a system and how questions are mapped to forms.
  - To provide value, platforms need to agree on the questions included in the "question bank".
  - Likely a higher lift to adopt than other options.
  - Doesn't explicitly define how cross-platform applications would work.
  - In-database mapping between questions and forms is less relevant with AI.

### Option 4: Profile import / export

Define a set of endpoints that enable third-party applications to export and import grant seeker profile data from one GMS to another in order to reduce data re-entry. Within this approach, we can frame the "common app" as a set of standard attributes on a common organizational profile. Functionally this might be pretty similar to the question bank approach except it establishes the "profile" as the base unit of information instead of individual "questions" and lets grant platforms define the relationship between that profile and individual forms.

:::tip[Bottom line]

This approach only makes sense if we mostly care about enabling applicants to import/export their profile data from/to another platform, and those platforms already use profile data to pre-populate applications.

:::

#### Pros and cons

- **Pros**
  - Enables grant applicants to quickly get set up in a new platform using existing data.
  - Provides platforms more flexibility around how data is internally represented than the question bank approach.
  - Standardizes how common attributes about an organization are represented and transported between platforms.
  - Easier to adopt than the common app or question bank approach.
- **Cons**
  - Doesn't simplify the apply workflow unless individual platforms are using an organization's profile to prefill applications.
  - Somewhat harder to adopt than the arbitrary forms or form mapping + prefill approach.
  - Most of the profile elements that are standard across platforms aren't that difficult to fill out, so this approach may not save grant seekers much time.
  - May run into the same challenges around agreeing on common profile attributes as the question bank approach does with questions.

### Option 5: Form mapping / prefill

Define an endpoint to retrieve a mapping from a given form to a common data model or another commonly used form, and then to use that mapping to pre-populate a form with external data. Functionally this is similar to the question bank approach except it establishes the "form" as the basic unit of information and defers the mapping to a serializable format instead of persisting relationships between questions and forms at the database level.

:::tip[Bottom line]

This approach is best if:

- We want to enable third-party applications to flexibly prefill forms with external data and simplify the process of translating that data between forms,
- And we can compromise on standardizing the form content itself.

:::

#### Pros and cons

- **Pros**
  - Balances flexibility around internal data representation with the ability to re-use application content.
  - Enables third-party applications to prefill forms with data that isn't stored in the platform.
  - Still uses a common data model to represent relationships between questions that are semantically equivalent.
  - Enables flexible translation between any two forms using the common data model or a third form as an intermediate representation.
- **Cons**
  - Could be challenging to maintain up-to-date mappings among forms and/or between forms and a standard data model.
  - Many form questions may not map onto other forms or will require complex transformations to do so.
  - May run into the same challenges around agreeing on standard mappings as the question bank approach does with common questions.
  - The overhead of maintaining official mappings may outweigh the benefits of automated transformations, especially with the advance of AI.
