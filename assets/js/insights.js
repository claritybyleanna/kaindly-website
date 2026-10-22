import { validatePreviewDetails } from './report.js';

export const REPORTS = Object.freeze({
  readiness: {
    title: 'AI Readiness Assessment',
    href: 'ai-readiness-assessment/',
    pdf: '../assets/reports/ai-readiness-assessment-2026-preview.pdf',
    type: 'Research report · 12 pages',
  },
  fluency: {
    title: 'The Fluency Advantage',
    href: 'the-fluency-advantage/',
    pdf: '../assets/reports/the-fluency-advantage-preview.pdf',
    type: 'Case study · 12 pages',
  },
});

export const ROLES = Object.freeze({
  leader: 'Team or business leader', learning: 'L&D or talent leader',
  community: 'Association or community leader', individual: 'Individual professional',
});
export const GOALS = Object.freeze({
  readiness: 'Understand AI readiness', program: 'Design a learning program',
  practice: 'Turn interest into practice', partnership: 'Explore a partnership',
});

export function recommendReport(role, goal) {
  if (!Object.hasOwn(ROLES, role) || !Object.hasOwn(GOALS, goal)) return null;
  const report = goal === 'readiness' ? 'readiness' : 'fluency';
  const audience = {
    leader: 'For your team', learning: 'For your learning strategy',
    community: 'For your members', individual: 'For your own development',
  }[role];
  const reason = {
    readiness: 'Start with how readiness was assessed across 197 professionals. Use the findings to frame questions about mindset, practice and the support people need.',
    program: 'Explore a four-session learning pathway, the baseline that informed it and the measures used to understand the experience.',
    practice: 'See how structured prompting, applied challenges and personal roadmaps gave learners a path from interest toward practice.',
    partnership: 'Explore how a learning program was structured for a professional community, then discuss what a relevant partnership could look like.',
  }[goal];
  const nextStep = {
    leader: 'Talk through your team’s next step', learning: 'Discuss a learning program',
    community: 'Explore a program for your members', individual: 'Talk about your learning goals',
  }[role];
  return { report, audience, reason, nextStep };
}

