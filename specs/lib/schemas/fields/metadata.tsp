namespace CommonGrants.Schemas.Fields;

// ########################################
// Model definition
// ########################################

/** Standard system-level metadata about a given record.
 *
 * @example How to spread the SystemMetadata props into another record
 *
 * ```typespec
 * model Opportunity {
 *   id: uuid;
 *   title: string;
 *
 *   // Includes SystemMetadata props in the root of the Opportunity model
 *   ...SystemMetadata;
 * }
 * ```
 * */
@example(MetadataExample.system)
model SystemMetadata {
  /** The timestamp (in UTC) at which the record was created. */
  @visibility(Lifecycle.Read)
  createdAt: utcDateTime;

  /** The timestamp (in UTC) at which the record was last modified. */
  @visibility(Lifecycle.Read)
  lastModifiedAt: utcDateTime;
}

// ########################################
// Model examples
// ########################################

namespace MetadataExample {
  const system = #{
    createdAt: utcDateTime.fromISO("2025-01-01T17:01:01"),
    lastModifiedAt: utcDateTime.fromISO("2025-01-02T17:30:00"),
  };
}
