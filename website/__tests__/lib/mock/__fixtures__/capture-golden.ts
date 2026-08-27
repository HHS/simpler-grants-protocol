/**
 * Regenerates `golden-envelopes.json` from the 3A standalone Worker (#1078).
 *
 * The byte-identity AC compares this site's Astro endpoint against the Worker's
 * actual output, but `mock-api/` does not exist on this branch — it lives on
 * `karina/1077-cloudflareworkermock`. So the corpus is captured once from a
 * worktree of that branch and checked in.
 *
 * Usage (from `website/`):
 *
 *   git worktree add /tmp/3a-worktree karina/1077-cloudflareworkermock
 *   pnpm exec tsx __tests__/lib/mock/__fixtures__/capture-golden.ts \
 *     /tmp/3a-worktree/mock-api/src/index.ts
 *
 * Since #1101 the fixture records' home is this site's copy
 * (`src/lib/mock/data/fixtures.ts`), which has grown past the 3A branch's
 * committed set. Before capturing, copy it over the worktree's
 * `mock-api/src/data/fixtures.ts` (the module is self-contained, so the copy
 * is safe) — the corpus then pins handler parity over the same data, which is
 * the guarantee this suite is for. Capturing without that copy regresses the
 * corpus to the old 11-record set.
 *
 * The Worker's handler is a pure `fetch(Request) => Response` over standard
 * Fetch API globals, so Node 22 replays it faithfully with no wrangler process
 * and no network. The module path is an argument rather than a static import
 * because it points outside this package — `tsc` must not try to resolve it.
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import { REQUEST_MATRIX } from "./request-matrix";

/** Host used for capture; nothing in the envelopes echoes the origin. */
const CAPTURE_ORIGIN = "https://mock.example";

/** The Worker's default export, narrowed to the one method used here. */
interface WorkerModule {
  default: { fetch(request: Request): Promise<Response> };
}

export interface GoldenEnvelope {
  status: number;
  contentType: string | null;
  /** Raw response text — never re-serialized, so key order is preserved. */
  body: string;
}

/** Replays the matrix against `worker` and returns entries keyed by case name. */
export async function captureGoldenEnvelopes(
  worker: WorkerModule["default"],
): Promise<Record<string, GoldenEnvelope>> {
  const captured: Record<string, GoldenEnvelope> = {};

  for (const testCase of REQUEST_MATRIX) {
    const request = new Request(`${CAPTURE_ORIGIN}${testCase.path}`, {
      method: testCase.method,
      body: testCase.body,
      headers:
        testCase.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
    });
    const response = await worker.fetch(request);

    captured[testCase.name] = {
      status: response.status,
      contentType: response.headers.get("Content-Type"),
      body: await response.text(),
    };
  }

  return captured;
}

async function main(): Promise<void> {
  const workerPath = process.argv[2];
  if (!workerPath) {
    console.error(
      "Usage: tsx capture-golden.ts <path to mock-api/src/index.ts on karina/1077-cloudflareworkermock>",
    );
    process.exit(1);
  }

  const worker = (await import(path.resolve(workerPath))) as WorkerModule;
  const captured = await captureGoldenEnvelopes(worker.default);

  const outputPath = path.join(import.meta.dirname, "golden-envelopes.json");
  await writeFile(
    outputPath,
    `${JSON.stringify(captured, null, 2)}\n`,
    "utf-8",
  );

  console.log(
    `Captured ${Object.keys(captured).length} envelopes to ${outputPath}`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await main();
}
