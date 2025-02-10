# CommonGrants CLI

The CommonGrants CLI (`cg`) is a tool for working with the CommonGrants protocol. It simplifies the process of defining, implementing, and validating CommonGrants APIs.

> **Note**: This package is currently in alpha. The commands described below are mocked implementations that will be replaced with full functionality in future releases.

## Installation

```bash
# Install globally
npm install -g @common-grants/cli

# Or use with npx
npx @common-grants/cli <command>
```

## Usage

View available commands and options:

```bash
cg --help
```

Output:

```
Usage: cg [options] [command]

CommonGrants CLI tools

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  init [options]  Initialize a new CommonGrants project
  preview         Preview an OpenAPI specification
  add field       Add a custom field to the schema
  check           Validate APIs and specifications
  generate        Generate server or client code
  help [command]  display help for command
```

### Initialize a Project

Create a new CommonGrants project from a template:

```bash
# Initialize interactively
cg init

# List available templates
cg init --list

# Use a specific template
cg init --template custom-api
```

## Development status

This CLI is currently in alpha stage with the following limitations:

- All commands are mocked and return simulated responses

The first round of releases will implement the following core:

- Basic project initialization
- Previewing an OpenAPI spec using Swagger UI or Redocly
- Validating an API specification against the CommonGrants standard

Subsequent releases will add:

- An expanded set of templates
- Validating an API implementation against its specification
- Generating server and client code

## Anticipated features

The following examples describe the anticipated features of the CLI, but these are not yet implemented and are subject to change.

### Preview OpenAPI Specification

Preview an API specification using Swagger UI or Redocly:

```bash
# Preview with Swagger UI (default)
cg preview spec.tsp

# Preview with Redocly
cg preview spec.tsp --ui redocly
```

### Add Custom Fields

Extend the API schema with custom fields:

```bash
# Add a basic field
cg add field fundingAmount number

# Include example and description
cg add field fundingAmount number --example 100000 --description "Total funding available"
```

### Validate API Implementation

Check if an API implementation matches its specification:

```bash
# Basic validation
cg check api https://api.example.com spec.yaml

# Generate validation report
cg check api https://api.example.com spec.yaml --report json

# Validate with authentication
cg check api https://api.example.com spec.yaml --auth bearer:token
```

### Generate Server Code

Generate API server code from a specification:

```bash
# Generate with default settings
cg generate server spec.tsp

# Specify language/framework
cg generate server spec.tsp --lang python

# Generate specific components
cg generate server spec.tsp --only controllers,routes
```

### Generate Client Code

Generate client SDKs from an API specification:

```bash
# Generate default client
cg generate client spec.tsp

# Generate for specific language
cg generate client spec.tsp --lang typescript

# Include documentation
cg generate client spec.tsp --docs
```
