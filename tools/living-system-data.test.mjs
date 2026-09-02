import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import {
  assertValidLivingSystemData,
  getFreshnessState,
  loadLivingSystemData,
  summarizeApplications,
  validateLivingSystemData,
} from "./living-system-data.mjs";

const localized = (en, tr) => ({ en, tr });
const testToday = new Date("2026-08-28T12:00:00Z");

const validData = () => ({
  schemaVersion: 1,
  contentPolicyVersion: 1,
  generatedCopyVersion: 1,
  applications: [{
    code: "aia",
    kind: "atlas",
    systemRole: "core-learning",
    visibility: "public",
    status: "live",
    title: localized("AI Ecosystem Atlas", "AI Ecosystem Atlas"),
    summary: localized("Evidence-backed research console.", "Kanıta dayalı araştırma konsolu."),
    repository: "https://github.com/aserdargun/aia-aserdargun-com",
    address: "https://aia.aserdargun.com/",
    updatedAt: "2026-08-25",
    relatedMemoryIds: [],
  }],
  now: {
    updatedAt: "2026-08-21",
    week: "2026-W34",
    items: [
      { id: "week", timeframe: "week", title: localized("Week", "Hafta"), summary: localized("Work", "Çalışma"), tags: [localized("Week tag", "Hafta etiketi")] },
      { id: "month", timeframe: "month", title: localized("Month", "Ay"), summary: localized("Work", "Çalışma"), tags: [localized("Month tag", "Ay etiketi")] },
      { id: "long-term", timeframe: "long-term", title: localized("Long term", "Uzun vade"), summary: localized("Work", "Çalışma"), tags: [localized("Long-term tag", "Uzun vadeli etiket")] },
    ],
  },
  publicMemory: [],
  journeyEvidence: [],
});

const errorsFor = (mutate) => {
  const data = validData();
  mutate(data);
  return validateLivingSystemData(data, { today: testToday }).errors;
};
const errorMessages = (errors) => errors.map(({ message }) => message);
const errorText = (errors) => errorMessages(errors).join("\n");

const validPublicMemory = () => ({
  id: "public-memory",
  type: "decision",
  visibility: "public",
  title: localized("Memory", "Bellek"),
  summary: localized("Summary", "Özet"),
  publishedAt: "2026-08-21",
  updatedAt: "2026-08-21",
  sourceUrl: "https://nxt.aserdargun.com/p/opaque-id",
  sourceLabel: "NXT snapshot",
  relatedApplicationCodes: ["aia"],
  tags: [],
  evidenceUrls: [],
});

const validJourneyEvidence = () => ({
  stage: "01",
  period: null,
  decision: localized("Decision", "Karar"),
  evidenceUrls: [],
  relatedApplicationCodes: [],
});

test("accepts the minimal bilingual public manifest", () => {
  assert.deepEqual(validateLivingSystemData(validData()), { valid: true, errors: [] });
});

test("returns stable structured paths and codes at validator creation sites", () => {
  const data = validData();
  data.now.privateNote = "DO_NOT_ECHO_UNKNOWN_VALUE";
  data.applications[0].updatedAt = "2026-02-30";
  data.applications[0].address = "javascript:DO_NOT_ECHO_URL_VALUE";
  data.publicMemory = [{
    ...validPublicMemory(),
    visibility: "owner-only",
    relatedApplicationCodes: ["aia", "aia"],
  }];
  data.applications[0].relatedMemoryIds = ["public-memory"];

  const result = validateLivingSystemData(data, { today: testToday });
  assert.equal(result.valid, false);
  assert.ok(result.errors.every((error) => (
    error
      && typeof error.path === "string"
      && typeof error.code === "string"
      && typeof error.message === "string"
      && Object.keys(error).length === 3
  )));
  const byPath = new Map(result.errors.map((error) => [error.path, error]));
  assert.equal(byPath.get("now.privateNote")?.code, "unknown-key");
  assert.equal(byPath.get("applications[0].updatedAt")?.code, "invalid-date");
  assert.equal(byPath.get("applications[0].address")?.code, "unsafe-url");
  assert.equal(byPath.get("publicMemory[0].visibility")?.code, "privacy-boundary");
  assert.equal(byPath.get("publicMemory[0].relatedApplicationCodes[1]")?.code, "relationship-duplicate");
  const mismatchData = validData();
  mismatchData.publicMemory = [{ ...validPublicMemory(), relatedApplicationCodes: [] }];
  mismatchData.applications[0].relatedMemoryIds = ["public-memory"];
  assert.equal(
    validateLivingSystemData(mismatchData, { today: testToday }).errors.some(({ code }) => code === "relationship-mismatch"),
    true,
  );
  const serialized = JSON.stringify(result);
  for (const secret of ["DO_NOT_ECHO_UNKNOWN_VALUE", "DO_NOT_ECHO_URL_VALUE", "owner-only"]) {
    assert.equal(serialized.includes(secret), false);
  }
});

