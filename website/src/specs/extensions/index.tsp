/**
 * Combined entry point for all extension schemas (custom fields + question bank).
 * Compiled together into a single output directory to avoid redundant tsp compile runs.
 */
import "../custom-fields/index.tsp";
import "../question-bank/index.tsp";
import "../forms/index.tsp";
