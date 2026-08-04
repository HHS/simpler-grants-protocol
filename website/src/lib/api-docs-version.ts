/**
 * Resolve a `?version=` query value to a known OpenAPI version.
 *
 * Accepts both the bare form (`"0.2.0"`) and the `v`-prefixed form (`"v0.2.0"`)
 * used by internal deep links (e.g. the RFC pages). Falls back to the first
 * (latest) entry in `versions` when the value is missing or unrecognized.
 *
 * @param param - The raw `?version=` value (may be an empty string).
 * @param versions - Known versions, latest first.
 * @returns A version guaranteed to be present in `versions`.
 */
export function resolveVersion(param: string, versions: string[]): string {
  const normalized = param.replace(/^v/, "");
  return versions.includes(normalized) ? normalized : versions[0];
}
