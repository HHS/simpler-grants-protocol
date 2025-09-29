import json
import logging
import os
import sys
import urllib.request
from pathlib import Path

# #######################################################
# Logging
# #######################################################

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="[%(levelname)s] %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger(__name__)


def log(message: str) -> None:
    """Log an info message."""
    logger.info(message)


def err(message: str, *, exit: bool = True) -> None:
    """Log an error message and exit."""
    logger.error(message)
    if exit:
        sys.exit(1)


# #######################################################
# Environment variables
# #######################################################


def get_env(name: str) -> str:
    """Get an environment variable and exit if it's not set."""
    value = os.environ.get(name)
    if not value:
        err(f"{name} environment variable must be set")
        return ""
    return value


# #######################################################
# GraphQL requests
# #######################################################
def get_query_from_file(file_path: str) -> str:
    """Get a GraphQL query from a file."""
    # Read the GraphQL query from file
    query_file_path = Path(__file__).parent / "queries" / file_path
    if not query_file_path.exists():
        log(f"GraphQL query file not found: {query_file_path}")
        return ""
    try:
        with open(query_file_path, "r") as f:
            return f.read()
    except Exception as e:
        log(f"Error reading query file: {e}")
        return ""


# #######################################################
# HTTP requests
# #######################################################


def make_request(
    url: str,
    headers: dict[str, str],
    method: str = "GET",
    data: str | None = None,
) -> dict:
    """Make an HTTP request and return JSON response."""
    # Always add a User-Agent header to avoid Cloudflare bot blocking
    headers = dict(headers)  # copy to avoid mutating caller's dict
    if "User-Agent" not in headers:
        headers["User-Agent"] = "Mozilla/5.0 (compatible; FeatureBaseBot/1.0)"
    try:
        req = urllib.request.Request(url, headers=headers, method=method)
        if data:
            req.data = data.encode()

        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode())
    except urllib.request.HTTPError as e:
        err(f"HTTP request failed: {e.code} - {e.reason}", exit=True)
        return {}  # For type checking, never reached due to sys.exit() in err()
    except json.JSONDecodeError:
        err("Failed to parse JSON response", exit=True)
        return {}  # For type checking, never reached due to sys.exit() in err()
    except Exception as e:
        err(f"Request failed: {e}", exit=True)
        return {}  # For type checking, never reached due to sys.exit() in err()
