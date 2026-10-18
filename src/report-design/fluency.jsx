import React from 'react';
import {createRoot} from 'react-dom/client';
import './design-system.js';
import {openReportDownload,openReportShare} from '../../assets/js/report.js';

const { Button, IconButton, Toast } = window.KaindlyDesignSystem_773de9;
const { useState, useEffect, useRef } = React;

const TITLE = "The Fluency Advantage: Building AI Capability in a Regulated Industry";

const Ic = {
  dl: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/></svg>,
  link: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  li: <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z"/></svg>,
  x: <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.67l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z"/></svg>,
  mail: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>,
};


function useShare(setToast) {
  const url = () => location.origin + location.pathname;
  const open = u => window.open(u, "_blank", "noopener,noreferrer,width=640,height=600");
  return {
    copy: async e => { const result = await openReportShare(e.currentTarget); if (result === 'copied') setToast(true); },
    li: () => open("https://www.linkedin.com/sharing/share-offsite/?url=" + encodeURIComponent(url())),
    x: () => open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(TITLE) + "&url=" + encodeURIComponent(url())),
    mail: () => { location.href = "mailto:?subject=" + encodeURIComponent(TITLE) + "&body=" + encodeURIComponent(url()); },
    dl: e => openReportDownload(e.currentTarget),
  };
}
function Evidence({page, children}) {
  return <div className="evidence"><p>{children}</p><button data-download data-page={page} onClick={e => openReportDownload(e.currentTarget, page)}>Explore the full report · p. {page} ↗</button></div>;
}
function tabKeys(e, set, index, count) {
  const next = e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (index + 1) % count : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (index + count - 1) % count : e.key === 'Home' ? 0 : e.key === 'End' ? count - 1 : null;
  if (next !== null) { e.preventDefault(); set(next); e.currentTarget.parentElement.querySelectorAll('[role=tab]')[next].focus(); }
}

function ShareIcons({ s, variant = "ghost", cls = "ib" }) {
  return <>
    <IconButton className={cls} variant={variant} data-share aria-label="Share or copy link" title="Share or copy link" onClick={s.copy}>{Ic.link}</IconButton>
    <IconButton className={cls} variant={variant} aria-label="Share on LinkedIn" title="Share on LinkedIn" onClick={s.li}>{Ic.li}</IconButton>
    <IconButton className={cls} variant={variant} aria-label="Share on X" title="Share on X" onClick={s.x}>{Ic.x}</IconButton>
    <IconButton className={cls} variant={variant} aria-label="Share via email" title="Share via email" onClick={s.mail}>{Ic.mail}</IconButton>
  </>;
}

function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { threshold: .15 });
    document.querySelectorAll(".rv").forEach(el => io.observe(el));
    return () => io.disconnect();
  }, []);
}

function useInView(ref) {
  const [v, setV] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setV(true); io.disconnect(); } }, { threshold: .4 });
    ref.current && io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return v;
}

