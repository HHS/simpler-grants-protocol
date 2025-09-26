from dataclasses import dataclass

from data import Dependency, Issue

STATUS_CLASSES = {
    "In Progress": ":::InProgress",
    "Done": ":::Done",
    "Closed": ":::Done",
    "Open": ":::InProgress",
}


# #######################################################
# Templates
# #######################################################


DIAGRAM_TEMPLATE = """
flowchart LR

  %% ─────────────────────────────
  %% Styles
  %% ─────────────────────────────
  classDef default fill:#fff,stroke:#333,stroke-width:1px,color:#000,rx:5,ry:5
  classDef InProgress fill:#e1f3f8,stroke:#07648d,stroke-width:2px,color:#000
  classDef Done fill:#8DE28D,stroke:#204e34,stroke-width:3px,color:#000
  style Canvas fill:transparent,stroke:#171716
  style Legend fill:#F7F7F4,stroke:#171716
{styles}

  %% ─────────────────────────────
  %% Legend
  %% ─────────────────────────────
  subgraph Legend["Key"]
    direction LR
    k1["Todo"]
    k2["In progress 🛠️ "]:::InProgress
    k3["Done ✔️"]:::Done

    k1 -.-> k2 -.-> k3
  end

  %% ─────────────────────────────
  %% Main canvas
  %% ─────────────────────────────
  subgraph Canvas["Dependencies"]
    direction LR

{subgraphs}

    %% ─────────────────────────────
    %% Relationships
    %% ─────────────────────────────
{relationships}

  end
"""

SUBGRAPH_TEMPLATE = """
    subgraph {slug}["{name}"]
    direction LR
{issues}
    end
"""

ISSUE_TEMPLATE = '        {repo}/{number}["{title}"]{status_class}'


# #######################################################
# Diagram class
# #######################################################


@dataclass
class Diagram:
    """A diagram of the dependencies between issues."""

    subgraphs: dict[str, list[Issue]]
    dependencies: list[Dependency]

    def generate_diagram(self) -> str:
        """Generate a diagram of the dependencies between issues."""
        return DIAGRAM_TEMPLATE.format(
            styles=self._format_styles(),
            subgraphs=self._format_subgraphs(),
            relationships=self._format_relationships(),
        )

    def _format_styles(self) -> str:
        """Format the subgraph styles."""
        return "\n".join(
            f"  style {format_slug(name)} fill:#F7F7F4,stroke:#171716"
            for name in self.subgraphs
        )

    def _format_subgraphs(self) -> str:
        """Generate the subgraphs for the 'Canvas' section of the diagram."""
        # Generate subgraph structure
        subgraphs = []
        for name, issues in self.subgraphs.items():
            subgraph = SUBGRAPH_TEMPLATE.format(
                slug=format_slug(name),
                name=name,
                issues=format_subgraph_items(issues),
            )
            subgraphs.append(subgraph)
        return "\n".join(subgraphs)

    def _format_relationships(self) -> str:
        """Format the subgraph relationships."""
        return "\n".join(
            f"    {dependency.blocked_by} --> {dependency.blocked}"
            for dependency in self.dependencies
        )


# #######################################################
# Helpers
# #######################################################


def format_slug(name: str) -> str:
    """Format a string to a valid slug."""
    return name.lower().strip().replace(" ", "_")


def format_subgraph_items(issues: list[Issue]) -> str:
    """Format and join the issues for a given subgraph."""
    # Format issue with status styling
    items = []
    for issue in issues:
        if issue.status in STATUS_CLASSES:
            status_class = STATUS_CLASSES[issue.status]
        else:
            status_class = ""
        items.append(
            ISSUE_TEMPLATE.format(
                repo=issue.repo,
                number=issue.number,
                title=issue.title,
                status_class=status_class,
            )
        )
    return "\n".join(items)
