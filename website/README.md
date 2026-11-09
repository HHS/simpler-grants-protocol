# CommonGrants protocol website

Code for the [CommonGrants protocol website](https://commongrants.org) and public docs. This site is built using the [Starlight docs](https://starlight.astro.build/) from Astro and hosted on GitHub pages.

## 🚀 Project Structure

The `website/` sub-directory is organized like this:

```
.
├── public/                 # Stores static assets like favicon
├── src/
│   ├── assets/             # Stores assets used at build-time like images
│   ├── content/
│   │   ├── docs/           # Stores the content for the site
│   └── content.config.ts   # Configures how the content is parsed and loaded
├── astro.config.mjs        # Configures site details like title, URL, etc.
├── package.json            # Manages dependencies and commands
└── tsconfig.json           # Manages TypeScript configuration
```

Starlight looks for `.md` or `.mdx` files in the `src/content/docs/` directory. Each file is exposed as a route based on its file name.

For more information about managing content, visit the Starlight docs, check out [Starlight’s docs](https://starlight.astro.build/), read [the Astro documentation](https://docs.astro.build)

## Commands

Run `pnpm install` once from the repo root. Then run these from `website/`, or from the repo root as `pnpm --filter website run <script>`.

| Command                   | Action                                                     |
| :------------------------ | :--------------------------------------------------------- |
| `pnpm run dev`            | Starts local dev server at `localhost:4321`                |
| `pnpm run build`          | Build your production site to `./dist/`                    |
| `pnpm run typespec`       | Regenerate the OpenAPI specs and JSON schemas in `public/` |
| `pnpm run preview`        | Preview your build locally, before deploying               |
| `pnpm astro --help`       | Get help using the Astro CLI                               |
| `pnpm run format`         | Run automatic formatting and fix issues                    |
| `pnpm run lint`           | Run automatic linting and fix issues                       |
| `pnpm run check:format`   | Check formatting, fail if issues are found                 |
| `pnpm run check:lint`     | Check linting, fail if issues are found                    |
| `pnpm run check:spelling` | Check spelling, fail if issues are found                   |
| `pnpm run check:types`    | Check TypeScript types, fail if issues are found           |
| `pnpm run check:a11y`     | Scan the built site for accessibility issues (see below)   |
| `pnpm run check:astro`    | Check Astro build and type safety                          |
| `pnpm run checks`         | Run the lint, format, type, Astro, and spelling checks     |

## Accessibility checks

Every pull request that changes the website runs an [axe](https://github.com/dequelabs/axe-core) accessibility scan in CI (the "Run accessibility scan" step of `.github/workflows/ci-website-preview.yml`). The scan:

- Serves the site built earlier in the same job from `dist/client`, so it runs on pull requests from forks and doesn't depend on the preview deploy.
- Opens each page listed in `a11y/pages.txt` in headless Chromium and checks it against WCAG 2.1 AA (axe tags `wcag2a`, `wcag2aa`, `wcag21a` and `wcag21aa`). Requests to other sites, such as analytics, are blocked.
- Fails on any issue axe rates "serious" or "critical" that isn't listed in `a11y/exceptions.txt`, and on any listed page that doesn't load. "Moderate" and "minor" issues don't fail the check.

The job log lists each new issue with the affected elements and a link to the rule's documentation, and the run's summary page shows the same results as a table.

### Run the scan locally

```bash
pnpm run build                                 # the scan checks the built site
pnpm exec playwright install chromium          # once, and again after a `playwright` version bump
pnpm run check:a11y
```

### Add a page to the scan

Add the page's path to `a11y/pages.txt`, one path per line, starting with `/` and written the way the site serves it, with the trailing slash (for example `/forms/sf424/`; the scan rejects a path without it). Lines starting with `#` are comments. Then run the scan, since a new page may surface issues to fix or list as exceptions.

Expect every new page to need an exception for `label-content-name-mismatch` until the search button in the site header is fixed (see the comment above those lines in `a11y/exceptions.txt`). The button appears on every page, so a new page fails the scan until you add `<page> label-content-name-mismatch` to the exceptions file. Once the header is fixed, all of those lines can be removed.

### Add or remove an exception

An exception lets the check pass while a known issue is still on a page. Fixing the issue is always preferred; add an exception only for an issue that can't be fixed in the same pull request, such as one that comes from a third-party component.

`a11y/exceptions.txt` holds one exception per line: the page path, a space, and the axe rule ID, for example:

```text
/protocol/api-docs/ color-contrast
```

- **To add one:** copy the line the failed scan prints under "add its line to a11y/exceptions.txt" (the line is also in the run's summary), and put a `#` comment above it saying why the issue can't be fixed yet. An exception covers every element on that page that breaks that rule, and only on that page.
- **To remove one:** delete its line once the issue is fixed. The scan prints a warning for any exception that no longer matches an issue, so stale lines are easy to spot.

The page in each exception must also be in `a11y/pages.txt`. A malformed or duplicate line fails the check.
