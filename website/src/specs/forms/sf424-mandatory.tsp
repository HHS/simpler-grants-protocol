import "@typespec/json-schema";
import "../question-bank/primary-org/org-name.tsp";
import "../question-bank/primary-org/org-ein.tsp";
import "../question-bank/primary-org/org-uei.tsp";
import "../question-bank/primary-org/org-address.tsp";
import "../question-bank/poc/poc-name.tsp";
import "../question-bank/poc/poc-title.tsp";
import "../question-bank/poc/poc-phone.tsp";
import "../question-bank/poc/poc-email.tsp";
import "../question-bank/aor/aor-name.tsp";
import "../question-bank/aor/aor-title.tsp";
import "../question-bank/aor/aor-phone.tsp";
import "../question-bank/aor/aor-email.tsp";

using JsonSchema;
using QuestionBank.OrgName;
using QuestionBank.OrgEin;
using QuestionBank.OrgUei;
using QuestionBank.OrgAddress;
using QuestionBank.PocName;
using QuestionBank.PocTitle;
using QuestionBank.PocPhone;
using QuestionBank.PocEmail;
using QuestionBank.AorName;
using QuestionBank.AorTitle;
using QuestionBank.AorPhone;
using QuestionBank.AorEmail;
using QuestionBank.QuestionName;
using QuestionBank.QuestionAddress;

namespace Forms.SF424Mandatory;

/**
 * SF-424 mandatory contact information section.
 * Composes org + contact + AOR — the three core sections that require
 * address, name, phone, and email fields without extra QB fields.
 */
@extension("x-tags", #["sf424-mandatory", "application"])
model SF424Mandatory {
  /** Primary applicant organization name */
  @example(#{ name: "Community Health Initiative" })
  orgName: QuestionOrgName;

  /** Employer Identification Number (EIN) of the applicant organization */
  @example(#{ ein: "12-3456789" })
  orgEin: QuestionOrgEin;

  /** SAM Unique Entity Identifier (UEI) of the applicant organization */
  @example(#{ uei: "ABCD12345678" })
  orgUei: QuestionOrgUei;

  /** Mailing address of the applicant organization */
  @example(#{
    street1: "123 Main Street",
    street2: "Suite 200",
    city: "Springfield",
    state: USState.MO,
    country: "US",
    postalCode: "65804",
  })
  orgAddress: QuestionPrimaryOrgAddress;

  /** Primary point of contact name */
  @example(#{
    prefix: NamePrefix.Dr,
    firstName: "Sarah",
    middleName: "Marie",
    lastName: "Johnson",
    suffix: NameSuffix.PhD,
  })
  contactName: QuestionPrimaryContactName;

  /** Primary point of contact title */
  @example(#{ title: "Program Director" })
  contactTitle: QuestionPocTitle;

  /** Primary point of contact phone number */
  @example(#{ countryCode: "+1", number: "(417) 555-0123" })
  contactPhone: QuestionPocPhone;

  /** Primary point of contact email */
  @example(#{ email: "sarah.johnson@communityhealth.org" })
  contactEmail: QuestionPocEmail;

  /** Authorized Organization Representative name */
  @example(#{
    prefix: NamePrefix.Mr,
    firstName: "Michael",
    lastName: "Thompson",
    suffix: NameSuffix.PhD,
  })
  aorName: QuestionAorName;

  /** Authorized Organization Representative title */
  @example(#{ title: "Executive Director" })
  aorTitle: QuestionAorTitle;

  /** Authorized Organization Representative phone number */
  @example(#{ countryCode: "+1", number: "(417) 555-0100" })
  aorPhone: QuestionAorPhone;

  /** Authorized Organization Representative email */
  @example(#{ email: "michael.thompson@communityhealth.org" })
  aorEmail: QuestionAorEmail;
}
