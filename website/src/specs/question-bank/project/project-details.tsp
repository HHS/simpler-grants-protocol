import "@common-grants/core";
import "@typespec/json-schema";
import "../index.tsp";

using CommonGrants.Types;
using CommonGrants.Fields;
using JsonSchema;

namespace QuestionBank.ProjectDetails;

/** A composite question capturing key project details for a proposal */
@extension("x-tags", #[Tags.details, Tags.proposal])
@extension("x-entity", #[Entities.project])
@extension(
  "x-mapping-from-cg",
  #{
    title: #{ field: "title" },
    description: #{ field: "description" },
    amountRequested: #{
      amount: #{ field: "amountRequested.amount" },
      currency: #{ field: "amountRequested.currency" },
    },
    startDate: #{ field: "projectTimeline.startDate.date" },
    endDate: #{ field: "projectTimeline.endDate.date" },
  }
)
@extension(
  "x-mapping-to-cg",
  #{
    title: #{ field: "title" },
    description: #{ field: "description" },
    amountRequested: #{
      amount: #{ field: "amountRequested.amount" },
      currency: #{ field: "amountRequested.currency" },
    },
    projectTimeline: #{
      startDate: #{ date: #{ field: "startDate" } },
      endDate: #{ date: #{ field: "endDate" } },
    },
  }
)
@extension(
  "x-ui-schema",
  #{
    type: "Group",
    label: "Project Details",
    elements: #[
      #{
        type: "Control",
        scope: "#/properties/title",
        label: "Project Title",
      },
      #{
        type: "Control",
        scope: "#/properties/description",
        label: "Project Description",
        options: #{ multi: true },
      },
      #{
        type: "Group",
        label: "Amount Requested",
        elements: #[
          #{
            type: "Control",
            scope: "#/properties/amountRequested/properties/amount",
            label: "Amount",
          },
          #{
            type: "Control",
            scope: "#/properties/amountRequested/properties/currency",
            label: "Currency Code",
          }
        ],
      },
      #{
        type: "Control",
        scope: "#/properties/startDate",
        label: "Project Start Date",
      },
      #{
        type: "Control",
        scope: "#/properties/endDate",
        label: "Project End Date",
      }
    ],
  }
)
model QuestionProjectDetails {
  /** The title of the project */
  @example("Community Health Initiative")
  title?: string;

  /** A description of the project */
  @example("A project to improve health outcomes in rural communities.")
  description?: string;

  /** The amount of funding requested */
  amountRequested?: Money;

  /** The project start date (ISO 8601 format: YYYY-MM-DD) */
  @format("date")
  @example("2026-01-01")
  startDate?: string;

  /** The project end date (ISO 8601 format: YYYY-MM-DD) */
  @format("date")
  @example("2027-12-31")
  endDate?: string;
}
