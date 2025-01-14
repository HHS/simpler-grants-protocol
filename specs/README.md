# Simpler grant protocol specifications

Code for the simpler grant protocol base specification libraries, written in TypeSpec. They are designed to be imported and extended by individual implementations of the grant protocol.

## 🚀 Project Structure

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

## 💻 Local development

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

### Installing the library locally

The medium-term goal is to publish this library to npm so that it can be installed directly using `npm install`. For the interim, however, you can install the library locally by running the following steps from the root of this directory:

1. Build the library: `npm build`
2. Package the library as a tarball: `npm pack`
3. Change directory into the node project where you want to install this library: `cd $path_to_other_project`
4. Add the following to that project's `package.json`:
   ```json
   "peerDependencies": {
       "@typespec/compiler": "^0.63.0",
       "@opportunity-stream/core": "file:<relative-path-to-library>/opportunity-stream-core-0.1.0-alpha.1.tgz"
   },
   ```
5. Then run `npm install` to install this package

### Using the library

Check out the [Custom API codebase](../examples/custom-api/) for an example of how to use this library within your own project. A more detailed tutorial is in the works.
