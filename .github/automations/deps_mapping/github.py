from data import CliArgs, Dependency, Issue
from diagram import Diagram
from utils import get_env, log, make_request

GITHUB_API_TOKEN = get_env("GITHUB_API_TOKEN")


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
    responses = make_paginated_graphql_request(
        "queries/repo_issues.graphql",
        {"owner": args.org, "name": args.repo},
        args.batch,
    )
    print(responses)
    return map_issues_dependencies(args)


def map_project_dependencies(args: CliArgs) -> Diagram:
    """Parse issue dependencies for a given project."""
    # Mock implementation - return all issues and dependencies for the project
    return map_issues_dependencies(args)


# #######################################################
# Make paginated GraphQL requests
# #######################################################


def make_paginated_graphql_request(
    query_path: str,
    variables: dict,
    batch: int,
) -> dict:
    """Make a paginated GraphQL request."""
    import os
    import json

    # Read the GraphQL query from file
    query_file_path = os.path.join(os.path.dirname(__file__), "queries", query_path)
    try:
        with open(query_file_path, "r") as f:
            query = f.read()
    except FileNotFoundError:
        log(f"GraphQL query file not found: {query_file_path}")
        return {}
    except Exception as e:
        log(f"Error reading query file: {e}")
        return {}

    headers = {
        "Authorization": f"token {GITHUB_API_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }

    url = "https://api.github.com/graphql"

    # Prepare variables for pagination
    variables["batch"] = batch
    cursor = None
    all_data = []

    while True:
        # Add cursor to variables if we have one
        if cursor:
            variables["cursor"] = cursor

        # Prepare the GraphQL request payload
        payload = {"query": query, "variables": variables}

        try:
            # Make the GraphQL request
            response = make_request(
                url, headers, method="POST", data=json.dumps(payload)
            )

            # Check for GraphQL errors
            if "errors" in response:
                log(f"GraphQL errors: {response['errors']}")
                return {}

            # Check if we have data
            if "data" not in response:
                log("No data in GraphQL response")
                return {}

            data = response["data"]

            # Navigate to the issues data based on the query structure
            if "repository" in data and "issues" in data["repository"]:
                issues_data = data["repository"]["issues"]

                # Add current batch to all_data
                if "nodes" in issues_data:
                    all_data.extend(issues_data["nodes"])

                # Check if there are more pages
                if "pageInfo" in issues_data and issues_data["pageInfo"]["hasNextPage"]:
                    cursor = issues_data["pageInfo"]["endCursor"]
                else:
                    break
            else:
                log("Unexpected GraphQL response structure")
                break

        except Exception as e:
            log(f"Error making GraphQL request: {e}")
            return {}

    # Return the accumulated data
    return {"data": {"repository": {"issues": {"nodes": all_data}}}}
