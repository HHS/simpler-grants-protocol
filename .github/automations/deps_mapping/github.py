import re

from data import CliArgs, Dependency, Issue
from diagram import Diagram
from utils import get_env, log, make_request

GITHUB_API_TOKEN = get_env("GITHUB_API_TOKEN")

# #######################################################
# Mapping functions
# #######################################################


def map_issues_dependencies(args: CliArgs) -> Diagram:
    """Parse dependencies for a single issue."""
    responses = make_paginated_graphql_request(
        "fetch-repo.graphql",
        {"org": args.org, "repo": args.repo, "issueType": args.issue_type},
        args.batch,
    )

    return parse_graphql_response(
        responses.get("data", {})
        .get("repository", {})
        .get("issues", {})
        .get("nodes", [])
    )


def map_repo_dependencies(args: CliArgs) -> Diagram:
    """Parse issue dependencies for a given repository."""
    responses = make_paginated_graphql_request(
        "fetch-repo.graphql",
        {"org": args.org, "repo": args.repo, "issueType": args.issue_type},
        args.batch,
    )

    return parse_graphql_response(
        responses.get("data", {})
        .get("repository", {})
        .get("issues", {})
        .get("nodes", [])
    )


def map_project_dependencies(args: CliArgs) -> Diagram:
    """Parse issue dependencies for a given project."""
    # Mock implementation - return all issues and dependencies for the project
    return map_issues_dependencies(args)


# #######################################################
# Parsing functions
# #######################################################


def parse_graphql_response(response_data: list[dict]) -> Diagram:
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
            status="Todo",  # Default status since GraphQL doesn't provide this
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


# #######################################################
# Request functions
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
