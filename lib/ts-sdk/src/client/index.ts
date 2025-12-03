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

export { Client, type FetchManyOptions } from "./client";
export { Opportunities } from "./opportunities";
export { Auth, type AuthMethod } from "./auth";
export { type ClientConfig, type ResolvedConfig } from "./config";
