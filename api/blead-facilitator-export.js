import { createFacilitatorHandlers } from "../lib/blead-response-api.js";
import { getBleadQuery } from "../lib/blead-db.js";
import { createBleadResponseStore } from "../lib/blead-response-store.js";

function handlers() {
  const store = createBleadResponseStore(getBleadQuery());
  return createFacilitatorHandlers({ store });
}

export function GET(request) {
  return handlers().EXPORT(request);
}
