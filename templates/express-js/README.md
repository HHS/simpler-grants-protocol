# Express.js template

A template for a CommonGrants API implemented using Express.js and TypeScript.

## Pre-requisites

1. Node.js 18 or greater is installed globally: `node --version`
2. npm is installed globally: `npm --version`
3. The TypeSpec compiler and CommonGrants CLI are installed globally: `npm install -g @common-grants/cli @typespec/compiler`

## Quickstart

1. Create a new directory for your project: `mkdir express-api && cd express-api`
2. Set up the project using this template and follow the instructions: `cg init --template express-js`
3. Install the project dependencies: `npm install`
4. Run the checks: `npm run checks`
5. Run the local development server: `npm run dev`

## Commands

The npm scripts expose the following commands:

| Command          | Description                                 |
| ---------------- | ------------------------------------------- |
| `npm install`    | Installs the project dependencies           |
| `npm run format` | Runs formatting with prettier               |
| `npm run lint`   | Runs linting with eslint                    |
| `npm run build`  | Compiles TypeScript to JavaScript           |
| `npm run dev`    | Runs the development server                 |
| `npm run checks` | Runs linting, formatting, and type checking |

## Project Structure

```
├── package.json            # Node.js project configuration and dependencies
├── package-lock.json       # Locked versions of dependencies
├── tsconfig.json           # TypeScript configuration
├── .eslintrc.js            # ESLint configuration
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
