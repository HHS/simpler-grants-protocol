# Development Guide

### Prerequisites

- Node.js 20 or higher
- pnpm 10.18.0 or higher

### Development commands

| Command                  | Description                                                      |
| ------------------------ | ---------------------------------------------------------------- |
| `pnpm install`           | Installs dependencies                                            |
| `pnpm run build`         | Compiles TypeScript code to JavaScript and runs TypeSpec         |
| `pnpm run typespec`      | Compile and emit TypeSpec outputs (i.e. OpenAPI and JSON schema) |
| `pnpm run dev`           | Run the entry point with ts-node                                 |
| `pnpm run test`          | Run Vitest test suite                                            |
| `pnpm run test:watch`    | Run Vitest in watch mode                                         |
| `pnpm run test:coverage` | Run Vitest with coverage report                                  |
| `pnpm run lint`          | Run ESLint and fix issues                                        |
| `pnpm run format`        | Format code with Prettier                                        |
| `pnpm run checks`        | Run lint and format checks                                       |
| `pnpm run prepare`       | Compile TypeScript (pre-publish hook)                            |
