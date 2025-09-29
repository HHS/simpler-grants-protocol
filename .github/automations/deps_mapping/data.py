from dataclasses import dataclass


@dataclass
class CliArgs:
    """Command line arguments for the application."""

    scope: str
    org: str
    repo: str
    project: int
    issue_type: str
    label: str | None = None
    state: str = "open"
    batch: int = 100
    dry_run: bool = False


@dataclass
class Issue:
    """An issue from the GitHub API."""

    title: str
    number: int
    url: str
    repo: str
    status: str | None = None
    group: str | None = None


@dataclass
class Dependency:
    """A dependency between two issues."""

    blocked: str
    blocked_by: str
