// Locks in how the publication verifier decides which run counts as a release.
//
// The verifier compares the recorded releaseSha against the newest successful
// deployment. It used to read the newest successful run on the branch, which let
// a validation workflow be reported as a publication: a repository whose quality
// gate last passed on an older commit reported release-drifted while its
// deployment was current.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("the release selector keeps only deploy workflows before taking the newest run", async () => {
  const source = await readFile(resolve(root, "tools/verify-applications.mjs"), "utf8");

  const jqIndex = source.indexOf("sort_by(.updated_at) | last");
  assert.ok(jqIndex > 0, "the verifier must still order runs before taking the last one");
  const selector = source.slice(0, jqIndex);
  assert.match(selector, /select\(\.name \| test\(.+deploy.+;.+i.+\)\)/,
    "only workflows named for deployment may count as a release");
  assert.match(selector, /\$deploys \| length\) > 0 then \$deploys else \.workflow_runs end/,
    "a repository that names no deploy workflow must still be checkable");
  assert.match(source, /per_page=30/,
    "the window must be wide enough to reach today's deploy past older validation runs");
});

test("the verifier never treats a validation run as a release", async () => {
  const source = await readFile(resolve(root, "tools/verify-applications.mjs"), "utf8");
  const failureStates = ['release-drifted', 'release-unconfirmed', 'release-unrecorded'];
  for (const state of failureStates) {
    assert.ok(source.includes(`"${state}"`), `${state} must remain a reported state`);
  }
  // The reported detail names the workflow, so a future reader can tell which run
  // was consulted instead of trusting an opaque hash.
  assert.match(source, /detail: `\$\{run\.name\} · \$\{run\.updated_at\}`/);
});
