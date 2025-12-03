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
 * const opp = await client.opportunities.get("opp-123");
 * ```
 */

export { Client, Auth } from "./client";
export type { ClientConfig, AuthMethod } from "./client";
