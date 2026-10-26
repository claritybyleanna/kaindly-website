import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import test from "node:test";

const routeFiles = [
  "bsales/index.html",
  "bsales/access/index.html",
  "bsales/prompt-pack-1/index.html",
  "bsales/prompt-pack-2/index.html",
  "bsales/materials/Kaindly_Bracco_Prompt_Pack_1_Demystifying_AI_and_Your_AI_Brain.docx",
  "bsales/materials/Kaindly_Bracco_Prompt_Pack_2_Your_AI_Chief_of_Staff.docx",
  "bsales/materials/Demystifying-AI-and-CRAFT-I.pdf",
  "bsales/materials/Build-Your-AI-Chief-of-Staff.pdf",
];

test("Bracco Sales hub ships the approved lightweight route bundle", async () => {
  for (const file of routeFiles) {
    assert.equal(existsSync(new URL(`../${file}`, import.meta.url)), true, `${file} must exist`);
  }

  const html = await readFile(new URL("../bsales/index.html", import.meta.url), "utf8");
  assert.match(html, /Bracco Sales Team/u);
  assert.match(html, /AI Working Session/u);
  assert.match(html, /AI Readiness Assessment results/u);
  assert.match(html, /hello@kaindly\.ai/u);
  assert.match(html, /results were incomplete/u);
  assert.match(html, /href="https:\/\/diagnostic\.kaindly\.ai"/u);
  assert.match(html, /Demystifying AI and Your AI Brain/u);
  assert.match(html, /Your AI Chief of Staff/u);
  assert.match(html, /Today’s agenda/u);
  assert.match(html, /8:00 – 8:10/u);
  assert.match(html, /Foundations/u);
  assert.match(html, /Exercise one: giving your AI a brain/u);
  assert.match(html, /Exercise two: building a chief of staff that coaches/u);
  assert.match(html, /Questions and close/u);
  assert.match(html, /Part 1 · Session deck/u);
  assert.match(html, /Part 2 · Session deck/u);
  assert.doesNotMatch(html, /Coming soon/u);
  assert.match(html, /href="\/bsales\/materials\/Demystifying-AI-and-CRAFT-I\.pdf"/u);
  assert.match(html, /href="\/bsales\/materials\/Build-Your-AI-Chief-of-Staff\.pdf"/u);
  assert.match(html, /<section class="blead-section" id="resources"/u);
  assert.ok(html.indexOf('id="resources"') > html.indexOf('id="how-to-use"'));
  assert.ok(html.indexOf("Part 1 · Session deck") > html.indexOf('id="resources"'));
  assert.ok(html.indexOf("Part 2 · Session deck") > html.indexOf('id="resources"'));
  assert.match(html, /The session is broken into two sections/u);
  assert.equal((html.match(/Kaindly_Bracco_Prompt_Pack_1_Demystifying_AI_and_Your_AI_Brain\.docx/gu) ?? []).length, 2);
  assert.equal((html.match(/Kaindly_Bracco_Prompt_Pack_2_Your_AI_Chief_of_Staff\.docx/gu) ?? []).length, 2);
  assert.ok(html.lastIndexOf("Exercise one: giving your AI a brain") > html.indexOf('id="resources"'));
  assert.ok(html.lastIndexOf("Exercise two: building a chief of staff that coaches") > html.indexOf('id="resources"'));
  assert.match(html, /href="\/bsales\/prompt-pack-1\/"/u);
  assert.match(html, /href="\/bsales\/prompt-pack-2\/"/u);
  assert.match(html, /action="\/bsales\/logout\/"/u);
  assert.doesNotMatch(html, /bsales-hero-mark|>02</u);
  assert.doesNotMatch(html, /facilitator|dashboard|response collection|recording/iu);
});

test("Bracco Sales agenda and deck order match the live session", async () => {
  const { bsalesContent } = await import("../bsales/content.js");
  assert.equal(bsalesContent.agenda.length, 6);
  assert.deepEqual(bsalesContent.agenda.map(({ time }) => time), [
    "8:00 – 8:10",
    "8:10 – 8:35",
    "8:35 – 9:35",
    "9:35 – 9:45",
    "9:45 – 10:30",
    "10:30 – 10:45",
  ]);
  assert.equal(bsalesContent.resources.length, 4);
  assert.ok(bsalesContent.resources.every(({ state }) => state === "available"));
});

