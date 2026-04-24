import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/poc/poc-details.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.PocDetails;

namespace Forms.KeyContact;

/**
 * Grants.gov "Key Contacts" form (FID 683).
 *
 * Captures the primary point of contact for a grant application along
 * with their role on the project. The applicant organization name doubles
 * as the link to ApplicantInfo on full applications.
 *
 * The legacy hand-written version (no longer the source of truth) lives
 * at website/src/content/forms/key-contact/. Reviewers compare the two
 * via /forms-new/key-contact vs /forms/key-contact during migration.
 */
@extension(
  "x-overrides",
  #{
    uiSchema: #{
      contactOrganizationalAffiliation: #{ label: "Organizational Affiliation" },
      contactCounty: #{ label: "County" },
      contactFax: #{ label: "Fax Number" },
      projectRole: #{ label: "Project Role" }
    }
  }
)
@extension("x-tags", #["key-contact", "application"])
model KeyContact {
  /** Applicant organization */
  @extension(
    "x-overrides",
    #{ uiSchema: #{ name: #{ label: "Applicant Organization Name" } } }
  )
  org: QuestionOrgName;

  /** Primary point of contact for the project */
  @extension(
    "x-overrides",
    #{
      uiSchema: #{
        `phone.number`: #{ label: "Telephone Number" },
        `phone.countryCode`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/contact/properties/phone/properties/countryCode", schema: #{} }
          }
        },
        `phone.extension`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/contact/properties/phone/properties/extension", schema: #{} }
          }
        },
        `phone.isMobile`: #{
          rule: #{
            effect: "HIDE",
            condition: #{ scope: "#/properties/contact/properties/phone/properties/isMobile", schema: #{} }
          }
        },
        `address.street1`: #{ label: "Street Address Line 1" },
        `address.street2`: #{ label: "Street Address Line 2" },
        `address.postalCode`: #{ label: "Zip / Postal Code" }
      }
    }
  )
  contact: QuestionPocDetails;

  /** Contact's organizational affiliation if different from the applicant organization */
  @example("Test Organization")
  @minLength(0)
  @maxLength(60)
  contactOrganizationalAffiliation?: string;

  /** County or parish of the contact address */
  @example("")
  @minLength(0)
  @maxLength(30)
  contactCounty?: string;

  /** Contact's fax number */
  @example("555-111-2222")
  @minLength(0)
  @maxLength(25)
  contactFax?: string;

  /** This contact's role on the project (e.g. Project Director, Fiscal Contact) */
  @example("Project Director")
  @minLength(1)
  @maxLength(45)
  projectRole: string;
}
