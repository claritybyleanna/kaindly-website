import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

function documentHead({ title, description }) {
  return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <meta name="robots" content="noindex, nofollow">
  <link rel="icon" href="/assets/brand/icon-violet.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/site.css">
  <link rel="stylesheet" href="/assets/css/dashboard.css">
</head>`;
}

function brand({ href = "/dashboard/", white = false } = {}) {
  return `<a class="dashboard-brand" href="${href}" aria-label="KAINDLY facilitator dashboard"><img src="/assets/brand/logo-secondary-${white ? "white" : "violet"}.svg" alt="KAINDLY" width="166" height="32"></a>`;
}

function authScript() {
  return `  <script type="module" src="/assets/js/dashboard-auth.js"></script>`;
}

export function renderDashboardAccess() {
  return `<!doctype html>
<html lang="en">
${documentHead({
    title: "Facilitator Dashboard Access | KAINDLY",
    description: "Private access to the KAINDLY facilitator dashboard.",
  })}
<body class="dashboard-auth-page">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <main id="main-content" class="dashboard-auth-shell">
    <section class="dashboard-auth-card" aria-labelledby="access-title">
      ${brand({ href: "/" })}
      <p class="dashboard-eyebrow">Private facilitator workspace</p>
      <h1 id="access-title">Facilitator dashboard access</h1>
      <p>Enter your approved email address. We’ll send a secure sign-in link.</p>
      <form class="dashboard-auth-form" data-dashboard-auth-form>
        <label for="dashboard-email">Email address</label>
        <input id="dashboard-email" type="email" name="email" autocomplete="email" required data-dashboard-auth-email>
        <button class="dashboard-button dashboard-button--primary" type="submit">Email me a sign-in link</button>
      </form>
      <p class="dashboard-auth-status" role="status" aria-live="polite" data-dashboard-auth-status></p>
    </section>
  </main>
${authScript()}
</body>
</html>
`;
}

export function renderDashboardVerification() {
  return `<!doctype html>
<html lang="en">
${documentHead({
    title: "Completing Sign In | KAINDLY",
    description: "Complete secure access to the KAINDLY facilitator dashboard.",
  })}
<body class="dashboard-auth-page">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <main id="main-content" class="dashboard-auth-shell" data-dashboard-auth-verify>
    <section class="dashboard-auth-card" aria-labelledby="verification-title">
      ${brand({ href: "/" })}
      <p class="dashboard-eyebrow">Private facilitator workspace</p>
      <h1 id="verification-title">Completing your sign in</h1>
      <p class="dashboard-auth-status" role="status" aria-live="polite" data-dashboard-verification-status>Verifying your secure link…</p>
      <p><a class="dashboard-text-link" href="/dashboard/access/">Request a new link</a></p>
    </section>
  </main>
${authScript()}
</body>
</html>
`;
}

function selectFilter(name, label) {
  return `<label class="dashboard-filter"><span>${label}</span><select name="${name}" data-dashboard-filter="${name}"><option value="">All ${label.toLowerCase()}</option></select></label>`;
}

export function renderDashboardShell() {
  return `<!doctype html>
<html lang="en">
${documentHead({
    title: "Facilitator Dashboard | KAINDLY",
    description: "Private review of anonymous KAINDLY client workbook responses.",
  })}
<body class="dashboard-page" id="top">
  <a class="skip-link" href="#main-content">Skip to content</a>
  <header class="dashboard-header">
    <div class="dashboard-shell dashboard-header__inner">
      ${brand()}
      <button class="dashboard-sign-out" type="button" data-dashboard-sign-out>Sign out</button>
    </div>
  </header>
  <main id="main-content">
    <section class="dashboard-hero">
      <div class="dashboard-shell">
        <p class="dashboard-eyebrow">KAINDLY · FACILITATOR WORKSPACE</p>
        <h1>Client response dashboard</h1>
        <p>Review anonymous workbook responses across KAINDLY client programs.</p>
      </div>
    </section>
    <section class="dashboard-section dashboard-overview" aria-labelledby="overview-title">
      <div class="dashboard-shell">
        <div class="dashboard-section-heading"><div><p class="dashboard-kicker">At a glance</p><h2 id="overview-title">Program activity</h2></div></div>
        <div class="dashboard-summary" aria-live="polite">
          <article><strong data-summary-clients>—</strong><span>Clients</span></article>
          <article><strong data-summary-workbooks>—</strong><span>Workbooks</span></article>
          <article><strong data-summary-participants>—</strong><span>Participants</span></article>
          <article><strong data-summary-responses>—</strong><span>Responses</span></article>
        </div>
        <div class="dashboard-directory" data-dashboard-directory></div>
      </div>
    </section>
    <section class="dashboard-section dashboard-response-review" aria-labelledby="responses-title">
      <div class="dashboard-shell">
        <div class="dashboard-section-heading dashboard-section-heading--actions">
          <div><p class="dashboard-kicker">Response review</p><h2 id="responses-title">Anonymous workbook responses</h2></div>
          <a class="dashboard-button dashboard-button--primary" href="/dashboard/api/export.csv" data-dashboard-export>Export filtered CSV</a>
        </div>
        <form class="dashboard-filters" data-dashboard-filters>
          ${selectFilter("client", "Clients")}
          ${selectFilter("program", "Programs")}
          ${selectFilter("workbook", "Workbooks")}
          ${selectFilter("exercise", "Exercises")}
          ${selectFilter("participant", "Participants")}
          <label class="dashboard-filter"><span>From date</span><input type="date" name="from" data-dashboard-filter="from"></label>
          <label class="dashboard-filter"><span>To date</span><input type="date" name="to" data-dashboard-filter="to"></label>
          <label class="dashboard-filter dashboard-filter--search"><span>Response text</span><input type="search" name="search" placeholder="Search saved responses" autocomplete="off" data-dashboard-filter="search"></label>
          <div class="dashboard-filter-actions"><button class="dashboard-button dashboard-button--secondary" type="submit">Apply filters</button><button class="dashboard-clear" type="button" data-dashboard-clear>Clear filters</button></div>
        </form>
        <p class="dashboard-state" data-dashboard-loading role="status" aria-live="polite">Loading responses…</p>
        <p class="dashboard-state" data-dashboard-empty role="status" aria-live="polite" hidden>No responses match these filters.</p>
        <div class="dashboard-state dashboard-state--alert" data-dashboard-unauthorized role="alert" aria-live="assertive" hidden><h3>Your dashboard session has ended.</h3><p><a href="/dashboard/access/">Email yourself a new sign-in link</a> to continue.</p></div>
        <div class="dashboard-state dashboard-state--alert" data-dashboard-unavailable role="alert" aria-live="assertive" hidden><h3>The dashboard is temporarily unavailable.</h3><p>Please try again shortly.</p><button class="dashboard-button dashboard-button--secondary" type="button" data-dashboard-retry>Try again</button></div>
        <div class="dashboard-responses" data-dashboard-responses aria-live="polite"></div>
      </div>
    </section>
  </main>
  <footer class="dashboard-footer"><div class="dashboard-shell">${brand({ href: "/", white: true })}<a href="#top">Back to top ↑</a></div></footer>
${authScript()}
  <script type="module" src="/assets/js/dashboard.js"></script>
</body>
</html>
`;
}

const outputs = [
  [new URL("../dashboard/index.html", import.meta.url), renderDashboardShell()],
  [new URL("../dashboard/access/index.html", import.meta.url), renderDashboardAccess()],
  [new URL("../dashboard/verify/index.html", import.meta.url), renderDashboardVerification()],
];

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const authBundleUrl = new URL("../assets/js/dashboard-auth.js", import.meta.url);
  const authBundle = await readFile(authBundleUrl, "utf8");
  await writeFile(authBundleUrl, authBundle.replace(/[ \t]+$/gmu, ""), "utf8");
  for (const [url, html] of outputs) {
    await mkdir(new URL("./", url), { recursive: true });
    await writeFile(url, html, "utf8");
    console.log(`Built ${fileURLToPath(url)}`);
  }
}
