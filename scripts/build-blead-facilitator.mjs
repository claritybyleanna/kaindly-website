import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

export function renderBleadFacilitatorAccess() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>KAINDLY Facilitator Access</title>
  <meta name="description" content="Private facilitator access for KAINDLY program response review.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead-access.css">
  <link rel="stylesheet" href="/assets/css/blead-facilitator.css">
</head>
<body class="blead-access-page blead-facilitator-access-page">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <main id="main-content" class="blead-access-shell">
    <section class="blead-access-card" aria-labelledby="access-title">
      <img class="blead-access-logo" src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY" width="166" height="32">
      <div class="blead-access-accent" aria-hidden="true"></div>
      <p class="eyebrow">Private response review</p>
      <h1 id="access-title">KAINDLY Facilitator Access</h1>
      <p class="blead-access-intro">Enter the facilitator password to review anonymous Session 1 workbook responses.</p>
      <form method="post" action="/Blead/facilitator/access/">
        <label for="facilitator-password">Facilitator password</label>
        <input id="facilitator-password" name="password" type="password" autocomplete="current-password" required>
        <input name="returnTo" type="hidden" value="/Blead/facilitator/">
        <button class="button" type="submit">Open facilitator dashboard</button>
      </form>
      <p class="access-error blead-facilitator-access-error" id="access-error-noscript" role="alert">That password was not accepted. Check it and try again.</p>
      <p class="blead-access-note">This area is for approved KAINDLY facilitators only.</p>
    </section>
  </main>
</body>
</html>
`;
}

export function renderBleadFacilitatorDashboard() {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Session 1 Responses | KAINDLY Facilitator</title>
  <meta name="description" content="Private review of anonymous Bracco Session 1 workbook responses.">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/blead.css">
  <link rel="stylesheet" href="/assets/css/blead-facilitator.css">
</head>
<body class="blead-page blead-facilitator-page" id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="blead-header">
    <div class="blead-shell blead-header-inner">
      <a class="blead-brand" href="/Blead/facilitator/" aria-label="KAINDLY facilitator dashboard"><img src="/assets/brand/logo-secondary-violet.svg" alt="KAINDLY"></a>
      <nav class="blead-navigation" aria-label="Facilitator links"><a href="/Blead/">Program hub</a><a href="/Blead/session-1-prompts/">Session 1 workbook</a></nav>
      <form class="blead-logout" method="post" action="/Blead/facilitator/logout/"><button type="submit">End facilitator session</button></form>
    </div>
  </header>
  <main id="main-content">
    <section class="blead-facilitator-hero">
      <div class="blead-shell">
        <p class="blead-eyebrow">BRACCO AI LEADERSHIP ACCELERATOR · SESSION 1</p>
        <h1>Anonymous participant responses</h1>
        <p>Review exercise entries by generated participant ID. Responses are retained through February 28, 2027 and scheduled for deletion beginning March 1, 2027.</p>
      </div>
    </section>
    <section class="blead-section" aria-labelledby="responses-title">
      <div class="blead-shell">
        <div class="blead-facilitator-heading">
          <div><p class="blead-kicker">Facilitator dashboard</p><h2 id="responses-title">Session 1 response review</h2><p><strong data-response-count>0 responses</strong></p></div>
          <a class="blead-button blead-button--primary" href="/Blead/facilitator/api/export.csv">Export CSV</a>
        </div>
        <label class="blead-response-filter"><span>Filter by participant ID, exercise, or response text</span><input type="search" data-response-filter placeholder="Search responses" autocomplete="off"></label>
        <p class="blead-dashboard-state" data-dashboard-loading>Loading responses…</p>
        <p class="blead-dashboard-state" data-dashboard-empty hidden>No responses have been saved yet.</p>
        <div class="blead-dashboard-state blead-dashboard-error" data-dashboard-error hidden><p>Responses could not be loaded.</p><button type="button" data-dashboard-retry>Try again</button></div>
        <div class="blead-response-list" data-response-list aria-live="polite"></div>
      </div>
    </section>
  </main>
  <footer class="blead-footer"><div class="blead-shell blead-footer-grid"><div><img src="/assets/brand/logo-secondary-white.svg" alt="KAINDLY"><p>Private facilitator workspace</p></div><a href="#top">Back to top ↑</a></div></footer>
  <script type="module" src="/assets/js/blead-facilitator.js"></script>
</body>
</html>
`;
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
