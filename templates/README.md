# CommonGrants TypeSpec Templates

This directory contains templates defining CommonGrants-compatible APIs using TypeSpec.

## Usage

To initialize a new TypeSpec project with a CommonGrants template, run the following command:

```bash
tsp init https://raw.githubusercontent.com/HHS/simpler-grants-protocol/refs/heads/main/templates/template.json
```

This will walk you through a series of prompts to initialize the your project.

> [!NOTE]
> We're working to simplify the init process using the [CommonGrants CLI](../cli).

## Templates

| Template Name | Description                                                                      |
| ------------- | -------------------------------------------------------------------------------- |
| Default API   | Define a CommonGrants API spec with default routes from the CommonGrants library |
| Custom API    | Extend the default CommonGrants API spec with custom fields and routes           |
