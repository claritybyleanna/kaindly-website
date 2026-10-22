const status = document.querySelector('#slide-status');
const sections = [...document.querySelectorAll('[data-section]')];
function show(name) {
  document.dispatchEvent(new Event('owr:before-panel-change'));
  if (!sections.some(section=>section.dataset.section===name)) name='slides';
  sections.forEach(section=>{
    section.hidden=section.dataset.section!==name;
    const frame=section.querySelector('iframe');
    if (!section.hidden && frame && !frame.getAttribute('src')) frame.src=frame.dataset.src;
  });
  document.querySelectorAll('[data-panel]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.panel===name)));
  document.dispatchEvent(new CustomEvent('owr:panel-change',{detail:name}));
}
document.querySelectorAll('[data-panel]').forEach(button=>button.addEventListener('click',()=>{show(button.dataset.panel);history.replaceState(null,'','#'+button.dataset.panel);}));
show(location.hash.slice(1));
window.addEventListener('hashchange',()=>show(location.hash.slice(1)));
import {initializeSlideViewer} from './owr-slide-viewer.js';
initializeSlideViewer();
document.querySelector('#open-slide-link').addEventListener('click',()=>{
  try {
    const url=new URL(document.querySelector('#slide-link').value.trim());
    if (url.protocol!=='https:' || url.username || url.password) throw Error('unsupported');
    window.open(url.href,'_blank','noopener,noreferrer');
    status.textContent='Presentation link opened.';
  } catch {status.textContent='Enter a complete HTTPS presentation link.';}
});
document.querySelector('#fullscreen').addEventListener('click',async()=>{
  try {await document.querySelector('main').requestFullscreen();} catch {status.textContent='Full screen is unavailable here. Use “Open PDF separately” or your browser’s full screen command.';}
});
document.querySelector('#copy-participant-link').addEventListener('click',async()=>{
  const link='https://www.kaindly.ai/OWR/';
  try {await navigator.clipboard.writeText(link);document.querySelector('#link-status').textContent='Participant link copied.';} catch {document.querySelector('#link-status').textContent=link;}
});
// The browser releases the object URL when this document is destroyed. Keep it
// through back/forward cache restores so returning to the presentation still works.
