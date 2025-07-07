// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";

// Import the core typespec files
import "./core/index.tsp";
import "./api.tsp";

// Import the versioning package
import "@typespec/versioning";

using Versioning;

@versioned(Versions)
namespace CommonGrants;

enum Versions {
  v0_1: "0.1.0",
  v0_2: "0.2.0",
}
