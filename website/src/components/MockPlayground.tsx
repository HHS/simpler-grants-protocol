import React, { useCallback, useEffect, useRef, useState } from "react";
import yaml from "js-yaml";
import { setupWorker, type SetupWorker } from "msw/browser";
import OpenApiDocs from "./OpenApiDocs";
import {
  buildHandlersFromSpec,
  type OpenApiSpec,
} from "@/lib/mock/spec-handlers";
import { buildOpportunityHandlers } from "@/lib/mock/opportunities/handlers";
import type { Version } from "@/lib/mock/opportunities/fixtures";

/**
 * Throwaway MSW playground (#1034-T3): starts a Mock Service Worker and answers
 * Swagger UI "Try it out" requests from handlers generated off the rendered
 * OpenAPI spec via `@mswjs/source`. The active handler set is swapped whenever
 * the version dropdown changes, so Try-it-out reflects the selected version
 * (0.1.0 / 0.2.0 / 0.3.0).
 *
 * The worker registers at root scope with `onUnhandledRequest: 'bypass'`, so
 * only spec'd paths are intercepted; everything else passes through. It is
 * stopped on unmount to avoid leaking across page navigation.
 */
export default function MockPlayground() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const workerRef = useRef<SetupWorker | undefined>(undefined);
  // Monotonic token so a slow spec fetch can't overwrite handlers for a version
  // the user has since switched away from (rapid dropdown toggles: latest wins).
  const versionTokenRef = useRef(0);
  // Set on unmount so an in-flight version change can't touch a stopped worker.
  const cancelledRef = useRef(false);

  // Start the worker once on mount.
  useEffect(() => {
    cancelledRef.current = false;
    const worker = setupWorker();
    workerRef.current = worker;

    const startup = worker.start({
      onUnhandledRequest: "bypass",
      serviceWorker: { url: "/mockServiceWorker.js" },
    });
    startup.then(() => {
      if (!cancelledRef.current) setReady(true);
    });

    return () => {
      cancelledRef.current = true;
      startup.then(() => worker.stop());
      workerRef.current = undefined;
    };
  }, []);

  // Fetch + parse the selected version's spec, generate handlers, and swap the
  // worker's active set. Wired to OpenApiDocs' version dropdown (and its
  // initial mount) via onVersionChange.
  const handleVersionChange = useCallback(async (version: string) => {
    const worker = workerRef.current;
    if (!worker) return;

    const token = ++versionTokenRef.current;
    try {
      const response = await fetch(`/openapi/openapi.${version}.yaml`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch spec v${version} (${response.status})`,
        );
      }
      const spec = yaml.load(await response.text(), {
        schema: yaml.CORE_SCHEMA,
      }) as OpenApiSpec;
      const specHandlers = await buildHandlersFromSpec(spec);
      const opportunityHandlers = buildOpportunityHandlers(version as Version);

      // Skip if unmounted or superseded by a newer version toggle.
      if (cancelledRef.current || token !== versionTokenRef.current) return;
      // Opportunity handlers first: MSW resolves first-match-wins, so they
      // override the generated `fromOpenApi` handlers for the same paths.
      worker.resetHandlers(...opportunityHandlers, ...specHandlers);
      setError(null);
    } catch (err) {
      if (cancelledRef.current || token !== versionTokenRef.current) return;
      console.warn(
        `[MockPlayground] Could not set up mocks for v${version}`,
        err,
      );
      setError(`Could not set up mocks for v${version}.`);
    }
  }, []);

  // Wait for the worker to activate so the first "Execute" is intercepted.
  if (!ready) {
    return <p>Starting mock service worker…</p>;
  }

  return (
    <>
      {error && <p role="alert">{error}</p>}
      <OpenApiDocs enableTryItOut onVersionChange={handleVersionChange} />
    </>
  );
}
