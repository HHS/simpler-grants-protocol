#!/usr/bin/env node

// Workaround for pnpm audit 410 error (pnpm/pnpm#11265).
//
// npm retired the legacy audit endpoints on 2026-04-15, returning
// 410 Gone. pnpm <=10.x (and 11.0.0-rc.0) still uses the old
// endpoints. This script calls the replacement bulk advisory
// endpoint directly.
//
// Usage:
//   node audit-deps.js [options]
//
// Options:
//   --level <severity>    Minimum severity to fail on (low|moderate|high|critical). Default: low
//   --filter <pattern>    pnpm workspace filter (e.g. @common-grants/cli)
//   --ignore-ghsa <id>    GHSA ID to ignore (can be repeated)
//
// Requires pnpm on PATH. Remove this script once pnpm ships
// native support for the new endpoint.

'use strict';

const { execSync } = require('node:child_process');
const https = require('node:https');

const BULK_ENDPOINT =
  'https://registry.npmjs.org/-/npm/v1/security/advisories/bulk';

const SEVERITY_ORDER = ['low', 'moderate', 'high', 'critical'];
const REQUEST_TIMEOUT_MS = 30_000;

// ---------------------------------------------------------------------------
// Parse arguments
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
let level = 'low';
let filter = '';
const ignoreGhsas = new Set();

for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--level':
      level = args[++i];
      break;
    case '--filter':
      filter = args[++i];
      break;
    case '--ignore-ghsa':
      ignoreGhsas.add(args[++i]);
      break;
    default:
      console.error('Unknown option: ' + args[i]);
      process.exit(1);
  }
}

const threshold = SEVERITY_ORDER.indexOf(level);
if (threshold === -1) {
  console.error(
    'Unknown severity: ' + level + '. Use: low, moderate, high, or critical'
  );
  process.exit(1);
}
const severityGate = new Set(SEVERITY_ORDER.slice(threshold));

// ---------------------------------------------------------------------------
// 1. Collect all transitive dependencies via pnpm
// ---------------------------------------------------------------------------

const listCmd = filter
  ? `pnpm list --filter ${filter} --json --depth=Infinity`
  : 'pnpm list --json --depth=Infinity';

let raw;
try {
  raw = execSync(listCmd, {
    encoding: 'utf8',
    maxBuffer: 50 * 1024 * 1024,
  });
} catch (err) {
  console.error(
    'Failed to list dependencies. Is pnpm installed and have you run pnpm install?\n' +
      (err.stderr || err.message)
  );
  process.exit(1);
}

const projects = JSON.parse(raw);
const deps = {};
const seen = new Set();

function walk(tree) {
  for (const [name, info] of Object.entries(tree || {})) {
    const key = name + '@' + info.version;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!deps[name]) deps[name] = [];
    if (!deps[name].includes(info.version)) deps[name].push(info.version);
    walk(info.dependencies);
  }
}
for (const project of projects) {
  walk(project.dependencies);
  walk(project.devDependencies);
}

const count = Object.keys(deps).length;
console.log('Auditing ' + count + ' packages\u2026');

// ---------------------------------------------------------------------------
// 2. POST to the bulk advisory endpoint
// ---------------------------------------------------------------------------

const body = JSON.stringify(deps);

const req = https.request(
  BULK_ENDPOINT,
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
    timeout: REQUEST_TIMEOUT_MS,
  },
  function (res) {
    let data = '';
    res.on('data', function (chunk) {
      data += chunk;
    });
    res.on('end', function () {
      if (res.statusCode !== 200) {
        console.error('Registry returned ' + res.statusCode + ': ' + data);
        process.exit(1);
      }

      const advisories = JSON.parse(data);
      const affected = Object.keys(advisories);

      if (affected.length === 0) {
        console.log('No vulnerabilities found.');
        process.exit(0);
      }

      let gated = 0;
      for (const pkg of affected) {
        for (const advisory of advisories[pkg]) {
          const ghsaId = (advisory.url || '').split('/').pop() || '';
          if (ignoreGhsas.has(ghsaId)) continue;

          const sev = advisory.severity;
          const icon =
            sev === 'critical'
              ? '\u{1F534}'
              : sev === 'high'
                ? '\u{1F7E0}'
                : sev === 'moderate'
                  ? '\u{1F7E1}'
                  : '\u26AA';
          console.log(
            icon +
              ' ' +
              sev.padEnd(9) +
              ' ' +
              pkg +
              ' ' +
              advisory.vulnerable_versions +
              ' \u2014 ' +
              advisory.title +
              (ghsaId ? ' (' + ghsaId + ')' : '')
          );
          if (severityGate.has(sev)) gated++;
        }
      }

      if (gated > 0) {
        console.error(
          '\n' + gated + ' advisory(ies) at or above "' + level + '" severity.'
        );
        process.exit(1);
      }
      console.log('\nNo advisories at or above "' + level + '" severity.');
    });
  }
);

req.on('timeout', function () {
  req.destroy();
  console.error('Request timed out after ' + REQUEST_TIMEOUT_MS + 'ms');
  process.exit(1);
});

req.on('error', function (err) {
  console.error('Request failed: ' + err.message);
  process.exit(1);
});

req.write(body);
req.end();
