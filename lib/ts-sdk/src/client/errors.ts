/**
 * Typed error thrown when the CommonGrants API returns a non-ok HTTP response.
 */
import { ErrorSchema } from "../schemas";
import type { ErrorResponse } from "../types";

export class ClientError extends Error {
  public readonly status: number;
  public readonly errorResponse: ErrorResponse;

  constructor(status: number, errorResponse: ErrorResponse) {
    super(`${status}: ${errorResponse.message}`);
    this.name = "ClientError";
    this.status = status;
    this.errorResponse = errorResponse;
  }
}

export async function throwHttpError(response: Response): Promise<never> {
  let errorResponse: ErrorResponse;
  try {
    const body = (await response.json()) as unknown;
    const parsed = ErrorSchema.safeParse(body);
    if (parsed.success) {
      errorResponse = parsed.data;
    } else {
      errorResponse = { status: response.status, message: response.statusText || "Request failed", errors: [] };
    }
  } catch {
    errorResponse = { status: response.status, message: response.statusText || "Request failed", errors: [] };
  }
  throw new ClientError(response.status, errorResponse);
}
