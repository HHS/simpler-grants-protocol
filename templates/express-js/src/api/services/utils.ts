import * as uuid from "uuid";
import { type Opportunity, type OppStatusOptions, type PaginationInfo } from "../schemas";

// Namespace UUID for generating deterministic UUIDs
const NAMESPACE = "58315de5-1411-4c17-a394-561f1a47376f";

/** Generic interface for paginated items */
export interface PaginatedItems<T> {
  items: T[];
  paginationInfo: PaginationInfo;
}

/** Paginate a list of items */
export function paginate<T>(items: T[], page: number, pageSize: number): PaginatedItems<T> {
  const start = (page - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    paginationInfo: {
      page,
      pageSize,
      totalItems: items.length,
      totalPages: Math.ceil(items.length / pageSize),
    },
  };
}

/** Create a mock opportunity with the given parameters */
export function mockOpportunity({
  title,
  status,
  totalAvailable,
  minAwardAmount,
  maxAwardAmount,
  minAwardCount,
  maxAwardCount,
  appOpens,
  appDeadline,
}: {
  title: string;
  status: OppStatusOptions;
  totalAvailable?: number;
  minAwardAmount?: number;
  maxAwardAmount?: number;
  minAwardCount?: number;
  maxAwardCount?: number;
  appOpens?: Date;
  appDeadline?: Date;
}): Opportunity {
  const now = new Date();

  return {
    id: uuid.v5(title, NAMESPACE),
    title,
    status: {
      value: status,
      description: `Status for ${title}`,
    },
    description: `Description for ${title}`,
    funding: {
      totalAmountAvailable: totalAvailable
        ? {
            amount: totalAvailable.toString(),
            currency: "USD",
          }
        : undefined,
      minAwardAmount: minAwardAmount
        ? {
            amount: minAwardAmount.toString(),
            currency: "USD",
          }
        : undefined,
      maxAwardAmount: maxAwardAmount
        ? {
            amount: maxAwardAmount.toString(),
            currency: "USD",
          }
        : undefined,
      minAwardCount,
      maxAwardCount,
    },
    keyDates: {
      appOpens: appOpens
        ? {
            name: "Application Opens",
            date: appOpens,
            description: "Start accepting applications",
          }
        : undefined,
      appDeadline: appDeadline
        ? {
            name: "Application Deadline",
            date: appDeadline,
            description: "Final deadline for submissions",
          }
        : undefined,
    },
    createdAt: now,
    lastModifiedAt: now,
  };
}
