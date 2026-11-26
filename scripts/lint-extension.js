// web-ext targets Firefox. Keep Chrome MV3 checks without pretending to ship a Firefox build.
import { spawnSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import assert from 'node:assert/strict';

const manifest = JSON.parse(readFileSync('manifest.json', 'utf8'));
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.background.service_worker);
assert.ok(manifest.content_security_policy.extension_pages.includes("script-src 'self'"));
// Chrome Web Store limits: the name is the store title, the description its summary.
assert.ok(manifest.name.length <= 75, `Store title is over 75 characters: ${manifest.name}`);
assert.ok(manifest.description.length <= 132, 'Store summary is over 132 characters');
const paths = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  ...Object.values(manifest.icons),
  ...Object.values(manifest.action.default_icon),
  ...manifest.content_scripts.flatMap((script) => script.js),
];
for (const path of paths) assert.ok(existsSync(path), `Missing packaged file: ${path}`);
for (const path of Object.values(manifest.icons))
  assert.ok(/\.(png|jpe?g)$/i.test(path), `Chrome cannot load this icon: ${path}`);

const result = spawnSync(
  process.execPath,
  ['node_modules/web-ext/bin/web-ext.js', 'lint', '--config=web-ext.config.mjs', '--output=json'],
  { encoding: 'utf8' }
);
if (result.error) throw result.error;
let report;
try {
  report = JSON.parse(result.stdout);
} catch {
  throw new Error(result.stderr || result.stdout || 'web-ext did not produce a report');
}
// Firefox caps names at 45 characters; Chrome allows 75 (checked above).
const firefoxNameLimit = (issue) =>
  issue.code === 'JSON_INVALID' && /"\/name" must NOT have more than 45/.test(issue.message);
const firefoxOnly = (issue) =>
  firefoxNameLimit(issue) ||
  (issue.file === 'manifest.json' &&
    ['BACKGROUND_SERVICE_WORKER_NOFALLBACK', 'ADDON_ID_REQUIRED'].includes(issue.code));
const errors = report.errors.filter((issue) => !firefoxOnly(issue));
for (const error of errors) console.error(`${error.file}: ${error.code}: ${error.message}`);
console.log(`Chrome MV3 manifest and web-ext: ${errors.length} errors.`);
console.log(
  `web-ext reports ${report.errors.filter(firefoxOnly).length} expected Firefox-only manifest differences and ${report.warnings.length} advisory warnings.`
);
if (errors.length || (result.status && !report.errors.length)) process.exitCode = 1;
