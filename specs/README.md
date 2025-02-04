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

// Allows us to use models defined in the specification library
// without prefixing each model with `CommonGrants.Models.`
using CommonGrants.Models;

namespace CustomAPI.CustomModels;

// Define a custom field
model Agency extends CustomField {
    name: "Agency";
    type: CustomFieldType.string;

    @example("Department of Transportation")
    value: string;

    description: "The agency responsible for this opportunity";
}

// Extend the `OpportunityBase` model to create a new `CustomOpportunity` model
// that includes the new `Agency` field in its `customFields` property
model CustomOpportunity extends OpportunityBase {
    customFields: {
        agency: Agency;
    }
};
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
@route("/opportunities")
namespace CustomAPI.CustomRoutes {
    alias OpportunitiesRouter = Opportunities;

    // Use the default model for list but custom model for read
    op list is OpportunitiesRouter.list;
    op read is OpportunitiesRouter.read<CustomModels.CustomOpportunity>;
}
```

### Define an API service

Next, use these updated routes to define an API service:

```typespec
// main.tsp

import "@typespec/http";

import "./routes.tsp"; // Import the routes from above

using TypeSpec.Http;

@service({
    title: "Custom API",
})
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
emitters:
  - "@typespec/openapi3"
```

Both strategies will generate an OpenAPI specification in the `tsp-output/` directory.

### Further reading

- See the [TypeSpec documentation](https://typespec.org/docs/getting-started/overview) for more information on how to use TypeSpec.
- See the [CommonGrants docs](https://hhs.github.io/simpler-grants-protocol/) to learn more about the CommonGrants protocol.

## 💻 Contributing to the library

### Project structure

The `specs/` sub-directory is organized like this:

```
.
├── lib/                # Defines reusable models and routes for the library
│   ├── models/         # Defines base models like Opportunity, CustomField, etc.
│   ├── routes/         # Defines base routes like GET /opportunities
│   └── main.tsp        # Exposes models and routes from the root of the library
|
├── src/
│   ├── index.ts        # Defines the entry point for the library
│   └── lib.ts          # Creates a new TypeSpec library definition
|
├── dist/               # .gitignored directory that stores the output of `npm build`
|
├── package.json        # Manages dependencies, commands, and library metadata
├── tsconfig.json       # Manages TypeScript configuration
└── tspconfig.yaml      # Manages TypeSpec configuration
```

### Pre-requisites

Node version 20 or later. Check with `node --version`

### Commands

All commands are run from the root of the project, from a terminal:

| Command                | Action                                     |
| :--------------------- | :----------------------------------------- |
| `npm install`          | Installs dependencies                      |
| `npm run build`        | Build package locally                      |
| `npm pack`             | Create a tarball from the package          |
| `npm typespec`         | Compile and emit the library with TypeSpec |
| `npm run format`       | Run automatic formatting and fix issues    |
| `npm run lint`         | Run automatic linting and fix issues       |
| `npm run check:format` | Check formatting, fail if issues are found |
| `npm run check:lint`   | Check linting, fail if issues are found    |
