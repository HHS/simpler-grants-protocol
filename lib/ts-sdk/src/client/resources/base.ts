/**
 * Shared base for API resource namespaces (opportunities today; organizations,
 * applications, awards as they land).
 */

import { z } from "zod";
import type { Client } from "../client";
import type { PluginRoutes } from "../../extensions/types";

export abstract class Resource<TItem> {
  constructor(
    protected readonly client: Client,
    protected readonly boundSchema: z.ZodType<TItem, z.ZodTypeDef, unknown>,
    protected readonly routes?: PluginRoutes
  ) {}

  /**
   * Shared write primitive: the body is validated before the request (throws),
   * the single response is parsed fail-hard. Write/action verbs on subclasses
   * (e.g. `replace()`, `submit()`) are one-liners over this.
   */
  protected async mutate<TRes>(
    method: "post" | "put" | "patch",
    path: string,
    body: unknown,
    opts: {
      requestSchema?: z.ZodTypeAny;
      responseSchema: z.ZodType<TRes, z.ZodTypeDef, unknown>;
    }
  ): Promise<TRes> {
    const payload: unknown = opts.requestSchema ? opts.requestSchema.parse(body) : body;
    const response = await this.client[method](path, payload);

    if (!response.ok) {
      throw new Error(
        `Failed to ${method.toUpperCase()} ${path}: ${response.status} ${response.statusText}`
      );
    }

    return opts.responseSchema.parse(await response.json());
  }
}
