// Fleet-wide GitHub Action pin verification.
//
// Every aserdargun subdomain repository pins its third-party GitHub Actions to
// one canonical commit set, recorded in
// docs/superpowers/agent-team/deploy-protocol.md under "Kanonik eylem pinleri".
// A moving version tag is not an acceptable pin: the tag can be re-pointed
// after review, so the reviewed commit is not the one that runs.
//
// This script reads the sibling repositories next to this one and reports every
// `uses:` reference that does not match the canonical set. It never mutates a
// repository and it never reaches the network.
//
// The check is intentionally a local operator tool rather than a CI step: a
// checkout of aserdargun-com alone does not contain the sibling repositories, so
// a CI run would silently pass by finding nothing to inspect. Run it after
// adding a subdomain and before declaring a fleet-wide change complete.
//
// Usage:
//   node tools/verify-action-pins.mjs           # verify the fleet
//   node tools/verify-action-pins.mjs --quiet   # only report problems
//
// Exit codes: 0 canonical, 1 drift found.

import { readFileSync, readdirSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const fleetRoot = path.dirname(rootDir);
const quiet = process.argv.includes("--quiet");

// Verified against upstream on 30 September 2026.
export const CANONICAL_ACTION_PINS = new Map([
  ["actions/checkout", { sha: "3d3c42e5aac5ba805825da76410c181273ba90b1", version: "v7.0.1" }],
  ["actions/setup-node", { sha: "820762786026740c76f36085b0efc47a31fe5020", version: "v7.0.0" }],
  ["actions/upload-artifact", { sha: "043fb46d1a93c77aae656e7c1c64a875d1fc6a0a", version: "v7.0.1" }],
  ["actions/cache", { sha: "55cc8345863c7cc4c66a329aec7e433d2d1c52a9", version: "v6.1.0" }],
  // The `v1` tag of this action still points at a 2021 commit while the `v1`
  // branch head moved to 2024. The fleet pins the branch head; see the deploy
  // protocol for the additive-only difference between the two.
  ["Azure/static-web-apps-deploy", { sha: "4d27395796ac319302594769cfe812bd207490b1", version: "v1 branch head 2024-09-11" }],
]);

const USES_PATTERN = /^(\s*(?:-\s+)?uses:\s*)([A-Za-z0-9._/-]+)@([^ \t#]+)[ \t]*(#(.*))?$/;

export function fleetRepositories(fleetRootDir = fleetRoot) {
  return readdirSync(fleetRootDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && entry.name.endsWith("-aserdargun-com"))
    .map((entry) => entry.name)
    .sort();
}

export function workflowFiles(repositoryDir) {
  const workflowDir = path.join(repositoryDir, ".github", "workflows");
  if (!existsSync(workflowDir)) return [];
  return readdirSync(workflowDir)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .sort()
    .map((name) => path.join(workflowDir, name));
}

export function inspectWorkflow(source) {
  const findings = [];
  source.split("\n").forEach((line, index) => {
    const match = USES_PATTERN.exec(line);
    if (!match) return;
    const [, , action, ref, , comment] = match;
    // Local and reusable-workflow references carry no third-party pin.
    if (ref.startsWith("./") || ref.startsWith("docker://")) return;
    const canonical = CANONICAL_ACTION_PINS.get(action);
    if (!canonical) {
      findings.push({ line: index + 1, action, ref, kind: "unknown-action", comment: comment ?? "" });
      return;
    }
    if (ref !== canonical.sha) {
      // A ref that is a full or abbreviated commit hash is a pinned-but-wrong
      // commit; anything else that looks like a version is a moving tag.
      const isCommit = /^[0-9a-f]{7,40}$/.test(ref);
      const kind = isCommit ? "wrong-commit" : /^v?\d/.test(ref) ? "moving-tag" : "unpinned-ref";
      findings.push({ line: index + 1, action, ref, kind, expected: canonical.sha, comment: comment ?? "" });
      return;
    }
    if (comment !== undefined && comment.trim() !== canonical.version) {
      findings.push({ line: index + 1, action, ref, kind: "stale-comment", expected: canonical.version, comment });
    }
  });
  return findings;
}

export function verifyFleet(fleetRootDir = fleetRoot) {
  // The census is built from the files on disk, not from the findings, so the
  // summary shows what is actually pinned rather than what is expected.
  const census = new Map();
  const repositories = [];
  for (const repository of fleetRepositories(fleetRootDir)) {
    const repositoryDir = path.join(fleetRootDir, repository);
    const findings = [];
    let inspected = 0;
    for (const file of workflowFiles(repositoryDir)) {
      inspected += 1;
      const source = readFileSync(file, "utf8");
      for (const finding of inspectWorkflow(source)) {
        findings.push({ ...finding, repository, file: path.relative(repositoryDir, file) });
      }
      for (const line of source.split("\n")) {
        const match = USES_PATTERN.exec(line);
        if (!match) continue;
        const key = `${match[2]}@${match[3]}`;
        census.set(key, (census.get(key) ?? 0) + 1);
      }
    }
    repositories.push({ repository, inspected, findings });
  }
  return { census, repositories };
}

function main() {
  const { census, repositories } = verifyFleet();
  const problems = repositories.flatMap(({ repository, findings }) =>
    findings.map((finding) => ({ ...finding, repository })),
  );
  const inspectedFiles = repositories.reduce((sum, entry) => sum + entry.inspected, 0);

  if (!quiet) {
    console.log(`Fleet: ${repositories.length} repositories, ${inspectedFiles} workflow files\n`);
    console.log("Action pin census");
    for (const [key, count] of [...census.entries()].sort((a, b) => b[1] - a[1])) {
      const [action, ref] = key.split("@");
      const canonical = CANONICAL_ACTION_PINS.get(action);
      const mark = canonical && canonical.sha === ref ? "ok  " : "DRIFT";
      console.log(`  ${mark} ${String(count).padStart(3)}  ${key}`);
    }
    console.log("");
  }

  if (problems.length === 0) {
    console.log(`PASS — every pinned action matches the canonical commit set (${census.size} distinct references).`);
    return 0;
  }

  console.error(`FAIL — ${problems.length} action pin problem(s) across the fleet:\n`);
  for (const problem of problems) {
    const expectation = problem.expected ? ` (expected ${problem.expected})` : "";
    console.error(`  ${problem.repository}/${problem.file}:${problem.line}  ${problem.kind}  ${problem.action}@${problem.ref}${expectation}`);
  }
  console.error("\nThe canonical set is documented in docs/superpowers/agent-team/deploy-protocol.md.");
  return 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(main());
}
