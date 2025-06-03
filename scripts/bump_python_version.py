import os
import re
import glob
import semver

PACKAGE = "common_grants_sdk"
SETUP_PATH = "lib/python-sdk/common_grants_sdk/setup.py"

def parse_changesets():
    changeset_files = glob.glob(".changeset/*.md")
    bumps = []

    for file in changeset_files:
        with open(file, "r") as f:
            contents = f.read()
            if PACKAGE in contents:
                # Match version type: "common_grants_sdk": patch
                match = re.search(rf'"{PACKAGE}":\s*(major|minor|patch)', contents)
                if match:
                    bumps.append(match.group(1))

    return bumps

def get_current_version():
    with open(SETUP_PATH, "r") as f:
        content = f.read()
        match = re.search(r'version=["\'](\d+\.\d+\.\d+)["\']', content)
        if match:
            return match.group(1)
        raise ValueError("Current version not found in setup.py")

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

def update_setup_py(new_version):
    with open(SETUP_PATH, "r") as f:
        content = f.read()

    updated = re.sub(
        r'version=["\'](\d+\.\d+\.\d+)["\']',
        f'version="{new_version}"',
        content
    )

    with open(SETUP_PATH, "w") as f:
        f.write(updated)

    print(f"Bumped {PACKAGE} to version {new_version}")

def update_changelog(new_version, bump_type):
    changelog_path = f"packages-python/{PACKAGE}/CHANGELOG.md"
    entry = f"## {new_version}\n\n- {bump_type} release based on changeset\n\n"

    # Prepend entry if file exists, else create new one
    if os.path.exists(changelog_path):
        with open(changelog_path, "r") as f:
            existing = f.read()
        with open(changelog_path, "w") as f:
            f.write(entry + "\n" + existing)
    else:
        with open(changelog_path, "w") as f:
            f.write("# Changelog\n\n" + entry)

    print(f"Updated CHANGELOG.md for version {new_version}")

def main():
    bumps = parse_changesets()
    if not bumps:
        print("No changesets found for Python package.")
        return

    # Pick the highest-impact bump
    bump_priority = {"major": 3, "minor": 2, "patch": 1}
    highest = max(bumps, key=lambda b: bump_priority[b])

    current = get_current_version()
    new_version = apply_bump(current, highest)
    update_setup_py(str(new_version))
    update_changelog(str(new_version), highest)

if __name__ == "__main__":
    main()
