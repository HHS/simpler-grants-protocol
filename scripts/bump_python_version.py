import os
import re
import glob
import semver
import json

PACKAGE = "common_grants_sdk"
PYPROJECT_PATH = "lib/python-sdk/pyproject.toml"

def parse_changesets():
    changeset_files = glob.glob(".changeset/*.md")
    bumps = []

    for file in changeset_files:
        with open(file, "r") as f:
            contents = f.read()
            if PACKAGE in contents:
                match = re.search(rf'"{PACKAGE}":\s*(major|minor|patch)', contents)
                if match:
                    bumps.append(match.group(1))

    return bumps

def get_current_version():
    with open(PYPROJECT_PATH, "r") as f:
        content = f.read()
    match = re.search(r'version\s*=\s*"(\d+\.\d+\.\d+)"', content)
    if match:
        return match.group(1)
    raise ValueError("Current version not found in pyproject.toml")

def apply_bump(version, bump_type):
    version_info = semver.VersionInfo.parse(version)
    if bump_type == "major":
        return version_info.bump_major()
    elif bump_type == "minor":
        return version_info.bump_minor()
    elif bump_type == "patch":
        return version_info.bump_patch()
    else:
        raise ValueError(f"Unknown bump type: {bump_type}")

def update_pyproject(new_version):
    with open(PYPROJECT_PATH, "r") as f:
        content = f.read()

    updated = re.sub(
        r'version\s*=\s*"\d+\.\d+\.\d+"',
        f'version = "{new_version}"',
        content
    )

    with open(PYPROJECT_PATH, "w") as f:
        f.write(updated)

    print(f"Bumped {PACKAGE} to version {new_version} in pyproject.toml")

def main():
    bumps = parse_changesets()
    if not bumps:
        print("No changesets found for Python package.")
        return

    bump_priority = {"major": 3, "minor": 2, "patch": 1}
    highest = max(bumps, key=lambda b: bump_priority[b])

    current = get_current_version()
    new_version = str(apply_bump(current, highest))
    update_pyproject(new_version)

if __name__ == "__main__":
    main()
