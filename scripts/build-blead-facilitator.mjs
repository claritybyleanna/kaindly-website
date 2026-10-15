import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

function renderLegacyFacilitatorRedirect() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KAINDLY Facilitator Hub</title>
  <meta name="robots" content="noindex, nofollow">
  <meta http-equiv="refresh" content="0;url=/dashboard/">
</head>
<body>
  <main>
    <p>This facilitator page has moved. <a href="/dashboard/">Open the KAINDLY Facilitator Hub</a>.</p>
  </main>
</body>
</html>
`;
}

export function renderBleadFacilitatorAccess() {
  return renderLegacyFacilitatorRedirect();
}

export function renderBleadFacilitatorDashboard() {
  return renderLegacyFacilitatorRedirect();
}

const accessUrl = new URL("../Blead/facilitator/access/index.html", import.meta.url);
const dashboardUrl = new URL("../Blead/facilitator/index.html", import.meta.url);

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await mkdir(new URL("../Blead/facilitator/access/", import.meta.url), { recursive: true });
  await writeFile(accessUrl, renderBleadFacilitatorAccess(), "utf8");
  await writeFile(dashboardUrl, renderBleadFacilitatorDashboard(), "utf8");
  console.log(`Built ${fileURLToPath(accessUrl)}`);
  console.log(`Built ${fileURLToPath(dashboardUrl)}`);
}
