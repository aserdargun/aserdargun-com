import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

function applicationManifest(application) {
  return {
    code: application.code,
    name: application.title,
    shortName: application.code.toUpperCase(),
    description: application.summary,
    type: application.kind,
    status: application.status,
    statusLabel: application.statusLabel,
    languages: application.languages,
    productionUrl: application.address,
    repositoryUrl: application.repository,
    researchCutoff: application.researchCutoff,
    lastVerified: application.lastVerified,
    lastReleased: application.lastReleased,
    releaseSha: application.releaseSha,
    sourceCount: application.sourceCount,
    claimCount: application.claimCount,
    evidencePolicy: application.evidencePolicy,
    upstreamApps: application.upstreamApps,
    downstreamApps: application.downstreamApps,
    tracks: application.tracks,
    entityIds: application.entityIds,
    portfolioLayer: application.portfolioLayer,
    focusState: application.focusState,
  };
}

export function buildPortfolioRegistry({ applications, generatedAt }) {
  return {
    schemaVersion: 1,
    generatedAt,
    applications: applications.map(applicationManifest),
  };
}

function serialize(registry) {
  return `${JSON.stringify(registry, null, 2)}\n`;
}

async function runCli() {
  const args = process.argv.slice(2);
  if (args.some((argument) => argument !== "--check")) {
    throw new Error("Usage: node tools/portfolio-registry.mjs [--check]");
  }

  const rootDir = process.cwd();
  const source = JSON.parse(await readFile(path.join(rootDir, "data", "living-system.json"), "utf8"));
  const outputPath = path.join(rootDir, "portfolio.json");
  const output = serialize(buildPortfolioRegistry({
    applications: source.applications,
    generatedAt: [source.now.updatedAt, ...source.applications.map(({ updatedAt }) => updatedAt).filter(Boolean)].sort().at(-1),
  }));

  if (args.includes("--check")) {
    let current = "";
    try {
      current = await readFile(outputPath, "utf8");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (current !== output) {
      console.log("portfolio.json");
      process.exitCode = 1;
    }
    return;
  }

  await writeFile(outputPath, output);
}

const invokedAsCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedAsCli) {
  runCli().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