test("Bracco Sales prompt packs preserve the source pack structure", async () => {
  assert.equal(existsSync(new URL("../bsales/pack-1/content.js", import.meta.url)), true);
  assert.equal(existsSync(new URL("../bsales/pack-2/content.js", import.meta.url)), true);
  const { packOneContent } = await import("../bsales/pack-1/content.js");
  const { packTwoContent } = await import("../bsales/pack-2/content.js");

  assert.equal(packOneContent.prompts.length, 7);
  assert.deepEqual(packOneContent.prompts.map(({ title }) => title), [
    "The Everyday Prompt",
    "The CRAFT-I Coaching Prompt",
    "Your Writing Style",
    "Your Work Map",
    "The Operating Manual Interview",
    "Your Custom Instructions",
    "Your Saved Memories",
  ]);
  assert.equal(packTwoContent.setup.length, 4);
  assert.equal(packTwoContent.prompts.length, 8);
  assert.deepEqual(packTwoContent.prompts.map(({ title }) => title), [
    "Prepare for the field day",
    "Separate observation from assumption",
    "Generate self-assessment questions",
    "Draft behavior-based feedback",
    "Coaching versus managing check",
    "Draft the Field Coaching Report",
    "Improve an existing FCR",
    "Create a 30-day embed plan",
  ]);
  assert.ok([...packOneContent.prompts, ...packTwoContent.prompts].every(({ prompt }) => prompt.length > 100));
});

