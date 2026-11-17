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

/**
 * Swagger UI `requestInterceptor` body: sends the selected spec's version as
 * `header` on calls to the mock, so an older spec page isn't served the
 * mock's default version. A non-empty value the user typed into the header
 * field wins. Other requests, such as the spec fetch, pass through untouched.
 *
 * @param request - The request Swagger UI is about to send.
 * @param options.version - The version selected on the page.
 * @param options.basePath - The mock's mount point, e.g. `/api`.
 * @param options.header - The version header's name, e.g. `CG-Version`.
 * @param options.origin - The page's origin, for resolving relative URLs.
 * @returns The same request, with the header set when it applies.
 */
export function withVersionHeader<T extends { url: string }>(
  request: T,
  options: {
    version: string;
    basePath: string;
    header: string;
    origin: string;
  },
): T {
  const { version, basePath, header, origin } = options;
  const url = new URL(request.url, origin);
  if (url.origin !== origin || !url.pathname.startsWith(`${basePath}/`)) {
    return request;
  }

  // Swagger UI's request type leaves `headers` untyped.
  const headers = ((request as { headers?: Record<string, string> }).headers ??=
    {});
  const name = header.toLowerCase();
  const existing = Object.keys(headers).find(
    (key) => key.toLowerCase() === name,
  );
  if (existing !== undefined && headers[existing] !== "") {
    return request;
  }

  if (existing !== undefined) delete headers[existing];
  headers[header] = version;
  return request;
}
