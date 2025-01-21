# CommonGrants protocol website

Code for the [CommonGrants protocol website](https://hhs.github.io/simpler-grants-protocol/) and public docs. This site is built using the [Starlight docs](https://starlight.astro.build/) from Astro and hosted on GitHub pages.

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

All commands are run from the root of the project, from a terminal:

| Command                   | Action                                       |
| :------------------------ | :------------------------------------------- |
| `npm install`             | Installs dependencies                        |
| `npm run dev`             | Starts local dev server at `localhost:4321`  |
| `npm run build`           | Build your production site to `./dist/`      |
| `npm run preview`         | Preview your build locally, before deploying |
| `npm run astro -- --help` | Get help using the Astro CLI                 |
| `npm run format`          | Run automatic formatting and fix issues      |
| `npm run lint`            | Run automatic linting and fix issues         |
| `npm run check:format`    | Check formatting, fail if issues are found   |
| `npm run check:lint`      | Check linting, fail if issues are found      |
| `npm run check:spelling`  | Check spelling, fail if issues are found     |
| `npm run check:astro`     | Check Astro build and type safety            |
| `npm run checks`          | Run all CI checks listed above               |
