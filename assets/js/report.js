export function validatePreviewDetails(name, email) {
  return {
    name: name.trim() ? '' : 'Enter your name.',
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ? '' : 'Enter a valid email address.',
  };
}

export async function shareSummary(navigatorObject, title, url) {
  if (navigatorObject.share) {
    try { await navigatorObject.share({ title, url }); return 'shared'; }
    catch (error) { if (error.name === 'AbortError') return 'cancelled'; }
  }
  try {
    if (!navigatorObject.clipboard?.writeText) return 'manual';
    await navigatorObject.clipboard.writeText(url);
    return 'copied';
  } catch { return 'manual'; }
}

function initializeReport() {
  const dialog = document.querySelector('#download-dialog');
  if (!dialog) return;
  document.querySelectorAll('.report-dialog').forEach(modal => {
    modal.addEventListener('keydown', event => {
      if (event.key !== 'Tab') return;
      const focusable = [...modal.querySelectorAll('button, input, a[href]')]
        .filter(element => !element.disabled && element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault(); first.focus();
      }
    });
  });
  const form = dialog.querySelector('form');
  const name = form.querySelector('#reader-name');
  const email = form.querySelector('#reader-email');
  const success = dialog.querySelector('[data-download-success]');
  const pdf = document.body.dataset.pdf;
  let opener;
  let page = 1;
  function clearDetails() {
    form.reset();
    for (const field of [name, email]) {
      field.removeAttribute('aria-invalid');
      document.querySelector(`#${field.id}-error`).textContent = '';
    }
  }
  function openDownload(button, requestedPage = 1) {
    opener = button;
    page = Number(requestedPage);
    clearDetails();
    form.hidden = false;
    success.hidden = true;
    dialog.showModal();
    name.focus();
  }
  document.querySelectorAll('[data-download]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => openDownload(button, button.dataset.page || 1));
  });
  const dismissDownload = () => { clearDetails(); dialog.close(); };
  dialog.querySelector('[data-close]').addEventListener('click', dismissDownload);
  dialog.addEventListener('cancel', clearDetails);
  dialog.addEventListener('close', () => { clearDetails(); opener?.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dismissDownload();
  }});
  form.addEventListener('submit', event => {
    event.preventDefault();
    const errors = validatePreviewDetails(name.value, email.value);
    for (const [key, field] of [['name', name], ['email', email]]) {
      field.setAttribute('aria-invalid', String(Boolean(errors[key])));
      document.querySelector(`#${field.id}-error`).textContent = errors[key];
    }
    if (errors.name || errors.email) { (errors.name ? name : email).focus(); return; }
    // Simulated gate only: no storage, analytics, requests or email service.
    const openLink = success.querySelector('[data-open-pdf]');
    const downloadLink = success.querySelector('[data-save-pdf]');
    openLink.href = `${pdf}#page=${page}`;
    downloadLink.href = pdf;
    clearDetails();
    form.hidden = true;
    success.hidden = false;
    downloadLink.click();
    success.querySelector('h3').focus();
  });

  const shareDialog = document.querySelector('#share-dialog');
  let shareButton;
  async function openShare(button) {
    shareButton = button;
    const url = `${location.origin}${location.pathname}`;
    const result = await shareSummary(navigator, document.querySelector('h1').textContent, url);
    document.querySelector('[data-share-status]').textContent = result === 'copied' ? 'Summary link copied.' : '';
    if (result === 'manual') {
      shareDialog.querySelector('input').value = url;
      shareDialog.showModal();
      shareDialog.querySelector('input').select();
    }
    return result;
  }
  document.querySelectorAll('[data-share]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => openShare(button));
  });
  shareDialog.querySelector('[data-close-share]').addEventListener('click', () => shareDialog.close());
  shareDialog.addEventListener('close', () => shareButton?.focus());
  return { openDownload, openShare };
}

let controls;
export function openReportDownload(button, page = 1) { controls?.openDownload(button, page); }
export function openReportShare(button) { return controls?.openShare(button); }
if (typeof document !== 'undefined') controls = initializeReport();
