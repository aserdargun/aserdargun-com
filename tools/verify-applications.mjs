// Public verification pass over the registered application catalog.
//
// Checks, for every registered application:
//   1. the published address answers 200 over HTTPS and still serves that
//      application's own identity (code and registered title token);
//   2. when a releaseSha is recorded, the newest successful deployment workflow
//      run of that application repository still points at the same commit;
//   3. how old the recorded verification date is.
//
// The script never mutates the catalog. It reports what it observed so a human
// can decide whether a verification date may be renewed.
//
// Usage:
//   node tools/verify-applications.mjs                 # full check (needs network)
//   node tools/verify-applications.mjs --offline       # staleness only
//   node tools/verify-applications.mjs --json report.json
//   STALE_AFTER_DAYS=30 node tools/verify-applications.mjs
//
// Repository checks need a GitHub token that can read the application
// repositories (for example an authenticated `gh` CLI). Without one they are
// reported as "repository-check-unavailable" instead of failing the run.

import { readFile, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const STALE_AFTER_DAYS = Number.parseInt(process.env.STALE_AFTER_DAYS ?? "30", 10);

function todayUtc() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function daysBetween(earlier, later) {
  return Math.floor((later - earlier) / 86400000);
}

function ageInDays(dateOnly) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateOnly ?? "");
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  return daysBetween(new Date(Date.UTC(year, month - 1, day)), todayUtc());
}

function repositorySlug(repository) {
  const match = /^https:\/\/github\.com\/([^/]+)\/([^/]+)$/.exec(repository ?? "");
  return match ? `${match[1]}/${match[2]}` : null;
}

function stripHtml(html) {
  return html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<[^>]+>/g, " ");
}

async function fetchPage(address) {
  const response = await fetch(address, {
    redirect: "follow",
    headers: { "user-agent": "aserdargun-com-catalog-verifier" },
    signal: AbortSignal.timeout(20000),
  });
  const html = await response.text();
  return { status: response.status, finalUrl: response.url, html };
}

function pageIdentity({ application, html }) {
  const code = application.code.toUpperCase();
  const titleToken = application.title.en.split("—").pop().trim();
  const words = titleToken.split(/\s+/).filter((word) => word.length > 3 && !/^[A-Z]{2,}$/.test(word));
  const haystack = html.toLowerCase();
  const codeFound = haystack.includes(code.toLowerCase());
  const wordsFound = words.filter((word) => haystack.includes(word.toLowerCase().replace(/[^a-z0-9]/g, "")));
  return {
    codeFound,
    matchedWordCount: wordsFound.length,
    requiredWordCount: words.length,
    // A page that still carries the application code, or at least half of the
    // distinctive title words, is treated as the same published identity.
    identityHolds: codeFound || (words.length > 0 && wordsFound.length >= Math.ceil(words.length / 2)),
  };
}

