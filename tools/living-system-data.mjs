import { readFile } from "node:fs/promises";

const TOP_LEVEL_KEYS = [
  "schemaVersion",
  "contentPolicyVersion",
  "generatedCopyVersion",
  "applications",
  "now",
  "publicMemory",
  "journeyEvidence",
];

const APPLICATION_KINDS = new Set(["atlas", "observatory", "tool", "lab", "horizon", "private-system"]);
const APPLICATION_VISIBILITIES = new Set(["public", "unlisted", "owner-only"]);
const APPLICATION_STATUSES = new Set(["idea", "design", "active", "live", "paused", "archived"]);
const SYSTEM_ROLES = new Set(["core-learning", "lab", "horizon-bridge", "horizon"]);
const MEMORY_TYPES = new Set(["event", "decision", "learning", "plan", "project", "publication"]);
const TIMEFRAMES = new Set(["week", "month", "long-term"]);
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_WEEK_PATTERN = /^(\d{4})-W(\d{2})$/;
const KEBAB_CASE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const APPLICATION_CODE_PATTERN = /^[a-z]{3}$/;
const RESERVED_PRIVATE_NAVIGATION_CODES = new Set(["stk", "inf", "nxt"]);
const APPLICATION_KEYS = new Set([
  "code", "kind", "systemRole", "visibility", "status", "title", "summary",
  "guidingQuestion", "repository", "address", "updatedAt", "relatedMemoryIds", "nextDirection",
]);
const NOW_KEYS = new Set(["updatedAt", "week", "items"]);
const NOW_ITEM_KEYS = new Set(["id", "timeframe", "title", "summary", "tags"]);
const PUBLIC_MEMORY_KEYS = new Set([
  "id", "type", "visibility", "title", "summary", "publishedAt", "updatedAt",
  "sourceUrl", "sourceLabel", "relatedApplicationCodes", "tags", "evidenceUrls",
]);
const JOURNEY_EVIDENCE_KEYS = new Set(["stage", "period", "decision", "evidenceUrls", "relatedApplicationCodes"]);

const isPlainObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

const addError = (errors, path, code, message) => errors.push({ path, code, message });

function dateFromDateOnly(value) {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null;
  return date;
}

