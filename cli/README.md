# CommonGrants CLI

The CommonGrants CLI is a tool for working with the CommonGrants protocol. It's designed to simplify the process of defining, implementing, and validating CommonGrants APIs.

## Initializing a project

### User story

As a developer implementing the CommonGrants protocol from scratch, I want to run a command that quickly sets up a new API, custom fields library, or other CommonGrants package, so that I don't have to spend a lot of time creating boilerplate code.

### Developer experience

Simplest use case: Developer runs `cg init` and is prompted to select from a list of templates.

```bash
cg init
```

#### Additional Features
- Pass a `--template` flag to create a project using a predefined CommonGrants template.
- Use `--dir` to specify a target directory for the generated project.
- Run `cg init --list` to display available templates without starting initialization.

#### Example Usage
```bash
# Initialize a new project interactively
cg init

# Initialize a new project using a specific template
cg init --template grants-api

# Initialize a new project in a custom directory
cg init --template grants-api --dir ./my-grants-project

# List available templates before choosing one
cg init --list
```

### Technical details
- If the user doesn't pass a `--template` flag to the command, it should prompt users with a list of optional templates.
- This command should be a thin wrapper for the `tsp init` function so that users can also pass paths or URLs to valid TypeSpec templates to create their own templates.

---

## Previewing an OpenAPI spec

### User story

As a developer working on a CommonGrants API, I want to preview my OpenAPI specification using Swagger or Redocly, so that I can quickly inspect my API documentation.

### Developer experience

Simplest use case: Preview an OpenAPI spec in Swagger UI.

```bash
cg preview spec <path-to-typespec>
```

#### Additional Features
- Allow choosing a preview tool (`--ui swagger` or `--ui redocly`).
- Open a local preview server for interactive exploration.

#### Example Usage
```bash
# Preview an OpenAPI spec with Swagger UI
cg preview spec grants-api.tsp --ui swagger

# Preview an OpenAPI spec with Redocly
cg preview spec grants-api.tsp --ui redocly
```

### Technical details
- The command should generate an OpenAPI spec from the TypeSpec project and serve it using Swagger UI or Redocly.
- Defaults to Swagger UI if no `--ui` option is specified.

---

## Adding a custom field

### User story

As a developer defining a CommonGrants API, I want to add a new custom field with configurable options, so that I can extend the API schema easily.

### Developer experience

Simplest use case: Add a custom field by specifying `name` and `type`.

```bash
cg add field <name> <type>
```

#### Additional Features
- Provide an example value with `--example`.
- Add a description using `--description`.

#### Example Usage
```bash
# Add a simple custom field
cg add field fundingAmount number

# Add a custom field with an example value
cg add field fundingAmount number --example 100000

# Add a custom field with a description
cg add field fundingAmount number --description "The total amount of funding available"
```

### Technical details
- The command should append the new field to the appropriate schema definition in the TypeSpec project.
- If `--example` or `--description` is provided, they should be included as metadata in the schema definition.

---

## Validating a CommonGrants API implementation

### User story

As a developer implementing a CommonGrants API, I want to run a command that checks whether a given API matches an OpenAPI spec, so that I can catch inconsistencies between the spec and the implementation.

### Developer experience

```bash
cg check api <url-for-root-of-the-api> <path-to-typespec-or-open-api-spec>
```

#### Additional Features
- Allow selecting the HTTP client for validation (e.g., `curl`, `httpx`).
- Provide an option to generate a report (`--report json` or `--report html`).
- Support authentication with `--auth` flag for APIs requiring credentials.

#### Example Usage
```bash
# Validate a running API against a spec
cg check api https://api.example.com grants-api.yaml

# Validate using a different HTTP client
cg check api https://api.example.com grants-api.yaml --client httpx

# Validate an authenticated API
cg check api https://api.example.com grants-api.yaml --auth bearer:mytoken

# Generate a validation report in JSON format
cg check api https://api.example.com grants-api.yaml --report json
```

### Technical details
- This command should leverage existing tools that validate OpenAPI spec implementations, where possible.

---

## Generating server code

### User story

As a developer implementing a CommonGrants API, I want to run a command that auto-generates an API server interface from a specification, so that I can follow a pattern of specification-driven development and quickly build APIs from scratch using the CommonGrants library.

### Developer experience

```bash
cg generate server <path-to-typespec>
```

#### Additional Features
- Allow specifying a language/framework with `--lang` (e.g., Python, Node.js).
- Enable plugin support for custom server code generation.
- Generate only specific components with `--only <controllers|models|routes>`.

#### Example Usage
```bash
# Generate a server using the default framework
cg generate server grants-api.tsp

# Generate a server for a specific language or framework
cg generate server grants-api.tsp --lang python

# Generate only controllers and routes
cg generate server grants-api.tsp --only controllers,routes
```

### Technical details
- This may require a combination of TypeSpec emitters and OpenAPI codegen.
- If an API framework isn't specified by the user via a flag, the CLI should prompt a user to choose one.
- Ideally, this entry point would be designed to support plugins for custom server code generators.

---

## Generating client code

### User story

As a developer consuming a CommonGrants API, I want to run a command that generates client code from an API spec, so that I don't have to manually set up the code to work with that API.

### Developer experience

```bash
cg generate client <path-to-typespec>
```

#### Additional Features
- Support multiple output formats (`--output <path>`).
- Allow targeting specific programming languages (`--lang`).
- Optionally include API documentation with `--docs`.

#### Example Usage
```bash
# Generate a client SDK from a spec
cg generate client grants-api.tsp

# Generate a client SDK for TypeScript
cg generate client grants-api.tsp --lang typescript

# Save generated client SDK in a custom directory
cg generate client grants-api.tsp --output ./sdk

# Include API documentation
cg generate client grants-api.tsp --docs
```

### Technical details
- This may require a combination of TypeSpec emitters and OpenAPI codegen.
- If a client framework isn't specified by the user via a flag, the CLI should prompt a user to choose one.
- Ideally, this entry point would be designed to support plugins for custom client code generators.


