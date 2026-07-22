namespace CommonGrants.Fields;

// #########################################################
// Identifier
// #########################################################

/** The lifecycle status of an identifier value. */
@Versioning.added(CommonGrants.Versions.v0_4)
enum IdentifierStatus {
  /** The identifier is currently valid. */
  active,

  /** The identifier is retired and no longer current. */
  archived,
}

/** An identifier issued to a record by a registry.
 *
 * Template used to define concrete identifier schemas. `Id` constrains the
 * identifier value (e.g. `employerTaxId`); `Code` pins `registry.code` to a
 * specific registry (e.g. `"org:us:ein"`). Both default to a plain string, so
 * `Identifier` is the generic form and named instantiations (e.g. `OrgIdEin`)
 * are the registry-specific forms.
 */
@Versioning.added(CommonGrants.Versions.v0_4)
model IdentifierT<Id extends string = string, Code extends string = string> {
  /** Registry-level facts shared by every record in this registry. */
  registry?: {
    /** Canonical CommonGrants registry code, `<schema>:<scope>:<prop>` (e.g. `org:us:ein`). */
    code?: Code;

    /** Link to the catalog entry for this registry. */
    url?: url;
  };

  /** The primary identifier string, when the registry has a single canonical value.
   *
   * May be omitted for registries with no natural primary; consumers should read
   * `allIds` in that case.
   */
  id?: Id;

  /** Every known identifier for this record in this registry, including archived values. */
  allIds?: Array<{
    /** The identifier string. */
    id: Id;

    /** Whether the identifier is currently valid or retired. */
    status: IdentifierStatus;
  }>;
}

/** An identifier issued to a record by a registry.
 *
 * Accepts any string value and any registry code. Model-specific collections use
 * registry-typed instantiations of `IdentifierT` (e.g. `OrgIdEin`) for their base
 * identifiers, and this generic form for extension identifiers under `otherIds`.
 */
@example(Examples.Identifier.ein)
@example(Examples.Identifier.multiValue)
@Versioning.added(CommonGrants.Versions.v0_4)
model Identifier is IdentifierT<string, string>;

/** The hosting system's own identifier for a record.
 *
 * The identifier value is the record's UUID within the hosting system; the
 * registry code names that system (e.g. `org:grants.gov:system`).
 */
@example(Examples.Identifier.systemId)
@Versioning.added(CommonGrants.Versions.v0_4)
model SystemId is IdentifierT<Types.uuid>;

// #########################################################
// Identifier Collection
// #########################################################

/** A collection of identifiers associated with a record. */
@example(Examples.Identifier.collection)
@Versioning.added(CommonGrants.Versions.v0_4)
model IdentifierCollection {
  /** The hosting system's own identifier for this record. */
  systemId?: SystemId;

  /** Additional identifiers keyed by their registry code, for registries the
   * protocol does not define as a base identifier on the model.
   */
  otherIds?: Record<Identifier>;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.Identifier {
  const ein = #{
    registry: #{
      code: "org:us:ein",
      url: "https://commongrants.org/registries/org-us-ein",
    },
    id: "123456789",
  };

  const multiValue = #{
    registry: #{
      code: "org:us:ein",
      url: "https://commongrants.org/registries/org-us-ein",
    },
    id: "123456789",
    allIds: #[
      #{ id: "123456789", status: IdentifierStatus.active },
      #{ id: "987654321", status: IdentifierStatus.archived }
    ],
  };

  const systemId = #{
    registry: #{
      code: "org:grants.gov:system",
      url: "https://commongrants.org/registries/org-grants-gov-system",
    },
    id: "01912a8b-7c3d-7890-abcd-ef1234567890",
  };

  const collection = #{
    systemId: systemId,
    otherIds: #{
      `org:candid:bridge`: #{
        registry: #{ code: "org:candid:bridge" },
        id: "1234567",
      },
    },
  };
}
