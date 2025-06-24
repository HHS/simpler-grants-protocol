namespace CommonGrants.Fields;

/** A Philanthropy Classification System (PCS) term.
 *
 * The PCS is a hierarchical classification system for categorizing data related to
 * philanthropic activities. It supports the following classes:
 * - Organization types
 * - Subjects
 * - Population groups
 * - Transaction types
 * - Support strategies
 *
 * See https://taxonomy.candid.org/ for more information.
 */
@example(Examples.PCS.orgTypeTerm)
model PCSTerm {
  /** The plain language PCS term. */
  term: string;

  /** The class to which the PCS term belongs. */
  class: PCSClass;

  /** The code for this PCS term. */
  @pattern("^[A-Z]{2}[0-9]{6}$")
  @example("UC000000")
  code: string;

  /** Description of the PCS term */
  description?: string;
}

// #########################################################
// PCSClass
// #########################################################

/** The class to which the PCS term belongs. */
enum PCSClass {
  orgTypes: "Organization types",
  subjects: "Subjects",
  populationGroups: "Population groups",
  transactionTypes: "Transaction types",
  supportStrategies: "Support strategies",
}

// #########################################################
// PCS class types
// #########################################################

/** A Philanthropy Classification System (PCS) term for organization types.
 *
 * See https://taxonomy.candid.org/organization-type for more information.
 */
model PCSOrgType extends PCSTerm {
  /** The PCS term for the organization type. */
  class: PCSClass.orgTypes;
}

/** A Philanthropy Classification System (PCS) term for the subject of the grant.
 *
 * See https://taxonomy.candid.org/subjects for more information.
 */
model PCSSubject extends PCSTerm {
  /** The PCS term for the subject. */
  class: PCSClass.subjects;
}

/** A Philanthropy Classification System (PCS) term for populations served.
 *
 * See https://taxonomy.candid.org/populations for more information.
 */
model PCSPopulation extends PCSTerm {
  /** The PCS term for the population. */
  class: PCSClass.populationGroups;
}

/** A Philanthropy Classification System (PCS) term for support strategies.
 *
 * See https://taxonomy.candid.org/support-strategies for more information.
 */
model PCSSupportStrategy extends PCSTerm {
  /** The PCS term for the support strategy. */
  class: PCSClass.supportStrategies;
}

/** A Philanthropy Classification System (PCS) term for transaction types.
 *
 * See https://taxonomy.candid.org/transaction-types for more information.
 */
model PCSTransactionType extends PCSTerm {
  /** The PCS term for the transaction type. */
  class: PCSClass.transactionTypes;
}

// #########################################################
// Examples
// #########################################################

namespace Examples.PCS {
  const orgTypeTerm = #{
    term: "Hospital",
    class: PCSClass.orgTypes,
    description: "Institutions with the primary purpose of providing in-patient physical and mental health services...",
    code: "EO000000",
  };

  const subjectTerm = #{
    term: "Education",
    class: PCSClass.subjects,
    description: "All formally constituted educational institutions (except art and performing art schools) and projects or activities...",
    code: "SB000000",
  };
}