test("Bracco Sales authentication is isolated to the lowercase sales route", async () => {
  assert.equal(existsSync(new URL("../lib/bsales-auth.js", import.meta.url)), true);
  const {
    BSALES_COOKIE_NAME,
    clearBsalesSession,
    sanitizeBsalesReturnTo,
    serializeBsalesSession,
    signBsalesSession,
    verifyBsalesSession,
  } = await import("../lib/bsales-auth.js");

  const secret = "sales-session-secret-with-adequate-length";
  const token = await signBsalesSession({ expiresAt: 20_000, secret });
  assert.equal(await verifyBsalesSession(token, secret, 10_000), true);
  assert.equal(await verifyBsalesSession(`${token}x`, secret, 10_000), false);
  const cookie = serializeBsalesSession(token, { secure: true });
  assert.match(cookie, new RegExp(`^${BSALES_COOKIE_NAME}=`));
  assert.match(cookie, /Path=\/bsales\//u);
  assert.match(cookie, /HttpOnly/u);
  assert.match(cookie, /SameSite=Strict/u);
  assert.match(clearBsalesSession({ secure: true }), /Max-Age=0/u);
  assert.equal(sanitizeBsalesReturnTo("/bsales/prompt-pack-1/"), "/bsales/prompt-pack-1/");
  assert.equal(sanitizeBsalesReturnTo("/Blead/"), "/bsales/");
  assert.equal(sanitizeBsalesReturnTo("//attacker.example"), "/bsales/");
});

test("middleware protects Bracco Sales independently from the leadership hub", async () => {
  const middlewareModule = await import("../middleware.js");
  assert.equal(typeof middlewareModule.isProtectedBsalesPath, "function");
  assert.equal(middlewareModule.isProtectedBsalesPath("/bsales/"), true);
  assert.equal(middlewareModule.isProtectedBsalesPath("/Bsales/"), false);
  assert.equal(middlewareModule.isProtectedBsalesPath("/Blead/"), false);
});

test("Bracco Sales middleware issues and accepts only its own scoped session", async () => {
  const keys = ["VERCEL_ENV", "BSALES_PASSWORD", "BSALES_SESSION_SECRET"];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  process.env.VERCEL_ENV = "development";
  process.env.BSALES_PASSWORD = "test-sales-password";
  process.env.BSALES_SESSION_SECRET = "test-sales-session-secret-with-adequate-length";
  try {
    const { default: middleware } = await import("../middleware.js");
    const denied = await middleware(new Request("https://www.kaindly.ai/bsales/prompt-pack-1/"));
    assert.equal(denied.status, 303);
    assert.equal(new URL(denied.headers.get("location")).pathname, "/bsales/access/");

    const login = await middleware(new Request("https://www.kaindly.ai/bsales/access/", {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: "https://www.kaindly.ai",
      },
      body: new URLSearchParams({
        password: process.env.BSALES_PASSWORD,
        returnTo: "/bsales/prompt-pack-1/",
      }),
    }));
    assert.equal(login.status, 303);
    assert.equal(login.headers.get("location"), "/bsales/prompt-pack-1/");
    assert.match(login.headers.get("set-cookie"), /^kaindly_bsales_session=/u);
    assert.doesNotMatch(login.headers.get("set-cookie"), /test-sales-password/u);

    const cookie = login.headers.get("set-cookie").split(";", 1)[0];
    const allowed = await middleware(new Request("https://www.kaindly.ai/bsales/prompt-pack-1/", {
      headers: { cookie },
    }));
    assert.match(await allowed.text(), /Save and open session/);
    assert.equal(allowed.headers.get("cache-control"), "private, no-store");
    assert.equal(allowed.headers.get("x-robots-tag"), "noindex, nofollow");
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test("generated Bracco Sales pages are deterministic, accessible, and interactive", async () => {
  assert.equal(existsSync(new URL("../scripts/build-bsales.mjs", import.meta.url)), true);
  const { bsalesContent } = await import("../bsales/content.js");
  const { packOneContent } = await import("../bsales/pack-1/content.js");
  const { packTwoContent } = await import("../bsales/pack-2/content.js");
  const { renderBsalesHub, renderBsalesPack } = await import("../scripts/build-bsales.mjs");

  const hub = await readFile(new URL("../bsales/index.html", import.meta.url), "utf8");
  const packOne = await readFile(new URL("../bsales/prompt-pack-1/index.html", import.meta.url), "utf8");
  const packTwo = await readFile(new URL("../bsales/prompt-pack-2/index.html", import.meta.url), "utf8");
  assert.equal(hub, renderBsalesHub(bsalesContent));
  assert.equal(packOne, renderBsalesPack(packOneContent));
  assert.equal(packTwo, renderBsalesPack(packTwoContent));

  for (const html of [hub, packOne, packTwo]) {
    assert.equal((html.match(/<h1\b/gu) ?? []).length, 1);
    assert.match(html, /<meta name="robots" content="noindex, nofollow">/u);
    assert.match(html, /<main\b/u);
    assert.match(html, /href="\/privacy\/"/u);
    assert.match(html, /href="\/terms\/"/u);
  }
  for (const html of [packOne, packTwo]) {
    assert.match(html, /BRACCO SALES TEAM/u);
    assert.doesNotMatch(html, /BRACCO SALES LEADERSHIP/u);
    assert.match(html, /data-copy-prompt/u);
    assert.match(html, /data-prompt-template/u);
    assert.match(html, /assets\/js\/bsales\.js/u);
  }
});

test("generated Bracco Sales prompt packs use the registered workbook and field identities", async () => {
  const { packOneContent } = await import("../bsales/pack-1/content.js");
  const { packTwoContent } = await import("../bsales/pack-2/content.js");
  const { createBsalesSchemas } = await import("../lib/workbook-schema.js");
  const packOne = await readFile(new URL("../bsales/prompt-pack-1/index.html", import.meta.url), "utf8");
  const packTwo = await readFile(new URL("../bsales/prompt-pack-2/index.html", import.meta.url), "utf8");

  const cases = [
    {
      html: packOne,
      content: packOneContent,
      workbookId: "bracco-sales-ai-brain",
      endpoint: "/bsales/prompt-pack-1/api/responses",
    },
    {
      html: packTwo,
      content: packTwoContent,
      workbookId: "bracco-sales-chief-of-staff",
      endpoint: "/bsales/prompt-pack-2/api/responses",
    },
  ];

  for (const { html, content, workbookId, endpoint } of cases) {
    const schema = createBsalesSchemas(content);
    assert.match(html, new RegExp(`data-workbook-id="${workbookId}"`, "u"));
    assert.match(html, new RegExp(`data-response-endpoint="${endpoint}"`, "u"));
    assert.deepEqual(
      [...html.matchAll(/data-prompt-card data-prompt-id="([^"]+)"/gu)].map(([, id]) => id),
      schema.map(({ id }) => id),
    );
    assert.deepEqual(
      [...html.matchAll(/data-prompt-field="([^"]+)"/gu)].map(([, id]) => id),
      schema.flatMap(({ fields }) => fields.map(({ id }) => id)),
    );
    assert.doesNotMatch(html, /data-prompt-field(?:\s|>)/u);
  }

  const promptOne = packOne.match(/<article[^>]+data-prompt-id="prompt-01"[\s\S]*?<\/article>/u)?.[0] ?? "";
  assert.notEqual(promptOne, "");
  assert.doesNotMatch(promptOne, /data-prompt-field/u);
});

test("Bracco Sales prompt personalization replaces only completed fields", async () => {
  assert.equal(existsSync(new URL("../assets/js/bsales.js", import.meta.url)), true);
  const { personalizePrompt } = await import("../assets/js/bsales.js");
  const template = "Rep [INITIALS] on [DATE] with [PASTE NOTES]";
  assert.equal(
    personalizePrompt(template, new Map([
      ["[INITIALS]", "T.M."],
      ["[DATE]", "October 15"],
      ["[PASTE NOTES]", ""],
    ])),
    "Rep T.M. on October 15 with [PASTE NOTES]",
  );
});

test("Bracco Sales navigation collapses before four links can overlap", async () => {
  const script = await readFile(new URL("../assets/js/bsales.js", import.meta.url), "utf8");
  assert.match(script, /classList\.add\("blead-js"\)/u);
  assert.match(script, /toggleAttribute\("data-open"/u);
});

test("Bracco Sales access return destinations cannot leave the protected route", async () => {
  assert.equal(existsSync(new URL("../assets/js/bsales-access.js", import.meta.url)), true);
  const { sanitizeBsalesAccessReturnTo } = await import("../assets/js/bsales-access.js");
  assert.equal(sanitizeBsalesAccessReturnTo("/bsales/prompt-pack-2/"), "/bsales/prompt-pack-2/");
  assert.equal(sanitizeBsalesAccessReturnTo("/Blead/"), "/bsales/");
  assert.equal(sanitizeBsalesAccessReturnTo("https://attacker.example"), "/bsales/");
});
