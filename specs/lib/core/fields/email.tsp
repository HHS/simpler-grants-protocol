import "../types.tsp";

namespace CommonGrants.Fields;

/** An email address. */
alias Email = Types.email; // Exposes Email from CommonGrants.Fields

/** A collection of email addresses. */
@example(Examples.Email.collection)
model EmailCollection {
  /** The primary email address for a person or organization. */
  primary: Types.email;

  /** Additional email addresses keyed by a descriptive label (e.g., "work", "personal", "support"). */
  otherEmails?: Record<Types.email>;
}

namespace Examples.Email {
  const collection = #{
    primary: "john.doe@example.com",
    otherEmails: #{
      work: "john.doe@work.com",
      personal: "john.doe@gmail.com",
      school: "john.doe@school.edu",
    },
  };
}
