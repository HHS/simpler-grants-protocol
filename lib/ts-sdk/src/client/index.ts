/**
 * CommonGrants API Client
 *
 * @example
 * ```ts
 * import { Client, Auth } from "@common-grants/sdk/client";
 *
 * const client = new Client({
 *   baseUrl: "https://api.example.org",
 *   auth: Auth.bearer("your-token"),
 * });
 *
 * const opp = await client.opportunities.get("00000000-0000-0000-0000-000000000000");
 * ```
 */

export { Client, type FetchManyOptions } from "./client.js";
export {
  Opportunities,
  type CustomFilterBag,
  type GetOptions,
  type ListOptions,
  type SearchOptions,
} from "./resources/opportunities.js";
export {
  Awards,
  type AwardCustomFilterBag,
  type AwardGetOptions,
  type AwardListOptions,
  type AwardSearchOptions,
} from "./resources/awards.js";
export type { BuiltClient } from "./resources/builder.js";
export { Resource } from "./resources/base.js";
export { RESOURCE_REGISTRY } from "./resources/registry.js";
export { Auth, type AuthMethod } from "./auth.js";
export { type ClientConfig, type ResolvedConfig } from "./config.js";
export { parseBatch, BatchParseError } from "./results.js";
export type { ParseFailure, OnParseError, ListResult, SearchResult } from "./results.js";
