// Fleet audit: does each registered application's release identity still match
// the commit that is actually deployed?
//
// The canonical catalog in data/living-system.json records, per application,
// the commit that a confirmed deployment run published (releaseSha) and the day
// that run happened (lastReleased). Those two claims are only true while they
// agree with the deployment history of the application repository, so this
// script reads the run history and reports every disagreement.
//
// It never writes the catalog. A release identity may only advance when a
// deployment run for that commit has actually concluded successfully; a build
// timestamp, a merge, or a run that merely started does not establish a release.
//
// Usage:
//   node tools/audit-release-identities.mjs            # table
//   node tools/audit-release-identities.mjs --json out.json
//
// Repository reads need an authenticated `gh` CLI.

import { writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(path.join(rootDir, "data/living-system.json"), "utf8"));

// A workflow that deploys is recognised by its name, not by its file name: the
// fleet uses `deploy-swa-<code>-...`, `Deploy <CODE> to Azure`, `quality`, and
// several other spellings for the same job.
const DEPLOY_NAME = /deploy/i;
const RUN_SCAN_LIMIT = 15;

export async function latestRuns(repository) {
  const { stdout } = await execFileAsync(
    "gh",
    [
      "run", "list",
      "--repo", `aserdargun/${repository}`,
      "--branch", "main",
      "--limit", String(RUN_SCAN_LIMIT),
      "--json", "workflowName,conclusion,status,headSha,createdAt,displayTitle,url",
    ],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  return JSON.parse(stdout);
}

// The newest run of each workflow, so a red validation run cannot hide the
// deployment that the same commit produced.
export function newestPerWorkflow(runs) {
  const newest = new Map();
  for (const run of runs) {
    const seen = newest.get(run.workflowName);
    if (!seen || run.createdAt > seen.createdAt) newest.set(run.workflowName, run);
  }
  return [...newest.values()];
}

export async function deployedCommit(application) {
  const runs = newestPerWorkflow(await latestRuns(`${application.code}-aserdargun-com`));
  const deploying = runs.filter((run) => DEPLOY_NAME.test(run.workflowName));
  const successful = deploying
    .filter((run) => run.status === "completed" && run.conclusion === "success")
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const [newest] = deploying;
  return {
    code: application.code,
    recordedSha: application.releaseSha ?? null,
    recordedOn: application.lastReleased ?? null,
    deployedSha: successful[0]?.headSha ?? null,
    deployedOn: successful[0]?.createdAt?.slice(0, 10) ?? null,
    deployWorkflow: newest?.workflowName ?? null,
    deployState: newest ? `${newest.status}/${newest.conclusion ?? "-"}` : "none",
    deployUrl: newest?.url ?? null,
  };
}

async function main() {
  const rows = [];
  for (const application of data.applications) {
    try {
      rows.push(await deployedCommit(application));
    } catch (error) {
      rows.push({ code: application.code, recordedSha: application.releaseSha ?? null, recordedOn: application.lastReleased ?? null, error: String(error.message ?? error).split("\n")[0] });
    }
  }

  if (process.argv.includes("--json")) {
    const target = process.argv[process.argv.indexOf("--json") + 1];
    await writeFile(target, `${JSON.stringify(rows, null, 2)}\n`);
    console.log(`wrote ${target}`);
    return 0;
  }

  const short = (sha) => (sha ? sha.slice(0, 8) : "—");
  console.log("code  recorded        deployed         on         state           verdict");
  const drift = [];
  for (const row of rows) {
    if (row.error) {
      console.log(`${row.code.padEnd(5)} ${short(row.recordedSha).padEnd(16)} ${"error".padEnd(16)} ${"—".padEnd(11)} ${"—".padEnd(16)} ${row.error}`);
      continue;
    }
    const inSync = row.recordedSha === row.deployedSha;
    if (!inSync) drift.push(row);
    console.log(
      `${row.code.padEnd(5)} ${short(row.recordedSha).padEnd(16)} ${short(row.deployedSha).padEnd(16)} ${String(row.deployedOn ?? "—").padEnd(11)} ${row.deployState.padEnd(16)} ${inSync ? "in sync" : "DRIFT"}`,
    );
  }
  console.log(`\n${rows.length - drift.length}/${rows.length} recorded release identities match the deployed commit.`);
  if (drift.length > 0) {
    console.log(`Drifted: ${drift.map((row) => row.code).join(", ")}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(await main());
}
