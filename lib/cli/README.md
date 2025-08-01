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
CommonGrants CLI tools

Options:
  -V, --version           output the version number
  -h, --help              display help for command

Commands:
  init [options]          Initialize a new CommonGrants project
  preview <specPath>      Preview an OpenAPI specification
  check                   Validate APIs and specifications
  compile <typespecPath>  Compile a TypeSpec file to OpenAPI
  help [command]          display help for command
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

### Compile TypeSpec to OpenAPI

Compile a TypeSpec file to an OpenAPI specification:

```bash
cg compile spec.tsp
```

This is a thin wrapper around the `tsp compile` command and uses your project's `tspconfig.yaml` file to determine the output format.

### Preview OpenAPI Specification

Preview an API specification using Swagger UI:

```bash
# Preview a YAML file
cg preview openapi.yaml

# Preview a JSON file
cg preview openapi.json
```

### Validate an API Specification

Validate an API specification against the CommonGrants base protocol. You can optionally specify a specific protocol version to check against, or provide a path to your own base spec. By default, `check spec` uses the latest version of the base protocol bundled with the CLI.

```bash
# Using the base protocol spec bundled with @common-grants/cli, uses the latest version by default
cg check spec openapi.yaml

# Using a specific protocol version
cg check spec openapi.yaml --protocol-version 0.1.0

# Using the path to a locally compiled base spec
cg check spec openapi.yaml --base <path-to-base-spec>
```

## Development status

This CLI is under active development and only supports the following commands:

- `cg init` with a limited set of templates
- `cg compile`
- `cg preview`
- `cg check spec`

## Anticipated features

The following examples describe the anticipated features of the CLI, but these are not yet implemented and are subject to change.

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
