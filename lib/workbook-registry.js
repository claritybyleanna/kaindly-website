import { promptPackContent as bleadPromptContent } from "../Blead/session-1-prompts/content.js";
import { packOneContent } from "../bsales/pack-1/content.js";
import { packTwoContent } from "../bsales/pack-2/content.js";
import { createBsalesSchemas, createPromptExerciseSchema } from "./workbook-schema.js";

export const WORKBOOK_DELETE_AFTER = "2027-03-01T06:00:00.000Z";

function deepFreeze(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

export function validateWorkbookRegistration(registration, now = new Date()) {
  if (!registration || typeof registration !== "object") {
    throw new TypeError("Workbook registration must be an object");
  }

  if (!registration.deleteAfter || !Number.isFinite(Date.parse(registration.deleteAfter))) {
    throw new TypeError("Workbook registration requires a valid retention deadline");
  }

  const referenceTime = new Date(now).getTime();
  if (!Number.isFinite(referenceTime)) throw new TypeError("Current time must be a valid date");

  const deadline = new Date(registration.deleteAfter);
  if (deadline.toISOString() !== registration.deleteAfter) {
    throw new TypeError("Workbook retention deadline must be an ISO timestamp");
  }
  if (deadline.getTime() <= referenceTime) {
    throw new RangeError("Workbook retention deadline must be in the future");
  }

  for (const section of ["client", "program", "workbook"]) {
    if (!registration[section]?.id || !registration[section]?.name) {
      throw new TypeError(`Workbook registration requires ${section} identity`);
    }
  }
  for (const key of ["key", "hubUrl", "routePrefix", "participantApiPath", "exportPrefix"]) {
    if (typeof registration[key] !== "string" || !registration[key].trim()) {
      throw new TypeError(`Workbook registration requires ${key}`);
    }
  }
  if (!Array.isArray(registration.exercises) || registration.exercises.length === 0) {
    throw new TypeError("Workbook registration requires exercises");
  }
  const exerciseIds = new Set();
  for (const exercise of registration.exercises) {
    if (!exercise.id || !exercise.title || !Array.isArray(exercise.fields)) {
      throw new TypeError("Workbook registration contains an invalid exercise");
    }
    if (exerciseIds.has(exercise.id)) throw new TypeError(`Duplicate exercise ID: ${exercise.id}`);
    exerciseIds.add(exercise.id);
    const fieldIds = new Set();
    for (const field of exercise.fields) {
      if (!field.id || !field.label) throw new TypeError("Workbook registration contains an invalid field");
      if (fieldIds.has(field.id)) throw new TypeError(`Duplicate field ID in ${exercise.id}: ${field.id}`);
      fieldIds.add(field.id);
    }
  }

  return registration;
}

export function validateRegistry(registrations, now = new Date()) {
  const keys = new Set();
  const workbookIds = new Set();

  for (const registration of registrations) {
    validateWorkbookRegistration(registration, now);
    if (keys.has(registration.key)) throw new TypeError(`Duplicate workbook key: ${registration.key}`);
    if (workbookIds.has(registration.workbook.id)) {
      throw new TypeError(`Duplicate workbook ID: ${registration.workbook.id}`);
    }
    keys.add(registration.key);
    workbookIds.add(registration.workbook.id);
  }
  return registrations;
}

const bleadExercises = bleadPromptContent.prompts.map((prompt) => createPromptExerciseSchema({
  id: prompt.id,
  title: prompt.title,
  fields: prompt.fields,
  noteField: true,
}));

const mclendonExercises = [
  ["build-app", "Build a Halftime Trivia App"],
  ["crisis", "The Crisis"],
  ["business-decision", "The Business Decision"],
  ["deal", "The Deal"],
].map(([id, title]) => createPromptExerciseSchema({ id, title, noteField: true }));

const registrationList = [
  {
    key: "bracco-leadership-session-1",
    client: { id: "bracco", name: "Bracco" },
    program: { id: "leadership-accelerator", name: "AI Leadership Accelerator" },
    workbook: { id: "bracco-session-1", name: "Session 1 workbook" },
    hubUrl: "/Blead/",
    routePrefix: "/Blead/session-1-prompts/",
    participantApiPath: "/Blead/api/responses",
    deleteAfter: WORKBOOK_DELETE_AFTER,
    exportPrefix: "bracco-session-1",
    exercises: bleadExercises,
  },
  {
    key: "bracco-sales-pack-1",
    client: { id: "bracco", name: "Bracco" },
    program: { id: "sales-ai-working-session", name: "Sales Team AI Working Session" },
    workbook: { id: "bracco-sales-ai-brain", name: packOneContent.title },
    hubUrl: "/bsales/",
    routePrefix: "/bsales/prompt-pack-1/",
    participantApiPath: "/bsales/prompt-pack-1/api/responses",
    deleteAfter: WORKBOOK_DELETE_AFTER,
    exportPrefix: "bracco-sales-ai-brain",
    exercises: createBsalesSchemas(packOneContent),
  },
  {
    key: "bracco-sales-pack-2",
    client: { id: "bracco", name: "Bracco" },
    program: { id: "sales-ai-working-session", name: "Sales Team AI Working Session" },
    workbook: { id: "bracco-sales-chief-of-staff", name: packTwoContent.title },
    hubUrl: "/bsales/",
    routePrefix: "/bsales/prompt-pack-2/",
    participantApiPath: "/bsales/prompt-pack-2/api/responses",
    deleteAfter: WORKBOOK_DELETE_AFTER,
    exportPrefix: "bracco-sales-chief-of-staff",
    exercises: createBsalesSchemas(packTwoContent),
  },
  {
    key: "mclendon-working-smarter",
    client: { id: "mclendon-working-smarter", name: "The McLendon Foundation" },
    program: { id: "working-smarter-from-day-one", name: "Working Smarter From Day One" },
    workbook: { id: "mclendon-working-smarter", name: "Working Smarter From Day One workbook" },
    hubUrl: "/McLendon/",
    routePrefix: "/McLendon/",
    participantApiPath: "/McLendon/api/responses",
    deleteAfter: WORKBOOK_DELETE_AFTER,
    exportPrefix: "mclendon-working-smarter",
    exercises: mclendonExercises,
  },
].map((registration) => deepFreeze(validateWorkbookRegistration(registration)));

export const WORKBOOK_REGISTRY = deepFreeze(Object.fromEntries(registrationList.map((registration) => [registration.key, registration])));

export function getWorkbookRegistration(workbookKey) {
  return WORKBOOK_REGISTRY[workbookKey];
}

export function listWorkbookRegistrations() {
  return Object.freeze(registrationList.slice());
}

validateRegistry(registrationList);
