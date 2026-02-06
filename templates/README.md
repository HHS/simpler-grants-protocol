# CommonGrants TypeSpec Templates

This directory contains templates defining CommonGrants-compatible APIs using TypeSpec.

## Usage

To initialize a new TypeSpec project with a CommonGrants template, run the following command:

```bash
cg init --template <template-slug>
```

This will walk you through a series of prompts to initialize the your project.

## Templates

| Template Name          | Slug        | Description                                                         |
| ---------------------- | ----------- | ------------------------------------------------------------------- |
| Quickstart             | quickstart  | Template to use for the CommonGrants TypeSpec quickstart guide      |
| FastAPI boilerplate    | fast-api    | Boilerplate code for a CommonGrants API implemented with FastAPI    |
| Express.js boilerplate | express-api | Boilerplate code for a CommonGrants API implemented with Express.js |


## Dependencies
To fix pnpm based dependencies that are listed in any of the template directories adhere to the following process

1. Run `pnpm audit --fix` at the root of this repository
2. Check the `pnpm-workspace.yaml` file to ensure that the audit fix command didn't duplicate an override of the same library
3. Cd into the directory where dependencies need to be updated e.g: cd [/templates/express-js](/templates/express-js)
4. Run `pnpm audit --ignore-workspace` to get a list of dependencies that have vulnerabilities
5. Run `pnpm audit --fix --ignore-workspace` to make the dependency updates
6. Run `pnpm install --ignore-workspace --no-frozen-lockfile` to install the updated dependencies

Repeat the above steps as needed for the templates and examples directories.