function Count({ to, prefix = "", suffix = "" }) {
  const ref = useRef(null); const v = useInView(ref); const [n, setN] = useState(0);
  useEffect(() => {
    if (!v) return; if (matchMedia("(prefers-reduced-motion: reduce)").matches) { setN(to); return; } let raf, t0;
    const step = (t) => { t0 ??= t; const p = Math.min((t - t0) / 1400, 1); setN(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [v]);
  return <span ref={ref}>{prefix}{n}{suffix}</span>;
}

const INS = [
  { k: "Intentional Learners", big: "65.5%", pct: 65.5, count: 129, total: 197, c: "var(--violet)", t: "were Intentional Learners: interested and experimenting with AI, but lacking a system.", src: "AI Readiness Assessment, p. 7 · 129 of 197 respondents. This research sample is separate from the Academy baseline.", scale: "Percentage highlights are illustrative; research sample: 197 respondents." },
  { k: "One organization", big: "33", count: 33, total: 177, c: "var(--charcoal)", t: "professionals from a single top-5 global pharmaceutical company completed the assessment independently, through no corporate channel.", src: "The Fluency Advantage, p. 8 · Academy baseline, n = 177.", scale: "33 highlighted figures; the full grid provides context for the 277 registrants." },
  { k: "Director & above", big: "49%", pct: 49, count: 97, total: 197, c: "var(--periwinkle)", t: "of research respondents were director level or above, including 7% in the C-suite.", src: "AI Readiness Assessment, p. 3 · n = 197. Published percentage is rounded.", scale: "Percentage highlights are illustrative; research sample: 197 respondents." },
  { k: "Before & after", big: "2", count: 2, total: 2, c: "#C0701E", t: "participants took the Readiness Assessment both before and after the Academy, according to the supplied design.", src: "Source note: this paired-assessment count appears in the design export and needs confirmation against the final report. It is separate from the 112 matched sentiment responses.", scale: "Two highlighted participants; paired-assessment count awaits confirmation." },
  { k: "Confidence improved", big: "94%", pct: 94, count: 94, total: 100, c: "var(--green)", t: "reported greater confidence by the finale. None reported feeling less confident.", src: "The Fluency Advantage, p. 10 · Self-reported confidence averaged 5.6/7 at close. The item-level response count is not stated in the supplied report.", scale: "Percentage highlights are illustrative, not a count of survey respondents." },
];
const TOTAL = 277;

function People() {
  const [z, setZ] = useState(-1);
  const x = z >= 0 ? INS[z] : null;
  // Keep the original grid intact. Percent views are proportional illustrations;
  // exact counts and source sample sizes remain in the accompanying text.
  const highlighted = x ? (x.pct ? Math.round(TOTAL * x.pct / 100) : x.count) : 0;
  return <div className="ppl-wrap rv">
    <div>
      <div className="ppl" aria-hidden="true" style={{ position: "relative", gridTemplateColumns: "repeat(28, minmax(0, 1fr))", gridTemplateRows: "repeat(10, minmax(0, 1fr))", height: "clamp(230px, 30vw, 410px)" }}>
        {Array.from({ length: TOTAL }, (_, i) => {
          const on = x && i < highlighted;
          return <i key={i} className={on ? "h" : ""} style={{ height: "100%", aspectRatio: "auto", background: on ? x.c : (z < 0 ? "#C9C5D3" : "#E6E4EB"), transitionDelay: (on ? i * 1.2 : 0) + "ms" }}></i>;
        })}
        <div style={{ position: "absolute", inset: 0, display: "grid", gridTemplateColumns: "repeat(5, 1fr)" }}>{INS.map((item, i) => <span key={item.k} onMouseEnter={() => setZ(i)} />)}</div>
      </div>
      <div className="ilg">{INS.map((y, i) => <button key={i} aria-pressed={z === i} aria-controls="fluency-cohort-detail" className={z === i ? "on" : ""} style={{ "--c": y.c }} onMouseEnter={() => setZ(i)} onFocus={() => setZ(i)} onClick={() => setZ(i)}><i></i>{y.k}</button>)}</div>
      <p className="ppl-scale">{x ? x.scale : "Each figure is one of the 277 registrants. Choose a view to explore its sample."}</p>
    </div>
    <div className="co" id="fluency-cohort-detail" aria-live="polite" aria-atomic="true" style={{ "--cc": x ? x.c : "var(--charcoal)" }}>
      <div key={z} className="fade">
        <b>{x ? x.big : <Count to={277} />}</b>
        <p>{x ? x.t : "Professionals registered across 27+ organizations. Hover across the cohort or choose a view to explore."}</p>
        {x && <small>{x.src}</small>}
      </div>
    </div>
  </div>;
}

const SESSIONS = [
  { k: "Before", t: "AI Readiness Assessment", c: "var(--green)", bg: "var(--honeydew)", d: "A 10-dimension diagnostic placing each participant on the five-stage AI Readiness Spectrum, establishing a baseline to inform session design.", a: "177", al: "completed pre-course" },
  { k: "Session 1", t: "Demystify the Machine", c: "var(--violet)", bg: "#EFEBFF", d: "AI fundamentals, platform navigation, and personalization setup, moving the room from confusion to clarity in 90 minutes.", q: "“I used Claude today for the 1st time, it was great!”", a: "195", al: "peak attendees" },
  { k: "Session 2", t: "Prompting Like a Pro", c: "#C0701E", bg: "#FEF2E6", d: "KAINDLY's structured prompting methodology, applied in live exercises with outputs compared across revisions.", q: "“I used CRAFT for a job-related task that I abandoned weeks ago. The output is amazing.”", a: "186", al: "peak attendees" },
  { k: "Session 3", t: "Prompts in Action", c: "var(--green)", bg: "#EAF4E4", d: "Team-based prompt challenges scored against a rubric, plus the AI Opportunity Scan for mapping workflow tasks to AI support.", q: "“It gave me clarity on my prioritisation and where it can really support me.”", a: "145", al: "peak attendees" },
  { k: "Session 4", t: "Own Your AI Future", c: "var(--charcoal)", bg: "#F1F0F3", d: "Readiness Assessment deep-dives, stage-based breakout reflections, and 90-day behavioral roadmaps built from each participant's results.", q: "“I am leaving more knowledgeable and feeling more empowered.”", a: "125", al: "peak attendees at the finale" },
  { k: "After", t: "The KAINDLY Collective", c: "var(--green)", bg: "var(--honeydew)", d: "Ongoing community with curated learning pathways, a prompt library, live weekly sessions, and peer accountability beyond the cohort.", a: "Ongoing", al: "community membership" },
];

const SPECTRUM = [
 {l:"Curious Observer",p:5,n:"Aware of AI, not yet using it in their work."},
 {l:"Intentional Learner",p:69,n:"69% of this Academy baseline were Intentional Learners."},
 {l:"Active Practitioner",p:20,n:"Using AI regularly and building repeatable habits."},
 {l:"Confident Integrator",p:5,n:"AI is embedded across real workflows."},
 {l:"Strategic Champion",p:1,n:"Leading others and shaping organizational adoption."},
];
const FINDINGS = [
  { t: "From Awareness to Behavioral Activation", d: "In session surveys (item-level response counts not reported), 85% of respondents had used an AI tool for a work-related task, unprompted by any assignment. By Session 3, 86% of respondents had applied the CRAFT framework between sessions; 93% of those reported usable results. These self-reports are not a controlled measure of productivity." },
  { t: "Individual Fluency Produced Enterprise Distribution", d: "By the midpoint, participants were building capability for their teams. One director planned to require her entire team to adopt AI-assisted meeting management the following week. Individual contributors moved into internal AI teaching roles without being asked." },
  { t: "Sentiment Shifted From Anxiety to Agency", d: "Among participants who responded in both sessions (n = 112), non-positive sentiment fell from 25% in Session 1 to 0% in Session 4. The room moved from curious, overwhelmed and skeptical to excited, motivated and confident." },
  { t: "The Assessment Revealed What Surveys Cannot", d: "As behavioral fluency increased, some self-assessed confidence scores declined. One reading is a calibration effect: learning increases awareness of what remains to be learned. The Readiness Assessment is designed to capture that distinction." },
];

function Band({ src, pos = "center", q, by }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const img = el.querySelector(".bi"); let raf;
    const f = () => { raf = null; const r = el.getBoundingClientRect(); const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; img.style.transform = `translateY(${p * -6}%) scale(1.04)`; };
    const on = () => { if (!raf) raf = requestAnimationFrame(f); };
    f(); addEventListener("scroll", on, { passive: true }); return () => removeEventListener("scroll", on);
  }, []);
  return <section className="band" ref={ref} data-screen-label="Image">
    <div className="bi" style={{ backgroundImage: `url("${src}")`, backgroundPosition: pos }}></div><div className="bs"></div>
    {q && <div className="wrap rv"><blockquote>{q}</blockquote><cite>{by}</cite></div>}
  </section>;
}

function App() {
  const [toast, setToast] = useState(false);
  const [sc, setSc] = useState(false);
  const [ses, setSes] = useState(1);
  const [stage, setStage] = useState(1); const [mode, setMode] = useState("pct");
  const [sv, setSv] = useState(0); const after = sv >= 50;
  const [open, setOpen] = useState(0);
  const specRef = useRef(null); const specIn = useInView(specRef);
  const s = useShare(setToast);
  useReveal();
  useEffect(() => { const f = () => setSc(window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(false), 2400); return () => clearTimeout(t); }, [toast]);
  const S = SESSIONS[ses];

  return <>
    <header className={"bar" + (sc ? " sc" : "")}>
      <div className="wrap in">
        <a href="../../index.html"><img className="lg" src={sc ? "../../assets/brand/logo-secondary-violet.svg" : "../../assets/brand/logo-secondary-white.svg"} alt="KAINDLY" /></a>
        <a className={"back" + (sc ? "" : " bw")} href="../">← All Insights</a>
        <span className="tt">The Fluency Advantage · Case Study</span>
        <div className="act">
          <Button size="sm" data-download aria-label="Download the Report" onClick={s.dl} style={sc ? {} : { background: "var(--white)", color: "var(--violet)", borderColor: "var(--white)" }}>{Ic.dl}<span className="dl-t">Download the Report</span></Button>
          <span className="sep" style={sc ? {} : { background: "rgba(255,255,255,.3)" }}></span>
          <span style={{ display: "contents", color: sc ? "" : "#fff" }}><ShareIcons s={s} cls={sc ? "ib" : "ib ibw"} /></span>
        </div>
      </div>
    </header>
    <style>{`.ibw{color:var(--white)!important}.ibw:hover{background:rgba(255,255,255,.16)!important;color:var(--white)!important}`}</style>

    <section className="hero" data-screen-label="Hero">
      <div className="ph"></div><div className="tn"></div><div className="sh"></div>
      <div className="wrap">
        <p className="eyb">Case Study · AI Academy</p>
        <h1>The Fluency <em>Advantage.</em></h1>
        <p className="sub">A four-session learning pathway for 277 registrants across a regulated industry, with evidence on practice and sentiment.</p>
        <div className="ctas">
          <Button size="lg" variant="accent" data-download aria-label="Download the Report" onClick={s.dl}>{Ic.dl}Download the Report</Button>
          <Button size="lg" variant="outline" onClick={() => document.getElementById("results").scrollTo ? window.scrollTo({ top: document.getElementById("results").offsetTop - 60, behavior: "smooth" }) : null} style={{ color: "var(--white)", borderColor: "rgba(255,255,255,.5)" }}>See the Results</Button>
        </div>
        <div className="meta">
          <div><span className="ml">Partner</span>24,000-member life sciences association</div>
          <div><span className="ml">Programme</span>Four-session virtual AI Academy</div>
          <div><span className="ml">Cohort</span>277 professionals · 27+ organizations</div>
        </div>
      </div>
    </section>

    <section className="sec" id="results" data-screen-label="At a Glance">
      <div className="wrap">
        <p className="eyb rv">At a Glance</p>
        <h2 className="h2 rv">Free. Voluntary. And They Kept Coming Back.</h2>
        <People />
      </div>
    </section>

    <Band src="../../assets/images/report-design/hero-team.jpg" pos="center 30%" q="“It went from overwhelming to a part of my way of working.”" by="Academy participant · Verbatim reflection" />
    <section className="sec" data-screen-label="Challenge">
      <div className="wrap">
        <p className="eyb rv">The Challenge</p>
        <h2 className="h2 rv">A Structural Gap in a Motivated Workforce.</h2>
        <p className="lead rv">Member companies were deploying AI platforms, but guidance remained uneven. Experienced professionals were expected to integrate tools they'd never been trained on, where a single hallucinated reference could carry regulatory consequences.</p>
        <div className="quote rv">
          <div className="q"><h3>“Never going to catch up.”</h3><p>Academy participant, Session 1 opening pulse check</p></div>
          <div className="im"></div>
        </div>
        <div className="cons">
          {[["Audience Diversity", "Entry-level to executive, across a dozen-plus functions. One curriculum had to serve all of them."], ["Regulatory Sensitivity", "Data confidentiality, hallucination risk, and human-in-the-loop accountability from the very first session."], ["Scale Without Dilution", "200+ registrants, virtual, with hands-on practice participants could feel and facilitators could measure."]].map(([t, d], i) =>
            <div className="rv" key={t} style={{ transitionDelay: i * 90 + "ms" }}><p className="n">0{i + 1}</p><h3>{t}</h3><p>{d}</p></div>)}
        </div>
      </div>
    </section>

    <section className="sec" style={{ background: "#FAF9FC" }} data-screen-label="Programme">
      <div className="wrap">
        <p className="eyb rv">Programme Design</p>
        <h2 className="h2 rv">Four Sessions. One Clear Path.</h2>
        <p className="lead rv">Four 90-minute sessions, each moving participants deeper into applied practice, bookended by diagnosis and community.</p>
        <div className="prog">
          <div className="tabs rv" role="tablist">
            {SESSIONS.map((x, i) => <button key={i} role="tab" aria-selected={ses === i} className={"tab" + (ses === i ? " on" : "")} style={{ "--c": x.c }} onKeyDown={e => tabKeys(e, setSes, i, SESSIONS.length)} onFocus={() => setSes(i)} onClick={() => setSes(i)} onMouseEnter={() => setSes(i)}><span className="k">{x.k}</span><span className="t">{x.t}</span><span className="d"></span></button>)}
          </div>
          <div className="panel rv" style={{ background: S.bg }}>
            <div key={ses} className="fade" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <p className="k" style={{ color: S.c }}>{S.k}</p>
              <h3 style={{ color: S.c }}>{S.t}</h3>
              <p className="ds">{S.d}</p>
              {S.q ? <blockquote style={{ color: S.c }}>{S.q}</blockquote> : <div style={{ marginTop: "auto" }}></div>}
              <div className="att"><b style={{ color: S.c }}>{S.a}</b><span>{S.al}</span></div>
            </div>
          </div>
        </div>
      </div>
    <div className="wrap"><Evidence page={9}>Source: The Fluency Advantage, p. 9. Earlier source edition. Read the full report for context and limitations.</Evidence></div>
    </section>

    <Band src="../../assets/images/report-design/laptop.jpg" pos="center 40%" q="“This has definitely been an awareness exercise for me.”" by="Academy participant · Session 2" />
    <section className="sec dark" data-screen-label="Readiness Spectrum">
      <div className="wrap">
        <p className="eyb rv">The Diagnostic</p>
        <h2 className="h2 rv">Interest Was High. Systems Were Missing.</h2>
        <p className="lead rv">177 professionals completed the AI Readiness Assessment: 10 dimensions across mindset, practice, and environment. Select a stage to explore.</p>
        <div className="spechd rv"><p>Academy baseline · n = 177 · Rounded percentages</p><div className="segd" role="group" aria-label="Display mode"><button className={mode === "pct" ? "on" : ""} aria-pressed={mode === "pct"} onClick={() => setMode("pct")}>Percent</button><button className={mode === "cnt" ? "on" : ""} aria-pressed={mode === "cnt"} onClick={() => setMode("cnt")}>Count</button></div></div>
        <div className="spec" ref={specRef}>
          {SPECTRUM.map((x, i) => <button key={i} className={"st" + (stage === i ? " on" : "")} aria-pressed={stage === i} onFocus={() => setStage(i)} onClick={() => setStage(i)} onMouseEnter={() => setStage(i)}>
            <span className="l">{i + 1} · {x.l}</span>
            <span className="tr"><span className="fl" style={{ width: specIn ? x.p + "%" : 0, transitionDelay: i * 80 + "ms" }}></span></span>
            <span className="p">{mode === "pct" ? x.p + "%" : <small>Not reported</small>}</span>
          </button>)}
        </div>
        <div className="axis"><span></span><span><span>0%</span><span>100%</span></span><span></span></div>
        <p className="spfoot">{mode === "pct" ? "Published rounded percentages of 177 baseline assessments." : "Exact stage counts are not reported. Bar lengths retain the published percentages; counts cannot be inferred from rounded values."}</p>
        <p className="stnote" key={stage}><span className="fade" style={{ display: "block" }}>{SPECTRUM[stage].n}</span></p>
      </div>
    <div className="wrap"><Evidence page={7}>Source: The Fluency Advantage, p. 7. n = 177; published rounded baseline percentages.</Evidence></div>
    </section>

    <section className="sec" data-screen-label="Sentiment">
      <div className="wrap">
        <div className="sent">
          <div>
            <p className="eyb rv">The Shift</p>
            <h2 className="h2 rv">From Anxiety to Agency.</h2>
            <p className="lead rv">We asked the same question at the start of Session 1 and Session 4: how do you feel about AI? Slide to compare the two measured endpoints (matched n = 112). The transition is illustrative, not intermediate observations.</p>
            <div className="sl rv">
              <p className={"slhint" + (sv > 0 ? " gone" : "")} aria-hidden="true">Slide to reveal<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></p>
              <input type="range" min="0" max="100" value={sv} onChange={e => setSv(+e.target.value)} aria-label="Session 1 to Session 4" aria-valuetext={after ? "Session 4: 0% non-positive; matched n=112" : "Session 1: 25% non-positive; matched n=112"} />
              <div className="ends"><span>Session 1</span><span>Session 4</span></div>
            </div>
          </div>
          <div className="sentcard rv" style={{ background: `color-mix(in oklab, #F1F0F3 ${100 - sv}%, var(--honeydew))` }}>
            <p className="big" style={{ color: `color-mix(in oklab, var(--charcoal) ${100 - sv}%, var(--green))` }}>{after ? 0 : 25}%</p>
            <div key={String(after)} className="fade">
              <p className="cap" style={{ marginTop: 0 }}>{after ? "Non-positive sentiment by the finale. Zero negative responses." : "Of responses were non-positive at the opening."}</p>
              <div className="chips">
                {(after ? ["Excited 38%", "Motivated 22%", "Confident 19%"] : ["Curious 34%", "Overwhelmed", "Skeptical", "Concerned", "Behind"]).map(c =>
                  <span key={c} style={after ? { background: "var(--green)", color: "var(--white)" } : { background: "var(--white)", color: "var(--charcoal)", border: "1px solid var(--grey)" }}>{c}</span>)}
              </div>
            </div>
          </div>
        </div>
      </div>
    <div className="wrap"><Evidence page={10}>Source: The Fluency Advantage, p. 10. Earlier source edition. Read the full report for context and limitations.</Evidence></div>
    </section>


    <Band src="../../assets/images/report-design/learning.jpg" pos="center 20%" q="“CRAFT is now part of my daily routine. Thank you!!”" by="Academy participant · Session 4" />
    <section className="sec" data-screen-label="Findings">
      <div className="wrap">
        <p className="eyb rv">Evidence</p>
        <h2 className="h2 rv">Four Findings That Define the Impact.</h2>
        <div className="acc rv">
          {FINDINGS.map((f, i) => <div key={i} className={"ai" + (open === i ? " on" : "")}>
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span className="n">0{i + 1}</span><span className="t">{f.t}</span><span className="pl"></span></button>
            <div className="bd" aria-hidden={open !== i}><div><p>{f.d}</p></div></div>
          </div>)}
        </div>
      </div>
    </section>

    <Band src="../../assets/images/report-design/community.jpg" pos="center 55%" />
    <section className="sec ctasec" data-screen-label="CTA">
      <div className="wrap">
        <div className="cta rv">
          <div className="gr"></div>
          <p className="eyb" style={{ color: "#E2DBFE" }}>The Full Report</p>
          <h2 style={{ marginTop: 16 }}>Build the Pathway for Your People.</h2>
          <p>Get the complete case study: methodology, audience profile, session-by-session data, and strategic implications for your organization.</p>
          <div className="row">
            <Button size="lg" data-download aria-label="Download the Report" onClick={s.dl} style={{ background: "var(--white)", color: "var(--violet)", borderColor: "var(--white)" }}>{Ic.dl}Download the Report</Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = "../#connect-heading"} style={{ color: "var(--white)", borderColor: "rgba(255,255,255,.55)" }}>Talk to Us</Button>
          </div>
          <div className="share"><span>Share this case study</span><ShareIcons s={s} variant="outline" cls="" /></div>
        </div>
      </div>
    </section>

    <footer><div className="wrap"><img src="../../assets/brand/logo-secondary-violet.svg" alt="KAINDLY" /><span>Lead AI, Don't Chase It. · <a href="mailto:hello@kaindly.ai">hello@kaindly.ai</a></span><span>© 2026 Kaindly</span></div></footer>

    {toast && <div className="toastw"><Toast tone="success" title="Link copied" message="The link to this report summary is ready to share." onClose={() => setToast(false)} /></div>}
  </>;
}

createRoot(document.getElementById("root")).render(<App />);
