import { readFileSync, writeFileSync, mkdirSync } from "fs";
import * as path from "path";
import { Paths } from "../lib/schema/paths";

import type { PluginSourceEntry, PluginCacheEntry } from "../lib/plugins/types";

// =============================================================================
// HELPERS
// =============================================================================

async function fetchNpmMeta(
  packageUrl: string,
): Promise<{ url: string; language: string; version: string }> {
  const packageName = packageUrl.replace("https://www.npmjs.com/package/", "");
  const encodedName = packageName.replace("/", "%2F");
  const res = await fetch(`https://registry.npmjs.org/${encodedName}`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch npm metadata for "${packageName}": ${res.status}`,
    );
  }
  const data = await res.json();
  const version: string = data["dist-tags"]?.latest ?? "unknown";
  const latestData = data.versions?.[version] ?? {};
  const language =
    latestData.types || latestData.typings
      ? "TypeScript"
      : (data.keywords ?? []).includes("typescript")
        ? "TypeScript"
        : "JavaScript";
  const rawRepoUrl: string =
    typeof data.repository === "string"
      ? data.repository
      : (data.repository?.url ?? "");
  const url = rawRepoUrl
    .replace(/^git\+/, "")
    .replace(/^git:\/\//, "https://")
    .replace(/\.git$/, "");
  return { language, url, version };
}

async function fetchPypiMeta(
  packageUrl: string,
): Promise<{ url: string; language: string; version: string }> {
  const packageName = packageUrl
    .replace("https://pypi.org/project/", "")
    .replace(/\/$/, "");
  const res = await fetch(`https://pypi.org/pypi/${packageName}/json`);
  if (!res.ok) {
    throw new Error(
      `Failed to fetch PyPI metadata for "${packageName}": ${res.status}`,
    );
  }
  const data = await res.json();
  const info = data.info ?? {};
  const version: string = info.version ?? "unknown";
  const url: string =
    info.project_urls?.Source ??
    info.project_urls?.Homepage ??
    info.home_page ??
    "";
  return { language: "Python", url, version };
}

async function fetchPackageMeta(packageUrl: string) {
  if (packageUrl.includes("npmjs.com")) {
    return fetchNpmMeta(packageUrl);
  }
  if (packageUrl.includes("pypi.org")) {
    return fetchPypiMeta(packageUrl);
  }
  throw new Error(
    `Unsupported package registry URL: "${packageUrl}". ` +
      `Expected an npmjs.com or pypi.org URL.`,
  );
}

// =============================================================================
// GENERATOR
// =============================================================================

class PluginMetadataGenerator {
  static async generate(): Promise<void> {
    console.log("Fetching plugin metadata...");
    const startTime = Date.now();

    const indexPath = path.join(
      Paths.WEBSITE_ROOT,
      "src/content/plugins/index.json",
    );
    const source = JSON.parse(
      readFileSync(indexPath, "utf-8"),
    ) as Record<string, PluginSourceEntry>;

    const entries = await Promise.all(
      Object.entries(source).map(async ([id, entry]) => {
        console.log(`  Fetching metadata for "${id}" (${entry.packageUrl})...`);
        const fetched = await fetchPackageMeta(entry.packageUrl);
        const url = fetched.url || entry.repoUrl || "";
      const cacheEntry: PluginCacheEntry = { ...entry, ...fetched, url };
        return [id, cacheEntry] as const;
      }),
    );

    const output = Object.fromEntries(entries);

    mkdirSync(Paths.CACHE_DIR, { recursive: true });
    writeFileSync(Paths.PLUGIN_METADATA, JSON.stringify(output, null, 2));

    const duration = Date.now() - startTime;
    console.log(
      `Fetched metadata for ${entries.length} plugins in ${duration}ms`,
    );
    console.log(`Output written to: ${Paths.PLUGIN_METADATA}`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  PluginMetadataGenerator.generate().catch((error) => {
    console.error("Failed to fetch plugin metadata:", error);
    process.exit(1);
  });
}

export { PluginMetadataGenerator };