test("requires application-to-memory relationships to be reciprocated with stable record paths", () => {
  const data = validData();
  const memory = validPublicMemory();
  memory.id = "decision-x";
  memory.relatedApplicationCodes = [];
  data.publicMemory = [memory];
  data.applications[0].relatedMemoryIds = ["decision-x"];

  assert.ok(errorMessages(validateLivingSystemData(data).errors).includes(
    "applications[aia].relatedMemoryIds contains decision-x, but publicMemory[decision-x].relatedApplicationCodes does not contain aia",
  ));
});

test("requires memory-to-application relationships to be reciprocated with stable record paths", () => {
  const data = validData();
  const memory = validPublicMemory();
  memory.id = "decision-x";
  data.publicMemory = [memory];

  assert.ok(errorMessages(validateLivingSystemData(data).errors).includes(
    "publicMemory[decision-x].relatedApplicationCodes contains aia, but applications[aia].relatedMemoryIds does not contain decision-x",
  ));
});

test("accepts one exact reciprocal application and public-memory relationship", () => {
  const data = validData();
  const memory = validPublicMemory();
  memory.id = "decision-x";
  data.publicMemory = [memory];
  data.applications[0].relatedMemoryIds = ["decision-x"];

  assert.deepEqual(validateLivingSystemData(data).errors, []);
});

test("keeps validator-accepted duplicate memory tags and evidence URLs trust-eligible", () => {
  const data = validData();
  const memory = validPublicMemory();
  memory.id = "decision-x";
  memory.tags = ["architecture", "architecture"];
  memory.evidenceUrls = ["https://example.com/evidence", "https://example.com/evidence"];
  data.publicMemory = [memory];
  data.applications[0].relatedMemoryIds = ["decision-x"];

  assert.deepEqual(validateLivingSystemData(data, { today: testToday }).errors, []);
});

test("rejects duplicate application and public-memory relationship entries", () => {
  const data = validData();
  const memory = validPublicMemory();
  memory.id = "decision-x";
  memory.relatedApplicationCodes = ["aia", "aia"];
  data.publicMemory = [memory];
  data.applications[0].relatedMemoryIds = ["decision-x", "decision-x"];

  const errors = validateLivingSystemData(data).errors;
  assert.ok(errorMessages(errors).includes("applications[0].relatedMemoryIds[1] duplicates an earlier relationship value; value=<redacted>."));
  assert.ok(errorMessages(errors).includes("publicMemory[0].relatedApplicationCodes[1] duplicates an earlier relationship value; value=<redacted>."));
  assert.equal(errorText(errors).includes("decision-x"), false);
  assert.equal(errorText(errors).includes("aia"), false);
});

test("rejects duplicate public-memory IDs without trusting or echoing the duplicate ID", () => {
  const data = validData();
  const first = validPublicMemory();
  first.relatedApplicationCodes = [];
  data.publicMemory = [first, structuredClone(first)];

  const message = errorText(validateLivingSystemData(data).errors);
  assert.match(message, /publicMemory\[1\]\.id duplicates publicMemory\[0\]\.id; value=<redacted>\./);
  assert.equal(message.includes("public-memory"), false);
});

