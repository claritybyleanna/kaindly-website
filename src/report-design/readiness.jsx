import React from 'react';
import {createRoot} from 'react-dom/client';
import './design-system.js';
import {openReportDownload,openReportShare} from '../../assets/js/report.js';
import {Scrolly} from './scrolly.jsx';

const { Button, IconButton, Toast } = window.KaindlyDesignSystem_773de9;
const { useState, useEffect, useRef } = React;
const TITLE = "AI Readiness Assessment: 2026 Snapshot";
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


const INS = [
  { k: "Vulnerable adopters", n: 129, c: "var(--violet)", big: "65.5%", t: "are vulnerable adopters: Stage 2 Intentional Learners who believe AI is relevant but aren't yet practicing consistently.", src: "Stage distribution, n = 197" },
  { k: "Strategic thinking gap", n: 88, c: "#C0701E", big: "88", t: "Stage 2 respondents (68%) are held back most by Strategic Thinking: connecting AI to business outcomes.", src: "Lowest staging anchor, Stage 2 (n = 129)" },
  { k: "Identity gap", n: 138, c: "var(--charcoal)", big: "70%", t: "score 3.0 or below on Self-Perception & Identity. They don't yet see themselves as AI users.", src: "Rounded 70%; highlighted icon count is approximate. D7: 52 named it their top growth edge." },
  { k: "Director & above", n: 97, c: "var(--periwinkle)", big: "49%", t: "are director level or above, including 7% in the C-suite.", src: "Rounded 49%; highlighted icon count is approximate." },
  { k: "Blocked potential", n: 21, c: "var(--green)", big: "21", t: "respondents (11%) show strong individual capability but low environmental support.", src: "Quadrant analysis" },
];
const TOTAL = 197, ROWS = 10;
const ZONES = [[0, 4], [4, 8], [8, 12], [12, 16], [16, 20]];
function zoneOf(i) { const c = Math.floor(i / ROWS); return ZONES.findIndex(([a, b]) => c >= a && c < b); }
function rangeOf(z) { const cnt = INS[z].n; const s = Math.max(0, Math.min(ZONES[z][0] * ROWS, TOTAL - cnt)); return [s, s + cnt]; }
function People() {
  const [z, setZ] = useState(-1);
  const r = z >= 0 ? rangeOf(z) : null; const x = z >= 0 ? INS[z] : null;
  return <div className="ppl-wrap rv">
    <div>
      <div className="ppl" style={{ gridTemplateColumns: "repeat(20,minmax(0,1fr))", gap: "8px 6px" }} onMouseLeave={() => setZ(-1)}>
        {Array.from({ length: TOTAL }, (_, i) => { const on = r && i >= r[0] && i < r[1];
          return <i key={i} className={on ? "h" : ""} onMouseEnter={() => setZ(zoneOf(i))} style={{ background: on ? x.c : (z < 0 ? "#C9C5D3" : "#E6E4EB"), transitionDelay: (on ? (i - r[0]) * 1.5 : 0) + "ms" }}></i>; })}
      </div>
      <div className="ilg">{INS.map((y, i) => <button key={i} aria-pressed={z === i} className={z === i ? "on" : ""} style={{ "--c": y.c }} onMouseEnter={() => setZ(i)} onFocus={() => setZ(i)} onClick={() => setZ(i)}><i></i>{y.k}</button>)}</div>
    </div>
    <div className="co" style={{ "--cc": x ? x.c : "var(--charcoal)" }}>
      <div key={z} className="fade">
        <b>{x ? x.big : <Count to={197} />}</b>
        <p>{x ? x.t : "Structured assessments completed, January to March 2026. Each figure is one professional. Hover across the cohort to explore."}</p>
        {x && <small>{x.src}</small>}
      </div>
    </div>
  </div>;
}
const LAYERS = [
  { k: "Mindset", s: 3.32, c: "var(--violet)", bg: "#EFEBFF", d: "How professionals perceive AI, themselves in relation to it, and their capacity to develop fluency.", dims: "D1 Emotional Response · D2 Relevance Belief · D3 Change Readiness · D7 Self-Perception · D8 Creative Freedom" },
  { k: "Practice", s: 3.26, c: "#5B47B0", bg: "#F1EEFB", d: "What professionals actually do with AI, measured through observable behavioral patterns rather than intentions.", dims: "D4 Friction Specificity · D5 Trust Calibration · D6 Behavioral Patterns · D9 Social & Peer Learning · D10 Strategic Thinking" },
  { k: "Environment", s: 3.18, c: "var(--green)", bg: "var(--honeydew)", d: "The organizational conditions that enable or constrain adoption: tool access, policy clarity, and social permission.", dims: "Scores slightly below both individual layers" },
];
const SPECTRUM = [
  { l: "Curious Observer", c: 9, p: 4.6, n: "Aware of AI, not yet using it in their work." },
  { l: "Intentional Learner", c: 129, p: 65.5, n: "65.5% believe AI is relevant but aren't yet practicing consistently: the vulnerable adopter." },
  { l: "Active Practitioner", c: 42, p: 21.3, n: "Using AI regularly and building repeatable habits." },
  { l: "Confident Integrator", c: 15, p: 7.6, n: "AI is embedded across real workflows." },
  { l: "Strategic Champion", c: 2, p: 1.0, n: "Leading others and shaping how their organization adopts AI." },
];
const DIMS = [
  ["D2", "Relevance Belief", 3.61, "M", "The highest-scoring dimension, and the most common strength (66 of 197). People know AI matters to their work."],
  ["D5", "Trust Calibration", 3.47, "P", "Respondents are reasonably good at judging when to trust AI output."],
  ["D3", "Change Readiness", 3.44, "M", "Openness to changing how work gets done is relatively strong."],
  ["D9", "Social & Peer Learning", 3.33, "P", "Learning from colleagues sits mid-pack."],
  ["D1", "Emotional Response", 3.30, "M", "Feelings about AI are moderately positive."],
  ["D8", "Creative Freedom", 3.28, "M", "A moderate sense of freedom to experiment."],
  ["D4", "Friction Specificity", 3.27, "P", "A moderate ability to name where AI could remove friction."],
  ["D6", "Behavioral Patterns", 3.18, "P", "Consistent, habitual use is still forming."],
  ["D10", "Strategic Thinking", 3.03, "P", "Connecting AI to business outcomes: the bottleneck holding back 68% of Stage 2."],
  ["D7", "Self-Perception & Identity", 2.94, "M", "The lowest score. “I am someone who uses AI” is the most common growth edge (52 of 197)."],
];
const QUADS = [
  { k: "Supported but Early Stage", n: 55, p: 28, d: "Permission is in place, but foundations aren't yet built.", pos: [1, 2] },
  { k: "Optimal Conditions", n: 48, p: 24, d: "High capability and high support. Ready to scale and lead others.", pos: [1, 3] },
  { k: "Early Stage", n: 73, p: 37, d: "Barriers on both fronts: individual foundations and organizational support.", pos: [2, 2] },
  { k: "High Potential, Low Support", n: 21, p: 11, d: "Strong capability constrained by policy, culture, or tool access. The next step is organizational, not more training.", pos: [2, 3], hl: true, layers: [["Mindset", 3.83, "var(--violet)"], ["Practice", 3.63, "var(--periwinkle)"], ["Environment", 2.82, "var(--orange)"]] },
];
const PRIOR = [
  { t: "Design for the Stage 2 Population", d: "Two-thirds of respondents sit at Stage 2, yet much AI training is built for beginners or power users. This group needs structured use-case mapping tied to role-specific business problems, cohort-based learning that builds social proof, and progressive challenges that create repeated 'I did that' experiences." },
  { t: "Address Environment Before Assuming Capability Gaps", d: "For roughly one in ten professionals, the constraint is organizational, not individual. Audit whether AI policies are explicit and enabling, whether managers signal support for experimentation, and whether AI goals sit inside performance frameworks, before investing in more training." },
  { t: "Measure Behavior and Context Alongside Sentiment", d: "Most respondents' mindset and practice scores move together (r = 0.79), but about one in six shows a meaningful gap. A single readiness score hides these profiles, and without measuring environment, organizations can't tell 'not ready' from 'ready but blocked.'" },
];
const SC = [[2.13,2.33,0],[2.73,3.03,0],[2.4,2.42,0],[3.33,3.42,0],[3.6,3.67,0],[3.2,3.37,0],[2.67,2.65,0],[3.6,4.03,0],[3.27,2.87,0],[4.27,4.32,0],[3.87,3.87,0],[3.07,3.39,0],[2.87,2.57,0],[3.53,3.37,0],[2.93,3.05,0],[2.87,3.02,0],[3.27,3.6,0],[3.53,3.2,0],[2.6,3.08,0],[3.87,4.32,0],[3.93,3.63,0],[4.2,3.87,0],[3.33,3.7,0],[4.2,4.35,0],[3.6,3.55,0],[3.73,3.82,0],[2.4,2.43,0],[3.13,3.15,0],[3.53,3.78,0],[3.33,3.28,0],[3.6,3.48,0],[3,2.92,0],[3.6,3.37,0],[3.54,3.5,0],[3.4,3.9,0],[3.47,3.35,0],[3.47,3.4,0],[3.53,3.35,0],[3.53,3.18,0],[3.53,3.35,0],[2.67,2.6,0],[3.47,3.28,0],[2.73,3.07,0],[4.07,4.42,0],[1.6,2.1,0],[3.4,3.6,0],[3.87,3.52,0],[4.87,4.68,0],[3.6,3.55,0],[3.13,2.9,0],[3.13,2.85,0],[3.07,3.08,0],[2.93,3.1,0],[3.8,4.12,0],[3.8,3.7,0],[3.27,3.37,0],[2.87,3.15,0],[2.8,2.57,0],[4.13,4.02,0],[3.2,3.42,0],[3.33,3.67,0],[3.87,3.83,0],[3.2,2.93,0],[3.33,3.68,0],[3.93,3.93,0],[2.2,2.35,0],[1.93,2.03,0],[3.13,3.1,0],[3.87,4.05,0],[3.93,3.75,0],[3.53,3.3,0],[2.67,2.63,0],[3.27,3.47,0],[2.67,2.48,0],[3.93,3.68,0],[3.13,2.75,0],[3.93,3.97,0],[2.74,2.95,0],[2.87,2.37,0],[3.33,3.82,0],[2.8,2.87,0],[3.33,2.9,0],[3.6,3.2,0],[2.4,2.42,0],[2.67,2.68,0],[3.6,3.83,0],[3.73,3.6,0],[2.67,2.3,0],[2.33,2.28,0],[3.27,2.8,0],[3.67,3.8,0],[4.2,4.62,0],[3.53,3.62,0],[3.2,3.07,0],[3.53,3.23,0],[2.8,3.07,0],[3.6,3.68,0],[3.87,3.57,0],[2.87,3.03,0],[3.27,3.05,0],[2.73,2.5,0],[2.93,3.23,0],[2.4,2.52,0],[3.27,2.78,0],[3.2,3.63,0],[4,3.77,0],[3.2,3.38,0],[3.47,3.38,0],[3.06,2.85,0],[2.87,3.1,0],[3.27,3.07,0],[3.33,3.81,0],[4.13,3.82,0],[4.4,4.62,0],[4.26,4.19,0],[3.2,3.42,0],[4.73,4.75,0],[3.33,3.37,0],[3.93,3.78,0],[3.73,3.33,0],[3.6,3.38,0],[3.27,3.23,0],[3.6,3.67,0],[3.33,3.07,0],[3.87,4.23,0],[2.93,2.87,0],[2.6,2.2,0],[3.47,3.5,0],[3.2,3.28,0],[3.07,3.28,0],[3.13,3.23,0],[2.6,2.5,0],[3.53,3.48,0],[3,3.18,0],[3.33,3.17,0],[3.13,3.4,0],[3.4,3.05,0],[2.87,3.05,0],[3.07,2.93,0],[2.73,3.13,0],[3.47,3.72,0],[3,3.05,0],[3.33,3.7,0],[3.6,3.78,0],[3.2,3.4,0],[3.27,3.58,0],[3.4,3.48,0],[3,2.58,0],[3.2,3.02,0],[2.67,3.1,0],[3.4,3.12,0],[3.47,3.5,0],[2.8,2.72,0],[3.8,3.62,0],[3.27,3.6,0],[2.93,3.27,0],[3.67,4.03,0],[3.2,3.08,0],[2.73,2.82,0],[3.47,3.19,0],[4.27,4.15,0],[3.87,3.68,0],[2.6,2.45,0],[2.53,2.67,0],[2.53,3.02,0],[3.6,3.48,0],[2.6,3.15,1],[3.47,4.03,1],[2.73,3.32,1],[3.27,3.87,1],[2.53,3.37,1],[3.67,4.2,1],[3.06,3.77,1],[3,3.82,1],[2.8,3.39,1],[3.06,3.8,1],[3.4,3.92,1],[2.67,3.45,1],[2.67,3.49,1],[3.13,3.65,1],[3.6,4.13,1],[3.07,3.82,1],[2.73,3.27,1],[3.2,3.82,1],[2.67,3.18,1],[2.4,3.3,1],[2.73,3.37,1],[3.4,3.97,1],[2.6,3.2,1],[2.8,2.23,2],[3.6,2.87,2],[3.47,2.73,2],[3.07,2.53,2],[2.8,2,2],[3.07,2.5,2],[3.13,2.6,2],[3.67,3.08,2]];
const SCG = [
  { k: "Aligned", p: 84, c: "#9C98A8", d: "Mindset and practice scores within half a point of each other. For most people, belief and behavior move together." },
  { k: "Mindset-led", p: 12, c: "var(--violet)", d: "Belief is ahead of behavior. They see AI's value but haven't built the habits yet: prime candidates for structured practice." },
  { k: "Practice-led", p: 4, c: "var(--orange)", d: "Behavior is ahead of belief. They use AI, but haven't yet internalized its value or their identity as an AI user." },
];
function Scatter() {
  const ref = useRef(null); const vis = useInView(ref);
  const [g, setG] = useState(-1); const [hv, setHv] = useState(null);
  const X = v => 22 + (v - 1) * 78, Y = v => 318 - (v - 1) * 78;
  const col = t => t === 1 ? "var(--violet)" : t === 2 ? "var(--orange)" : "#B9B6C3";
  return <div className="scw">
    <div className="scp rv" ref={ref} onMouseLeave={() => setHv(null)}>
      <svg viewBox="-14 0 360 350" role="group" aria-label="Illustrative scatterplot from design export; point-level data awaiting verification">
        <polygon points="22,279 295,6 334,6 334,45 61,318 22,318" fill="var(--periwinkle-25)" style={{ opacity: g === 0 || g < 0 ? 1 : .35, transition: "opacity .35s" }}></polygon>
        <line x1="22" y1="318" x2="334" y2="318" stroke="var(--grey)"></line><line x1="22" y1="318" x2="22" y2="6" stroke="var(--grey)"></line>
        <line x1="22" y1="318" x2="334" y2="6" stroke="var(--charcoal)" strokeDasharray="3 3" strokeWidth=".8" opacity=".6"></line>
        {[1, 2, 3, 4, 5].map(v => <g key={v}><text className="tk" x={X(v)} y="334" textAnchor="middle">{v}</text><text className="tk" x="12" y={Y(v) + 4} textAnchor="end">{v}</text></g>)}
        <text className="axl" x="178" y="350" textAnchor="middle">Practice →</text>
        <text className="axl" x="-8" y="162" textAnchor="middle" transform="rotate(-90 -8 162)">Mindset →</text>
        {SC.map(([p, m, t], i) => { const dim = g >= 0 && g !== t; const on = hv === i;
          return <circle key={i} className="dot" cx={vis ? X(p) : X((p + m) / 2)} cy={vis ? Y(m) : Y((p + m) / 2)} r={on ? 6.5 : t ? 4.2 : 3.6} fill={col(t)} style={{ opacity: vis ? (dim ? .12 : t ? 1 : .8) : 0, transitionDelay: vis && !hv && hv !== 0 ? (i % 40) * 12 + "ms" : "0ms" }} tabIndex="0" role="button" aria-label={`Illustrative ${SCG[t].k} point ${i + 1}`} onFocus={() => setHv(i)} onBlur={() => setHv(null)} onMouseEnter={() => setHv(i)}></circle>; })}
      </svg>
      {hv !== null && <div className="sctip" style={{ left: ((X(SC[hv][0]) + 14) / 360 * 100) + "%", top: (Y(SC[hv][1]) / 350 * 100) + "%" }}><b>Illustrative · {SCG[SC[hv][2]].k}</b> · Practice {SC[hv][0].toFixed(2)} · Mindset {SC[hv][1].toFixed(2)}</div>}
    </div>
    <div className="rv">
      <div className="scr"><b>r = 0.79</b><span>Pearson correlation, p &lt; 0.001</span></div>
      <div className="scg">{SCG.map((x, i) => <button key={i} className={g === i ? "on" : ""} style={{ "--c": x.c }} onMouseEnter={() => setG(i)} onFocus={() => setG(i)} onMouseLeave={() => setG(-1)} aria-pressed={g === i} onClick={() => setG(i)}><i style={{ background: x.c }}></i><span>{x.k}</span><b style={{ color: i === 2 ? "#C0701E" : i === 1 ? "var(--violet)" : "var(--charcoal)" }}>{x.p}%</b></button>)}</div>
      <p className="scd" key={g}><span className="fade" style={{ display: "block" }}>{g >= 0 ? SCG[g].d : "Point positions are supplied design data, awaiting source validation. Select a profile or explore a point. Aggregate profiles match the report."}</span></p>
    </div>
  </div>;
}
const MSTEPS = [
  ["Participants", "n = 197", "Professionals enrolled in a structured AI training program completed the ARA pre-course, January to March 2026."],
  ["Assessment", "10 dimensions · ~20 min", "Scenario-based questions across three measurement layers: Mindset, Practice, and Environment."],
  ["Review & Scoring", "2 scorers", "Every response was reviewed by two scorers before dimension-level scores were calculated."],
  ["Quadrant Analysis", "Capability × Support", "Mindset + Practice mapped against environmental support to reveal alignment or constraint."],
  ["Stage Placement", "5-stage spectrum", "Three Practice anchors (D5, D6, D10) place each respondent on the AI Readiness Spectrum."],
  ["Deliverable", "Personal report", "Each respondent received a personalized AI Readiness Report."],
];
const FDIMS = [["D1", "Emotional Response", "M"], ["D4", "Friction Specificity", "P"], ["D2", "Relevance Belief", "M"], ["D5", "Trust Calibration", "P"], ["D3", "Change Readiness", "M"], ["D6", "Behavioral Patterns", "P"], ["D7", "Self-Perception", "M"], ["D9", "Social & Peer Learning", "P"], ["D8", "Creative Freedom", "M"], ["D10", "Strategic Thinking", "P"]];
const FMODES = [
  { k: "Layer scores", on: d => true, env: true },
  { k: "Stage placement", on: d => ["D5", "D6", "D10"].includes(d[0]), env: false },
  { k: "Quadrant", on: d => true, env: true },
];
const ANL = [
  ["Descriptive statistics", "Means, standard deviations, and frequency distributions for each dimension, layer, and stage.", "All 197"],
  ["Subgroup analysis", "Comparisons by role level, industry, and professional function.", "By segment"],
  ["Layer correlations", "Relationships between layers examined using Pearson's r.", "r = 0.79"],
  ["Quadrant classification", "Derived from the intersection of composite capability and environment scores.", "4 profiles"],
  ["Pre/post comparison", "Two participants completed the ARA at both time points. Reported as directional signals, not tested for significance.", "n = 2 · Directional"],
];
function MsVis({ i }) {
  if (i === 0) return <div className="mv-ppl"><div className="mv-big">197</div><div className="mv-dots">{Array.from({ length: 197 }, (_, k) => <i key={k}></i>)}</div><p className="mv-cap">Each dot = 1 professional</p></div>;
  if (i === 1) return <div className="mv-asm">{[["Mindset", 5, "var(--violet)"], ["Practice", 5, "var(--periwinkle)"], ["Environment", 1, "var(--green)"]].map(([k, n, c]) => <div key={k} className="mv-lr"><span className="mv-ln" style={{ color: c }}>{k}</span><span className="mv-ds">{Array.from({ length: n }, (_, j) => <i key={j} style={{ background: c }}></i>)}</span><span className="mv-dn">{k === "Environment" ? "context" : n + " dims"}</span></div>)}<div className="mv-time"><span>Completion time</span><div><i></i></div><b>~20 min</b></div></div>;
  if (i === 2) return <div className="mv-rev"><div className="mv-rvs"><span>R1</span><span>R2</span></div><span className="mv-arr">→</span><div className="mv-sc">{[4, 3, 5, 2, 3].map((v, j) => <div key={j}><b>{"D" + (j + 1)}</b><span className="bars">{[1, 2, 3, 4, 5].map(n => <i key={n} className={n <= v ? "on" : ""}></i>)}</span></div>)}<p className="mv-cap">Scores 1–5 per dimension</p></div></div>;
  if (i === 3) return <div className="mv-q"><p className="mv-ay">Support →</p><div className="mv-qg"><div><b>Supported but Early</b></div><div className="v"><b>Optimal Conditions</b></div><div><b>Early Stage</b></div><div className="o"><b>High Potential, Low Support</b></div></div><span></span><p className="mv-ax">Capability →</p></div>;
  if (i === 4) return <div className="mv-stg"><p className="mv-sh">Five-Stage AI Readiness Spectrum</p><p className="mv-ss">Anchors: D5 · D6 · D10</p><div className="mv-lad">{["Curious Observer", "Intentional Learner", "Active Practitioner", "Confident Integrator", "Strategic Champion"].map((s, j) => <div key={s} className={j === 1 ? "on" : ""}><span>{j + 1}</span>{s}</div>)}</div></div>;
  return <div className="mv-rep"><div className="mv-pg b"></div><div className="mv-pg m"></div><div className="mv-pg f"><div className="mv-ph"><img src="../../assets/brand/logo-secondary-white.svg" alt="KAINDLY" /></div><div className="mv-pb"><p>AI Readiness Report</p><i></i><i></i><i style={{ width: "60%" }}></i><span>Personalized</span></div></div></div>;
}
function Method() {
  const [st, setSt] = useState(1); const [fm, setFm] = useState(0); const [lay, setLay] = useState(0);
  const indRef = useRef(null); const indIn = useInView(indRef);
  const F = FMODES[fm]; const S = MSTEPS[st];
  const dOn = d => fm === 0 ? (lay === 0 ? d[2] === "M" : lay === 1 ? d[2] === "P" : false) : F.on(d);
  const eOn = fm === 0 ? lay === 2 : F.env;
  return <>
    <div className="mstep rv" role="tablist">{MSTEPS.map((x, i) => <button key={i} role="tab" aria-selected={st === i} className={"ms" + (st === i ? " on" : "")} onKeyDown={e => tabKeys(e, setSt, i, MSTEPS.length)} onMouseEnter={() => setSt(i)} onFocus={() => setSt(i)} onClick={() => setSt(i)}><b>{i + 1}</b><span>{x[0]}</span></button>)}</div>
    <div className="msp rv">
      <div key={"t" + st} className="fade msp-t"><p className="msp-k">Step {st + 1} · {S[0]}</p><h3>{S[1]}</h3><p>{S[2]}</p></div>
      <div key={"v" + st} className="fade msp-v"><MsVis i={st} /></div>
    </div>

    <div className="mblk">
      <div className="rv"><p className="mn">01</p><h3 className="mt">Instrument</h3><p className="mp">The ARA is a proprietary diagnostic of scenario-based questions scored across 10 dimensions in three layers: Mindset (Self-Perception Score), Practice (Behavioral Practice Score), and Environment (Contextual Support Score).</p><p className="mp">Each question presents a workplace scenario and asks what respondents would actually do, not what they believe they should do. This situational design reduces the social desirability bias common to self-reported proficiency surveys.</p></div>
      <div className="vs rv">
        <div className="a"><p className="lb">Typical survey</p><p className="qq">"How confident are you using AI?"</p><div className="sc5">{[1, 2, 3, 4, 5].map(n => <i key={n}>{n}</i>)}</div><p className="ft">Measures how people feel. Prone to social desirability bias.</p></div>
        <div className="b"><p className="lb">The ARA</p><p className="qq">A workplace scenario. What would you actually do?</p><div className="opt"><i></i><i className="s"></i><i></i><i></i></div><p className="ft">Measures what people do. Situational, behavior-anchored choices.</p></div>
      </div>
    </div>

    <div className="mblk">
      <div className="rv"><p className="mn">02</p><h3 className="mt">Scoring</h3><p className="mp">Each dimension is scored 1 to 5. Layer scores are the mean of their dimensions; Environment reflects contextual factors weighted by responsible AI mindset. A composite readiness score draws on all three layers.</p><p className="mp">Three Practice dimensions act as staging anchors for the five-stage spectrum. A quadrant classification maps intrinsic capability (Mindset + Practice) against environmental support.</p></div>
      <div className="flow rv">
        <div className="flseg" role="group" aria-label="Scoring output">{FMODES.map((x, i) => <button key={i} className={fm === i ? "on" : ""} aria-pressed={fm === i} onClick={() => setFm(i)}>{x.k}</button>)}</div>
        <div className="flg">
          <div className="fdims">
            {FDIMS.map(d => <div key={d[0]} className={"fd" + (dOn(d) ? " on" : "")} style={{ "--c": fm === 2 ? "var(--violet)" : d[2] === "M" ? "var(--violet)" : "var(--periwinkle)" }}><b>{d[0]}</b>{d[1]}</div>)}
            <div className={"fd env" + (eOn ? " on" : "") + (fm === 2 ? " or" : "")} style={fm === 2 ? { "--c": "var(--orange)" } : {}}><b>ENV</b>Contextual support factors</div>
          </div>
          <div className="farr">→</div>
          <div className="fout"><div key={fm} className="fade" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {fm === 0 && <><p className="lb">Output · select a layer</p><h4>Three layer scores + composite</h4><div className="lyl">{LAYERS.map((x, i) => <button key={i} className={lay === i ? "on" : ""} style={{ "--c": x.c, "--bg": x.bg }} aria-pressed={lay === i} onClick={() => setLay(i)} onMouseEnter={() => setLay(i)}><span className="r"><span>{x.k}</span><b>{x.s.toFixed(2)}</b></span>{lay === i && <span className="x fade">{x.d}</span>}</button>)}</div><p style={{ fontSize: 13 }}>Mean score out of 5 · composite draws on all three layers</p></>}
            {fm === 1 && <><p className="lb">Output</p><h4>AI Readiness Spectrum stage</h4><p>Trust Calibration, Behavioral Patterns, and Strategic Thinking determine placement.</p><div className="stg">{[1, 2, 3, 4, 5].map(n => <i key={n} className={n === 2 ? "on" : ""}>{n}</i>)}</div></>}
            {fm === 2 && <><p className="lb">Output</p><h4>Capability × support quadrant</h4><p>Mindset + Practice (capability) against Environment (support) shows alignment or constraint.</p><div className="mq"><i></i><i className="v"></i><i></i><i className="o"></i></div></>}
          </div></div>
        </div>
      </div>
    </div>

    <div className="mblk">
      <div className="rv"><p className="mn">03</p><h3 className="mt">Sample</h3><p className="mp">197 assessments were completed pre-course by professionals enrolled in a structured AI training program between January and March 2026. Every response was reviewed by two scorers before dimension-level calculation.</p></div>
      <div className="rv" ref={indRef}>
        <div className="stt">
          <div><b><Count to={197} /></b><p>Assessments completed</p></div>
          <div><b>14</b><p>Professional functions</p></div>
          <div><b>9</b><p>Industry sectors</p></div>
          <div><b><Count to={49} suffix="%" /></b><p>Director level or above</p></div>
          <div><b>7%</b><p>C-Suite</p></div>
          <div><b>~20</b><p>Minutes to complete</p></div>
        </div>
        <div className="ind">
          <p style={{ fontWeight: 600, fontSize: 15 }}>Industry mix</p>
          <div className="bar">{[[73, "var(--violet)"], [7, "var(--periwinkle)"], [7, "var(--periwinkle-50)"], [6, "var(--green)"], [8, "var(--grey)"]].map(([w, c], i) => <i key={i} style={{ width: indIn ? w + "%" : 0, background: c, transitionDelay: i * 80 + "ms" }}></i>)}</div>
          <div className="lg2">{[["73% Pharma / Biotech / Life Sciences", "var(--violet)"], ["7% Consulting", "var(--periwinkle)"], ["7% Medical Devices", "var(--periwinkle-50)"], ["6% Healthcare Providers", "var(--green)"], ["8% Other", "var(--grey)"]].map(([t, c]) => <span key={t}><s style={{ background: c }}></s>{t}</span>)}</div>
        </div>
      </div>
    </div>

    <div className="mblk">
      <div className="rv"><p className="mn">04</p><h3 className="mt">Analysis</h3><p className="mp">Statistics were computed at every level of the model, from individual dimensions to stages and quadrants, with subgroup cuts to test whether patterns hold across the cohort.</p></div>
      <div className="anl rv">{ANL.map((a, i) => <div className="an" key={i}><span className="n">0{i + 1}</span><div><h4>{a[0]}</h4><p>{a[1]}</p></div><span className={"tg" + (i === 4 ? " d" : "")}>{a[2]}</span></div>)}</div>
    </div>
  </>;
}
const dx = v => (v - 2.75) * 100;

