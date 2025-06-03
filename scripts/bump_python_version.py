import os
import re
import glob
import semver
import json

PACKAGE = "common_grants_sdk"
PYPROJECT_PATH = "lib/python-sdk/pyproject.toml"
PACKAGE_JSON_PATH = "lib/python-sdk/package.json"
CHANGELOG_PATH = "lib/python-sdk/CHANGELOG.md"

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

def update_package_json(new_version):
    if not os.path.exists(PACKAGE_JSON_PATH):
        print("package.json not found, skipping update.")
        return

    with open(PACKAGE_JSON_PATH, "r") as f:
        data = json.load(f)

    data["version"] = new_version

    with open(PACKAGE_JSON_PATH, "w") as f:
        json.dump(data, f, indent=2)
        f.write("\n")

    print(f"Bumped {PACKAGE} to version {new_version} in package.json")

def update_changelog(new_version, bump_type):
    entry = f"## {new_version}\n\n- {bump_type} release based on changeset\n\n"

    if os.path.exists(CHANGELOG_PATH):
        with open(CHANGELOG_PATH, "r") as f:
            existing = f.read()
        with open(CHANGELOG_PATH, "w") as f:
            f.write(entry + "\n" + existing)
    else:
        with open(CHANGELOG_PATH, "w") as f:
            f.write("# Changelog\n\n" + entry)

    print(f"Updated CHANGELOG.md for version {new_version}")

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
    update_package_json(new_version)
    update_changelog(new_version, highest)

if __name__ == "__main__":
    main()
