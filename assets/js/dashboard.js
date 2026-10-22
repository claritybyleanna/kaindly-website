const FILTER_NAMES = [
  "client",
  "program",
  "workbook",
  "exercise",
  "participant",
  "from",
  "to",
  "search",
];

function stringValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function buildDashboardQuery(values = {}) {
  const query = new URLSearchParams();
  for (const name of FILTER_NAMES) {
    const value = stringValue(typeof values.get === "function" ? values.get(name) : values[name]);
    if (value) query.set(name, value);
  }
  return query;
}

export function groupDashboardResponses(responses = []) {
  const groups = new Map();
  for (const response of responses) {
    const workbookId = String(response?.workbook?.id ?? "");
    const participantId = String(response?.participantId ?? "");
    const key = `${workbookId}:${participantId}`;
    if (!groups.has(key)) {
      groups.set(key, {
        workbook: response.workbook,
        client: response.client,
        program: response.program,
        participantId,
        contact: response.contact,
        latestActivity: response.updatedAt,
        responses: [],
      });
    }
    const group = groups.get(key);
    if (Date.parse(response.updatedAt) > Date.parse(group.latestActivity)) {
      group.latestActivity = response.updatedAt;
    }
    group.responses.push(response);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      responses: group.responses.sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt)),
    }))
    .sort((left, right) => Date.parse(right.latestActivity) - Date.parse(left.latestActivity));
}

export function filterParticipantOptions(options = [], workbookId = "") {
  if (!workbookId) return [];
  return options.filter((option) => option.workbookId === workbookId);
}

function normalizedFilterObject(values = {}) {
  return Object.fromEntries(FILTER_NAMES.flatMap((name) => {
    const value = stringValue(typeof values.get === "function" ? values.get(name) : values[name]);
    return value ? [[name, value]] : [];
  }));
}

export function reconcileDashboardFilterValues(values = {}, filters = {}) {
  const next = normalizedFilterObject(values);
  const programs = new Map((filters.programs ?? []).map((entry) => [entry.id, entry]));
  const workbooks = new Map((filters.workbooks ?? []).map((entry) => [entry.id, entry]));
  const exercises = filters.exercises ?? [];
  const participants = new Map((filters.participants ?? []).map((entry) => [
    `${entry.workbookId}:${entry.id}`,
    entry,
  ]));

  const selectedProgram = next.program ? programs.get(next.program) : null;
  const programInvalid = Boolean(next.program) && (
    !selectedProgram || (next.client && selectedProgram.clientId !== next.client)
  );
  if (programInvalid) delete next.program;

  const selectedWorkbook = next.workbook ? workbooks.get(next.workbook) : null;
  const workbookInvalid = Boolean(next.workbook) && (
    programInvalid
    || !selectedWorkbook
    || (next.client && selectedWorkbook.clientId !== next.client)
    || (next.program && selectedWorkbook.programId !== next.program)
  );
  if (workbookInvalid) delete next.workbook;

  if (next.exercise) {
    const matchingExercises = exercises.filter(({ id }) => id === next.exercise);
    const exerciseIsCompatible = matchingExercises.some((exercise) => {
      const exerciseWorkbook = workbooks.get(exercise.workbookId);
      return exerciseWorkbook
        && (!next.workbook || exercise.workbookId === next.workbook)
        && (!next.client || exerciseWorkbook.clientId === next.client)
        && (!next.program || exerciseWorkbook.programId === next.program);
    });
    if (
      workbookInvalid
      || !exerciseIsCompatible
    ) {
      delete next.exercise;
    }
  }

  if (
    !next.workbook
    || !next.participant
    || !participants.has(`${next.workbook}:${next.participant}`)
  ) {
    delete next.participant;
  }

  return next;
}

export function filterRelationalDashboardOptions(filters = {}, values = {}) {
  const selected = normalizedFilterObject(values);
  const workbooks = (filters.workbooks ?? []).filter((entry) => (
    (!selected.client || entry.clientId === selected.client)
    && (!selected.program || entry.programId === selected.program)
  ));
  const permittedWorkbookIds = new Set(workbooks.map(({ id }) => id));
  return {
    clients: filters.clients ?? [],
    programs: (filters.programs ?? []).filter((entry) => (
      !selected.client || entry.clientId === selected.client
    )),
    workbooks,
    exercises: (filters.exercises ?? []).filter((entry) => (
      selected.workbook ? entry.workbookId === selected.workbook : permittedWorkbookIds.has(entry.workbookId)
    )),
    participants: filterParticipantOptions(filters.participants, selected.workbook),
  };
}

function element(documentRef, tagName, className, text) {
  const node = documentRef.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = String(text);
  return node;
}

