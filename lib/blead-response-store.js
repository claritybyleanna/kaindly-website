import { createWorkbookResponseStore } from "./workbook-response-store.js";
import { getWorkbookRegistration } from "./workbook-registry.js";

export function createBleadResponseStore(query) {
  const store = createWorkbookResponseStore(query);
  const registration = getWorkbookRegistration("bracco-leadership-session-1");

  return {
    async upsert(snapshot) {
      return store.upsert({
        ...snapshot,
        clientId: registration.client.id,
        programId: registration.program.id,
        workbookId: registration.workbook.id,
        deleteAfter: registration.deleteAfter,
      });
    },

    async listByParticipant(participantId) {
      return store.listByParticipant(participantId, registration);
    },

    async listAll() {
      return store.listDashboard({
        clientId: registration.client.id,
        programId: registration.program.id,
        workbookId: registration.workbook.id,
      });
    },

    async deleteExpired(now = new Date()) {
      return store.deleteExpired(now);
    },
  };
}
