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
    `repos/${slug}/actions/runs?branch=main&status=success&per_page=10`,
    "--jq",
    "[.workflow_runs[] | {head_sha, updated_at, name}] | sort_by(.updated_at) | last",
  ], { timeout: 30000 });
  const run = JSON.parse(stdout);
  return run && run.head_sha ? run : null;
}

async function checkRepository(application) {
  const slug = repositorySlug(application.repository);
  if (!slug) return { state: "repository-check-unavailable", detail: "unrecognized repository URL" };
  try {
    const run = await latestSuccessfulDeployment(slug);
    if (!run) return { state: "release-unconfirmed", detail: "no successful deployment run found" };
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

    report.push(entry);
    const padded = `${application.code} `.padEnd(6, " ");
    console.log([
      padded,
      `verified ${application.lastVerified ?? "—"} (${age ?? "?"}d)`,
      offline ? "" : `publication=${entry.publication}`,
      offline ? "" : `release=${entry.repository}`,
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