function todayUtcDate(now = new Date()) {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isoWeekFor(date) {
  const working = new Date(date.getTime());
  const weekday = working.getUTCDay() || 7;
  working.setUTCDate(working.getUTCDate() + 4 - weekday);
  const year = working.getUTCFullYear();
  const yearStart = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil((((working - yearStart) / 86400000) + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function isCanonicalHttpsUrl(value) {
  if (typeof value !== "string") return false;
  try {
    const url = new URL(value);
    const authority = value.match(/^https:\/\/([^/?#]+)/i)?.[1] ?? "";
    const hostWithOptionalPort = authority.slice(authority.lastIndexOf("@") + 1);
    const hasExplicitPort = /:\d+$/.test(hostWithOptionalPort);
    return url.protocol === "https:"
      && url.username === ""
      && url.password === ""
      && url.port === ""
      && !hasExplicitPort
      && url.search === ""
      && url.hash === "";
  } catch {
    return false;
  }
}

function isGithubRepositoryForOwner(value) {
  if (!isCanonicalHttpsUrl(value)) return false;
  const url = new URL(value);
  return url.hostname === "github.com"
    && /^\/aserdargun\/[A-Za-z0-9][A-Za-z0-9_.-]*$/.test(url.pathname);
}

function isNxtSnapshotUrl(value) {
  if (!isCanonicalHttpsUrl(value)) return false;
  const url = new URL(value);
  return url.hostname === "nxt.aserdargun.com"
    && /^\/p\/[A-Za-z0-9_-]+$/.test(url.pathname);
}

function validateAllowedKeys(value, allowedKeys, label, errors) {
  for (const key of Object.keys(value)) {
    if (!allowedKeys.has(key)) addError(errors, `${label}.${key}`, "unknown-key", `${label} has unknown key ${key}.`);
  }
}

function validateLocalized(value, label, errors) {
  if (!isPlainObject(value)
    || Object.keys(value).length !== 2
    || typeof value.en !== "string" || value.en.trim() === ""
    || typeof value.tr !== "string" || value.tr.trim() === "") {
    addError(errors, label, "invalid-localized-value", `${label} must be a complete non-empty localized { en, tr } object.`);
  }
}

function validateDate(value, label, errors, today) {
  const date = dateFromDateOnly(value);
  if (!date) {
    addError(errors, label, "invalid-date", `${label} must be a real YYYY-MM-DD calendar date.`);
    return null;
  }
  if (date > today) addError(errors, label, "future-date", `${label} must not be a future date.`);
  return date;
}

function validateUrl(value, label, errors) {
  if (!isCanonicalHttpsUrl(value)) {
    addError(errors, label, "unsafe-url", `${label} must be a canonical HTTPS URL without credentials, ports, queries, or fragments.`);
  }
}

function validateOptionalLocalized(value, label, errors) {
  if (value !== undefined) validateLocalized(value, label, errors);
}

function trustedPublicIdentitySet(records, key, pattern, isPublicRecord) {
  if (!Array.isArray(records)) return new Set();
  const matches = new Map();
  for (const record of records) {
    if (!isPlainObject(record) || typeof record[key] !== "string" || !pattern.test(record[key])) continue;
    const occurrences = matches.get(record[key]) ?? [];
    occurrences.push(record);
    matches.set(record[key], occurrences);
  }
  return new Set([...matches]
    .filter(([, occurrences]) => occurrences.length === 1 && isPublicRecord(occurrences[0]))
    .map(([identity]) => identity));
}

function hasOnlyAllowedKeys(record, allowedKeys) {
  return Object.keys(record).every((key) => allowedKeys.has(key));
}

function isCompleteLocalized(value) {
  return isPlainObject(value)
    && Object.keys(value).length === 2
    && typeof value.en === "string" && value.en.trim() !== ""
    && typeof value.tr === "string" && value.tr.trim() !== "";
}

function isValidDateOnOrBefore(value, today) {
  const date = dateFromDateOnly(value);
  return date !== null && date <= today;
}

function isUniqueArrayOf(value, predicate) {
  return Array.isArray(value)
    && value.every(predicate)
    && new Set(value).size === value.length;
}

function isStructurallyValidPublicApplication(application, today) {
  const allowsNullUpdate = ["idea", "design", "paused", "archived"].includes(application.status);
  const validUpdate = application.updatedAt === null
    ? allowsNullUpdate
    : isValidDateOnOrBefore(application.updatedAt, today);
  return hasOnlyAllowedKeys(application, APPLICATION_KEYS)
    && typeof application.code === "string"
    && APPLICATION_CODE_PATTERN.test(application.code)
    && !RESERVED_PRIVATE_NAVIGATION_CODES.has(application.code)
    && APPLICATION_KINDS.has(application.kind)
    && application.kind !== "private-system"
    && application.visibility === "public"
    && APPLICATION_STATUSES.has(application.status)
    && SYSTEM_ROLES.has(application.systemRole)
    && isCompleteLocalized(application.title)
    && isCompleteLocalized(application.summary)
    && (application.guidingQuestion === undefined || isCompleteLocalized(application.guidingQuestion))
    && (application.nextDirection === undefined || isCompleteLocalized(application.nextDirection))
    && isGithubRepositoryForOwner(application.repository)
    && isCanonicalHttpsUrl(application.address)
    && validUpdate
    && isUniqueArrayOf(
      application.relatedMemoryIds,
      (memoryId) => typeof memoryId === "string" && KEBAB_CASE_PATTERN.test(memoryId),
    );
}

function isStructurallyValidPublicMemory(memory, today) {
  return hasOnlyAllowedKeys(memory, PUBLIC_MEMORY_KEYS)
    && typeof memory.id === "string"
    && KEBAB_CASE_PATTERN.test(memory.id)
    && MEMORY_TYPES.has(memory.type)
    && memory.visibility === "public"
    && isCompleteLocalized(memory.title)
    && isCompleteLocalized(memory.summary)
    && isValidDateOnOrBefore(memory.publishedAt, today)
    && isValidDateOnOrBefore(memory.updatedAt, today)
    && isNxtSnapshotUrl(memory.sourceUrl)
    && typeof memory.sourceLabel === "string" && memory.sourceLabel.trim() !== ""
    && Array.isArray(memory.tags)
    && memory.tags.every((tag) => typeof tag === "string" && tag.trim() !== "")
    && Array.isArray(memory.evidenceUrls)
    && memory.evidenceUrls.every(isCanonicalHttpsUrl)
    && isUniqueArrayOf(
      memory.relatedApplicationCodes,
      (code) => typeof code === "string" && APPLICATION_CODE_PATTERN.test(code),
    );
}

function validateApplications(applications, errors, today, trustedApplicationCodes) {
  if (!Array.isArray(applications)) {
    addError(errors, "applications", "invalid-type", "applications must be an array.");
    return new Set();
  }

  const codeFirstIndexes = new Map();
  for (const [index, application] of applications.entries()) {
    const label = `applications[${index}]`;
    if (!isPlainObject(application)) {
      addError(errors, label, "invalid-type", `${label} must be an object.`);
      continue;
    }
    validateAllowedKeys(application, APPLICATION_KEYS, label, errors);

    if (typeof application.code !== "string" || !APPLICATION_CODE_PATTERN.test(application.code)) {
      addError(errors, `${label}.code`, "invalid-application-code", `${label} application code must be a unique lowercase three-letter code.`);
    } else if (RESERVED_PRIVATE_NAVIGATION_CODES.has(application.code)) {
      addError(errors, `${label}.code`, "privacy-boundary", `${label}.code is reserved for private navigation; value=<redacted>.`);
    } else if (codeFirstIndexes.has(application.code)) {
      addError(errors, `${label}.code`, "duplicate-identity", `${label}.code duplicates applications[${codeFirstIndexes.get(application.code)}].code; value=<redacted>.`);
    } else {
      codeFirstIndexes.set(application.code, index);
    }

    if (!APPLICATION_KINDS.has(application.kind)) addError(errors, `${label}.kind`, "invalid-enum", `${label} application kind is not recognized.`);
    if (application.kind === "private-system") addError(errors, `${label}.kind`, "privacy-boundary", `${label} private-system applications are not allowed in this public manifest.`);
    if (!APPLICATION_VISIBILITIES.has(application.visibility)) addError(errors, `${label}.visibility`, "invalid-enum", `${label} application visibility is not recognized.`);
    if (application.visibility !== "public") addError(errors, `${label}.visibility`, "privacy-boundary", `${label} application visibility must be public in this public manifest.`);
    if (!APPLICATION_STATUSES.has(application.status)) addError(errors, `${label}.status`, "invalid-enum", `${label} application status is not recognized.`);
    if (!SYSTEM_ROLES.has(application.systemRole)) addError(errors, `${label}.systemRole`, "invalid-enum", `${label} systemRole is not recognized.`);

    validateLocalized(application.title, `${label}.title`, errors);
    validateLocalized(application.summary, `${label}.summary`, errors);
    validateOptionalLocalized(application.guidingQuestion, `${label}.guidingQuestion`, errors);
    validateOptionalLocalized(application.nextDirection, `${label}.nextDirection`, errors);

    if (!isGithubRepositoryForOwner(application.repository)) {
      addError(errors, `${label}.repository`, "unsafe-url", `${label} GitHub repository must be a canonical HTTPS repository under the aserdargun owner.`);
    }
    validateUrl(application.address, `${label}.address`, errors);

    const allowsNullUpdate = ["idea", "design", "paused", "archived"].includes(application.status);
    if (application.updatedAt === null) {
      if (!allowsNullUpdate) addError(errors, `${label}.updatedAt`, "required-value", `${label} updatedAt is required for active and live applications.`);
    } else {
      validateDate(application.updatedAt, `${label}.updatedAt`, errors, today);
    }
    if (application.updatedAt === undefined) addError(errors, `${label}.updatedAt`, "required-value", `${label} updatedAt is required.`);

    if (!Array.isArray(application.relatedMemoryIds)) {
      addError(errors, `${label}.relatedMemoryIds`, "invalid-type", `${label} relatedMemoryIds must be an array.`);
    } else {
      const memoryIdFirstIndexes = new Map();
      for (const [memoryIndex, memoryId] of application.relatedMemoryIds.entries()) {
        const relationshipPath = `${label}.relatedMemoryIds[${memoryIndex}]`;
        if (typeof memoryId !== "string" || !KEBAB_CASE_PATTERN.test(memoryId)) {
          addError(errors, relationshipPath, "invalid-relationship", `${relationshipPath} must be a stable public memory ID; value=<redacted>.`);
        } else if (memoryIdFirstIndexes.has(memoryId)) {
          addError(errors, relationshipPath, "relationship-duplicate", `${relationshipPath} duplicates an earlier relationship value; value=<redacted>.`);
        } else {
          memoryIdFirstIndexes.set(memoryId, memoryIndex);
        }
      }
    }
  }
  return trustedApplicationCodes;
}

function validateNow(now, errors, today) {
  if (!isPlainObject(now)) {
    addError(errors, "now", "invalid-type", "now must be an object.");
    return;
  }
  validateAllowedKeys(now, NOW_KEYS, "now", errors);

  const updatedAt = validateDate(now.updatedAt, "now.updatedAt", errors, today);
  if (typeof now.week !== "string" || !ISO_WEEK_PATTERN.test(now.week)) {
    addError(errors, "now.week", "invalid-iso-week", "now week must be a real ISO week in YYYY-Www format.");
  } else {
    const [, yearText, weekText] = now.week.match(ISO_WEEK_PATTERN);
    const week = Number(weekText);
    const isoWeeksInYear = isoWeekFor(new Date(Date.UTC(Number(yearText), 11, 28))).slice(-2);
    if (week < 1 || week > Number(isoWeeksInYear)) addError(errors, "now.week", "invalid-iso-week", "now week must be a real ISO week in YYYY-Www format.");
    if (updatedAt && now.week !== isoWeekFor(updatedAt)) addError(errors, "now.week", "week-date-mismatch", "now week must match now updatedAt's ISO week.");
  }

  if (!Array.isArray(now.items)) {
    addError(errors, "now.items", "invalid-type", "now items must be an array.");
    return;
  }

  const timeframes = new Set();
  for (const [index, item] of now.items.entries()) {
    const label = `now.items[${index}]`;
    if (!isPlainObject(item)) {
      addError(errors, label, "invalid-type", `${label} must be an object.`);
      continue;
    }
    validateAllowedKeys(item, NOW_ITEM_KEYS, label, errors);
    if (typeof item.id !== "string" || !KEBAB_CASE_PATTERN.test(item.id)) addError(errors, `${label}.id`, "invalid-identity", `${label} id must be stable kebab-case.`);
    if (!TIMEFRAMES.has(item.timeframe)) {
      addError(errors, `${label}.timeframe`, "invalid-enum", `${label} timeframe is not recognized.`);
    } else if (timeframes.has(item.timeframe)) {
      addError(errors, `${label}.timeframe`, "duplicate-timeframe", `${label} timeframe duplicates ${item.timeframe}.`);
    } else {
      timeframes.add(item.timeframe);
    }
    validateLocalized(item.title, `${label}.title`, errors);
    validateLocalized(item.summary, `${label}.summary`, errors);
    if (!Array.isArray(item.tags)) {
      addError(errors, `${label}.tags`, "invalid-type", `${label} tags must be an array of localized objects.`);
    } else {
      for (const [tagIndex, tag] of item.tags.entries()) {
        validateLocalized(tag, `${label}.tags[${tagIndex}]`, errors);
      }
    }
  }

  for (const timeframe of TIMEFRAMES) {
    if (!timeframes.has(timeframe)) addError(errors, "now.items", "missing-timeframe", `now must include exactly one ${timeframe} timeframe.`);
  }
  if (now.items.length !== 3) addError(errors, "now.items", "timeframe-count", "now must include exactly one week, month, and long-term timeframe.");
}

function validatePublicMemory(publicMemory, applicationCodes, trustedMemoryIds, errors, today) {
  if (!Array.isArray(publicMemory)) {
    addError(errors, "publicMemory", "invalid-type", "publicMemory must be an array.");
    return new Set();
  }

  const idFirstIndexes = new Map();
  for (const [index, memory] of publicMemory.entries()) {
    const label = `publicMemory[${index}]`;
    if (!isPlainObject(memory)) {
      addError(errors, label, "invalid-type", `${label} must be an object.`);
      continue;
    }
    validateAllowedKeys(memory, PUBLIC_MEMORY_KEYS, label, errors);
    if (typeof memory.id !== "string" || !KEBAB_CASE_PATTERN.test(memory.id)) {
      addError(errors, `${label}.id`, "invalid-identity", `${label} public memory ID must be stable kebab-case.`);
    } else if (idFirstIndexes.has(memory.id)) {
      addError(errors, `${label}.id`, "duplicate-identity", `${label}.id duplicates publicMemory[${idFirstIndexes.get(memory.id)}].id; value=<redacted>.`);
    } else {
      idFirstIndexes.set(memory.id, index);
    }
    if (!MEMORY_TYPES.has(memory.type)) addError(errors, `${label}.type`, "invalid-enum", `${label} public memory type is not recognized.`);
    if (memory.visibility !== "public") addError(errors, `${label}.visibility`, "privacy-boundary", `${label} public memory visibility must be public.`);
    validateLocalized(memory.title, `${label}.title`, errors);
    validateLocalized(memory.summary, `${label}.summary`, errors);
    validateDate(memory.publishedAt, `${label}.publishedAt`, errors, today);
    validateDate(memory.updatedAt, `${label}.updatedAt`, errors, today);
    if (!isNxtSnapshotUrl(memory.sourceUrl)) addError(errors, `${label}.sourceUrl`, "privacy-boundary", `${label} NXT snapshot sourceUrl must match https://nxt.aserdargun.com/p/<opaque-id>.`);
    if (typeof memory.sourceLabel !== "string" || memory.sourceLabel.trim() === "") addError(errors, `${label}.sourceLabel`, "required-value", `${label} sourceLabel must be non-empty.`);
    validateStringArray(memory.tags, `${label}.tags`, errors);
    validateUrls(memory.evidenceUrls, `${label}.evidenceUrls`, errors);
    validateRelatedApplicationCodes(memory.relatedApplicationCodes, label, applicationCodes, errors);
  }
  return trustedMemoryIds;
}

function validateRelatedApplicationCodes(codes, label, applicationCodes, errors) {
  if (!Array.isArray(codes)) {
    addError(errors, `${label}.relatedApplicationCodes`, "invalid-type", `${label} relatedApplicationCodes must be an array.`);
    return;
  }
  const firstIndexes = new Map();
  for (const [index, code] of codes.entries()) {
    const relationshipPath = `${label}.relatedApplicationCodes[${index}]`;
    if (typeof code !== "string" || !APPLICATION_CODE_PATTERN.test(code)) {
      addError(errors, relationshipPath, "invalid-relationship", `${relationshipPath} must be a valid related application code; value=<redacted>.`);
      continue;
    }
    if (firstIndexes.has(code)) {
      addError(errors, relationshipPath, "relationship-duplicate", `${relationshipPath} duplicates an earlier relationship value; value=<redacted>.`);
      continue;
    }
    firstIndexes.set(code, index);
    if (!applicationCodes.has(code)) {
      addError(errors, relationshipPath, "relationship-unresolved", `${relationshipPath} references applications[*].code=<redacted>, but no unique valid public target exists.`);
    }
  }
}

function validateStringArray(value, label, errors) {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || item.trim() === "")) {
    addError(errors, label, "invalid-string-array", `${label} must be an array of non-empty strings.`);
  }
}

function validateUrls(value, label, errors) {
  if (!Array.isArray(value)) {
    addError(errors, label, "invalid-type", `${label} must be an array of HTTPS URLs.`);
    return;
  }
  for (const url of value) validateUrl(url, label, errors);
}

function validateJourneyEvidence(journeyEvidence, applicationCodes, errors) {
  if (!Array.isArray(journeyEvidence)) {
    addError(errors, "journeyEvidence", "invalid-type", "journeyEvidence must be an array.");
    return;
  }

  const stageFirstIndexes = new Map();
  for (const [index, evidence] of journeyEvidence.entries()) {
    const label = `journeyEvidence[${index}]`;
    if (!isPlainObject(evidence)) {
      addError(errors, label, "invalid-type", `${label} must be an object.`);
      continue;
    }
    validateAllowedKeys(evidence, JOURNEY_EVIDENCE_KEYS, label, errors);
    if (typeof evidence.stage !== "string" || !KEBAB_CASE_PATTERN.test(evidence.stage)) {
      addError(errors, `${label}.stage`, "invalid-identity", `${label} journey stage must be a unique stable key.`);
    } else if (stageFirstIndexes.has(evidence.stage)) {
      addError(errors, `${label}.stage`, "duplicate-identity", `${label}.stage duplicates journeyEvidence[${stageFirstIndexes.get(evidence.stage)}].stage; value=<redacted>.`);
    } else {
      stageFirstIndexes.set(evidence.stage, index);
    }
    if (evidence.period !== null && (typeof evidence.period !== "string" || evidence.period.trim() === "")) {
      addError(errors, `${label}.period`, "invalid-period", `${label} journey period must be null or a non-empty verified string.`);
    }
    validateLocalized(evidence.decision, `${label}.decision`, errors);
    validateUrls(evidence.evidenceUrls, `${label}.evidenceUrls`, errors);
    validateRelatedApplicationCodes(evidence.relatedApplicationCodes, label, applicationCodes, errors);
    const hasDecision = isPlainObject(evidence.decision)
      && typeof evidence.decision.en === "string" && evidence.decision.en.trim() !== ""
      && typeof evidence.decision.tr === "string" && evidence.decision.tr.trim() !== "";
    if (!hasDecision && (!Array.isArray(evidence.evidenceUrls) || evidence.evidenceUrls.length === 0)
      && (!Array.isArray(evidence.relatedApplicationCodes) || evidence.relatedApplicationCodes.length === 0)) {
      addError(errors, label, "missing-evidence", `${label} must include a verified decision, evidence URL, or related application.`);
    }
  }
}

function resolveToday(options) {
  if (options instanceof Date) return options;
  const { today = new Date() } = options ?? {};
  return today;
}

export function validateLivingSystemData(data, options = {}) {
  const errors = [];
  const today = todayUtcDate(resolveToday(options));
  if (!isPlainObject(data)) return {
    valid: false,
    errors: [{ path: "root", code: "invalid-type", message: "living system data must be an object." }],
  };

  for (const key of TOP_LEVEL_KEYS) {
    if (!(key in data)) addError(errors, key, "required-key", `top-level key ${key} is required.`);
  }
  for (const key of Object.keys(data)) {
    if (!TOP_LEVEL_KEYS.includes(key)) addError(errors, key, "unknown-key", `top-level key ${key} is not recognized.`);
  }
  for (const versionKey of ["schemaVersion", "contentPolicyVersion", "generatedCopyVersion"]) {
    if (!Number.isInteger(data[versionKey]) || data[versionKey] < 1) addError(errors, versionKey, "invalid-version", `${versionKey} must be a positive integer.`);
  }

  const trustedApplicationCodes = trustedPublicIdentitySet(
    data.applications,
    "code",
    APPLICATION_CODE_PATTERN,
    (application) => isStructurallyValidPublicApplication(application, today),
  );
  const trustedMemoryIds = trustedPublicIdentitySet(
    data.publicMemory,
    "id",
    KEBAB_CASE_PATTERN,
    (memory) => isStructurallyValidPublicMemory(memory, today),
  );
  const applicationCodes = validateApplications(data.applications, errors, today, trustedApplicationCodes);
  validateNow(data.now, errors, today);
  validatePublicMemory(data.publicMemory, applicationCodes, trustedMemoryIds, errors, today);
  validateJourneyEvidence(data.journeyEvidence, applicationCodes, errors);

  const publicApplications = new Map();
  if (Array.isArray(data.applications)) {
    for (const [index, application] of data.applications.entries()) {
      if (!isPlainObject(application)
        || typeof application.code !== "string"
        || !trustedApplicationCodes.has(application.code)) continue;
      publicApplications.set(application.code, { record: application, index });
    }
  }
  const publicMemories = new Map();
  if (Array.isArray(data.publicMemory)) {
    for (const [index, memory] of data.publicMemory.entries()) {
      if (!isPlainObject(memory)
        || typeof memory.id !== "string"
        || !trustedMemoryIds.has(memory.id)) continue;
      publicMemories.set(memory.id, { record: memory, index });
    }
  }

  for (const [code, { record: application, index: applicationIndex }] of publicApplications) {
    if (!Array.isArray(application.relatedMemoryIds)) continue;
    for (const [relationshipIndex, memoryId] of application.relatedMemoryIds.entries()) {
      if (typeof memoryId !== "string" || !KEBAB_CASE_PATTERN.test(memoryId)) continue;
      if (application.relatedMemoryIds.indexOf(memoryId) !== relationshipIndex) continue;
      const memoryMatch = publicMemories.get(memoryId);
      if (!memoryMatch) {
        addError(
          errors,
          `applications[${applicationIndex}].relatedMemoryIds[${relationshipIndex}]`,
          "relationship-unresolved",
          `applications[${applicationIndex}].relatedMemoryIds[${relationshipIndex}] references publicMemory[*].id=<redacted>, but no unique valid public target exists.`,
        );
        continue;
      }
      if (!Array.isArray(memoryMatch.record.relatedApplicationCodes)
        || !memoryMatch.record.relatedApplicationCodes.includes(code)) {
        addError(
          errors,
          `applications[${code}].relatedMemoryIds`,
          "relationship-mismatch",
          `applications[${code}].relatedMemoryIds contains ${memoryId}, but publicMemory[${memoryId}].relatedApplicationCodes does not contain ${code}`,
        );
      }
    }
  }

  for (const [memoryId, { record: memory }] of publicMemories) {
    if (!Array.isArray(memory.relatedApplicationCodes)) continue;
    for (const [relationshipIndex, code] of memory.relatedApplicationCodes.entries()) {
      if (typeof code !== "string" || !APPLICATION_CODE_PATTERN.test(code)) continue;
      if (memory.relatedApplicationCodes.indexOf(code) !== relationshipIndex) continue;
      const applicationMatch = publicApplications.get(code);
      if (!applicationMatch) {
        // validateRelatedApplicationCodes already records this untrusted target with redaction.
        continue;
      }
      if (!Array.isArray(applicationMatch.record.relatedMemoryIds)
        || !applicationMatch.record.relatedMemoryIds.includes(memoryId)) {
        addError(
          errors,
          `publicMemory[${memoryId}].relatedApplicationCodes`,
          "relationship-mismatch",
          `publicMemory[${memoryId}].relatedApplicationCodes contains ${code}, but applications[${code}].relatedMemoryIds does not contain ${memoryId}`,
        );
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

export function assertValidLivingSystemData(data, options = {}) {
  const { errors } = validateLivingSystemData(data, options);
  if (errors.length === 0) return data;
  const source = typeof options?.sourcePath === "string" && options.sourcePath.trim() !== ""
    ? `file=${options.sourcePath} `
    : "";
  const entries = errors.map(({ path, code, message }) => `${source}path=${path} code=${code} message=${message}`);
  throw new Error(`Living system data validation failed:\n${entries.join("\n")}`);
}

export async function loadLivingSystemData(filePath) {
  const path = String(filePath);
  let source;
  try {
    source = await readFile(filePath, "utf8");
  } catch (error) {
    throw new Error(`Unable to read living system data at ${path}: ${error.message}`);
  }
  try {
    return JSON.parse(source);
  } catch (error) {
    throw new Error(`Unable to parse living system data at ${path}: ${error.message}`);
  }
}

export function getFreshnessState(dateOnly, now = new Date()) {
  const date = dateFromDateOnly(dateOnly);
  if (!date) throw new TypeError("Freshness requires a real YYYY-MM-DD calendar date.");
  const age = Math.floor((todayUtcDate(now) - date) / 86400000);
  if (age < 0) throw new RangeError("Freshness date must not be in the future.");
  if (age <= 7) return "current";
  if (age <= 14) return "aging";
  return "needs-refresh";
}

export function summarizeApplications(applications) {
  const counts = { "core-learning": 0, lab: 0, "horizon-bridge": 0, horizon: 0 };
  for (const application of applications) {
    if (counts[application.systemRole] !== undefined) counts[application.systemRole] += 1;
  }
  const englishNumber = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
  const turkishNumber = ["sıfır", "bir", "iki", "üç", "dört", "beş", "altı", "yedi", "sekiz", "dokuz", "on"];
  const number = (values, count) => values[count] ?? String(count);
  const sentenceNumber = (values, count) => {
    const value = number(values, count);
    return value.charAt(0).toLocaleUpperCase("tr-TR") + value.slice(1);
  };
  const applicationNoun = counts["core-learning"] === 1 ? "application" : "applications";
  const labNoun = counts.lab === 1 ? "lab" : "labs";
  const bridgeNoun = counts["horizon-bridge"] === 1 ? "horizon bridge" : "horizon bridges";
  const horizonNoun = counts.horizon === 1 ? "horizon" : "horizons";
  return {
    en: `${sentenceNumber(englishNumber, counts["core-learning"])} core learning ${applicationNoun}, ${number(englishNumber, counts.lab)} ${labNoun}, ${number(englishNumber, counts["horizon-bridge"])} ${bridgeNoun}, and ${number(englishNumber, counts.horizon)} long-term ${horizonNoun}.`,
    tr: `${sentenceNumber(turkishNumber, counts["core-learning"])} çekirdek öğrenme uygulaması, ${number(turkishNumber, counts.lab)} laboratuvar, ${number(turkishNumber, counts["horizon-bridge"])} ufuk köprüsü ve ${number(turkishNumber, counts.horizon)} uzun vadeli ufuk.`,
  };
}
