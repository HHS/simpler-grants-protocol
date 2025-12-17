# Express.js template

A template for a CommonGrants API implemented using Express.js and TypeScript.

## Pre-requisites

1. Node.js 18 or greater is installed globally: `node --version`
2. pnpm is installed globally: `pnpm --version`
3. The CommonGrants CLI is installed globally: `pnpm install -g @common-grants/cli`

## Quickstart

1. Create a new directory for your project: `mkdir express-api && cd express-api`
2. Set up the project using this template and follow the instructions: `cg init --template express-js`
3. Install the project dependencies: `pnpm install`
4. Run the checks: `pnpm run checks`
5. Run the local development server: `pnpm run dev`

## Commands

The pnpm scripts expose the following commands:

| Command           | Description                                 |
| ----------------- | ------------------------------------------- |
| `pnpm install`    | Installs the project dependencies           |
| `pnpm run format` | Runs formatting with prettier               |
| `pnpm run lint`   | Runs linting with eslint                    |
| `pnpm run build`  | Compiles TypeScript to JavaScript           |
| `pnpm run dev`    | Runs the development server                 |
| `pnpm run checks` | Runs linting, formatting, and type checking |

## Project Structure

```
├── package.json            # Node.js project configuration and dependencies
├── pnpm-lock.yaml          # Locked versions of dependencies
├── tsconfig.json           # TypeScript configuration
├── eslint.config.js        # ESLint configuration
├── .prettierrc             # Prettier configuration
├── README.md               # Project documentation
│
├── src/
│   ├── api/                                # Main API directory
│   │   ├── index.ts                        # Express application setup and config
│   │   ├── controllers/                    # Request handlers and controllers
│   │   │   ├── docs.controller.ts          # Documentation endpoints
│   │   │   └── opportunity.controller.ts   # Opportunity endpoints
│   │   │
│   │   ├── middleware/                     # Express middleware
│   │   │   ├── error.middleware.ts         # Error handling
│   │   │   └── validation.middleware.ts    # Request validation
│   │   │
│   │   ├── schemas/            # Data models and schema definitions
│   │   │   ├── fields.ts       # Base field types
│   │   │   ├── filters.ts      # Query filter models
│   │   │   ├── models.ts       # Core domain models
│   │   │   ├── pagination.ts   # Pagination models
│   │   │   └── responses.ts    # API response wrappers
│   │   │
│   │   └── services/                       # Business logic and data operations
│   │       ├── documentation.service.ts    # API documentation
│   │       ├── opportunity.service.ts      # Opportunity operations
│   │       ├── utils.ts                    # Shared utilities
│   │       └── validation.service.ts       # Data validation
│   │
│   └── typespec/           # TypeSpec API definitions
│       └── main.tsp        # Main API specification
```