async function latestSuccessfulDeployment(slug) {
  const { stdout } = await execFileAsync("gh", [
    "api",
    `repos/${slug}/actions/runs?branch=main&status=success&per_page=30`,
    "--jq",
    // Only a deploy workflow publishes. A validation or quality workflow on the
    // same branch is not a release, so it must not be reported as one. Fall back
    // to the newest successful run if a repository names none of its workflows
    // with "deploy", so an unusual naming convention cannot orphan it.
    "[.workflow_runs[] | select(.name | test(\"deploy\"; \"i\"))] as $deploys "
    + "| (if ($deploys | length) > 0 then $deploys else .workflow_runs end) "
    + "| [.[] | {head_sha, updated_at, name}] | sort_by(.updated_at) | last",
  ], { timeout: 30000 });
  const run = JSON.parse(stdout);
  return run && run.head_sha ? run : null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The catalog publishes a source and claim count for each application, and the
// application map now renders them. Those numbers drifted from the repositories
// they describe: SWI was published as 4 sources and 6 claims while its own
// content files held 11 and 13. The check below reads the sibling checkout when
// one is available and reports the difference; it never rewrites the catalog.
//
// Only applications whose repositories expose a canonical JSON evidence file are
// checked. Anything else is reported as unverified rather than guessed, because
// an invented count is exactly the failure this is meant to catch.
const evidenceFiles = {
  swi: { sources: "content/sources.json", claims: "content/claims.json" },
  ctx: { sources: "content/sources.json", claims: "content/claims.json" },
  hns: { sources: "content/sources.json", claims: "content/claims.json" },
  sec: { sources: "content/sources.json", claims: "content/claims.json" },
  cld: { sources: "src/data/sources.json" },
  aos: { sources: "docs/SOURCE_PROVENANCE.json", sourcesKey: "documents" },
};

async function readJsonIfPresent(file) {
  try {
    await access(file);
  } catch {
    return null;
  }
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
}

async function siblingWorkspace() {
  const workspace = process.env.ASERDARGUN_WORKSPACE ?? path.resolve(rootDir, "..");
  try {
    await access(workspace);
  } catch {
    return null;
  }
  return workspace;
}

async function checkEvidenceCounts(application, workspace) {
  const spec = evidenceFiles[application.code];
  if (!spec || !workspace) {
    return { state: "not-checked", detail: "" };
  }
  const repo = path.join(workspace, `${application.code}-aserdargun-com`);
  const sources = await readJsonIfPresent(path.join(repo, spec.sources));
  if (!sources) {
    return { state: "not-checked", detail: "evidence file not available locally" };
  }

  const actualSources = (Array.isArray(sources) ? sources : sources[spec.sourcesKey])?.length ?? null;
  const claimsDoc = spec.claims ? await readJsonIfPresent(path.join(repo, spec.claims)) : null;
  const actualClaims = Array.isArray(claimsDoc) ? claimsDoc.length : null;

  const problems = [];
  if (actualSources !== null && application.sourceCount !== undefined && application.sourceCount !== null && actualSources !== application.sourceCount) {
    problems.push(`sources ${application.sourceCount} recorded, ${actualSources} in ${spec.sources}`);
  }
  if (actualClaims !== null && application.claimCount !== undefined && application.claimCount !== null && actualClaims !== application.claimCount) {
    problems.push(`claims ${application.claimCount} recorded, ${actualClaims} in ${spec.claims}`);
  }
  if (problems.length === 0) {
    return { state: "counts-match", detail: `${actualSources ?? "?"} sources · ${actualClaims ?? "?"} claims`, actualSources, actualClaims };
  }
  return { state: "counts-drifted", detail: problems.join(" · "), actualSources, actualClaims };
}

// The runs index behind `status=success` is only eventually consistent. It
// intermittently answers with a stale page that hides the newest successful
// deployment, which makes a correct catalog look drifted. Observed repeatedly on
// 2026-09-30: the same catalog read as drifted for aia, usl, hex, dcl, bee, eng
// and gpu, and an immediate identical query returned the recorded SHA every
// time. So a single drift reading is never trusted on its own: the query is
// repeated, and only a second disagreeing answer counts as a real drift.
const DRIFT_CONFIRM_ATTEMPTS = 2;
const DRIFT_CONFIRM_DELAY_MS = 2000;

async function confirmDeploymentDrift(slug, run) {
  for (let attempt = 1; attempt < DRIFT_CONFIRM_ATTEMPTS; attempt += 1) {
    await sleep(DRIFT_CONFIRM_DELAY_MS);
    let retry;
    try {
      retry = await latestSuccessfulDeployment(slug);
    } catch {
      return run; // The re-read failed; keep the original reading rather than invent one.
    }
    if (!retry) continue;
    if (retry.head_sha !== run.head_sha) return retry;
  }
  return run;
}

async function checkRepository(application) {
  const slug = repositorySlug(application.repository);
  if (!slug) return { state: "repository-check-unavailable", detail: "unrecognized repository URL" };
  try {
    let run = await latestSuccessfulDeployment(slug);
    if (!run) return { state: "release-unconfirmed", detail: "no successful deployment run found" };
    if (application.releaseSha && run.head_sha !== application.releaseSha) {
      run = await confirmDeploymentDrift(slug, run);
    }
    const releasedOn = run.updated_at.slice(0, 10);
    if (!application.releaseSha) {
      return {
        state: "release-unrecorded",
        detail: `deployed ${run.head_sha.slice(0, 8)} · ${run.updated_at} is not recorded in the catalog`,
        deployedSha: run.head_sha,
        releasedOn,
      };
    }
    if (run.head_sha === application.releaseSha) {
      return { state: "release-matches", detail: `${run.name} · ${run.updated_at}`, deployedSha: run.head_sha, releasedOn };
    }
    return {
      state: "release-drifted",
      detail: `recorded ${application.releaseSha.slice(0, 8)} · deployed ${run.head_sha.slice(0, 8)} · ${run.updated_at}`,
      deployedSha: run.head_sha,
      releasedOn,
    };
  } catch (error) {
    return { state: "repository-check-unavailable", detail: String(error.stderr ?? error.message).trim().slice(0, 200) };
  }
}

async function main() {
  const args = process.argv.slice(2);
  const offline = args.includes("--offline");
  const jsonIndex = args.indexOf("--json");
  const jsonPath = jsonIndex >= 0 ? args[jsonIndex + 1] : null;
  if (args.some((argument, index) => argument.startsWith("--") && !["--offline", "--json"].includes(argument) && index !== jsonIndex + 1)) {
    throw new Error("Usage: node tools/verify-applications.mjs [--offline] [--json report.json]");
  }

  const data = JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
  const workspace = await siblingWorkspace();
  const report = [];
  let failures = 0;

  for (const application of data.applications) {
    const age = ageInDays(application.lastVerified);
    const entry = {
      code: application.code,
      address: application.address,
      lastVerified: application.lastVerified ?? null,
      verificationAgeDays: age,
      stale: age === null ? true : age > STALE_AFTER_DAYS,
      publication: offline ? "not-checked" : "pending",
      repository: offline ? "not-checked" : "pending",
      evidence: "pending",
      deployedSha: null,
      releasedOn: null,
      detail: "",
    };
    if (age === null) {
      entry.detail = "no verification date recorded";
      failures += 1;
    } else if (entry.stale) {
      entry.detail = `verification is ${age} days old (window ${STALE_AFTER_DAYS})`;
      failures += 1;
    }

    if (!offline) {
      try {
        const { status, finalUrl, html } = await fetchPage(application.address);
        if (status !== 200) {
          entry.publication = `http-${status}`;
          entry.detail = `${entry.detail} ${entry.detail ? "·" : ""} address answered ${status}`;
          failures += 1;
        } else {
          const identity = pageIdentity({ application, html });
          entry.publication = identity.identityHolds ? "identity-confirmed" : "identity-unconfirmed";
          if (!identity.identityHolds) {
            entry.detail = `${entry.detail} ${entry.detail ? "·" : ""} published page no longer shows ${application.code.toUpperCase()}`;
            failures += 1;
          }
          if (finalUrl.replace(/\/$/, "") !== application.address.replace(/\/$/, "")) {
            entry.detail = `${entry.detail} ${entry.detail ? "·" : ""} served from ${finalUrl}`;
          }
        }
      } catch (error) {
        entry.publication = "unreachable";
        entry.detail = `${entry.detail} ${entry.detail ? "·" : ""} ${String(error.message).slice(0, 120)}`;
        failures += 1;
      }

      const repository = await checkRepository(application);
      entry.repository = repository.state;
      entry.deployedSha = repository.deployedSha ?? null;
      entry.releasedOn = repository.releasedOn ?? null;
      if (repository.detail) entry.detail = `${entry.detail} ${entry.detail ? "·" : ""} ${repository.detail}`;
      if (["release-drifted", "release-unconfirmed", "release-unrecorded"].includes(repository.state)) failures += 1;
    }

    const evidence = await checkEvidenceCounts(application, workspace);
    entry.evidence = evidence.state;
    if (evidence.state === "counts-drifted") {
      entry.detail = `${entry.detail} ${entry.detail ? "·" : ""} evidence ${evidence.detail}`;
      failures += 1;
    }

    report.push(entry);
    const padded = `${application.code} `.padEnd(6, " ");
    console.log([
      padded,
      `verified ${application.lastVerified ?? "—"} (${age ?? "?"}d)`,
      offline ? "" : `publication=${entry.publication}`,
      offline ? "" : `release=${entry.repository}`,
      `evidence=${entry.evidence}`,
      entry.detail,
    ].filter(Boolean).join("  "));
  }

  if (jsonPath) await writeFile(path.resolve(rootDir, jsonPath), `${JSON.stringify(report, null, 2)}\n`);

  const stale = report.filter((entry) => entry.stale).map((entry) => entry.code);
  console.log(`\napplications=${report.length} stale=${stale.length} failures=${failures} window=${STALE_AFTER_DAYS}d`);
  if (stale.length > 0) console.log(`needs refresh: ${stale.join(", ")}`);
  if (failures > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
