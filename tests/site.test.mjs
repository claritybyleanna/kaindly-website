import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const pageFiles = [
  ["index.html", "/"],
  ["collective/index.html", "/collective/"],
  ["insights/index.html", "/insights/"],
  ["about/index.html", "/about/"],
  ["contact/index.html", "/contact/"],
  ["assessment/index.html", "/assessment/"],
  ["insights/kaindly-standards/index.html", "/insights/kaindly-standards/"],
];

const launchAssets = [
  ".nojekyll",
  "assets/brand/logo-primary-violet.svg",
  "assets/brand/logo-secondary-violet.svg",
  "assets/brand/logo-secondary-white.svg",
  "assets/brand/icon-violet.svg",
  "assets/brand/icon-white.svg",
  "assets/brand/tagline-white.svg",
  "assets/brand/gradient.png",
];

test("official web brand assets are available at stable paths", () => {
  for (const file of launchAssets) {
    assert.equal(existsSync(file), true, `${file} is missing`);
  }
});

test("Vercel serves the approved maintenance wall on every application route", () => {
  assert.equal(existsSync("maintenance.html"), true, "Maintenance page is missing");
  assert.equal(existsSync("vercel.json"), true, "Vercel configuration is missing");

  const maintenance = readFileSync("maintenance.html", "utf8");
  assert.match(maintenance, /<meta name="robots" content="noindex, nofollow">/);
  assert.match(maintenance, /A Thoughtful Update Is Underway/);
  assert.match(maintenance, /Our site is being updated\./);
  assert.match(maintenance, /Thank you for your patience while we make thoughtful improvements to the KAINDLY experience\. We(?:’|&rsquo;)ll be back soon\./);
  assert.match(maintenance, /href="mailto:hello@kaindly\.ai"/);
  assert.match(maintenance, />hello@kaindly\.ai<\/a>/);
  assert.match(maintenance, /Lead AI\. Don(?:’|&rsquo;)t Chase It\./);
  assert.equal((maintenance.match(/mailto:hello@kaindly\.ai/g) || []).length, 1);
  assert.doesNotMatch(maintenance, /<nav\b|acuityscheduling|data-tf-live|Schedule Appointment|Book a Call/i);

  const config = JSON.parse(readFileSync("vercel.json", "utf8"));
  assert.equal(config.$schema, "https://openapi.vercel.sh/vercel.json");
  assert.deepEqual(config.routes[0], {
    src: "/assets/(.*)",
    dest: "/assets/$1",
  });
  assert.deepEqual(config.routes[1], {
    src: "/(.*)",
    dest: "/maintenance.html",
    status: 503,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "Retry-After": "3600",
      "X-Robots-Tag": "noindex, nofollow",
    },
  });
});