function initializeHub() {
  const hub = document.querySelector('[data-insights-hub]');
  if (!hub) return;
  let role = '', goal = '', opener = null, capture = null;
  const steps = [...document.querySelectorAll('[data-finder-step]')];
  const progress = document.querySelector('[data-finder-progress]');
  const next = document.querySelector('[data-finder-next]');
  const match = document.querySelector('[data-finder-match]');
  const dialog = document.querySelector('#lead-dialog');
  const form = document.querySelector('#lead-form');
  const success = document.querySelector('[data-lead-success]');
  const name = document.querySelector('#lead-name');
  const email = document.querySelector('#lead-email');
  const leadRole = document.querySelector('#lead-role');
  const leadGoal = document.querySelector('#lead-goal');
  const context = document.querySelector('[data-lead-context]');
  const previewNotice = document.querySelector('[data-lead-notice]');
  const status = document.querySelector('[data-hub-status]');

  function showStep(step, focus = true) {
    steps.forEach(item => { item.hidden = item.dataset.finderStep !== step; });
    progress.textContent = step === 'role' ? 'Your perspective' : step === 'goal' ? 'Your priority' : 'Your starting point';
    hub.dataset.finderStage = step;
    if (focus) document.querySelector(`[data-finder-step="${step}"] [data-step-heading]`).focus();
  }
  document.querySelectorAll('input[name="visitor-role"]').forEach(input => input.addEventListener('change', () => {
    role = input.value; next.disabled = false; status.textContent = '';
  }));
  document.querySelectorAll('input[name="visitor-goal"]').forEach(input => input.addEventListener('change', () => {
    goal = input.value; match.disabled = false;
  }));
  next.addEventListener('click', () => { if (role) showStep('goal'); });
  document.querySelector('[data-finder-back]').addEventListener('click', () => showStep('role'));
  match.addEventListener('click', () => {
    const choice = recommendReport(role, goal);
    if (!choice) return;
    const report = REPORTS[choice.report];
    document.querySelector('[data-result-audience]').textContent = choice.audience;
    document.querySelector('[data-result-title]').textContent = report.title;
    document.querySelector('[data-result-reason]').textContent = choice.reason;
    document.querySelector('[data-result-type]').textContent = report.type;
    document.querySelector('[data-result-read]').href = report.href;
    document.querySelector('[data-result-download]').dataset.report = choice.report;
    document.querySelector('[data-result-connect]').textContent = choice.nextStep + ' ↗';
    document.querySelector('[data-result-selections]').textContent = `${ROLES[role]} · ${GOALS[goal]}`;
    showStep('result');
  });
  document.querySelector('[data-finder-reset]').addEventListener('click', () => {
    role = ''; goal = '';
    document.querySelectorAll('[data-finder] input').forEach(input => { input.checked = false; });
    next.disabled = true; match.disabled = true; showStep('role');
    status.textContent = 'Your finder choices have been cleared.';
  });

  function clearForm() {
    form.reset();
    form.querySelector('details').open = false;
    for (const field of [name, email]) {
      field.removeAttribute('aria-invalid');
      document.querySelector(`#${field.id}-error`).textContent = '';
    }
  }
  function dismiss() { clearForm(); dialog.close(); }
  document.querySelectorAll('[data-lead]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      opener = button;
      const recommendation = recommendReport(role, goal);
      capture = { mode: button.dataset.lead, report: button.dataset.report || recommendation?.report || 'readiness' };
      clearForm();
      const connect = capture.mode === 'connect';
      const bundle = capture.mode === 'recommendations';
      document.querySelector('#lead-title').textContent = connect ? 'Let’s talk about your next step.' : bundle ? 'Your evidence, in one place.' : 'Get the full report.';
      document.querySelector('[data-lead-subtitle]').textContent = connect ? 'Tell us a little about what you’re working toward.' : bundle ? 'Get both reports and choose where to start.' : `${REPORTS[capture.report].title} · PDF · 12 pages`;
      document.querySelector('[data-lead-submit]').textContent = connect ? 'Preview conversation request ↗' : bundle ? 'Get both reports ↓' : 'Download report ↓';
      leadRole.value = role; leadGoal.value = goal;
      context.textContent = role && goal ? `Your selections: ${ROLES[role]} · ${GOALS[goal]}. You can adjust these under “Add context”.` : 'Optional context helps us understand your role, organization and priorities.';
      previewNotice.textContent = 'Preview only. Details are not saved and no email is sent. Use sample details to try this form.';
      form.hidden = false; success.hidden = true; dialog.showModal(); name.focus();
    });
  });
  document.querySelector('[data-lead-close]').addEventListener('click', dismiss);
  document.querySelector('[data-success-browse]').addEventListener('click', event => {
    event.preventDefault();
    opener = document.querySelector('#case-studies-heading');
    opener.tabIndex = -1;
    dismiss();
  });
  dialog.addEventListener('cancel', clearForm);
  dialog.addEventListener('close', () => { clearForm(); capture = null; opener?.focus(); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dismiss();
  });
  dialog.addEventListener('keydown', event => {
    if (event.key !== 'Tab') return;
    const items = [...dialog.querySelectorAll('button, input, select, textarea, summary, a[href]')].filter(el => !el.disabled && el.getClientRects().length);
    if (event.shiftKey && document.activeElement === items[0]) { event.preventDefault(); items.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === items.at(-1)) { event.preventDefault(); items[0].focus(); }
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const errors = validatePreviewDetails(name.value, email.value);
    for (const [key, field] of [['name', name], ['email', email]]) {
      field.setAttribute('aria-invalid', String(Boolean(errors[key])));
      document.querySelector(`#${field.id}-error`).textContent = errors[key];
    }
    if (errors.name || errors.email) { (errors.name ? name : email).focus(); return; }
    if (!capture) return;
    const mode = capture.mode;
    const selected = REPORTS[capture.report];
    // Preview only: form values are never sent, logged or persisted.
    clearForm();
    form.hidden = true; success.hidden = false;
    const heading = success.querySelector('h3');
    heading.textContent = mode === 'connect' ? 'Conversation request previewed.' : mode === 'recommendations' ? 'Your reading list is ready.' : 'Your report is ready.';
    document.querySelector('[data-success-copy]').textContent = mode === 'connect' ? 'In the live experience, this would go to KAINDLY with the context you chose to share. This preview sent no request and created no subscription.' : 'Your details have been cleared. No email was sent and no subscription was created. Open or download your report below.';
    const list = document.querySelector('[data-success-reports]');
    list.replaceChildren();
    if (mode !== 'connect') {
      for (const report of mode === 'recommendations' ? Object.values(REPORTS) : [selected]) {
        const item = document.createElement('div'); item.className = 'success-report';
        const title = document.createElement('p'); title.textContent = report.title;
        const open = document.createElement('a'); open.href = report.pdf; open.target = '_blank'; open.rel = 'noopener noreferrer'; open.textContent = 'Open PDF ↗';
        const download = document.createElement('a'); download.href = report.pdf; download.download = ''; download.textContent = 'Download PDF ↓'; download.dataset.successDownload = '';
        item.append(title, open, download); list.append(item);
      }
      if (mode === 'download') list.querySelector('[data-success-download]').click();
    }
    heading.focus();
    status.textContent = 'Preview complete. Contact details were cleared; nothing was saved or sent.';
  });
  // Guidance stays available to pointer, keyboard and touch users without moving the cards.
  document.querySelectorAll('.case-art').forEach(art => {
    const toggle = art.querySelector('.case-guidance-toggle');
    const guidance = document.getElementById(toggle.getAttribute('aria-controls'));
    const card = art.closest('.case-card');
    let pinned = false;
    const show = open => {
      guidance.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
    };
    card.addEventListener('pointerenter', event => { if (event.pointerType === 'mouse') show(true); });
    card.addEventListener('pointerleave', () => { if (!pinned && document.activeElement !== toggle) show(false); });
    toggle.addEventListener('focus', () => show(true));
    toggle.addEventListener('blur', () => { pinned = false; show(false); });
    toggle.addEventListener('click', () => { pinned = !pinned; show(pinned); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape') { pinned = false; show(false); }
    });
  });
  showStep('role', false);
}

if (typeof document !== 'undefined') initializeHub();
