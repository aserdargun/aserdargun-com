import { readFileSync } from "node:fs";

const focus = JSON.parse(readFileSync(new URL("../data/system-focus.json", import.meta.url), "utf8"));

// The table and diagram share approved additions to the registered catalog. Entries
// may include verified public addresses before their full release metadata is
// registered in living-system.json. Canonical catalog entries take precedence.
export function systemFocusApplications(applications) {
  const result = applications.map((app) => ({ ...app }));
  for (const addition of focus.additionalApplications) {
    if (result.some((app) => app.code === addition.code)) continue;
    const parent = result.find((app) => app.code === addition.parentApp);
    if (!parent) continue;
    const entry = { ...addition, portfolioLayer: parent.portfolioLayer };
    const before = result.findIndex((app) => app.code === addition.before && app.parentApp === addition.parentApp);
    result.splice(before < 0 ? result.length : before, 0, entry);
  }
  return result;
}
