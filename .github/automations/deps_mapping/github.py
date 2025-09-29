import re
import json

from data import CliArgs, Dependency, Issue
from diagram import Diagram
from utils import get_env, get_query_from_file, log, make_request

GITHUB_API_TOKEN = get_env("GITHUB_API_TOKEN")

# #######################################################
# Mapping functions
# #######################################################


def map_issue_dependencies(args: CliArgs) -> Diagram:
    """Parse dependencies for a single issue."""
    # Make the GraphQL request
    query = get_query_from_file("fetch-repo.graphql")
    payload = {
        "org": args.org,
        "repo": args.repo,
        "issueType": args.issue_type,
    }
    responses = make_paginated_graphql_request(query, payload, args.batch)
    # Parse the responses
    issue_data = (
        responses.get("data", {})
        .get("repository", {})
        .get("issues", {})
        .get("nodes", [])
    )
    return parse_graphql_response(issue_data, args)


def map_repo_dependencies(args: CliArgs) -> Diagram:
    """Parse issue dependencies for a given repository."""
    # Make the GraphQL request
    query = get_query_from_file("fetch-repo.graphql")
    payload = {
        "org": args.org,
        "repo": args.repo,
        "issueType": args.issue_type,
    }
    responses = make_paginated_graphql_request(query, payload, args.batch)
    # Parse the responses
    issue_data = (
        responses.get("data", {})
        .get("repository", {})
        .get("issues", {})
        .get("nodes", [])
    )
    return parse_graphql_response(issue_data, args)


# #######################################################
# Parsing functions
# #######################################################


def parse_graphql_response(response_data: list[dict], args: CliArgs) -> Diagram:
    """Parse GraphQL response data into a Diagram."""
    issues = {}
    dependencies = []

    # Extract issues from GraphQL response
    for issue_data in response_data:
        # Extract issue number from URL
        issue_url = issue_data["url"]
        issue_repo = issue_data["repository"]["nameWithOwner"]
        issue_number = issue_data["number"]

        # Parse group name from title pattern: [<group name>] <Issue title>
        title = issue_data["title"]
        group = "Other"

        # Determine group based on title prefix (e.g., [SDK] Create a Python SDK)
        match = re.match(r"^\[([^\]]+)\]\s*(.*)$", title)
        if match:
            group = match.group(1).strip()
            # Remove the prefix from the title
            clean_title = match.group(2).strip()
        else:
            clean_title = title

        # Create Issue object
        issue = Issue(
            title=clean_title,
            number=issue_number,
            url=issue_url,
            repo=issue_repo,
            status=extract_status(issue_data, args.project),
            group=group,
        )

        # Add to appropriate group
        if group not in issues:
            issues[group] = []
        issues[group].append(issue)

        # Extract dependencies from blocking relationships
        for blocked_issue in issue_data["blocking"]["nodes"]:
            blocked_repo = blocked_issue["repository"]["nameWithOwner"]
            blocked_number = blocked_issue["number"]

            # Create dependency: blocked issue is blocked by current issue
            dependency = Dependency(
                blocked=f"{blocked_repo}#{blocked_number}",
                blocked_by=f"{issue_repo}#{issue_number}",
            )
            dependencies.append(dependency)

    return Diagram(subgraphs=issues, dependencies=dependencies)


def extract_status(issue_data: dict, project: int, default: str = "Todo") -> str:
    """Extract status from project items filtered by project number.

    Defaults to "Todo" if no match found, or if the issue has no project items.

    This is equivalent to the following jq expression:
    (.[] | select(.project.number == $project) | .status.name) // $default
    """
    return next(
        (
            item.get("status", {}).get("name")
            for item in issue_data.get("projectItems", {}).get("nodes", [])
            if item.get("project", {}).get("number") == project
        ),
        default,  # Default value if no match found
    )


# #######################################################
# Request functions
# #######################################################


def make_graphql_request(query: str, variables: dict) -> dict:
    """Make a GraphQL request."""
    # Prepare the request
    url = "https://api.github.com/graphql"
    headers = {
        "Authorization": f"token {GITHUB_API_TOKEN}",
        "Accept": "application/vnd.github.v3+json",
        "Content-Type": "application/json",
    }
    # Make the request
    response = make_request(
        url,
        headers,
        method="POST",
        data=json.dumps({"query": query, "variables": variables}),
    )
    # Check for GraphQL errors
    if "errors" in response:
        log(f"GraphQL errors: {response['errors']}")
        return {}
    # Check if we have data
    if "data" not in response:
        log("No data in GraphQL response")
        return {}
    return response


def make_paginated_graphql_request(
    query: str,
    variables: dict,
    batch: int,
) -> dict:
    """Make a paginated GraphQL request."""
    # Prepare variables for pagination
    variables["batch"] = batch
    cursor = None
    all_data = []

    while True:
        # Add cursor to variables if we have one
        if cursor:
            variables["cursor"] = cursor

        # Make the GraphQL request using the helper function
        response = make_graphql_request(query, variables)

        if not response:
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

    # Return the accumulated data
    return {"data": {"repository": {"issues": {"nodes": all_data}}}}
