import {captureRegistrations} from "./session-capture-registry.js";
import { SECTIONS as nextMoveSections } from '../OWR/next-move/content.js';
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

// New registrations require future retention; runtime loading still validates
// expired registrations so their responses remain reviewable and removable.
export function validateWorkbookRegistration(registration, now = new Date(), { requireFuture = true } = {}) {
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
  if (requireFuture && deadline.getTime() <= referenceTime) {
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

export function validateRegistry(registrations, now = new Date(), options) {
  const keys = new Set();
  const workbookIds = new Set();

  for (const registration of registrations) {
    validateWorkbookRegistration(registration, now, options);
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

const owrExercises = [
  {
    id: "ex1",
    title: "Compare two directions",
    fields: [
      ["experience", "My experience in one sentence"],
      ["dirA", "Direction A"],
      ["dirB", "Direction B"],
      ["priorities", "My three priorities"],
      ["constraints", "Practical constraints"],
      ["provisional", "My provisional direction to explore"],
      ["unknown", "Still unknown"],
      ["__accepted", "What I’m keeping from the AI response"],
      ["__help", "I need help with"],
    ],
  },
  {
    id: "ex2",
    title: "Find the meaning behind the goal",
    fields: [
      ["question", "The question I’m struggling with"],
      ["experience2", "A concrete experience that matters"],
      ["contribution", "I want my next chapter to make ___ possible for ___"],
      ["corrected", "One AI assumption I corrected"],
      ["__accepted", "What I’m keeping from the AI response"],
      ["__help", "I need help with"],
    ],
  },
  {
    id: "ex3",
    title: "Build the Impact Ladder",
    fields: [
      ["impact", "Impact and horizon"],
      ["outcome", "Outcome that would indicate progress"],
      ["outputs", "Output I can produce"],
      ["activity", "Weekly activity within my control"],
      ["__accepted", "What I’m keeping from the AI response"],
      ["__help", "I need help with"],
    ],
  },
  {
    id: "ex4",
    title: "Test the weakest assumption",
    fields: [
      ["assumption", "I am assuming"],
      ["have", "Evidence I have"],
      ["missing", "Evidence missing"],
      ["experiment", "My low-risk 30-day experiment"],
      ["source", "A person or source to consult"],
      ["revise", "I would revise my plan if"],
      ["__accepted", "What I’m keeping from the AI response"],
      ["__help", "I need help with"],
    ],
  },
  {
    id: "ex5",
    title: "Save and test the plan",
    fields: [
      ["sevenDay", "My seven-day action"],
      ["reviewDate", "My 30-day review date"],
      ["unresolved", "What remains unresolved"],
      ["question", "One question for a real person"],
      ["__accepted", "What I’m keeping from the AI response"],
      ["__help", "I need help with"],
    ],
  },
].map(({ id, title, fields }) => createPromptExerciseSchema({
  id,
  title,
  fields: fields.map(([fieldId, label]) => ({ id: fieldId, label })),
}));

const registrationList = [
  ...captureRegistrations(WORKBOOK_DELETE_AFTER),
  {
    key: "owr-purposeful-next-move",
    client: { id: "onewe-reach", name: "OneWe Reach" },
    program: { id: "career-architecture-ai-era", name: "Career Architecture in the AI Era" },
    workbook: { id: "owr-purposeful-next-move", name: "Purposeful Next Moves · revised workshop" },
    hubUrl: "/OWR/", routePrefix: "/OWR/next-move/",
    participantApiPath: "/OWR/next-move/api/responses",
    deleteAfter: WORKBOOK_DELETE_AFTER, exportPrefix: "owr-purposeful-next-move",
    exercises: [...nextMoveSections.map(section => createPromptExerciseSchema({id:section.id,title:section.title,fields:section.fields.map(([id,label])=>({id,label}))})), createPromptExerciseSchema({id:"identity",title:"Workshop support contact",fields:[{id:"name",label:"Name"},{id:"email",label:"Email (self-reported; not a verified sign-in)"}]})],
  },
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
  {
    key: "owr-career-architecture",
    client: { id: "onewe-reach", name: "OneWe Reach" },
    program: { id: "career-architecture-ai-era", name: "Career Architecture in the AI Era" },
    workbook: { id: "owr-career-architecture", name: "Career Architecture workbook" },
    hubUrl: "/OWR/",
    routePrefix: "/OWR/",
    participantApiPath: "/OWR/api/responses",
    deleteAfter: WORKBOOK_DELETE_AFTER,
    exportPrefix: "owr-career-architecture",
    exercises: owrExercises,
  },
].map((registration) => deepFreeze(validateWorkbookRegistration(registration, undefined, { requireFuture: false })));

export const WORKBOOK_REGISTRY = deepFreeze(Object.fromEntries(registrationList.map((registration) => [registration.key, registration])));

export function getWorkbookRegistration(workbookKey) {
  return Object.hasOwn(WORKBOOK_REGISTRY, workbookKey)
    ? WORKBOOK_REGISTRY[workbookKey]
    : undefined;
}

export function listWorkbookRegistrations() {
  return Object.freeze(registrationList.slice());
}

validateRegistry(registrationList, undefined, { requireFuture: false });
