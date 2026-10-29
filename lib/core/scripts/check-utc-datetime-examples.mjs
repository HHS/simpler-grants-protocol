// Fails if a `utcDateTime.fromISO(...)` example in the TypeSpec sources has no UTC offset.
// TypeSpec compiles offset-less values without complaint, but they fail Core's own
// `format: date-time` schema and the SDKs' timestamp validation.
import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

const root = join(import.meta.dirname, "..");
const libDir = join(root, "lib");
const call = /utcDateTime\.fromISO\(\s*"([^"]*)"/g;
const hasOffset = /(Z|[+-]\d{2}:\d{2})$/;

function* tspFiles(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) yield* tspFiles(path);
    else if (entry.name.endsWith(".tsp")) yield path;
  }
}

const problems = [];
let checked = 0;
for (const file of tspFiles(libDir)) {
  const source = readFileSync(file, "utf8");
  for (const match of source.matchAll(call)) {
    checked += 1;
    if (!hasOffset.test(match[1])) {
      const line = source.slice(0, match.index).split("\n").length;
      problems.push(
        `${relative(root, file)}:${line}: "${match[1]}" has no UTC offset`,
      );
    }
  }
}

if (problems.length > 0) {
  console.error(
    "utcDateTime examples need a UTC offset (for example, add `Z`):",
  );
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log(`All ${checked} utcDateTime.fromISO examples have a UTC offset.`);
