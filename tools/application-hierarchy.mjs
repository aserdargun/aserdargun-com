// Ownership is explicit: a learning prerequisite is not necessarily a parent.
export function applicationHierarchy(applications, parentApp = null, depth = 0) {
  return applications.filter((app) => (app.parentApp ?? null) === parentApp).flatMap((app) => [
    { application: app, depth },
    ...applicationHierarchy(applications, app.code, depth + 1),
  ]);
}
