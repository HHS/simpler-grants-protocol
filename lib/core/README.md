# CommonGrants core library

Code for the CommonGrants core specification library, written in TypeSpec. This library is designed to be imported and extended by individual implementations of the CommonGrants protocol.

## 🚀 Quickstart

### Install the library

```bash
npm install @common-grants/core
```

### Project setup

A basic project structure that uses the library might look like this:

```
.
├── models.tsp      # Extends @common-grants/core models with custom fields
├── routes.tsp      # Overrides @common-grants/core routes to use the custom models
├── main.tsp        # Defines an API service that uses the custom models and routes
|
├── tsp-output/     # Directory that stores the output of `tsp compile`, often .gitignored
|
├── package.json    # Manages dependencies, commands, and library metadata
└── tspconfig.yaml  # Manages TypeSpec configuration, including emitters
```

### Define custom fields

The Opportunity model is templated to support custom fields. First define your custom fields by extending the `CustomField` model:

```typespec
// models.tsp

import "@common-grants/core"; // Import the base specification library
import "@typespec/versioning";

// Allows us to use models and fields defined in the core library without
// prefixing each item with `CommonGrants.Models` or `CommonGrants.Fields`
using CommonGrants.Models;
using CommonGrants.Fields;

@Versioning.useDependency(CommonGrants.Versions.v0_2) // Specify the version of the core library to use
namespace CustomAPI.CustomModels;

// Define a custom field
model ProgramArea extends CustomField {
  name: "programArea";
  fieldType: CustomFieldType.string;

  @example("Healthcare Innovation")
  value: string;

  description: "Primary focus area of the grant program";
}

// Extend the `OpportunityBase` model to create a new `CustomOpportunity` model
// that includes the new `ProgramArea` field in its `customFields` property
model CustomOpportunity extends OpportunityBase {
  customFields: {
    programArea: ProgramArea;
  };
}
```

### Override default routes

The router interfaces are templated to support your custom models. Override them like this:

```typespec
// routes.tsp

import "@common-grants/core";
import "./models.tsp"; // Import the custom field and model from above

using CommonGrants.Routes;
using TypeSpec.Http;

@tag("Search")
@route("/common-grants/opportunities")
@Versioning.useDependency(CommonGrants.Versions.v0_2)
namespace CustomAPI.CustomRoutes {
  alias OpportunitiesRouter = Opportunities;

  // Use the default model for list but custom model for read and search
  op list is OpportunitiesRouter.list;
  op read is OpportunitiesRouter.read<CustomModels.CustomOpportunity>;
  op search is OpportunitiesRouter.search<CustomModels.CustomOpportunity>;
}
```

### Define an API service

Next, use these updated routes to define an API service:

```typespec
// main.tsp

import "@typespec/http";

import "./routes.tsp"; // Import the routes from above

using TypeSpec.Http;

/** Description of your API goes here */
@service(#{ title: "Custom API" })
namespace CustomAPI;
```

### Generate the OpenAPI spec

Generate an OpenAPI specification from your `main.tsp` file using either the CLI:

```bash
npx tsp compile main.tsp --emit "@typespec/openapi3"
```

Or specify the emitter in `tspconfig.yaml`:

```yaml
# tspconfig.yaml
emit:
  - "@typespec/openapi3"
```

And run the following command:

```bash
npx tsp compile main.tsp
```

Both strategies will generate an OpenAPI specification in the `tsp-output/` directory.

### Further reading

- See the [TypeSpec documentation](https://typespec.org/docs/getting-started/overview) for more information on how to use TypeSpec.
- See the [CommonGrants docs](https://hhs.github.io/simpler-grants-protocol/) to learn more about the CommonGrants protocol.
- See the [CommonGrants CLI](https://www.npmjs.com/package/@common-grants/cli) for more developer tools related to the CommonGrants protocol.
