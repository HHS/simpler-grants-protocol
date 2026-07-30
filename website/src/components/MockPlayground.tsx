import React, { useEffect, useState } from "react";
import yaml from "js-yaml";
import { setupWorker } from "msw/browser";
import OpenApiDocs, { defaultVersion } from "./OpenApiDocs";
import {
  opportunitiesHandler,
  type OpenApiSpec,
} from "@/lib/mock/opportunities-handler";

/**
 * Throwaway MSW playground (#1034-T2): starts a Mock Service Worker that
 * answers `GET /common-grants/opportunities` from the rendered OpenAPI spec,
 * then renders the shared `OpenApiDocs` island with "Try it out" enabled.
 *
 * The worker registers at root scope with `onUnhandledRequest: 'bypass'`, so
 * only the one mocked path is intercepted; everything else passes through.
 * It is stopped on unmount to avoid leaking across page navigation.
 */
export default function MockPlayground() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let worker: ReturnType<typeof setupWorker> | undefined;
    // Tracks the in-flight start() so cleanup stops the worker only after it
    // has finished registering — avoids stop()-before-start() if the component
    // unmounts mid-startup. The default version matches what OpenApiDocs renders.
    let startup: Promise<unknown> | undefined;

    (async () => {
      const response = await fetch(`/openapi/openapi.${defaultVersion}.yaml`);
      const spec = yaml.load(await response.text(), {
        schema: yaml.CORE_SCHEMA,
      }) as OpenApiSpec;
      if (cancelled) return;

      worker = setupWorker(opportunitiesHandler(spec));
      startup = worker.start({
        onUnhandledRequest: "bypass",
        serviceWorker: { url: "/mockServiceWorker.js" },
      });
      await startup;
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
      void startup?.then(() => worker?.stop());
    };
  }, []);

  // Wait for the worker to activate so the first "Execute" is intercepted.
  if (!ready) {
    return <p>Starting mock service worker…</p>;
  }

  return <OpenApiDocs enableTryItOut />;
}
