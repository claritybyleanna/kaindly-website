import { createNextMoveStore } from "../lib/owr-next-move-store.js";
import { createOwrHelpHandler } from "../lib/owr-help.js";
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
  if (new URL(request.url).searchParams.get("view") === "owr-help") {
    return createOwrHelpHandler({ authorize: authorizeDashboardRequest, store: createNextMoveStore((text, values) => getWorkbookQuery()(text, values)) })(request);
  }
  return handlers().GET(request);
}

export function POST(request) {
  if (new URL(request.url).searchParams.get("view") !== "owr-help") return new Response(null,{status:405});
  return createOwrHelpHandler({authorize:authorizeDashboardRequest,store:createNextMoveStore((text,values)=>getWorkbookQuery()(text,values))})(request);
}
