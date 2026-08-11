import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

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

test("Collective presents the approved membership journey without unsupported offer claims", () => {
  assert.equal(existsSync("collective/index.html"), true, "Collective page is missing");
  const html = readFileSync("collective/index.html", "utf8");
  const visibleText = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");

  assert.match(html, /<title>KAINDLY \| The Kaindly Collective<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/www\.kaindly\.ai\/collective\/">/);
  assert.match(html, /href="\.\.\/collective\/"[^>]+aria-current="page"/);
  assert.match(visibleText, /Your AI Future Starts With You/);
  assert.match(visibleText, /Not a Course\. A Living Ecosystem\./);
  assert.match(html, /id="experience"/);
  assert.match(html, /id="transformation"/);
  assert.match(html, /id="pathways"/);
  assert.equal((html.match(/data-pathway/g) || []).length, 5);
  assert.match(html, /owner=38041134&amp;ref=booking_button/);
  assert.doesNotMatch(html, /\$\d|Enrollment Closes|April\s+1/i);
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
