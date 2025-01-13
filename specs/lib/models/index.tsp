import "@typespec/json-schema";

// Import individual models to provide a consistent interface
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
