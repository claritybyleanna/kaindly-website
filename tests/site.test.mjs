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

test("Home and Assessment expose the supplied Typeforms with fallbacks", () => {
  assert.equal(existsSync("assessment/index.html"), true, "Assessment page is missing");
  const home = readFileSync("index.html", "utf8");
  const assessment = readFileSync("assessment/index.html", "utf8");

  assert.match(home, /data-tf-live="01KJ3V41DCC0V9P0VT0T97XK4E"/);
  assert.match(home, /https:\/\/form\.typeform\.com\/to\/01KJ3V41DCC0V9P0VT0T97XK4E/);
  assert.equal((home.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
  assert.match(assessment, /data-tf-live="01KJ3TB8AV4EBVV6P51RE768EB"/);
  assert.match(assessment, /https:\/\/form\.typeform\.com\/to\/01KJ3TB8AV4EBVV6P51RE768EB/);
  assert.equal((assessment.match(/https:\/\/embed\.typeform\.com\/next\/embed\.js/g) || []).length, 1);
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

test("Insights presents curated previews without broken article destinations", () => {
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
  assert.equal((html.match(/href="\.\.\/insights\/"/g) || []).length, 2);
  assert.doesNotMatch(html, /image-slot|text\/babel|TODO|TBD/i);
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

test("Contact exposes both Acuity integrations and never depends on a form", () => {
  assert.equal(existsSync("contact/index.html"), true, "Contact page is missing");
  const html = readFileSync("contact/index.html", "utf8");

  assert.match(html, /<title>KAINDLY \| Schedule a Conversation<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/contact\/">/);
  assert.match(html, /href="\.\.\/contact\/"[^>]+aria-current="page"/);
  assert.match(html, /class="acuity-booking-bar" style="display: none;"/);
  assert.match(html, /owner=38041134&amp;ref=booking_bar/);
  assert.match(html, /https:\/\/embed\.acuityscheduling\.com\/embed\/bar\/38041134\.js/);
  assert.match(html, /owner=38041134&amp;ref=booking_button/);
  assert.match(html, /https:\/\/embed\.acuityscheduling\.com\/embed\/button\/38041134\.css/);
  assert.match(html, /https:\/\/embed\.acuityscheduling\.com\/embed\/button\/38041134\.js/);
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
