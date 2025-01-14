import "@typespec/json-schema";

// Import individual models to provide a consistent interface
// and make them available throughout the namespace
import "./base.tsp";
import "./custom-field.tsp";
import "./currency.tsp";
import "./funding.tsp";
import "./event.tsp";
import "./opportunity.tsp";

using TypeSpec.JsonSchema;

// Define the top-level namespace for the models
// and emit these models as JSON schemas
@jsonSchema
namespace OpportunityStream.Models;
