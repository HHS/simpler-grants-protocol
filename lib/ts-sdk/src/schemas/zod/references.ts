/**
 * Zod schemas for the CommonGrants record-reference models in the
 * @common-grants/core library: the compact previews one record embeds to point
 * at another (e.g. the application an award resulted from).
 *
 * @packageDocumentation
 */

import { z } from "zod";
import { UuidSchema } from "./types";

// ############################################################################
// AppRef schema
// ############################################################################

/**
 * A reference to an application, previewing the key fields a consumer needs to
 * identify it and look it up or join it to another response.
 */
export const AppRefSchema = z
  .object({
    /** The unique identifier for the application */
    id: UuidSchema,

    /** The title of the application */
    title: z.string(),
  })
  .strict();
