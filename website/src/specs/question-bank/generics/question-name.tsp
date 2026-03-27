import "@typespec/json-schema";
import "../index.tsp";

using JsonSchema;

namespace QuestionBank.QuestionName;

/** Honorific name prefixes */
enum NamePrefix {
  Mr: "Mr.",
  Ms: "Ms.",
  Mrs: "Mrs.",
  Dr: "Dr.",
  Prof: "Prof.",
}

/** Name suffixes */
enum NameSuffix {
  Jr: "Jr.",
  Sr: "Sr.",
  II: "II",
  III: "III",
  IV: "IV",
  PhD: "Ph.D.",
  MD: "M.D.",
  Esq: "Esq.",
}

/** A generic name question with structured prefix and suffix enums */
@extension("x-tags", #[Tags.name])
@extension(
  "x-mapping-from-cg",
  #{
    prefix: #{ field: "prefix" },
    firstName: #{ field: "firstName" },
    middleName: #{ field: "middleName" },
    lastName: #{ field: "lastName" },
    suffix: #{ field: "suffix" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    prefix: #{ field: "prefix" },
    firstName: #{ field: "firstName" },
    middleName: #{ field: "middleName" },
    lastName: #{ field: "lastName" },
    suffix: #{ field: "suffix" },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Name",
    elements: #[
      #{ type: "Control", scope: "#/properties/prefix", label: "Prefix" },
      #{
        type: "Control",
        scope: "#/properties/firstName",
        label: "First Name",
      },
      #{
        type: "Control",
        scope: "#/properties/middleName",
        label: "Middle Name",
      },
      #{ type: "Control", scope: "#/properties/lastName", label: "Last Name" },
      #{ type: "Control", scope: "#/properties/suffix", label: "Suffix" }
    ],
  }
)
@example(#{
  prefix: NamePrefix.Dr,
  firstName: "Jane",
  middleName: "Edward",
  lastName: "Doe",
  suffix: NameSuffix.Jr,
})
model QuestionName {
  /** Honorific prefix */
  prefix?: NamePrefix;

  /** First or given name */
  firstName: string;

  /** Middle name */
  middleName?: string;

  /** Last or family name */
  lastName: string;

  /** Name suffix */
  suffix?: NameSuffix;
}