function App() {
  const [toast, setToast] = useState(false);
  const [sc, setSc] = useState(false);
  const [stage, setStage] = useState(1); const [mode, setMode] = useState("pct");
  const [dm, setDm] = useState(9);
  const [q, setQ] = useState(3);
  const [open, setOpen] = useState(0);
  const specRef = useRef(null); const specIn = useInView(specRef);
  const dimRef = useRef(null); const dimIn = useInView(dimRef);
  const s = useShare(setToast);
  useReveal();
  useEffect(() => { const f = () => setSc(window.scrollY > 40); f(); window.addEventListener("scroll", f, { passive: true }); return () => window.removeEventListener("scroll", f); }, []);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(false), 2400); return () => clearTimeout(t); }, [toast]);
  const D = DIMS[dm], Q = QUADS[q];

  return <>
    <header className={"bar" + (sc ? " sc" : "")}>
      <div className="wrap in">
        <a href="../../index.html"><img className="lg" src={sc ? "../../assets/brand/logo-secondary-violet.svg" : "../../assets/brand/logo-secondary-white.svg"} alt="KAINDLY" /></a>
        <a className={"back" + (sc ? "" : " bw")} href="../">← All Insights</a>
        <span className="tt">AI Readiness Assessment · 2026 Snapshot</span>
        <div className="act">
          <Button size="sm" data-download aria-label="Download the Report" onClick={s.dl} style={sc ? {} : { background: "var(--white)", color: "var(--violet)", borderColor: "var(--white)" }}>{Ic.dl}<span className="dl-t">Download the Report</span></Button>
          <span className="sep" style={sc ? {} : { background: "rgba(255,255,255,.3)" }}></span>
          <ShareIcons s={s} cls={sc ? "ib" : "ib ibw"} />
        </div>
      </div>
    </header>
    <style>{`.ibw{color:var(--white)!important}.ibw:hover{background:rgba(255,255,255,.16)!important;color:var(--white)!important}`}</style>

    <section className="hero" data-screen-label="Hero">
      <div className="ph"></div><div className="sh"></div>
      <div className="wrap">
        <p className="eyb">Market Intelligence Report · 2026 Snapshot</p>
        <h1>AI Readiness <em>Assessment.</em></h1>
        <p className="sub">What 197 structured assessments reveal about how professionals actually relate to AI.</p>
        <div className="ctas">
          <Button size="lg" variant="accent" data-download aria-label="Download the Report" onClick={s.dl}>{Ic.dl}Download the Report</Button>
          <Button size="lg" variant="outline" onClick={() => window.scrollTo({ top: document.getElementById("glance").offsetTop - 60, behavior: "smooth" })} style={{ color: "var(--white)", borderColor: "rgba(255,255,255,.5)" }}>Explore the Findings</Button>
        </div>
        <div className="meta">
          <div><span className="ml">Instrument</span>AI Readiness Assessment (ARA)</div>
          <div><span className="ml">Cohort</span>197 professionals · 73% life sciences</div>
          <div><span className="ml">Period</span>January – March 2026</div>
        </div>
      </div>
    </section>

    <Scrolly />

    <section className="sec" style={{ paddingTop: "clamp(48px,6vw,80px)", paddingBottom: "clamp(48px,6vw,80px)", background: "#FAF9FC" }} data-screen-label="Methodology Link">
      <div className="wrap">
        <button className="mlink rv" id="method-opener" onClick={() => document.querySelector("#method-dialog").showModal()}>
          <div><p className="eyb">Want to Go Deeper?</p><h3>Explore the Full Methodology.</h3><p>Instrument design, scoring model, sample, and analysis, step by step.</p></div>
          <span className="mgo">Explore the Methodology<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg></span>
        </button>
      </div>
    </section>


    <section className="sec" id="glance" data-screen-label="At a Glance">
      <div className="wrap">
        <p className="eyb rv">At a Glance</p>
        <h2 className="h2 rv">Not Resisters. Not Early Adopters. Something in Between.</h2>
        <People />
      </div>
    </section>

    <Band src="../../assets/images/report-design/leaders.jpg" pos="center 45%" q="“Where are our people, really, in their AI adoption journey?”" by="The question we heard most from leaders" />

    <section className="sec" data-screen-label="Vulnerable Adopter">
      <div className="wrap">
        <p className="eyb rv">From the Founders</p>
        <h2 className="h2 rv">Between Interest and Action.</h2>
        <p className="lead rv">Login rates and satisfaction scores show how programs feel, not whether anything changed. So we measured what sits underneath adoption. A third group emerged.</p>
        <div className="dict rv">
          <p className="dt"><b>vulnerable adopter</b><span>/ˈvʌl-nər-ə-bəl əˈdɑp-tər/ · noun</span></p>
          <p className="dd">An experienced professional who believes AI is relevant to their work and wants to use it, but is not yet practicing consistently; caught between interest and action.</p>
          <p className="dc">Coined by KAINDLY, 2026</p>
        </div>
      </div>
    </section>


    <section className="sec dark" data-screen-label="Readiness Spectrum">
      <div className="wrap">
        <p className="eyb rv">Finding 1</p>
        <h2 className="h2 rv">The Stage 2 Concentration.</h2>
        <p className="lead rv">Two-thirds have moved past awareness. They want to learn. But they aren't yet practicing consistently enough to advance. Select a stage to explore.</p>
        <div className="spechd rv"><p>197 respondents · January–March 2026</p><div className="segd" role="group" aria-label="Display mode"><button className={mode === "pct" ? "on" : ""} aria-pressed={mode === "pct"} onClick={() => setMode("pct")}>Percent</button><button className={mode === "cnt" ? "on" : ""} aria-pressed={mode === "cnt"} onClick={() => setMode("cnt")}>Count</button></div></div>
        <div className="spec" ref={specRef}>
          {SPECTRUM.map((x, i) => <button key={i} className={"st" + (stage === i ? " on" : "")} aria-pressed={stage === i} onFocus={() => setStage(i)} onClick={() => setStage(i)} onMouseEnter={() => setStage(i)}>
            <span className="l">{i + 1} · {x.l}</span>
            <span className="tr"><span className="fl" style={{ width: specIn ? Math.max(x.c / 197 * 100, 1) + "%" : 0, transitionDelay: i * 80 + "ms" }}></span></span>
            <span className="p">{mode === "pct" ? x.p + "%" : <>{x.c}<small>respondents</small></>}</span>
          </button>)}
        </div>
        <div className="axis"><span></span><span><span>0%</span><span>100%</span></span><span></span></div>
        <p className="spfoot">{mode === "pct" ? "Showing percentages of 197 respondents." : "Showing respondent counts. Bar lengths show the share of 197 respondents."}</p>
        <p className="stnote" key={stage}><span className="fade" style={{ display: "block" }}>{SPECTRUM[stage].n}</span></p>
      </div>
    <div className="wrap"><Evidence page={7}>Source: AI Readiness Assessment, p. 7. Earlier source edition. Read the full report for context and limitations.</Evidence></div>
    </section>

    <section className="sec" data-screen-label="Identity Gap">
      <div className="wrap">
        <p className="eyb rv">Findings 2 & 3</p>
        <h2 className="h2 rv">They Believe in AI. They Don't Yet See Themselves Using It.</h2>
        <p className="lead rv">The widest gap in the assessment sits between the two dimensions that bookend the adoption journey. Hover any dimension.</p>
        <div className="dimw">
          <div className="rv" ref={dimRef}>
            <div className="dim">
              {DIMS.map((x, i) => <button key={i} className={"dr" + (i === 0 || i === 9 ? " k" : "") + (i === 8 ? " lo" : "") + (dm === i ? " on" : "")} onMouseEnter={() => setDm(i)} onFocus={() => setDm(i)} aria-pressed={dm === i} onClick={() => setDm(i)}>
                <span className="n"><i style={{ background: x[3] === "M" ? "var(--violet)" : "var(--periwinkle)" }}></i>{x[0]} · {x[1]}</span>
                <span className="t"><span className="ln" style={{ width: dimIn ? dx(x[2]) + "%" : 0 }}></span><span className="dt" style={{ left: dimIn ? dx(x[2]) + "%" : 0, transitionDelay: i * 50 + "ms" }}></span></span>
                <span className="v">{x[2].toFixed(2)}</span>
              </button>)}
            </div>
            <div className="dax"><span style={{ display: "flex", gap: 14 }}><span style={{ display: "flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--violet)", display: "block" }}></i>Mindset</span><span style={{ display: "flex", alignItems: "center", gap: 6 }}><i style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--periwinkle)", display: "block" }}></i>Practice</span></span><span><span>2.75</span><span>3.25</span><span>3.75</span></span><span></span></div>
          </div>
          <div className="gapc rv">
            <div key={dm} className="fade">
              <p className="eyb">{D[0]} · {D[3] === "M" ? "Mindset" : "Practice"}</p>
              <b>{D[2].toFixed(2)}</b>
              <h3 style={{ fontSize: 24, marginTop: 10, letterSpacing: "-.02em" }}>{D[1]}</h3>
              <p>{D[4]}</p>
              {(dm === 0 || dm === 9) && <span className="lyr">0.67-point gap · D2 to D7</span>}
            </div>
          </div>
        </div>
      </div>
    <div className="wrap"><Evidence page={9}>Source: AI Readiness Assessment, p. 9. Earlier source edition. Read the full report for context and limitations.</Evidence></div>
    </section>

    <Band src="../../assets/images/report-design/identity.jpg" pos="center 40%" q="“Identity shifts through experience, social proof, and progressive mastery.”" by="What this means for organizations" />

    <section className="sec" data-screen-label="Blocked Potential">
      <div className="wrap">
        <p className="eyb rv">Finding 4</p>
        <h2 className="h2 rv">Blocked Potential.</h2>
        <p className="lead rv">Capability mapped against environmental support. Select a quadrant.</p>
        <div className="qw">
          <div className="qg rv">
            <p className="ay">Support →</p>
            {QUADS.map((x, i) => <button key={i} className={"qc" + (x.hl ? " hl" : "") + (q === i ? " on" : "")} style={{ gridRow: x.pos[0], gridColumn: x.pos[1] }} onMouseEnter={() => setQ(i)} onFocus={() => setQ(i)} aria-pressed={q === i} onClick={() => setQ(i)}><h3>{x.k}</h3><b>{x.p}%</b></button>)}
            <p className="ax">Capability →</p>
          </div>
          <div className="qd rv">
            <div key={q} className="fade">
              <h3 style={{ color: Q.hl ? "#C0701E" : "var(--violet)" }}>{Q.k}</h3>
              <p><strong>{Q.n} respondents ({Q.p}%).</strong> {Q.d}</p>
              {Q.layers && <div className="lb">{Q.layers.map(([n, v, c]) => <div className="lr" key={n}><span>{n}</span><span className="tr"><span className="fl" style={{ width: (v / 5 * 100) + "%", background: c }}></span></span><b style={{ color: c === "var(--orange)" ? "#C0701E" : "var(--violet)" }}>{v.toFixed(2)}</b></div>)}</div>}
            </div>
          </div>
        </div>
      </div>
    <div className="wrap"><Evidence page={10}>Source: AI Readiness Assessment, p. 10. Earlier source edition. Read the full report for context and limitations.</Evidence></div>
    </section>

    <section className="sec" style={{ background: "#FAF9FC" }} data-screen-label="Figure 9">
      <div className="wrap">
        <p className="eyb rv">Figure 9 · Mindset vs. Practice</p>
        <h2 className="h2 rv">One Score Hides Three Profiles.</h2>
        <p className="lead rv">Most respondents' mindset and practice move together. About one in six shows a meaningful gap, and a single readiness score can't see it.</p>
        <Scatter /><p className="source-note">Interactive design preview: individual point coordinates have not been validated against source data. Published aggregate profiles: 84% aligned, 12% mindset-led, 4% practice-led.</p>
      </div>
    <div className="wrap"><Evidence page={11}>Source: AI Readiness Assessment, p. 11. Earlier source edition. Read the full report for context and limitations.</Evidence></div>
    </section>

    <section className="sec" data-screen-label="Priorities">
      <div className="wrap">
        <p className="eyb rv">Implications</p>
        <h2 className="h2 rv">Three Priorities for Organizational AI Strategy.</h2>
        <div className="acc rv">
          {PRIOR.map((f, i) => <div key={i} className={"ai" + (open === i ? " on" : "")}>
            <button aria-expanded={open === i} onClick={() => setOpen(open === i ? -1 : i)}><span className="n">0{i + 1}</span><span className="t">{f.t}</span><span className="pl"></span></button>
            <div className="bd" aria-hidden={open !== i}><div><p>{f.d}</p></div></div>
          </div>)}
        </div>
      </div>
    </section>

    <Band src="../../assets/images/report-design/team.jpg" pos="center 35%" />

    <section className="sec ctasec" data-screen-label="CTA">
      <div className="wrap">
        <div className="cta rv">
          <div className="gr"></div>
          <p className="eyb" style={{ color: "#E2DBFE" }}>The Full Report</p>
          <h2 style={{ marginTop: 16 }}>See Where Your People Really Stand.</h2>
          <p>Get the complete 2026 snapshot: methodology, sample, all ten dimensions, and what the findings mean for your AI strategy.</p>
          <div className="row">
            <Button size="lg" data-download aria-label="Download the Report" onClick={s.dl} style={{ background: "var(--white)", color: "var(--violet)", borderColor: "var(--white)" }}>{Ic.dl}Download the Report</Button>
            <Button size="lg" variant="outline" onClick={() => window.location.href = "../#connect-heading"} style={{ color: "var(--white)", borderColor: "rgba(255,255,255,.55)" }}>Assess Your Team</Button>
          </div>
          <div className="share"><span>Share this report</span><ShareIcons s={s} variant="outline" cls="" /></div>
        </div>
      </div>
    </section>

    <dialog id="method-dialog" aria-labelledby="method-title" onClose={() => document.querySelector('#method-opener').focus()}>
      <button className="method-close" autoFocus aria-label="Close methodology" onClick={() => document.querySelector('#method-dialog').close()}>×</button>
      <h2 id="method-title" className="h2">Explore the Full Methodology.</h2>
      <Method />
      <Evidence page={5}>Source: AI Readiness Assessment, pp. 5–6. Self-selected cohort, n = 197; 73% life sciences. Findings are descriptive, not nationally representative or causal.</Evidence>
    </dialog>
    <footer><div className="wrap"><img src="../../assets/brand/logo-secondary-violet.svg" alt="KAINDLY" /><span>Lead AI, Don't Chase It. · <a href="mailto:hello@kaindly.ai">hello@kaindly.ai</a></span><span>© 2026 Kaindly</span></div></footer>

    {toast && <div className="toastw"><Toast tone="success" title="Link copied" message="The link to this report summary is ready to share." onClose={() => setToast(false)} /></div>}
  </>;
}

createRoot(document.getElementById("root")).render(<App />);
