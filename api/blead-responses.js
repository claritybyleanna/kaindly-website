import { createParticipantResponseHandlers } from "../lib/blead-response-api.js";
import { getBleadQuery } from "../lib/blead-db.js";
import { createBleadResponseStore } from "../lib/blead-response-store.js";

function handlers() {
  const store = createBleadResponseStore(getBleadQuery());
  return createParticipantResponseHandlers({ store });
}

export function GET(request) {
  return handlers().GET(request);
}

export function POST(request) {
  return handlers().POST(request);
}