test("journey evidence relationships resolve uniquely to public applications", () => {
  const missing = validData();
  missing.journeyEvidence = [{
    ...validJourneyEvidence(),
    relatedApplicationCodes: ["gpu"],
  }];
  assert.ok(errorMessages(validateLivingSystemData(missing).errors).includes(
    "journeyEvidence[0].relatedApplicationCodes[0] references applications[*].code=<redacted>, but no unique valid public target exists.",
  ));
  assert.equal(errorText(validateLivingSystemData(missing).errors).includes("gpu"), false);

  const duplicate = validData();
  duplicate.journeyEvidence = [{
    ...validJourneyEvidence(),
    relatedApplicationCodes: ["aia", "aia"],
  }];
  assert.ok(errorMessages(validateLivingSystemData(duplicate).errors).includes(
    "journeyEvidence[0].relatedApplicationCodes[1] duplicates an earlier relationship value; value=<redacted>.",
  ));
  assert.equal(errorText(validateLivingSystemData(duplicate).errors).includes("aia"), false);
});

test("redacts private, unresolved, duplicate, and reserved relationship identifiers", () => {
  const sourcePath = "fixtures/relationship-privacy.json";
  const cases = [
    {
      name: "owner-only duplicate memory ID",
      sentinel: "owner-secret-memory",
      expectedPaths: [/publicMemory\[0\]\.id/, /publicMemory\[1\]\.id/],
      mutate(data) {
        const publicRecord = { ...validPublicMemory(), id: this.sentinel, relatedApplicationCodes: [] };
        data.publicMemory = [publicRecord, { ...structuredClone(publicRecord), visibility: "owner-only" }];
      },
    },
    {
      name: "unresolved valid-looking application memory ID",
      sentinel: "unresolved-secret-memory",
      expectedPaths: [/applications\[0\]\.relatedMemoryIds\[0\]/, /publicMemory\[\*\]\.id=<redacted>/],
      mutate(data) { data.applications[0].relatedMemoryIds = [this.sentinel]; },
    },
    {
      name: "duplicate untrusted application memory relationship",
      sentinel: "duplicate-secret-memory",
      expectedPaths: [/applications\[0\]\.relatedMemoryIds\[1\]/, /value=<redacted>/],
      mutate(data) { data.applications[0].relatedMemoryIds = [this.sentinel, this.sentinel]; },
    },
    {
      name: "identifier on a structurally invalid public memory record",
      sentinel: "invalid-public-memory",
      expectedPaths: [/applications\[0\]\.relatedMemoryIds\[0\]/, /publicMemory\[\*\]\.id=<redacted>/],
      mutate(data) {
        data.applications[0].relatedMemoryIds = [this.sentinel];
        data.publicMemory = [{
          ...validPublicMemory(),
          id: this.sentinel,
          relatedApplicationCodes: [],
          privateNote: "owner-only content",
        }];
      },
    },
    {
      name: "identifier on a structurally invalid public application record",
      sentinel: "zzz",
      expectedPaths: [/publicMemory\[0\]\.relatedApplicationCodes\[0\]/, /applications\[\*\]\.code=<redacted>/],
      mutate(data) {
        data.applications[0].code = this.sentinel;
        data.applications[0].ownerPrompt = "owner-only prompt";
        data.publicMemory = [{ ...validPublicMemory(), relatedApplicationCodes: [this.sentinel] }];
      },
    },
    ...["stk", "inf", "nxt"].map((sentinel) => ({
      name: `reserved application code ${sentinel}`,
      sentinel,
      expectedPaths: [/applications\[0\]\.code/, /value=<redacted>/],
      mutate(data) { data.applications[0].code = sentinel; },
    })),
    {
      name: "unresolved journey application code",
      sentinel: "zzz",
      expectedPaths: [/journeyEvidence\[0\]\.relatedApplicationCodes\[0\]/, /applications\[\*\]\.code=<redacted>/],
      mutate(data) {
        data.journeyEvidence = [{ ...validJourneyEvidence(), relatedApplicationCodes: [this.sentinel] }];
      },
    },
    {
      name: "duplicate journey application code",
      sentinel: "zzz",
      expectedPaths: [/journeyEvidence\[0\]\.relatedApplicationCodes\[1\]/, /value=<redacted>/],
      mutate(data) {
        data.journeyEvidence = [{ ...validJourneyEvidence(), relatedApplicationCodes: [this.sentinel, this.sentinel] }];
      },
    },
  ];

  for (const testCase of cases) {
    const data = validData();
    testCase.mutate(data);
    assert.throws(
      () => assertValidLivingSystemData(data, { today: testToday, sourcePath }),
      (error) => {
        assert.match(error.message, new RegExp(`file=${sourcePath.replaceAll(".", "\\.")}`), testCase.name);
        for (const pattern of testCase.expectedPaths) assert.match(error.message, pattern, testCase.name);
        assert.equal(error.message.includes(testCase.sentinel), false, `${testCase.name} must not echo its sentinel`);
        return true;
      },
      testCase.name,
    );
  }
});

