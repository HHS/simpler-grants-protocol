/**
 * Awards resource namespace for the CommonGrants API.
 */

import { z } from "zod";
import type { AwardBase } from "../../types";
import { AwardBaseSchema, OkSchema, PaginatedSchema } from "../../schemas";
import type { Client, FetchManyOptions } from "../client";
import { parseBatch } from "../results";
import type { ListResult } from "../results";
import { Resource } from "./base";

/** Any schema whose parsed output satisfies the base award contract. */
type AwardSchema = z.ZodType<AwardBase, unknown>;

/** Options for getting a single award. */
export interface AwardGetOptions<S extends AwardSchema = typeof AwardBaseSchema> {
  /** Zod schema to parse and type the response. Defaults to the bound base schema. */
  schema?: S;
}

/** Options for listing awards. */
export interface AwardListOptions<
  S extends AwardSchema = typeof AwardBaseSchema,
> extends FetchManyOptions<z.infer<S>> {
  /** Zod schema to parse and type each item. Defaults to the bound base schema. */
  schema?: S;
}

/** Awards resource - provides methods for interacting with awards. */
export class Awards<TItem extends AwardBase = AwardBase> extends Resource<TItem> {
  private readonly basePath = "/common-grants/awards";

  constructor(client: Client, boundSchema?: z.ZodType<TItem, unknown>) {
    super(client, boundSchema ?? (AwardBaseSchema as unknown as z.ZodType<TItem, unknown>));
  }

  /** Per-call override wins; otherwise the bound base schema. */
  private resolveSchema<S extends AwardSchema>(override?: S): S {
    return override ?? (this.boundSchema as unknown as S);
  }

  /** Get a specific award by ID. */
  async get<S extends AwardSchema = z.ZodType<TItem, unknown>>(
    id: string,
    options?: AwardGetOptions<S>
  ): Promise<z.infer<S>> {
    const schema = this.resolveSchema(options?.schema);
    const response = await this.client.get(`${this.basePath}/${encodeURIComponent(id)}`);

    if (!response.ok) {
      throw new Error(`Failed to get award ${id}: ${response.status} ${response.statusText}`);
    }

    const json = await response.json();
    const result = OkSchema(schema).parse(json) as { data: z.infer<S> };
    return result.data;
  }

  /** List awards with auto-pagination by default. */
  async list<S extends AwardSchema = z.ZodType<TItem, unknown>>(
    options?: AwardListOptions<S>
  ): Promise<ListResult<z.infer<S>>> {
    const schema = this.resolveSchema(options?.schema);

    if (options?.page !== undefined) {
      const params: Record<string, number> = { page: options.page };
      if (options.pageSize) params.pageSize = options.pageSize;

      const response = await this.client.get(this.basePath, {
        params,
        signal: options.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to list awards: ${response.status} ${response.statusText}`);
      }

      const envelope = PaginatedSchema(z.unknown()).parse(await response.json());
      const { items, errors } = parseBatch(
        schema,
        envelope.items as unknown[],
        options.onParseError ?? "collect"
      );
      return { ...envelope, items, errors } as ListResult<z.infer<S>>;
    }

    return this.client.fetchMany(this.basePath, {
      ...options,
      schema,
    }) as Promise<ListResult<z.infer<S>>>;
  }
}
