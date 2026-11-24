import { SchemaDocMapper } from "./schema-doc-mapper";
import { clearDeclarationIndexes } from "./source-declarations";

/** The render the caches were last cleared for, if any */
let refreshedForRender: object | undefined;

/**
 * Makes the next lookups re-read the protocol pages and source files, once
 * per render: the schema-to-page map and the declaration indexes. The dev
 * server calls this from each component that reads them, with the request's
 * `Astro.locals`, so a page reload shows a source or page edit while the
 * components on one page still share one read. A production build never
 * calls it, so it reads everything once per build.
 */
export function refreshSchemaSourcesForRender(render: object): void {
  if (render === refreshedForRender) return;
  refreshedForRender = render;
  clearDeclarationIndexes();
  SchemaDocMapper.clearCache();
}
