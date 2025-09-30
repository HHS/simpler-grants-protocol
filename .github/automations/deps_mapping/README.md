# Dependency Mapping

This script generates a mermaid diagram of the dependencies between issues in a GitHub repository based on the ["Blocked by" and "Blocking"](https://github.blog/changelog/2025-08-21-dependencies-on-issues/#%e2%9e%95-getting-started) relationships feature.

## Usage

### Mapping dependencies for an entire repository

This will generate a diagram of the dependencies between all issues in the repository with a specific issue type, then update the `README.md` file with the diagram.

```bash
python run.py \
    --scope repo \
    --org HHS \
    --repo simpler-grants-protocol \
    --project 17 \
    --issue-type Epic
```

### Mapping dependencies for a single issue

> [!NOTE]
> **Coming soon:** This feature has been mocked up, but is not yet implemented.

This will generate a diagram of the dependencies upstream and downstream of a specific issue. In the future, this script will also update a "Dependencies" section within each issue's body.

```bash
python run.py \
    --scope issue \
    --org HHS \
    --repo simpler-grants-protocol \
    --project 17 \
    --issue-type Epic
```

## Next steps

- [ ] Update the script to map dependencies for a single issue when the `--scope` argument is set to `issue`
- [ ] Update the script to update the "Dependencies" section within each issue's body when the `--scope` argument is set to `issue`
- [ ] Create a GitHub action that triggers the repo-level dependency mapping workflow and opens a PR with the updated `README.md` file when the `--scope` argument is set to `repo`
- [ ] Create a GitHub action that triggers the issue-level dependency mapping workflow when the `--scope` argument is set to `issue`
- [ ] Add unit tests for the script
