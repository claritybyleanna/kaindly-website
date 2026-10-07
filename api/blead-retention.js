import { createRetentionHandler } from "../lib/blead-response-api.js";
import { getBleadQuery } from "../lib/blead-db.js";
import { createBleadResponseStore } from "../lib/blead-response-store.js";

function handler() {
  const store = createBleadResponseStore(getBleadQuery());
  return createRetentionHandler({ store });
}

export function GET(request) {
  return handler()(request);
}