export function createResponseValue(documentRef, value) {
  return element(documentRef, "p", "dashboard-response-value", value);
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function renderDirectory(documentRef, root, directory = []) {
  const cards = directory.map((entry) => {
    const card = element(documentRef, "article", "dashboard-directory-card");
    const heading = element(documentRef, "h3", "", entry.workbook.name);
    const context = element(documentRef, "p", "dashboard-directory-context", `${entry.client.name} · ${entry.program.name}`);
    const count = element(documentRef, "p", "dashboard-directory-count", `${entry.responseCount} saved response${entry.responseCount === 1 ? "" : "s"}`);
    const activity = element(
      documentRef,
      "p",
      "dashboard-directory-activity",
      entry.latestActivity ? `Latest activity ${formatDate(entry.latestActivity)}` : "No activity yet",
    );
    const status = element(documentRef, "span", entry.expired ? "dashboard-badge dashboard-badge--expired" : "dashboard-badge", entry.expired ? "Retention ended" : "Active");
    const link = element(documentRef, "a", "dashboard-text-link", "Open client hub");
    link.setAttribute("href", entry.hubUrl);
    card.append(status, heading, context, count, activity, link);
    return card;
  });
  root.replaceChildren(...cards);
}

function renderResponse(documentRef, response) {
  const item = element(documentRef, "article", "dashboard-response-item");
  const header = element(documentRef, "header", "dashboard-response-item__header");
  header.append(
    element(documentRef, "h4", "", response.exercise.title),
    element(documentRef, "time", "", formatDate(response.updatedAt)),
  );
  header.children?.[1]?.setAttribute?.("datetime", response.updatedAt);
  item.append(header);

  if (response.fields?.length) {
    const fields = element(documentRef, "dl", "dashboard-response-fields");
    for (const field of response.fields) {
      const pair = element(documentRef, "div", "");
      pair.append(
        element(documentRef, "dt", "", field.label),
        element(documentRef, "dd", "", field.value || "No response"),
      );
      fields.append(pair);
    }
    item.append(fields);
  }
  if (stringValue(response.notes)) {
    const notes = element(documentRef, "section", "dashboard-response-notes");
    notes.append(
      element(documentRef, "h5", "", "Notes"),
      createResponseValue(documentRef, response.notes),
    );
    item.append(notes);
  }
  return item;
}

export function renderDashboardResponses(documentRef, root, responses = []) {
  const cards = groupDashboardResponses(responses).map((group) => {
    const card = element(documentRef, "article", "dashboard-participant-card");
    const header = element(documentRef, "header", "dashboard-participant-card__header");
    const id = element(documentRef, "h3", "", group.contact?.name || `Participant ${group.participantId.slice(0, 8)}`);
    id.append(element(documentRef, "span", "visually-hidden", ` Full anonymous participant ID: ${group.participantId}`));
    header.append(
      id,
      element(documentRef, "p", "", `${group.workbook.name} · ${group.client.name}`),
      element(documentRef, "p", "dashboard-participant-meta", `${group.responses.length} response${group.responses.length === 1 ? "" : "s"} · Latest ${formatDate(group.latestActivity)}`),
    );
    if (group.contact?.email) header.append(element(documentRef, "p", "dashboard-participant-meta", group.contact.email + " · Workshop support contact"));
    card.append(header, ...group.responses.map((response) => renderResponse(documentRef, response)));
    return card;
  });
  root.replaceChildren(...cards);
}

export async function loadDashboardResponses({ query, fetchImpl = globalThis.fetch, signal } = {}) {
  const suffix = query?.toString() ? `?${query.toString()}` : "";
  try {
    const options = {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };
    if (signal) options.signal = signal;
    const response = await fetchImpl(`/dashboard/api/responses${suffix}`, options);
    if (response.status === 401) return { kind: "unauthorized" };
    if (!response.ok) return { kind: "unavailable" };
    const data = await response.json();
    if (!data || !Array.isArray(data.responses)) return { kind: "unavailable" };
    return { kind: data.responses.length ? "loaded" : "empty", data };
  } catch {
    if (signal?.aborted) return { kind: "aborted" };
    return { kind: "unavailable" };
  }
}

function setHidden(node, hidden) {
  if (node) node.hidden = hidden;
}

function updateSummary(documentRef, summary) {
  for (const name of ["clients", "workbooks", "participants", "responses"]) {
    const node = documentRef.querySelector(`[data-summary-${name}]`);
    if (node) node.textContent = String(summary?.[name] ?? 0);
  }
}

function optionLabel(name, option) {
  if (name === "participants") return `${option.id.slice(0, 8)} · ${option.workbookId}`;
  return option.name || option.title || option.id;
}

function updateSelect(documentRef, name, options, selected) {
  const select = documentRef.querySelector(`[data-dashboard-filter="${name}"]`);
  if (!select) return;
  const plural = name === "participant" ? "participants" : `${name}s`;
  const placeholder = element(documentRef, "option", "", `All ${plural}`);
  placeholder.setAttribute("value", "");
  const items = (options ?? []).map((option) => {
    const node = element(documentRef, "option", "", optionLabel(plural, option));
    node.setAttribute("value", option.id);
    if (name === "participant") node.setAttribute("data-workbook-id", option.workbookId);
    if (option.id === selected && (name !== "participant" || option.workbookId)) node.selected = true;
    return node;
  });
  select.replaceChildren(placeholder, ...items);
  select.value = selected ?? "";
}

export function initializeDashboard({
  documentRef = globalThis.document,
  historyRef = globalThis.history,
  locationRef = globalThis.location,
  fetchImpl = globalThis.fetch,
  formValuesReader = (form) => new FormData(form),
} = {}) {
  if (!documentRef) return { ready: Promise.resolve() };
  const form = documentRef.querySelector("[data-dashboard-filters]");
  const directory = documentRef.querySelector("[data-dashboard-directory]");
  const responseRoot = documentRef.querySelector("[data-dashboard-responses]");
  const exportLink = documentRef.querySelector("[data-dashboard-export]");
  const loading = documentRef.querySelector("[data-dashboard-loading]");
  const empty = documentRef.querySelector("[data-dashboard-empty]");
  const unauthorized = documentRef.querySelector("[data-dashboard-unauthorized]");
  const unavailable = documentRef.querySelector("[data-dashboard-unavailable]");
  const clear = documentRef.querySelector("[data-dashboard-clear]");
  const retry = documentRef.querySelector("[data-dashboard-retry]");
  let pendingQuery = buildDashboardQuery(new URLSearchParams(locationRef?.search ?? ""));
  let filterMetadata = null;
  let activeController = null;
  let loadSequence = 0;

  function currentQuery() {
    if (pendingQuery) return new URLSearchParams(pendingQuery);
    return form ? buildDashboardQuery(formValuesReader(form)) : new URLSearchParams();
  }

  function reflectQuery(query) {
    const suffix = query.toString() ? `?${query.toString()}` : "";
    if (exportLink) exportLink.setAttribute("href", `/dashboard/api/export.csv${suffix}`);
    historyRef?.replaceState?.({}, "", `${locationRef.pathname}${suffix}`);
  }

  function reconcileForm() {
    if (!form || !filterMetadata) return;
    const selected = reconcileDashboardFilterValues(formValuesReader(form), filterMetadata);
    for (const name of FILTER_NAMES) {
      if (form.elements?.[name]) form.elements[name].value = selected[name] ?? "";
    }
  }

  async function load() {
    const sequence = ++loadSequence;
    activeController?.abort();
    const controller = new AbortController();
    activeController = controller;
    const query = currentQuery();
    reflectQuery(query);
    setHidden(loading, false);
    setHidden(empty, true);
    setHidden(unauthorized, true);
    setHidden(unavailable, true);
    responseRoot?.replaceChildren();
    const result = await loadDashboardResponses({ query, fetchImpl, signal: controller.signal });
    if (sequence !== loadSequence) return;
    activeController = null;
    setHidden(loading, true);
    if (result.kind === "aborted") return;
    if (result.kind === "unauthorized") {
      setHidden(unauthorized, false);
      return;
    }
    if (result.kind === "unavailable") {
      setHidden(unavailable, false);
      return;
    }
    const { data } = result;
    updateSummary(documentRef, data.summary);
    renderDirectory(documentRef, directory, data.directory);
    filterMetadata = data.filters;
    const selected = reconcileDashboardFilterValues(Object.fromEntries(query), filterMetadata);
    const options = filterRelationalDashboardOptions(filterMetadata, selected);
    updateSelect(documentRef, "client", options.clients, selected.client);
    updateSelect(documentRef, "program", options.programs, selected.program);
    updateSelect(documentRef, "workbook", options.workbooks, selected.workbook);
    updateSelect(documentRef, "exercise", options.exercises, selected.exercise);
    updateSelect(
      documentRef,
      "participant",
      options.participants,
      selected.participant,
    );
    const participantSelect = documentRef.querySelector('[data-dashboard-filter="participant"]');
    if (participantSelect) participantSelect.disabled = !selected.workbook;
    pendingQuery = null;
    renderDashboardResponses(documentRef, responseRoot, data.responses);
    setHidden(empty, result.kind !== "empty");
  }

  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    pendingQuery = null;
    reconcileForm();
    void load();
  });
  for (const select of form?.querySelectorAll?.("select") ?? []) {
    select.addEventListener("change", () => {
      pendingQuery = null;
      reconcileForm();
      void load();
    });
  }
  clear?.addEventListener("click", () => {
    form?.reset();
    pendingQuery = null;
    void load();
  });
  retry?.addEventListener("click", () => void load());

  const locationQuery = new URLSearchParams(pendingQuery);
  for (const name of FILTER_NAMES) {
    const control = form?.elements?.[name];
    if (control && locationQuery.has(name)) control.value = locationQuery.get(name);
  }

  return { ready: load(), reload: load };
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
  initializeDashboard();
}
