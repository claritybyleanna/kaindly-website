import { authorizeDashboardRequest } from "../lib/dashboard-auth.js";
import { getWorkbookQuery } from "../lib/blead-db.js";
import { createDashboardHandlers } from "../lib/workbook-response-api.js";
import { createWorkbookResponseStore } from "../lib/workbook-response-store.js";
import { listWorkbookRegistrations } from "../lib/workbook-registry.js";

function handlers() {
  const query = (text, values) => getWorkbookQuery()(text, values);
  return createDashboardHandlers({
    authorize: authorizeDashboardRequest,
    store: createWorkbookResponseStore(query),
    registry: listWorkbookRegistrations(),
  });
}

export function GET(request) {
  return handlers().GET(request);
}
