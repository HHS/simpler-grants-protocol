// Resolves the path to the tsp binary
// This allows us to provide a thin wrapper around `tsp` commands
// like `tsp init` and `tsp compile` that we want to call from the CLI
export const tspBinPath = require.resolve(".bin/tsp");