test("requires Now tags to be exact non-empty localized objects", () => {
  const validTags = validData();
  validTags.now.items[0].tags = [localized("GPU memory bandwidth", "GPU bellek bant genişliği")];
  assert.deepEqual(validateLivingSystemData(validTags).errors, []);

  const cases = [
    ["flat string", (data) => { data.now.items[0].tags = ["GPU memory bandwidth"]; }],
    ["missing Turkish", (data) => { data.now.items[0].tags = [{ en: "GPU memory bandwidth" }]; }],
    ["empty English", (data) => { data.now.items[0].tags = [localized("", "GPU bellek bant genişliği")]; }],
    ["unknown locale", (data) => { data.now.items[0].tags = [{ en: "GPU memory bandwidth", tr: "GPU bellek bant genişliği", de: "GPU-Speicherbandbreite" }]; }],
  ];

  for (const [name, mutate] of cases) {
    const errors = errorsFor(mutate);
    assert.match(errorText(errors), /tags\[0\].*localized/i, name);
  }
});

test("uses calendar-day freshness boundaries", () => {
  const today = new Date("2026-08-28T12:00:00+03:00");
  assert.equal(getFreshnessState("2026-08-21", today), "current");
  assert.equal(getFreshnessState("2026-08-20", today), "aging");
  assert.equal(getFreshnessState("2026-08-13", today), "needs-refresh");
});

test("reports every independent public-data contract failure", () => {
  const errors = errorsFor((data) => {
    data.applications[0].code = "AIA";
    data.applications.push({ ...data.applications[0] });
    data.applications[0].kind = "unknown";
    data.applications[0].repository = "https://github.com/other/aia-aserdargun-com";
    data.applications[0].address = "javascript:alert(1)";
    data.applications[0].updatedAt = "2026-02-30";
    delete data.applications[0].summary.tr;
    data.now.items.push({ ...data.now.items[0] });
    data.publicMemory.push({
      id: "memory-item",
      type: "decision",
      visibility: "private",
      title: localized("Memory", "Bellek"),
      summary: localized("Summary", "Özet"),
      publishedAt: "2026-08-21",
      updatedAt: "2026-08-21",
      sourceUrl: "https://example.com/p/not-nxt",
      sourceLabel: "NXT snapshot",
      relatedApplicationCodes: ["missing"],
      tags: [],
      evidenceUrls: [],
    });
    data.publicMemory.push({
      id: "memory-item",
      type: "decision",
      visibility: "public",
      title: localized("Other", "Diğer"),
      summary: localized("Summary", "Özet"),
      publishedAt: "2026-08-21",
      updatedAt: "2026-08-21",
      sourceUrl: "https://nxt.aserdargun.com/p/opaque-id",
      sourceLabel: "NXT snapshot",
      relatedApplicationCodes: [],
      tags: [],
      evidenceUrls: [],
    });
    data.journeyEvidence.push({
      stage: "stage one",
      period: "",
      decision: localized("Decision", "Karar"),
      evidenceUrls: ["javascript:alert(1)"],
      relatedApplicationCodes: ["missing"],
    });
  });

  assert.ok(errors.length > 10, `expected aggregate errors, received ${errors.length}`);
  assert.match(errorText(errors), /application code/i);
  assert.match(errorText(errors), /application kind/i);
  assert.match(errorText(errors), /GitHub repository/i);
  assert.match(errorText(errors), /HTTPS URL/i);
  assert.match(errorText(errors), /calendar date/i);
  assert.match(errorText(errors), /localized/i);
  assert.match(errorText(errors), /timeframe/i);
  assert.match(errorText(errors), /public memory/i);
  assert.match(errorText(errors), /NXT snapshot/i);
  assert.match(errorText(errors), /related application/i);
  assert.match(errorText(errors), /journey stage/i);
  assert.match(errorText(errors), /journey period/i);
});

