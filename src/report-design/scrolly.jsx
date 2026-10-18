import React from 'react';
const { useState: syUseState, useEffect: syUseEffect, useRef: syUseRef } = React;

const SY_STEPS = [
  { e: "The Problem", h: "Everyone Says AI Matters. No One Knows Where Their People Stand.", p: "Most organizations measure AI adoption with login rates and self-reported confidence. Neither captures readiness." },
  { e: "The Audience", h: "So We Started With 24,000 Professionals in a Regulated Industry.", p: "A national professional association spanning pharma and life sciences, from early-career analysts to the C-suite." },
  { e: "The Solution", h: "And Asked What They Would Actually Do.", p: "The AI Readiness Assessment: a scenario-based diagnostic that measures what people do, not what they believe they should do.", tid: ["197 completed", "~20 minutes", "Jan–Mar 2026"] },
  { e: "Three Layers", h: "Their Answers Revealed Three Layers of Readiness.", p: "Mindset: how people think about AI. Practice: what they actually do with it. Environment: whether their organization makes room to grow." },
  { e: "Ten Dimensions", h: "Each Layer Breaks Into Measurable Dimensions.", p: "Each dimension is scored 1 to 5. Layer scores are the mean of their dimensions, and a composite draws on all three." },
  { e: "Scoring", h: "Together, They Show Who's Ready and Who's Blocked.", p: "Three Practice anchors place each person on the five-stage spectrum. Capability (Mindset + Practice) against support reveals who is blocked." },
  { e: "The Report", h: "Now We Know Where They're Blocked. So Does Each Person.", p: "Every respondent receives a personalized AI Readiness Report: their stage, their strengths, their growth edges, and dedicated next steps built for where they actually are." },
  { e: "Hands-On Learning", h: "Then We Close the Gap, Hands On.", p: "KAINDLY's live, hands-on learning turns each growth edge into practice, with structured frameworks and a community that keeps momentum going." },
];
const SY_DIMS = [
  ["D1", "Emotional Response", 0], ["D2", "Relevance Belief", 0], ["D3", "Change Readiness", 0], ["D4", "Friction Specificity", 1], ["D5", "Trust Calibration", 1],
  ["D6", "Behavioral Patterns", 1], ["D7", "Self-Perception", 0], ["D8", "Creative Freedom", 0], ["D9", "Social & Peer Learning", 1], ["D10", "Strategic Thinking", 1],
];
const SY_COLS = [{ k: "Mindset", s: "3.32", c: "var(--violet)", x: 3 }, { k: "Practice", s: "3.26", c: "#5B47B0", x: 36 }, { k: "Environment", s: "3.18", c: "var(--green)", x: 69 }];
const SY_ANCH = ["D5", "D6", "D10"];
const SY_N = 240;
const syRand = (() => { let s = 7; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const SY_SCAT = Array.from({ length: SY_N }, () => [6 + syRand() * 88, 8 + syRand() * 80]);

function syDot(i, st) {
  if (st === 0) return { x: SY_SCAT[i][0], y: SY_SCAT[i][1], s: 1.1, c: "#C9C5D3", o: .9 };
  if (st === 1) return { x: 8 + (i % 24) * (84 / 23), y: 20 + Math.floor(i / 24) * (58 / 9), s: 1.4, c: "var(--periwinkle-50)", o: 1 };
  if (st === 2) return i < 197 ? { x: 12 + (i % 20) * (76 / 19), y: 14 + Math.floor(i / 20) * (64 / 9), s: 2.4, c: "var(--violet)", o: 1 } : { x: 50, y: 50, s: .5, c: "var(--violet)", o: 0 };
  return { x: 50, y: 46, s: .4, c: "var(--violet)", o: 0 };
}
function syChip(d, i, st) {
  if (st < 3) return { x: 37, y: 46, w: 26, o: 0 };
  if (st >= 6) { const col = d[2], idx = SY_DIMS.filter(x => x[2] === col).indexOf(d); return { x: SY_COLS[col].x + 1.5, y: 30 + idx * 8.6, w: 25, o: 0 }; }
  if (st === 3) return { x: 2 + (i % 5) * 19.6, y: 4 + Math.floor(i / 5) * 8, w: 18, o: 1 };
  const col = d[2], idx = SY_DIMS.filter(x => x[2] === col).indexOf(d);
  return { x: SY_COLS[col].x + 1.5, y: 33 + idx * 8.6, w: 25, o: 1 };
}

function Scrolly() {
  const ref = syUseRef(null);
  const [st, setSt] = syUseState(0);
  syUseEffect(() => {
    const f = () => { const el = ref.current; if (!el) return; const r = el.getBoundingClientRect(); const tot = el.offsetHeight - innerHeight; const p = Math.min(Math.max(-r.top / tot, 0), .9999); setSt(Math.floor(p * SY_STEPS.length)); };
    f(); addEventListener("scroll", f, { passive: true }); addEventListener("resize", f); return () => { removeEventListener("scroll", f); removeEventListener("resize", f); };
  }, []);
  const jump = i => { const el = ref.current; const tot = el.offsetHeight - innerHeight; window.scrollTo({ top: el.offsetTop + (i + .5) / SY_STEPS.length * tot, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }); };
  return <section className="sy" ref={ref} style={{ height: (SY_STEPS.length * 85 + 100) + "vh" }} data-screen-label="Methodology Scroll">
    <style>{SY_CSS}</style>
    <div className="sy-stage">
      <div className="sy-txt">
        <div className="sy-rail">{SY_STEPS.map((x, i) => <button key={i} className={st === i ? "on" : ""} aria-label={x.e} aria-pressed={st === i} onClick={() => jump(i)}></button>)}</div>
        <div className="sy-tw">
          {SY_STEPS.map((x, i) => <div key={i} className={"sy-t" + (st === i ? " on" : "")} aria-hidden={st !== i}>
            <h2>{x.h}</h2>
            <p className="sy-p">{x.p}</p>
            {x.tid && <div className="sy-tid">{x.tid.map((t, j) => <span key={t} style={{ transitionDelay: (st === i ? 200 + j * 90 : 0) + "ms" }}>{t}</span>)}</div>}
          </div>)}
        </div>
      </div>
      <div className="sy-v">
        {Array.from({ length: SY_N }, (_, i) => { const d = syDot(i, st); return <i key={i} className="sy-d" style={{ left: d.x + "%", top: d.y + "%", width: d.s + "%", background: d.c, opacity: d.o, transitionDelay: (st <= 2 ? (i % 60) * 6 : 0) + "ms" }}></i>; })}
        <div className={"sy-proxy" + (st === 0 ? " on" : "")} style={{ left: "10%", top: "30%" }}><b>Login rates</b><span>Show usage, not readiness</span></div>
        <div className={"sy-proxy" + (st === 0 ? " on" : "")} style={{ left: "46%", top: "56%", transitionDelay: "120ms" }}><b>Confidence surveys</b><span>Show feelings, not behavior</span></div>
        <p className={"sy-cap" + (st === 1 ? " on" : "")}>Each dot ≈ 100 members</p>
        <p className={"sy-cap" + (st === 2 ? " on" : "")}>Each dot = 1 respondent · 197 completed</p>
        {SY_COLS.map((c, i) => <div key={c.k} className={"sy-col" + (st >= 3 && st <= 5 ? " on" : "")} style={{ left: c.x + "%", "--c": c.c, transitionDelay: (st >= 3 ? i * 90 : 0) + "ms" }}>
          <div className="sy-ch"><span>{c.k}</span><b className={st >= 4 ? "on" : ""}>{c.s}</b></div>
          {i === 2 && <div className={"sy-env" + (st >= 4 ? " on" : "")}><span className="sy-chip env">ENV · Contextual support</span><p>Tool access</p><p>Policy clarity</p><p>Social permission</p></div>}
        </div>)}
        {SY_DIMS.map((d, i) => { const p = syChip(d, i, st); const anc = st === 5 && SY_ANCH.includes(d[0]); const mut = st === 5 && !anc;
          return <span key={d[0]} className={"sy-chip" + (st >= 4 ? " c" + d[2] : "") + (anc ? " anc" : "") + (mut ? " mut" : "")} style={{ left: p.x + "%", top: p.y + "%", width: p.w + "%", opacity: p.o, transitionDelay: (st === 3 ? i * 40 : st === 4 ? i * 60 : 0) + "ms" }}><b>{d[0]}</b><span className="nm">{d[1]}</span></span>; })}
        <div className={"sy-br" + (st === 5 ? " on" : "")} style={{ left: "3%", width: "63%" }}><span>Capability</span></div>
        <div className={"sy-br" + (st === 5 ? " on" : "")} style={{ left: "69%", width: "28%" }}><span>Support</span></div>
        <div className={"sy-rep" + (st === 6 ? " on" : "")}>
          <div className="sy-rc">
            <div className="sy-rh"><img src="../../assets/brand/logo-secondary-white.svg" alt="KAINDLY" /><span>AI Readiness Report</span></div>
            <div className="sy-rb">
              <p className="sy-rl">Your stage</p>
              <div className="sy-rs">{[1, 2, 3, 4, 5].map(n => <i key={n} className={n === 2 ? "on" : ""}>{n}</i>)}</div>
              <p className="sy-rn">Stage 2 · Intentional Learner</p>
              <div className="sy-rr"><span>Top strength</span><b>D2 · Relevance Belief</b></div>
              <div className="sy-rr"><span>Growth edge</span><b className="o">D10 · Strategic Thinking</b></div>
              <div className="sy-rx"><p className="sy-rl">Your next steps</p><i></i><i></i><i style={{ width: "62%" }}></i></div>
            </div>
          </div>
        </div>
        <div className={"sy-sol" + (st === 7 ? " on" : "")}>
          {[["Strategic thinking gap", "Use-case mapping tied to your role and real business problems"], ["Identity gap", "Repeated 'I did that' wins through live, guided practice"], ["Low environmental support", "Leadership modeling and community that make room to grow"]].map(([a, b], i) => <div key={a} className="sy-sr" style={{ transitionDelay: (st === 7 ? 150 + i * 120 : 0) + "ms" }}><span className="a">{a}</span><span className="ar">→</span><span className="b">{b}</span></div>)}
          <div className="sy-mv"><p>From intention to practice</p><div>{[1, 2, 3, 4, 5].map(n => <i key={n} className={n === 2 ? "fr" : n === 3 ? "to" : ""}>{n}</i>)}<em className={st === 7 ? "go" : ""}></em></div></div>
        </div>
        <div className={"sy-spec" + (st === 5 ? " on" : "")}>
          <p>Anchors D5 · D6 · D10 → stage</p>
          <div>{["Curious Observer", "Intentional Learner", "Active Practitioner", "Confident Integrator", "Strategic Champion"].map((s, i) => <span key={s} className={i === 1 ? "hi" : ""}><b>{i + 1}</b><em>{s}</em></span>)}</div>
        </div>
      </div>
    </div>
  </section>;
}

const SY_CSS = `.sy{position:relative;background:var(--white)}
.sy-stage{position:sticky;top:0;height:100vh;box-sizing:border-box;display:grid;grid-template-columns:minmax(0,.8fr) minmax(0,1.2fr);gap:56px;align-items:center;max-width:1280px;margin:0 auto;padding:84px clamp(20px,4vw,48px) 32px}
.sy-txt{display:grid;grid-template-columns:14px minmax(0,1fr);gap:28px;align-items:center}
.sy-rail{display:flex;flex-direction:column;gap:12px}
.sy-rail button{all:unset;cursor:pointer;width:8px;height:8px;border-radius:50%;background:var(--grey);transition:all .3s;justify-self:center}
.sy-rail button.on{background:var(--violet);height:28px;border-radius:99px}
.sy-rail button:focus-visible{outline:2px solid var(--violet);outline-offset:3px}
.sy-tw{position:relative;min-height:380px}
.sy-t{position:absolute;left:0;right:0;top:50%;transform:translateY(calc(-50% + 20px));opacity:0;transition:opacity .5s cubic-bezier(.2,.7,.2,1),transform .6s cubic-bezier(.2,.7,.2,1);pointer-events:none}
.sy-t.on{opacity:1;transform:translateY(-50%);pointer-events:auto}
.sy-t h2{font-size:clamp(32px,3.8vw,54px);line-height:.95;color:var(--violet)}
.sy-p{font-size:clamp(17px,1.5vw,20px);line-height:1.5;color:#4a4752;margin-top:20px;max-width:40ch}
.sy-tid{display:flex;flex-wrap:wrap;gap:8px;margin-top:24px}
.sy-tid span{padding:8px 14px;border-radius:99px;background:var(--periwinkle-25);color:var(--violet);font-weight:600;font-size:14px;opacity:0;transform:translateY(8px);transition:all .4s cubic-bezier(.2,.7,.2,1)}
.sy-t.on .sy-tid span{opacity:1;transform:none}
.sy-v{position:relative;width:min(100%,calc((100vh - 140px) * 1.19));aspect-ratio:10/8.4;justify-self:end;border-radius:5px;background:#FAF9FC;overflow:hidden;container-type:inline-size}
.sy-d{position:absolute;aspect-ratio:1;border-radius:50%;transform:translate(-50%,-50%);transition:left .9s cubic-bezier(.2,.7,.2,1),top .9s cubic-bezier(.2,.7,.2,1),width .6s,background .5s,opacity .5s}
.sy-proxy{position:absolute;background:var(--white);border-radius:5px;padding:16px 20px;box-shadow:0 10px 30px -10px rgba(36,24,78,.25);display:flex;flex-direction:column;gap:4px;opacity:0;transform:translateY(12px);transition:all .5s cubic-bezier(.2,.7,.2,1)}
.sy-proxy.on{opacity:1;transform:none}
.sy-proxy b{font-family:var(--font-heading);font-size:clamp(15px,2.6cqw,20px);letter-spacing:-.02em;color:var(--charcoal);text-decoration:line-through;text-decoration-color:var(--orange);text-decoration-thickness:2px}
.sy-proxy span{font-size:clamp(12px,1.9cqw,14px);color:#6f6c78}
.sy-cap{position:absolute;left:5%;bottom:5%;font-family:var(--font-subhead);font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#8a8794;opacity:0;transition:opacity .4s}
.sy-cap.on{opacity:1;transition-delay:.5s}
.sy-col{position:absolute;top:22%;height:56%;width:28%;border-radius:5px;background:var(--white);border:1px solid var(--grey);opacity:0;transform:translateY(16px);transition:all .6s cubic-bezier(.2,.7,.2,1)}
.sy-col.on{opacity:1;transform:none}
.sy-ch{display:flex;justify-content:space-between;align-items:baseline;padding:4.5cqw 4cqw 0;border-top:3px solid var(--c);border-radius:5px 5px 0 0;margin-top:-1px}
.sy-ch span{font-family:var(--font-heading);font-weight:700;font-size:clamp(13px,2.6cqw,20px);letter-spacing:-.02em;color:var(--c)}
.sy-ch b{font-family:var(--font-heading);font-size:clamp(13px,2.4cqw,18px);color:var(--c);opacity:0;transition:opacity .5s .5s}.sy-ch b.on{opacity:1}
.sy-env{position:absolute;left:5%;right:5%;top:19%;display:flex;flex-direction:column;gap:1.6cqw;opacity:0;transition:opacity .5s .3s}
.sy-env.on{opacity:1}
.sy-env p{font-size:clamp(11px,1.8cqw,14px);color:#55525e;padding-left:2cqw}
.sy-chip{position:absolute;box-sizing:border-box;display:flex;gap:1.4cqw;align-items:center;padding:1.3cqw 1.6cqw;border-radius:5px;background:var(--white);border:1px solid var(--grey);font-size:clamp(10px,1.7cqw,13px);line-height:1.15;color:#55525e;transition:left .8s cubic-bezier(.2,.7,.2,1),top .8s cubic-bezier(.2,.7,.2,1),width .8s cubic-bezier(.2,.7,.2,1),opacity .4s,background .4s,color .4s,border-color .4s}
.sy-chip b{font-family:var(--font-heading);color:var(--charcoal);flex:none}
.sy-chip.env{position:static;border-color:transparent;background:var(--honeydew);color:var(--charcoal);font-weight:600}
.sy-chip.c0{background:#EFEBFF;border-color:transparent;color:var(--violet)}.sy-chip.c0 b{color:var(--violet)}
.sy-chip.c1{background:#F1EEFB;border-color:transparent;color:#5B47B0}.sy-chip.c1 b{color:#5B47B0}
.sy-chip.anc{background:var(--violet);color:var(--white)}.sy-chip.anc b{color:var(--white)}
.sy-chip.mut{opacity:.4!important}
.sy-br{position:absolute;top:15%;height:4%;border:1.5px solid var(--charcoal);border-bottom:none;border-radius:4px 4px 0 0;opacity:0;transition:opacity .5s .3s}
.sy-br.on{opacity:1}
.sy-br span{position:absolute;left:50%;top:0;transform:translate(-50%,-115%);background:#FAF9FC;padding:0 8px;font-family:var(--font-subhead);font-size:clamp(9px,1.6cqw,11px);letter-spacing:.18em;text-transform:uppercase;color:var(--charcoal)}
.sy-spec{position:absolute;left:3%;right:3%;top:82%;opacity:0;transform:translateY(10px);transition:all .6s cubic-bezier(.2,.7,.2,1) .2s}
.sy-spec.on{opacity:1;transform:none}
.sy-spec p{font-family:var(--font-subhead);font-size:clamp(9px,1.6cqw,11px);letter-spacing:.16em;text-transform:uppercase;color:var(--violet);margin-bottom:1.2cqw}
.sy-spec div{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px}
.sy-spec span{display:flex;gap:1cqw;align-items:center;background:var(--white);border:1px solid var(--grey);border-radius:4px;padding:1.2cqw 1.4cqw;font-size:clamp(9px,1.5cqw,12px);line-height:1.1;color:#55525e}
.sy-spec span b{font-family:var(--font-heading);color:var(--violet)}
.sy-spec span em{font-style:normal}
.sy-spec span.hi{background:var(--violet);border-color:var(--violet);color:var(--white)}.sy-spec span.hi b{color:var(--white)}
.sy-rep{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;opacity:0;transform:translateY(20px) scale(.97);transition:all .7s cubic-bezier(.2,.7,.2,1);pointer-events:none}
.sy-rep.on{opacity:1;transform:none}
.sy-rc{width:58%;border-radius:5px;background:var(--white);box-shadow:0 24px 60px -20px rgba(36,24,78,.35);overflow:hidden}
.sy-rh{background:var(--violet);padding:4cqw 4.5cqw;display:flex;justify-content:space-between;align-items:center}
.sy-rh img{height:clamp(12px,2.6cqw,20px)}.sy-rh span{font-family:var(--font-subhead);font-size:clamp(9px,1.6cqw,11px);letter-spacing:.18em;text-transform:uppercase;color:#E2DBFE}
.sy-rb{padding:4.5cqw;display:flex;flex-direction:column;gap:2.2cqw}
.sy-rl{font-family:var(--font-subhead);font-size:clamp(9px,1.5cqw,11px);letter-spacing:.18em;text-transform:uppercase;color:#8a8794}
.sy-rs{display:flex;gap:4px}.sy-rs i{flex:1;height:clamp(20px,4.4cqw,32px);border-radius:4px;background:#F1F0F3;display:flex;align-items:center;justify-content:center;font-style:normal;font-family:var(--font-heading);font-weight:700;font-size:clamp(11px,1.8cqw,14px);color:#8a8794}.sy-rs i.on{background:var(--violet);color:var(--white)}
.sy-rn{font-family:var(--font-heading);font-weight:700;font-size:clamp(14px,2.8cqw,20px);letter-spacing:-.02em;color:var(--violet)}
.sy-rr{display:flex;justify-content:space-between;gap:10px;padding:1.6cqw 0;border-top:1px solid #F1F0F3;font-size:clamp(10px,1.7cqw,13px)}.sy-rr span{color:#6f6c78}.sy-rr b{color:var(--charcoal);text-align:right}.sy-rr b.o{color:#C0701E}
.sy-rx{display:flex;flex-direction:column;gap:1.2cqw;padding:2.4cqw 3cqw;border-radius:5px;background:var(--honeydew)}.sy-rx .sy-rl{color:var(--green)}.sy-rx i{display:block;height:clamp(5px,1cqw,8px);border-radius:3px;background:rgba(70,139,43,.3);width:100%}
.sy-sol{position:absolute;inset:0;padding:7% 6%;display:flex;flex-direction:column;justify-content:center;gap:2.4cqw;opacity:0;transition:opacity .5s;pointer-events:none}
.sy-sol.on{opacity:1}
.sy-sr{display:grid;grid-template-columns:minmax(0,.8fr) auto minmax(0,1.2fr);gap:2.4cqw;align-items:center;opacity:0;transform:translateX(-16px);transition:all .6s cubic-bezier(.2,.7,.2,1)}
.sy-sol.on .sy-sr{opacity:1;transform:none}
.sy-sr .a{padding:2.6cqw 3cqw;border-radius:5px;background:var(--white);border:1px solid var(--grey);font-weight:600;font-size:clamp(11px,1.9cqw,15px);color:var(--charcoal)}
.sy-sr .ar{color:var(--periwinkle);font-size:clamp(14px,2.6cqw,22px)}
.sy-sr .b{padding:2.6cqw 3cqw;border-radius:5px;background:var(--violet);color:var(--white);font-size:clamp(11px,1.8cqw,14px);line-height:1.35}
.sy-mv{margin-top:2cqw}.sy-mv p{font-family:var(--font-subhead);font-size:clamp(9px,1.6cqw,11px);letter-spacing:.18em;text-transform:uppercase;color:var(--green);margin-bottom:1.4cqw}
.sy-mv div{position:relative;display:grid;grid-template-columns:repeat(5,1fr);gap:4px}
.sy-mv i{height:clamp(22px,4.6cqw,34px);border-radius:4px;background:var(--white);border:1px solid var(--grey);display:flex;align-items:center;justify-content:center;font-style:normal;font-family:var(--font-heading);font-weight:700;font-size:clamp(11px,1.8cqw,14px);color:#8a8794}
.sy-mv i.fr{border-color:var(--periwinkle-50);color:var(--violet)}.sy-mv i.to{background:var(--green);border-color:var(--green);color:var(--white)}
.sy-mv em{position:absolute;top:50%;left:30%;width:0;height:2px;background:var(--green);transition:width .8s cubic-bezier(.2,.7,.2,1) .6s}.sy-mv em.go{width:0}
@container (max-width:520px){.sy-rc{width:80%}.sy-sr{grid-template-columns:1fr;gap:4px}.sy-sr .ar{display:none}.sy-chip .nm,.sy-spec span em{display:none}.sy-chip{justify-content:center}}
@media (max-width:900px){.sy-stage{grid-template-columns:1fr;grid-template-rows:auto 1fr;gap:20px;align-items:start;padding-top:76px}.sy-v{order:-1;justify-self:center;width:min(100%,calc(46vh * 1.19))}.sy-tw{min-height:300px}.sy-t{top:0;transform:translateY(16px)}.sy-t.on{transform:none}.sy-txt{gap:16px}}
@media (prefers-reduced-motion:reduce){.sy-d,.sy-chip,.sy-col,.sy-t{transition:opacity .2s!important}}`;

export { Scrolly };