test("Home exposes the shared, accessible launch shell", () => {
  assert.equal(existsSync("index.html"), true, "index.html is missing");
  assert.equal(existsSync("assets/css/site.css"), true, "shared stylesheet is missing");
  assert.equal(existsSync("assets/js/site.js"), true, "shared JavaScript is missing");

  const html = readFileSync("index.html", "utf8");
  assert.match(html, /<title>KAINDLY \| Lead AI\. Don't Chase It\.<\/title>/);
  assert.match(html, /<meta name="description" content="[^"]+">/);
  assert.match(html, /<meta name="viewport" content="width=device-width, initial-scale=1">/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/">/);
  assert.match(html, /<meta property="og:url" content="https:\/\/www\.kaindly\.ai\/">/);
  assert.match(html, /href="#main-content"[^>]*>Skip to content<\/a>/);
  assert.equal((html.match(/<main\b/g) || []).length, 1);
  assert.equal((html.match(/<\/main>/g) || []).length, 1);
  assert.match(html, /<nav[^>]+aria-label="Primary navigation"/);
  assert.match(html, /href="\.\/"[^>]+aria-current="page"/);
  for (const route of ["collective/", "insights/", "about/", "contact/"]) {
    assert.match(html, new RegExp(`href="${route.replace("/", "\\/")}"`));
  }
  assert.match(html, /Lead AI\. Don't Chase It\./);
  assert.match(html, /owner=38041134&amp;ref=booking_button/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.match(html, /<header\b/);
  assert.match(html, /<footer\b/);
  assert.match(html, /href="assets\/css\/site\.css"/);
  assert.match(html, /src="assets\/js\/site\.js"/);
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
});

test("Home links to the Assessment while the Assessment embeds its Typeform", () => {
  assert.equal(existsSync("assessment/index.html"), true, "Assessment page is missing");
  const home = readFileSync("index.html", "utf8");
  const assessment = readFileSync("assessment/index.html", "utf8");

  assert.doesNotMatch(home, /data-tf-live="01KJ3V41DCC0V9P0VT0T97XK4E"/);
  assert.doesNotMatch(home, /https:\/\/form\.typeform\.com\/to\/V6UyKfJp/);
  assert.match(home, /<a class="button button--accent" href="assessment\/">Take the Assessment<\/a>/);
  assert.equal((home.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
  assert.match(assessment, /data-tf-live="01KJ3TB8AV4EBVV6P51RE768EB"/);
  assert.match(assessment, /https:\/\/form\.typeform\.com\/to\/V6UyKfJp/);
  assert.equal((assessment.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
});

test("Home exposes the approved assessment and five-card structure", () => {
  const home = readFileSync("index.html", "utf8");
  assert.match(home, /class="container home-assessment-layout"/);
  assert.doesNotMatch(home, /class="container typeform-layout"/);

  const cards = home.match(/<article class="system-card"[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, 5);

  const expectedCards = [
    { category: "Assessment · Diagnostic", tags: [["primary", "Enterprise"], ["secondary", "Individual"]] },
    { category: "Discovery · Workflow Mapping", tags: [["primary", "Enterprise"], ["secondary", "Individual"]] },
    { category: "Enterprise · Bespoke Programs", tags: [["primary", "Enterprise Only"]] },
    { category: "Training · Cohort-Based", tags: [["primary", "Enterprise Cohorts"], ["secondary", "Open Enrollment"]] },
    { category: "Community · Sustained Fluency", tags: [["primary", "Organizational Access"], ["secondary", "Individual Membership"]] },
  ];

  for (const [index, card] of cards.entries()) {
    assert.match(card, /class="card-category"/);
    assert.match(card, /class="card-description"/);
    assert.match(card, /class="card-tags"/);
    const text = card.replace(/<[^>]+>/g, " ").replaceAll("&middot;", "·").replace(/\s+/g, " ");
    assert.match(text, new RegExp(expectedCards[index].category.replace("·", "\\s*·\\s*")));
    const tags = [...card.matchAll(/<li class="card-tag card-tag--(primary|secondary)">([^<]+)<\/li>/g)]
      .map(([, kind, label]) => [kind, label]);
    assert.deepEqual(tags, expectedCards[index].tags, `card ${index + 1} must have its approved audience badges`);
  }
});

test("Home stylesheet defines the approved responsive grids", () => {
  const css = readFileSync("assets/css/site.css", "utf8");
  assert.match(css, /\.home-assessment-layout\s*{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto;/);
  assert.match(css, /\.system-grid\s*{[\s\S]*?grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*1179px\)[\s\S]*?\.system-grid\s*{[^}]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*?\.stage-rail\s*{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*?\.system-grid\s*{[^}]*grid-template-columns:\s*1fr;/);
  assert.match(css, /@media \(max-width:\s*680px\)[\s\S]*?\.home-assessment-layout\s*{[^}]*grid-template-columns:\s*1fr;/);
});

test("Home assessment keeps its compact phone padding through the 640px reset", () => {
  const css = readFileSync("assets/css/site.css", "utf8");
  assert.match(
    css,
    /@media \(max-width:\s*640px\)\s*{[\s\S]*?\.section\s*{[^}]*padding:\s*76px\s+0;[^}]*}[\s\S]*?\.home-assessment\s*{[^}]*padding-block:\s*64px;/,
  );
});

test("Home groups FAAI stages and leaves card categories as visible text", () => {
  const home = readFileSync("index.html", "utf8");
  assert.match(home, /<div class="stage-rail" role="group" aria-label="FAAI progression stages" data-reveal>/);

  const categories = home.match(/<p class="card-category"[^>]*>/g) || [];
  assert.equal(categories.length, 5);
  for (const category of categories) assert.doesNotMatch(category, /\saria-label=/);
});

test("every page initializes the newsletter popover exactly once", () => {
  for (const [file] of pageFiles) {
    const html = readFileSync(file, "utf8");
    assert.equal(
      (html.match(/data-tf-live="01KZS2YNAZC5SMZR13X20CRVKZ"/g) || []).length,
      1,
      `${file} needs one newsletter popover`,
    );
    assert.equal(
      (html.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length,
      1,
      `${file} needs exactly one Typeform loader`,
    );
  }
});

test("Collective preserves the complete approved membership offer", () => {
  assert.equal(existsSync("collective/index.html"), true, "Collective page is missing");
  const html = readFileSync("collective/index.html", "utf8");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const circleUrl = "https://kaindly.circle.so/checkout/founding-member";

  assert.match(html, /<title>KAINDLY \| The Kaindly Collective<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/collective\/">/);
  assert.match(html, /href="\.\.\/collective\/"[^>]+aria-current="page"/);
  assert.match(visibleText, /Your AI Future Starts With You/);
  assert.match(visibleText, /Not a Course\. A Living Ecosystem\./);
  assert.match(html, /id="experience"/);
  assert.match(html, /id="transformation"/);
  assert.match(html, /id="pathways"/);
  assert.match(visibleText, /Enrollment Now Open/);
  assert.match(visibleText, /\$97\/month/);
  assert.match(visibleText, /Cancel anytime/);
  assert.equal((html.match(/data-audience-card/g) || []).length, 6);
  assert.equal((html.match(/data-benefit/g) || []).length, 5);
  assert.equal((html.match(/data-pathway/g) || []).length, 5);
  for (const price of ["$2,000+", "$500+", "$300+", "$97/month"]) {
    assert.match(visibleText, new RegExp(price.replace(/[+$]/g, "\\$&")));
  }
  assert.ok((html.match(new RegExp(circleUrl, "g")) || []).length >= 2);
  assert.match(html, /href="\.\.\/assessment\/"/);
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
});

test("Insights filtering matches complete category tokens", async () => {
  const { insightMatches } = await import("../assets/js/site.js");
  assert.equal(insightMatches("kaindly growth", "all"), true);
  assert.equal(insightMatches("kaindly growth", "kaindly"), true);
  assert.equal(insightMatches("kaindly growth", "growth"), true);
  assert.equal(insightMatches("kaindly growth", "ai"), false);
  assert.equal(insightMatches("ai-news", "ai"), false);
});

test("Insights presents curated previews and links the published Standards article", () => {
  assert.equal(existsSync("insights/index.html"), true, "Insights page is missing");
  const html = readFileSync("insights/index.html", "utf8");

  assert.match(html, /<title>KAINDLY \| Insights<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/insights\/">/);
  assert.match(html, /href="\.\.\/insights\/"[^>]+aria-current="page"/);
  assert.equal((html.match(/data-filter="/g) || []).length, 6);
  assert.equal((html.match(/data-insight-card/g) || []).length, 3);
  assert.match(html, /data-filter="all"[^>]+aria-pressed="true"/);
  assert.match(html, /Exclusion and Inequity Has a New Face in the World of AI/);
  assert.match(html, /Your Company Won't Save You from the AI Revolution/);
  assert.match(html, /KAINDLY Standards/);
  assert.match(html, /href="kaindly-standards\/"/);
  assert.match(html, /Read Article/);
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
});

test("KAINDLY Standards publishes the corrected article verbatim", () => {
  assert.equal(existsSync("insights/kaindly-standards/index.html"), true, "Standards article is missing");
  const html = readFileSync("insights/kaindly-standards/index.html", "utf8");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  assert.match(html, /<title>How We Show Up \| KAINDLY Standards<\/title>/);
  assert.match(visibleText, /These standards govern how we work—with clients, with each other, and in every decision we make\./);
  for (const opening of [
    "We do not shame uncertainty.",
    "We design for the least confident person in the room.",
    "We choose clarity over cleverness.",
    "We build confidence through practice, not proclamation.",
    "We challenge without diminishing.",
    "We resist the pressure to move before direction is clear.",
    "We measure by capability and outcomes, not adoption.",
  ]) {
    assert.match(visibleText, new RegExp(opening.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(visibleText, /These standards are not negotiable\./);
  assert.match(visibleText, /They are how KAINDLY earns the right to guide/);
  assert.doesNotMatch(visibleText, /We lead AI\. We don.t chase it\./i);
});

test("About introduces both founders before the company story", () => {
  assert.equal(existsSync("about/index.html"), true, "About page is missing");
  const html = readFileSync("about/index.html", "utf8");

  assert.match(html, /<title>KAINDLY \| About<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/about\/">/);
  assert.match(html, /href="\.\.\/about\/"[^>]+aria-current="page"/);
  assert.equal((html.match(/data-founder/g) || []).length, 2);
  assert.match(html, /Barbara Salami/);
  assert.match(html, /Leanna Baker Williams/);
  assert.match(html, /Co-Founder/);
  assert.match(html, /Why KAINDLY/);
  assert.match(html, /Values in Practice/);
  assert.match(html, /src="\.\.\/assets\/images\/barbara-salami\.jpg" alt="Barbara Salami"/);
  assert.match(html, /src="\.\.\/assets\/images\/leanna-baker-williams\.jpg" alt="Leanna Baker Williams"/);
  assert.equal(existsSync("assets/images/barbara-salami.jpg"), true, "Barbara's launch headshot is missing");
  assert.equal(existsSync("assets/images/leanna-baker-williams.jpg"), true, "Leanna's launch headshot is missing");
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
});

test("Contact exposes embedded scheduling, messaging, and assessment paths", () => {
  assert.equal(existsSync("contact/index.html"), true, "Contact page is missing");
  const html = readFileSync("contact/index.html", "utf8");

  assert.match(html, /<title>KAINDLY \| Schedule a Conversation<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/contact\/">/);
  assert.match(html, /href="\.\.\/contact\/"[^>]+aria-current="page"/);
  assert.match(html, /class="acuity-booking-bar" style="display: none;"/);
  assert.match(html, /owner=38041134&amp;ref=booking_bar/);
  assert.match(html, /https:\/\/embed\.acuityscheduling\.com\/embed\/bar\/38041134\.js/);
  assert.match(html, /src="https:\/\/app\.acuityscheduling\.com\/schedule\.php\?owner=38041134&amp;ref=embedded_csp"/);
  assert.match(html, /title="Schedule Appointment"[^>]+width="100%"[^>]+height="800"[^>]+allow="payment"/);
  assert.equal((html.match(/https:\/\/embed\.acuityscheduling\.com\/js\/embed\.js/g) || []).length, 1);
  assert.match(html, /owner=38041134&amp;ref=booking_button/);
  assert.match(html, /data-tf-live="01KZS1XDVQMV2J1AP4SMMSTQZ6"/);
  assert.match(html, /https:\/\/form\.typeform\.com\/to\/CLwbVZRw/);
  assert.equal((html.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
  assert.match(html, /Not Sure Where You Stand\?/);
  assert.match(html, /href="\.\.\/assessment\/"/);
  assert.match(html, /target="_blank" rel="noopener noreferrer"/);
  assert.doesNotMatch(html, /<form\b/i);
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
});

test("every page has complete unique metadata and accessibility landmarks", () => {
  const titles = new Set();
  const descriptions = new Set();

  for (const [file, route] of pageFiles) {
    const html = readFileSync(file, "utf8");
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)?.[1];

    assert.ok(title, `${file} needs a title`);
    assert.ok(description, `${file} needs a description`);
    assert.equal(titles.has(title), false, `${file} title must be unique`);
    assert.equal(descriptions.has(description), false, `${file} description must be unique`);
    titles.add(title);
    descriptions.add(description);

    assert.match(html, new RegExp(`<link rel="canonical" href="https:\\/\\/www\\.kaindly\\.ai${route.replaceAll("/", "\\/")}">`));
    assert.match(html, new RegExp(`<meta property="og:url" content="https:\\/\\/www\\.kaindly\\.ai${route.replaceAll("/", "\\/")}">`));
    assert.match(html, /<meta name="twitter:title" content="[^"]+">/);
    assert.match(html, /<meta name="twitter:description" content="[^"]+">/);
    assert.match(html, /<meta name="twitter:image" content="https:\/\/www\.kaindly\.ai\/assets\/brand\/og\.png">/);
    assert.equal((html.match(/<main\b/g) || []).length, 1, `${file} needs one main landmark`);
    const expectedCurrentLinks = file === "assessment/index.html" ? 0 : 1;
    assert.equal((html.match(/aria-current="page"/g) || []).length, expectedCurrentLinks, `${file} has an incorrect active navigation state`);
    assert.match(html, /href="#main-content"[^>]*>Skip to content<\/a>/);

    for (const imageTag of html.matchAll(/<img\b[^>]*>/g)) {
      assert.match(imageTag[0], /\balt="[^"]*"/, `${file} image is missing alt text`);
    }

    for (const anchorTag of html.matchAll(/<a\b[^>]*href="https?:\/\/[^>]+>/g)) {
      if (!/target="_blank"/.test(anchorTag[0])) continue;
      assert.match(anchorTag[0], /rel="noopener noreferrer"/, `${file} external new-tab link is unsafe`);
    }
  }
});

test("every local page link and asset reference resolves", () => {
  for (const [file] of pageFiles) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      const reference = match[1];
      if (/^(?:https?:|mailto:|tel:|#)/.test(reference)) continue;

      const cleanReference = reference.split(/[?#]/, 1)[0];
      let target = resolve(dirname(file), cleanReference);
      if (cleanReference.endsWith("/")) target = resolve(target, "index.html");
      assert.equal(existsSync(target), true, `${file} has a broken reference: ${reference}`);
    }
  }
});
