// Import the JS entry point for this library
// For more details see:
// https://typespec.io/docs/extending-typespec/basics/#h-add-your-main-typespec-file
import "../dist/src/index.js";

// Import Schemas and Routes to make them available outside the package
import "./schemas/index.tsp";
import "./routes/index.tsp";
import "./api.tsp";

namespace CommonGrants;

alias Types = CommonGrants.Schemas.Types;
alias Fields = CommonGrants.Schemas.Fields;
