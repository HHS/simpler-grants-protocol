"""The package version has two on-disk homes; release-please bumps both.

`release-type: python` rewrites `[tool.poetry] version` and, via its native
`<project_name>/__init__.py` discovery, `__version__` too. This pins them
together so a hand-edit of one that misses the other fails here instead of
shipping a wheel whose `__version__` disagrees with its metadata.
"""

import tomllib
from pathlib import Path

import common_grants_sdk

PYPROJECT = Path(__file__).resolve().parent.parent / "pyproject.toml"


def test_dunder_version_matches_pyproject() -> None:
    pyproject = tomllib.loads(PYPROJECT.read_text())
    assert common_grants_sdk.__version__ == pyproject["tool"]["poetry"]["version"]
