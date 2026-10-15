import assert from "node:assert/strict";
import test from "node:test";
import * as bsales from "../assets/js/bsales.js";

const packOneParticipant = "75f6c553-4bb4-4b3e-9a2a-ef29f1b64930";
const packTwoParticipant = "419ff9dd-0184-4c02-a5e3-356b1ae50ec0";

function memoryStorage(initial = []) {
  const values = new Map(initial);
  return {
    values,
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

function fakeCrypto(ids) {
  let index = 0;
  return { randomUUID: () => ids[index++] };
}

function control(fieldId, token, value = "") {
  const listeners = new Map();
  return {
    dataset: { promptField: fieldId, promptToken: token },
    value,
    addEventListener(type, listener) { listeners.set(type, listener); },
    emit(type) { listeners.get(type)?.({ target: this }); },
  };
}

function promptCard({ exerciseId = "prompt-02", role = "", initials = "" } = {}) {
  const fields = [
    control("field-01", "[YOUR ROLE]", role),
    control("field-02", "[REP INITIALS]", initials),
  ];
  const template = { value: "Act as [YOUR ROLE] for [REP INITIALS]." };
  const preview = { textContent: template.value };
  const button = { textContent: "Copy Prompt", addEventListener() {} };
  const status = { textContent: "" };
  const listeners = new Map();
  return {
    dataset: { promptId: exerciseId },
    fields,
    preview,
    querySelectorAll(selector) {
      return selector === "[data-prompt-field]" ? fields : [];
    },
    querySelector(selector) {
      return {
        "[data-prompt-template]": template,
        "[data-prompt-preview]": preview,
        "[data-copy-prompt]": button,
        "[data-copy-status]": status,
        "[data-prompt-notes]": null,
      }[selector] ?? null;
    },
    addEventListener(type, listener) { listeners.set(type, listener); },
    dispatchEvent(event) { listeners.get(event.type)?.(event); },
  };
}

function documentRoot({ workbookId, endpoint, cards }) {
  const listeners = new Map();
  return {
    body: { dataset: { workbookId, responseEndpoint: endpoint } },
    visibilityState: "visible",
    defaultView: { CustomEvent: class { constructor(type) { this.type = type; } } },
    querySelectorAll(selector) { return selector === "[data-prompt-card]" ? cards : []; },
    querySelector() { return null; },
    addEventListener(type, listener) { listeners.set(type, listener); },
    documentElement: { classList: { add() {} } },
  };
}

test("Bracco Sales edits post typed fields to each pack's registered response endpoint", async () => {
  const storage = memoryStorage();
  const cryptoApi = fakeCrypto([packOneParticipant, packTwoParticipant]);
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    return options.method
      ? { ok: true, json: async () => ({}) }
      : { ok: true, json: async () => ({ responses: [] }) };
  };

  const cases = [
    {
      workbookId: "bracco-sales-ai-brain",
      endpoint: "/bsales/prompt-pack-1/api/responses",
      participantId: packOneParticipant,
    },
    {
      workbookId: "bracco-sales-chief-of-staff",
      endpoint: "/bsales/prompt-pack-2/api/responses",
      participantId: packTwoParticipant,
    },
  ];

  for (const entry of cases) {
    const card = promptCard();
    const root = documentRoot({ ...entry, cards: [card] });
    bsales.initializePromptCard(card);
    const sync = bsales.initializeBsalesResponseSync({
      documentRoot: root,
      storage,
      cryptoApi,
      fetchImpl,
      delay: 0,
      navigatorRoot: {},
      windowRoot: { addEventListener() {} },
    });
    await sync.ready;
    card.fields[0].value = "District manager";
    card.fields[0].emit("input");
    card.fields[0].emit("blur");
    await sync.whenIdle();

    const post = requests.filter(({ url, options }) => url === entry.endpoint && options.method === "POST").at(-1);
    assert.ok(post, `expected a POST to ${entry.endpoint}`);
    assert.deepEqual(JSON.parse(post.options.body), {
      participantId: entry.participantId,
      exerciseId: "prompt-02",
      fields: { "field-01": "District manager", "field-02": "" },
      notes: "",
    });
  }

  assert.equal(
    storage.values.get("kaindly:workbook:bracco-sales-ai-brain:participant-id"),
    packOneParticipant,
  );
  assert.equal(
    storage.values.get("kaindly:workbook:bracco-sales-chief-of-staff:participant-id"),
    packTwoParticipant,
  );
});

test("Bracco Sales restores local values first and fills only empty fields from the server", async () => {
  const workbookId = "bracco-sales-ai-brain";
  const endpoint = "/bsales/prompt-pack-1/api/responses";
  const storage = memoryStorage([
    [`kaindly:workbook:${workbookId}:participant-id`, packOneParticipant],
    [`kaindly:workbook:${workbookId}:exercise:prompt-02:field:field-01`, "Local role"],
  ]);
  const card = promptCard();
  const root = documentRoot({ workbookId, endpoint, cards: [card] });
  const requests = [];
  const fetchImpl = async (url, options = {}) => {
    requests.push({ url, options });
    if (!options.method) {
      assert.equal(card.fields[0].value, "Local role");
      return {
        ok: true,
        json: async () => ({
          responses: [{
            exercise_id: "prompt-02",
            payload: { fields: { "field-01": "Server role", "field-02": "S.B." }, notes: "" },
          }],
        }),
      };
    }
    return { ok: true, json: async () => ({}) };
  };

  bsales.initializePromptCard(card);
  const sync = bsales.initializeBsalesResponseSync({
    documentRoot: root,
    storage,
    cryptoApi: fakeCrypto([packTwoParticipant]),
    fetchImpl,
    delay: 0,
    navigatorRoot: {},
    windowRoot: { addEventListener() {} },
  });
  await sync.ready;
  await sync.whenIdle();

  assert.equal(card.fields[0].value, "Local role");
  assert.equal(card.fields[1].value, "S.B.");
  assert.equal(card.preview.textContent, "Act as Local role for S.B..");
  const post = requests.find(({ options }) => options.method === "POST");
  assert.deepEqual(JSON.parse(post.options.body), {
    participantId: packOneParticipant,
    exerciseId: "prompt-02",
    fields: { "field-01": "Local role", "field-02": "S.B." },
    notes: "",
  });
});

test("Bracco Sales prompt compilation still replaces only completed typed fields", () => {
  assert.equal(
    bsales.personalizePrompt(
      "Rep [REP INITIALS] on [DATE] with [PASTE NOTES]",
      new Map([
        ["[REP INITIALS]", "T.M."],
        ["[DATE]", "October 15"],
        ["[PASTE NOTES]", ""],
      ]),
    ),
    "Rep T.M. on October 15 with [PASTE NOTES]",
  );
});
