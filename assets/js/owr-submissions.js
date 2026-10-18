import { getOrCreateParticipantId } from "./workbook-sync.js";

export function createOwrSubmissionClient({
  workbookId,
  endpoint,
  storage = globalThis.localStorage,
  cryptoApi = globalThis.crypto,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!workbookId || !endpoint || typeof fetchImpl !== "function") {
    throw new TypeError("OWR submission sync requires a workbook, endpoint, and fetch implementation");
  }
  const participantId = getOrCreateParticipantId(storage, workbookId, cryptoApi);

  async function request(method, body) {
    const response = await fetchImpl(endpoint, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ participantId, ...body }),
    });
    if (!response.ok) throw new Error("The facilitator submission could not be saved");
    return response.json();
  }

  async function load() {
    const response = await fetchImpl(
      `${endpoint}?participantId=${encodeURIComponent(participantId)}`,
      { credentials: "same-origin" },
    );
    if (!response.ok) throw new Error("The facilitator submissions could not be restored");
    const data = await response.json();
    return data.responses ?? [];
  }

  async function submit(exerciseId, fields) {
    const data = await request("POST", { exerciseId, fields, notes: "" });
    return data.response;
  }

  async function withdraw(exerciseId) {
    const data = await request("DELETE", { exerciseId, fields: {}, notes: "" });
    return Boolean(data.withdrawn);
  }

  return { load, participantId, submit, withdraw };
}
