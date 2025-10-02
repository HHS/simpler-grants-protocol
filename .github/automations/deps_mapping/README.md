# Dependency Mapping

This script generates a mermaid diagram of the dependencies between issues in a GitHub repository based on the ["Blocked by" and "Blocking"](https://github.blog/changelog/2025-08-21-dependencies-on-issues/#%e2%9e%95-getting-started) relationships feature.

## Usage

### Mapping dependencies for an entire repository

This will generate a diagram of the dependencies between all issues in the repository with a specific issue type, then update the `README.md` file with the diagram.

```bash
python run.py \
    --org HHS \
    --repo simpler-grants-protocol \
    --project 17 \
    --labels "co-planning" \
    --issue-type Epic \
    --scope repo
```

### Mapping dependencies for a single issue

This will generate a diagram of the dependencies upstream and downstream of a specific issue, and post the diagram to the "Dependencies" section within each issue's body.

```bash
python run.py \
    --org HHS \
    --repo simpler-grants-protocol \
    --project 17 \
    --issue-type Epic \
    --labels "co-planning" \
    --scope issue
```

## Configuring the sync behavior

The CLI supports the following options:

- `--org`: The GitHub organization that owns the repository
- `--repo`: The GitHub repository to sync data from
- `--labels`: The GitHub issue label to sync data from, can be specified multiple times
- `--state`: The GitHub issue state to sync data from (e.g. `open`, `closed`, `all`), defaults to `open`
- `--batch`: The number of issues to sync at a time, defaults to `100` which is the max batch size for the GitHub API
- `--scope`: The scope of the dependencies to map (`issue` or `repo`)
- `--dry-run`: Whether to run the sync in dry run mode (e.g. log the insert or update but don't actually perform them)

## Local development

Before running the script locally, you can use the `loadenv.sh` script to load the environment variables from a local `.env` file.

```bash
source loadenv.sh
python run.py \
    --org "HHS" \
    --repo "simpler-grants-gov" \
    --project 17 \
    --labels "co-planning" \
    --issue-type Epic \
    --scope issue
```

The environment variables that need to be set are:
- `GITHUB_API_TOKEN`: The GitHub API token
- `FIDER_API_TOKEN`: The Fider API token
- `FIDER_BOARD`: The name of the Fider board to sync to (e.g. `commongrants` for the CommonGrants.Fider.io board)

You can also run the script with the `--dry-run` flag to see what would be done without actually performing the actions.
