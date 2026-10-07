import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  renderBleadFacilitatorAccess,
  renderBleadFacilitatorDashboard,
} from "../scripts/build-blead-facilitator.mjs";

const accessUrl = new URL("../Blead/facilitator/access/index.html", import.meta.url);
const dashboardUrl = new URL("../Blead/facilitator/index.html", import.meta.url);

test("facilitator pages are private, deterministic, and contain no secret", async () => {
  assert.equal(existsSync(accessUrl), true);
  assert.equal(existsSync(dashboardUrl), true);
  const access = await readFile(accessUrl, "utf8");
  const dashboard = await readFile(dashboardUrl, "utf8");

  assert.match(access, /KAINDLY Facilitator Access/);
  assert.match(access, /action="\/Blead\/facilitator\/access\/"/);
  assert.match(dashboard, /Responses are retained through February 28, 2027/);
  assert.match(dashboard, /Export CSV/);
  assert.match(dashboard, /href="\/Blead\/facilitator\/api\/export\.csv"/);
  assert.match(dashboard, /data-response-filter/);
  assert.match(dashboard, /data-response-count/);
  assert.match(dashboard, /data-dashboard-loading/);
  assert.match(dashboard, /data-dashboard-empty/);
  assert.match(dashboard, /data-dashboard-error/);
  assert.match(dashboard, /action="\/Blead\/facilitator\/logout\/"/);
  assert.match(`${access}${dashboard}`, /<meta name="robots" content="noindex, nofollow">/);
  assert.doesNotMatch(`${access}${dashboard}`, /test-facilitator-password/iu);
  assert.equal(access, renderBleadFacilitatorAccess());
  assert.equal(dashboard, renderBleadFacilitatorDashboard());
});

test("facilitator dashboard exposes only anonymous response language", async () => {
  const dashboard = await readFile(dashboardUrl, "utf8");
  const visibleText = dashboard.replace(/<[^>]+>/gu, " ").replace(/\s+/gu, " ");

  assert.match(visibleText, /anonymous participant responses/i);
  assert.doesNotMatch(visibleText, /participant name|participant email/iu);
  assert.match(dashboard, /src="\/assets\/js\/blead-facilitator\.js"/);
  assert.match(dashboard, /href="\/assets\/css\/blead-facilitator\.css"/);
});