test("rejects future dates while accepting explicit undated design horizons", () => {
  const futureErrors = errorsFor((data) => {
    data.applications[0].updatedAt = "2026-08-29";
  });
  assert.match(errorText(futureErrors), /future/i);

  const designData = validData();
  designData.applications[0] = {
    ...designData.applications[0],
    code: "eng",
    kind: "horizon",
    systemRole: "horizon",
    status: "design",
    updatedAt: null,
  };
  assert.deepEqual(validateLivingSystemData(designData).errors, []);
});

test("accepts a live public horizon-bridge atlas", () => {
  const bridgeData = validData();
  bridgeData.applications[0] = {
    ...bridgeData.applications[0],
    code: "wfm",
    systemRole: "horizon-bridge",
    title: localized("World Models Atlas", "World Models Atlas"),
    repository: "https://github.com/aserdargun/wfm-aserdargun-com",
    address: "https://wfm.aserdargun.com/",
  };

  assert.deepEqual(validateLivingSystemData(bridgeData).errors, []);
});

test("accepts a live public core-learning observatory", () => {
  const observatoryData = validData();
  observatoryData.applications[0] = {
    ...observatoryData.applications[0],
    code: "hns",
    kind: "observatory",
    title: localized("Harness Engineering Observatory", "Harness Engineering Observatory"),
    repository: "https://github.com/aserdargun/hns-aserdargun-com",
    address: "https://hns.aserdargun.com/",
  };

  assert.deepEqual(validateLivingSystemData(observatoryData).errors, []);
});

test("accepts the SEC observatory as a canonical public core-learning application", () => {
  const observatoryData = validData();
  observatoryData.applications[0] = {
    ...observatoryData.applications[0],
    code: "sec",
    kind: "observatory",
    title: localized("AI Systems Security Observatory", "AI Sistemleri Güvenlik Gözlemevi"),
    repository: "https://github.com/aserdargun/sec-aserdargun-com",
    address: "https://sec.aserdargun.com/",
  };

  assert.deepEqual(validateLivingSystemData(observatoryData).errors, []);
});

test("summarizes semantic system roles rather than application array length", () => {
  const applications = [
    { systemRole: "core-learning" },
    { systemRole: "core-learning" },
    { systemRole: "core-learning" },
    { systemRole: "core-learning" },
    { systemRole: "core-learning" },
    { systemRole: "lab" },
    { systemRole: "horizon-bridge" },
    { systemRole: "horizon" },
  ];

  assert.deepEqual(summarizeApplications(applications), {
    en: "Five core learning applications, one lab, one horizon bridge, and one long-term horizon.",
    tr: "Beş çekirdek öğrenme uygulaması, bir laboratuvar, bir ufuk köprüsü ve bir uzun vadeli ufuk.",
  });
});

test("fails closed for unknown sensitive-looking nested fields", () => {
  const errors = errorsFor((data) => {
    data.applications[0].ownerPrompt = "do not publish";
    data.now.driveFileId = "private-drive-file";
    data.now.items[0].privateNote = "owner-only";
    data.publicMemory.push({ ...validPublicMemory(), oauthToken: "secret" });
    data.journeyEvidence.push({ ...validJourneyEvidence(), ownerPrompt: "internal" });
  });

  for (const field of ["ownerPrompt", "driveFileId", "privateNote", "oauthToken"]) {
    assert.match(errorText(errors), new RegExp(`unknown key ${field}`, "i"));
  }
});

