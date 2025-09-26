from data import CliArgs, Dependency, Issue
from diagram import Diagram


def map_issues_dependencies(args: CliArgs) -> Diagram:
    """Parse dependencies for a single issue."""
    # Create mock issues based on the diagram data
    issues = {
        "SDK": [
            Issue(
                title="Create a Python SDK ✔️",
                number=345,
                url=f"https://github.com/{args.org}/{args.repo}/issues/345",
                repo=args.repo,
                status="Done",
                group="SDK",
            ),
            Issue(
                title="Create a TypeScript SDK",
                number=321,
                url=f"https://github.com/{args.org}/{args.repo}/issues/321",
                repo=args.repo,
                status="Todo",
                group="SDK",
            ),
            Issue(
                title="Create a Go SDK",
                number=323,
                url=f"https://github.com/{args.org}/{args.repo}/issues/323",
                repo=args.repo,
                status="Todo",
                group="SDK",
            ),
            Issue(
                title="Create a Python API client",
                number=324,
                url=f"https://github.com/{args.org}/{args.repo}/issues/324",
                repo=args.repo,
                status="Todo",
                group="SDK",
            ),
            Issue(
                title="Create a TypeScript API client",
                number=328,
                url=f"https://github.com/{args.org}/{args.repo}/issues/328",
                repo=args.repo,
                status="Todo",
                group="SDK",
            ),
            Issue(
                title="Create a Go API client",
                number=329,
                url=f"https://github.com/{args.org}/{args.repo}/issues/329",
                repo=args.repo,
                status="Todo",
                group="SDK",
            ),
        ],
        "Template": [
            Issue(
                title="Create an Express.js API template",
                number=332,
                url=f"https://github.com/{args.org}/{args.repo}/issues/332",
                repo=args.repo,
                status="Todo",
                group="Template",
            ),
            Issue(
                title="Create a Go API template",
                number=333,
                url=f"https://github.com/{args.org}/{args.repo}/issues/333",
                repo=args.repo,
                status="Todo",
                group="Template",
            ),
            Issue(
                title="Create a FastAPI template ✔️",
                number=346,
                url=f"https://github.com/{args.org}/{args.repo}/issues/346",
                repo=args.repo,
                status="Done",
                group="Template",
            ),
        ],
        "Website": [
            Issue(
                title="Create a custom fields catalog",
                number=330,
                url=f"https://github.com/{args.org}/{args.repo}/issues/330",
                repo=args.repo,
                status="Todo",
                group="Website",
            ),
            Issue(
                title="Add mock API playground to CommonGrants.org",
                number=334,
                url=f"https://github.com/{args.org}/{args.repo}/issues/334",
                repo=args.repo,
                status="Todo",
                group="Website",
            ),
        ],
        "CLI": [
            Issue(
                title="Make API spec validation configurable",
                number=331,
                url=f"https://github.com/{args.org}/{args.repo}/issues/331",
                repo=args.repo,
                status="Todo",
                group="CLI",
            ),
            Issue(
                title="Create GH action and badge for CommonGrants compliance",
                number=335,
                url=f"https://github.com/{args.org}/{args.repo}/issues/335",
                repo=args.repo,
                status="Todo",
                group="CLI",
            ),
        ],
    }

    # Create dependencies based on the diagram
    dependencies = [
        Dependency(
            blocked="simpler-grants-protocol/328",
            blocked_by="simpler-grants-protocol/321",
        ),  # TS SDK -> TS API client
        Dependency(
            blocked="simpler-grants-protocol/324",
            blocked_by="simpler-grants-protocol/345",
        ),  # Py SDK -> Py API client
        Dependency(
            blocked="simpler-grants-protocol/329",
            blocked_by="simpler-grants-protocol/323",
        ),  # Go SDK -> Go API client
        Dependency(
            blocked="simpler-grants-protocol/333",
            blocked_by="simpler-grants-protocol/323",
        ),  # Go SDK -> Go API template
        Dependency(
            blocked="simpler-grants-protocol/332",
            blocked_by="simpler-grants-protocol/321",
        ),  # TS SDK -> Express.js template
        Dependency(
            blocked="simpler-grants-protocol/346",
            blocked_by="simpler-grants-protocol/345",
        ),  # Py SDK -> FastAPI template
        Dependency(
            blocked="simpler-grants-protocol/335",
            blocked_by="simpler-grants-protocol/331",
        ),  # API spec validation -> GH action
    ]

    return Diagram(subgraphs=issues, dependencies=dependencies)


def map_repo_dependencies(args: CliArgs) -> Diagram:
    """Parse issue dependencies for a given repository."""
    # Mock implementation - return all issues and dependencies for the repository
    return map_issues_dependencies(args)


def map_project_dependencies(args: CliArgs) -> Diagram:
    """Parse issue dependencies for a given project."""
    # Mock implementation - return all issues and dependencies for the project
    return map_issues_dependencies(args)
