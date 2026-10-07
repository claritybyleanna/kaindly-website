export function groupFacilitatorResponses(rows = []) {
  const byParticipant = new Map();
  for (const row of rows) {
    const participantId = String(row.participant_id ?? "");
    if (!byParticipant.has(participantId)) {
      byParticipant.set(participantId, {
        participantId,
        lastUpdated: row.updated_at,
        exercises: [],
      });
    }
    const group = byParticipant.get(participantId);
    if (new Date(row.updated_at).getTime() > new Date(group.lastUpdated).getTime()) {
      group.lastUpdated = row.updated_at;
    }
    group.exercises.push({
      exerciseId: row.exercise_id,
      number: row.exercise_number,
      title: row.exercise_title,
      fields: row.fields ?? [],
      notes: row.notes ?? "",
      updatedAt: row.updated_at,
    });
  }

  return [...byParticipant.values()]
    .map((group) => ({
      ...group,
      exercises: group.exercises.sort((left, right) => left.number - right.number),
    }))
    .sort((left, right) => (
      new Date(right.lastUpdated).getTime() - new Date(left.lastUpdated).getTime()
    ));
}

export function responseMatchesFilter(group, query = "") {
  const term = String(query).trim().toLocaleLowerCase();
  if (!term) return true;
  if (group.participantId.toLocaleLowerCase().startsWith(term)) return true;
  return group.exercises.some((exercise) => {
    if (exercise.title.toLocaleLowerCase().includes(term)) return true;
    if (String(exercise.notes).toLocaleLowerCase().includes(term)) return true;
    return exercise.fields.some(({ label, value }) => (
      String(label).toLocaleLowerCase().includes(term)
      || String(value).toLocaleLowerCase().includes(term)
    ));
  });
}

function element(documentRoot, tagName, className, text) {
  const node = documentRoot.createElement(tagName);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderExercise(documentRoot, exercise) {
  const details = element(documentRoot, "details", "blead-response-exercise");
  const summary = element(
    documentRoot,
    "summary",
    "",
    `Prompt ${String(exercise.number).padStart(2, "0")} · ${exercise.title}`,
  );
  details.append(summary);

  const body = element(documentRoot, "div", "blead-response-exercise-body");
  if (exercise.fields.length) {
    const fields = element(documentRoot, "dl", "blead-response-fields");
    for (const field of exercise.fields) {
      const pair = element(documentRoot, "div", "");
      pair.append(
        element(documentRoot, "dt", "", field.label),
        element(documentRoot, "dd", "", field.value || "No response"),
      );
      fields.append(pair);
    }
    body.append(fields);
  }
  if (String(exercise.notes).trim()) {
    const notes = element(documentRoot, "section", "blead-response-notes");
    notes.append(
      element(documentRoot, "h4", "", "Exercise notes"),
      element(documentRoot, "p", "", exercise.notes),
    );
    body.append(notes);
  }
  details.append(body);
  return details;
}

export function renderFacilitatorResponses(root, groups) {
  const documentRoot = root.ownerDocument ?? globalThis.document;
  const cards = groups.map((group) => {
    const card = element(documentRoot, "article", "blead-response-card");
    const header = element(documentRoot, "header", "blead-response-card-header");
    const title = element(
      documentRoot,
      "h3",
      "",
      `Participant ${group.participantId.slice(0, 8)}`,
    );
    title.append(element(
      documentRoot,
      "span",
      "visually-hidden",
      ` Full anonymous participant ID: ${group.participantId}`,
    ));
    const date = new Date(group.lastUpdated);
    const updated = element(
      documentRoot,
      "time",
      "",
      `Last updated ${date.toLocaleString()}`,
    );
    updated.setAttribute("datetime", date.toISOString());
    header.append(
      title,
      element(
        documentRoot,
        "p",
        "blead-response-completion",
        `${group.exercises.length} completed exercise${group.exercises.length === 1 ? "" : "s"}`,
      ),
      updated,
    );
    card.append(header, ...group.exercises.map((exercise) => renderExercise(documentRoot, exercise)));
    return card;
  });
  root.replaceChildren(...cards);
}

export function initializeFacilitatorDashboard({
  documentRoot = globalThis.document,
  fetchImpl = globalThis.fetch,
  location = globalThis.location,
} = {}) {
  if (!documentRoot) return { ready: Promise.resolve() };
  const root = documentRoot.querySelector("[data-response-list]");
  const filter = documentRoot.querySelector("[data-response-filter]");
  const count = documentRoot.querySelector("[data-response-count]");
  const loading = documentRoot.querySelector("[data-dashboard-loading]");
  const empty = documentRoot.querySelector("[data-dashboard-empty]");
  const error = documentRoot.querySelector("[data-dashboard-error]");
  const retry = documentRoot.querySelector("[data-dashboard-retry]");
  let groups = [];

  function render() {
    const visible = groups.filter((group) => responseMatchesFilter(group, filter?.value));
    renderFacilitatorResponses(root, visible);
    if (count) {
      const exerciseCount = visible.reduce((sum, group) => sum + group.exercises.length, 0);
      count.textContent = `${exerciseCount} response${exerciseCount === 1 ? "" : "s"} across ${visible.length} participant${visible.length === 1 ? "" : "s"}`;
    }
    if (empty) empty.hidden = visible.length !== 0;
  }

  async function load() {
    if (loading) loading.hidden = false;
    if (empty) empty.hidden = true;
    if (error) error.hidden = true;
    try {
      const response = await fetchImpl("/Blead/facilitator/api/responses", {
        credentials: "same-origin",
      });
      if (response.status === 401) {
        location.assign("/Blead/facilitator/access/?returnTo=/Blead/facilitator/");
        return;
      }
      if (!response.ok) throw new Error("Dashboard response failed");
      const data = await response.json();
      groups = groupFacilitatorResponses(data.responses ?? []);
      render();
    } catch {
      if (error) error.hidden = false;
    } finally {
      if (loading) loading.hidden = true;
    }
  }

  filter?.addEventListener("input", render);
  retry?.addEventListener("click", load);
  const ready = load();
  return { ready, reload: load };
}

if (typeof document !== "undefined") initializeFacilitatorDashboard();