test("rejects non-canonical public URLs including credentials and NXT suffixes", () => {
  const cases = [
    ["GitHub userinfo", (data) => { data.applications[0].repository = "https://user:pass@github.com/aserdargun/aia-aserdargun-com"; }],
    ["explicit default HTTPS port", (data) => { data.applications[0].address = "https://aia.aserdargun.com:443/"; }],
    ["application query", (data) => { data.applications[0].address = "https://aia.aserdargun.com/?preview=1"; }],
    ["evidence fragment", (data) => { data.publicMemory.push({ ...validPublicMemory(), evidenceUrls: ["https://example.com/evidence#section"] }); }],
    ["NXT query", (data) => { data.publicMemory.push({ ...validPublicMemory(), sourceUrl: "https://nxt.aserdargun.com/p/opaque-id?draft=1" }); }],
    ["NXT fragment", (data) => { data.publicMemory.push({ ...validPublicMemory(), sourceUrl: "https://nxt.aserdargun.com/p/opaque-id#private" }); }],
    ["NXT credentials", (data) => { data.publicMemory.push({ ...validPublicMemory(), sourceUrl: "https://owner:token@nxt.aserdargun.com/p/opaque-id" }); }],
    ["NXT path traversal", (data) => { data.publicMemory.push({ ...validPublicMemory(), sourceUrl: "https://nxt.aserdargun.com/p/../private" }); }],
  ];

  for (const [name, mutate] of cases) {
    const errors = errorsFor(mutate);
    assert.match(errorText(errors), /canonical|NXT snapshot/i, name);
  }
});

test("public-memory privacy failures name the source file and forbidden field without echoing values", () => {
  const sourcePath = "fixtures/malicious-public-memory.json";
  const cases = [
    ["owner-only visibility", "visibility", "owner-only", (memory) => { memory.visibility = "owner-only"; }],
    ["unlisted visibility", "visibility", "unlisted", (memory) => { memory.visibility = "unlisted"; }],
    ["private identifier", "driveFileId", "PRIVATE_DRIVE_IDENTIFIER_7", (memory, secret) => { memory.driveFileId = secret; }],
    ["private content", "privateNote", "PRIVATE_CONTENT_VALUE_7", (memory, secret) => { memory.privateNote = secret; }],
    ["unknown field", "unexpectedField", "UNKNOWN_FIELD_VALUE_7", (memory, secret) => { memory.unexpectedField = secret; }],
    ["bad NXT host", "sourceUrl", "https://private.example/p/secret-snapshot", (memory, secret) => { memory.sourceUrl = secret; }],
    ["NXT query", "sourceUrl", "https://nxt.aserdargun.com/p/opaque-id?draft=secret", (memory, secret) => { memory.sourceUrl = secret; }],
    ["NXT fragment", "sourceUrl", "https://nxt.aserdargun.com/p/opaque-id#secret", (memory, secret) => { memory.sourceUrl = secret; }],
    ["NXT credentials", "sourceUrl", "https://owner:secret@nxt.aserdargun.com/p/opaque-id", (memory, secret) => { memory.sourceUrl = secret; }],
    ["NXT traversal", "sourceUrl", "https://nxt.aserdargun.com/p/%2e%2e/private-secret", (memory, secret) => { memory.sourceUrl = secret; }],
    ["missing application", "relatedApplicationCodes", "private-missing-code", (memory, secret) => { memory.relatedApplicationCodes = [secret]; }],
  ];

  for (const [name, field, forbiddenValue, mutate] of cases) {
    const data = validData();
    const memory = validPublicMemory();
    mutate(memory, forbiddenValue);
    data.publicMemory = [memory];

    assert.throws(
      () => assertValidLivingSystemData(data, {
        today: new Date("2026-08-28T12:00:00Z"),
        sourcePath,
      }),
      (error) => {
        assert.match(error.message, new RegExp(`file=${sourcePath.replaceAll(".", "\\.")}`), name);
        assert.match(error.message, new RegExp(field, "i"), name);
        assert.equal(error.message.includes(forbiddenValue), false, `${name} must not echo its forbidden value`);
        return true;
      },
      name,
    );
  }
});

