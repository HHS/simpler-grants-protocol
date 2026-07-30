import { http, HttpResponse, type HttpHandler } from "msw";
import * as OpenAPISampler from "openapi-sampler";

/**
 * Same-origin relative path Swagger UI targets for the "list opportunities"
 * operation. The specs declare no `servers:` block, so Try-it-out requests
 * resolve against the current page origin + this path.
 */
export const OPPORTUNITIES_PATH = "/common-grants/opportunities";

/**
 * Minimal shape of a parsed OpenAPI document this module reads from. Kept
 * loose (index signature) because we only navigate a few known keys and pass
 * the whole document to `openapi-sampler` for `$ref` resolution.
 */
export interface OpenApiSpec {
  paths?: Record<string, unknown>;
  components?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Extracts the `200` JSON response schema for `GET /common-grants/opportunities`
 * from a parsed OpenAPI document.
 *
 * @throws If the path, GET operation, or 200 JSON response schema is absent.
 */
function getOpportunitiesResponseSchema(spec: OpenApiSpec): object {
  const schema = (
    spec.paths?.[OPPORTUNITIES_PATH] as
      | {
          get?: {
            responses?: {
              "200"?: {
                content?: { "application/json"?: { schema?: object } };
              };
            };
          };
        }
      | undefined
  )?.get?.responses?.["200"]?.content?.["application/json"]?.schema;

  if (!schema) {
    throw new Error(
      `No 200 JSON response schema found for GET ${OPPORTUNITIES_PATH} in the provided spec`,
    );
  }
  return schema;
}

/**
 * Samples the 200 response body for `GET /common-grants/opportunities` from a
 * parsed OpenAPI document. The full `spec` is passed to `OpenAPISampler.sample`
 * as its third argument so component `$ref`s (e.g. `OpportunityBase`,
 * `PaginatedResultsInfo`) resolve against the document.
 *
 * @param spec - A parsed OpenAPI document (YAML already loaded to an object).
 * @returns A schema-valid example body for the paginated opportunities list.
 */
export function buildOpportunitiesExample(
  spec: OpenApiSpec,
): Record<string, unknown> {
  const schema = getOpportunitiesResponseSchema(spec);
  const body = OpenAPISampler.sample(schema, {}, spec as object);
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new Error(
      `Sampled body for GET ${OPPORTUNITIES_PATH} was not a JSON object`,
    );
  }
  return body as Record<string, unknown>;
}

/**
 * Builds an MSW handler for `GET /common-grants/opportunities` that answers
 * with a sampled, schema-valid example body. Registered against the
 * same-origin relative path so it matches the requests Swagger UI's
 * "Try it out" fires.
 *
 * @param spec - A parsed OpenAPI document used to generate the example body.
 */
export function opportunitiesHandler(spec: OpenApiSpec): HttpHandler {
  const body = buildOpportunitiesExample(spec);
  return http.get(OPPORTUNITIES_PATH, () => HttpResponse.json(body));
}
