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
| `pnpm run check:astro`    | Check Astro build and type safety                          |
| `pnpm run checks`         | Run all CI checks listed above                             |