test("rejects private-system records and reserved private-navigation codes", () => {
  for (const code of ["stk", "inf", "nxt"]) {
    const errors = errorsFor((data) => {
      data.applications[0].code = code;
    });
    assert.match(errorText(errors), /reserved/i, code);
  }

  const errors = errorsFor((data) => {
    data.applications[0].kind = "private-system";
    data.applications[0].visibility = "owner-only";
  });

  assert.match(errorText(errors), /private-system/i);
  assert.match(errorText(errors), /visibility must be public/i);
});

test("loads and validates the committed canonical manifest", async () => {
  const filePath = fileURLToPath(new URL("../data/living-system.json", import.meta.url));
  const data = await loadLivingSystemData(filePath);
  const canonicalToday = new Date("2026-09-02T12:00:00+03:00");

  assert.equal(data.applications.length, 11);
  assert.deepEqual(
    data.applications.find((application) => application.code === "hns"),
    {
      code: "hns",
      kind: "observatory",
      systemRole: "core-learning",
      visibility: "public",
      status: "live",
      title: localized("Harness Engineering Observatory", "Harness Engineering Observatory"),
      summary: localized(
        "A bilingual, source-backed observatory for comparing the harnesses, runtimes, orchestration, execution, verification, and observability layers that turn model capability into reliable agent systems.",
        "Model kabiliyetini güvenilir agent sistemlerine dönüştüren harness, runtime, orkestrasyon, yürütme, doğrulama ve gözlemlenebilirlik katmanlarını karşılaştıran iki dilli, kaynak-temelli gözlemevi.",
      ),
      repository: "https://github.com/aserdargun/hns-aserdargun-com",
      address: "https://hns.aserdargun.com/",
      updatedAt: "2026-09-02",
      relatedMemoryIds: [],
    },
  );
  assert.deepEqual(
    data.applications.find((application) => application.code === "wfm"),
    {
      code: "wfm",
      kind: "atlas",
      systemRole: "horizon-bridge",
      visibility: "public",
      status: "live",
      title: localized("World Models Atlas", "World Models Atlas"),
      summary: localized(
        "A living research atlas tracing how world models connect perception, prediction, planning, and action through primary sources.",
        "Dünya modellerinin algı, tahmin, planlama ve eylem arasındaki rolünü birincil kaynaklar üzerinden izleyen yaşayan bir araştırma atlası.",
      ),
      repository: "https://github.com/aserdargun/wfm-aserdargun-com",
      address: "https://wfm.aserdargun.com/",
      updatedAt: "2026-09-01",
      relatedMemoryIds: [],
    },
  );
  assert.deepEqual(
    data.applications.find((application) => application.code === "sec"),
    {
      code: "sec",
      kind: "observatory",
      systemRole: "core-learning",
      visibility: "public",
      status: "live",
      title: localized("AI Systems Security Observatory", "AI Sistemleri Güvenlik Gözlemevi"),
      summary: localized(
        "A bilingual, evidence-aware observatory for tracing AI-agent trust from model intent through identity, authorization, constrained action, audit, and incident recovery.",
        "AI agent güvenini model niyetinden kimlik, yetkilendirme, kısıtlı eylem, denetim ve olay kurtarmaya kadar izleyen iki dilli, kanıt duyarlı gözlemevi.",
      ),
      repository: "https://github.com/aserdargun/sec-aserdargun-com",
      address: "https://sec.aserdargun.com/",
      updatedAt: "2026-09-02",
      relatedMemoryIds: [],
    },
  );
  assert.deepEqual(validateLivingSystemData(data, { today: canonicalToday }).errors, []);
  assert.strictEqual(assertValidLivingSystemData(data, { today: canonicalToday }), data);
});

test("aggregate assertion reports every invalid path with code and message", () => {
  const data = validData();
  data.applications[0].code = "nxt";
  data.now.items[0].privateNote = "never expose";

  assert.throws(
    () => assertValidLivingSystemData(data, { today: new Date("2026-08-28T12:00:00+03:00") }),
    (error) => {
      assert.match(error.message, /path=applications\[0\]\.code code=privacy-boundary message=.*reserved/i);
      assert.match(error.message, /path=now\.items\[0\]\.privateNote code=unknown-key message=.*unknown key privateNote/i);
      return true;
    },
  );
});
