// Ownership is explicit: a learning prerequisite is not necessarily a parent.
export function applicationParents(app) {
  return Array.isArray(app.sharedParentApps) ? app.sharedParentApps : (app.parentApp ? [app.parentApp] : []);
}

export function applicationOwnership(app, locale) {
  const parents = applicationParents(app).map((code) => code.toUpperCase()).join(" + ");
  if (!parents) return "";
  if (app.sharedParentApps) return locale === "tr" ? `${parents} ortak laboratuvarı` : `Shared laboratory of ${parents}`;
  return locale === "tr" ? `${parents} alt uygulaması` : `Sub-application of ${parents}`;
}

export function applicationHierarchy(applications, parentApp = null, depth = 0) {
  const rows = applications.filter((app) => !app.sharedParentApps && (app.parentApp ?? null) === parentApp).flatMap((app) => [
    { application: app, depth },
    ...applicationHierarchy(applications, app.code, depth + 1),
  ]);
  if (parentApp === null) {
    for (const app of applications.filter((app) => app.sharedParentApps)) {
      const index = Math.max(...app.sharedParentApps.map((code) => rows.findIndex(({ application }) => application.code === code)));
      let insertion = index + 1;
      while (insertion < rows.length && rows[insertion].depth > rows[index].depth) insertion++;
      rows.splice(insertion, 0, { application: app, depth: rows[index].depth + 1 });
    }
  }
  return rows;
}
