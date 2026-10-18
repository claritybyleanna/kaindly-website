import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.env.REPORT_PREVIEW_PORT || 4183);
const allowed = /^(?:\/|\/index\.html|\/(?:insights|about|assessment|collective|contact|privacy|terms)(?:\/.*)?|\/assets\/(?:brand|images|reports)\/[^.][^?]*|\/assets\/css\/(?:site|reports|insights|report-design|report-interactions)\.css|\/assets\/js\/(?:site|report|insights|report-readiness|report-fluency)\.js)$/;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.pdf': 'application/pdf', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg' };
const csp = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; form-action 'none'; base-uri 'self'";

createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.setHeader('Content-Security-Policy', csp);
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end('Read-only preview'); return; }
  try {
    const path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    if (!allowed.test(path) || path.split('/').some(part => part.startsWith('.'))) throw new Error('Not public');
    let file = resolve(root, `.${path}`);
    if (!file.startsWith(root.endsWith(sep) ? root : root + sep)) throw new Error('Not public');
    if ((await stat(file)).isDirectory()) file = resolve(file, 'index.html');
    let bytes = await readFile(file);
    if (extname(file) === '.html') {
      // Existing public pages retain their source; this preview disables external
      // capture and embeds throughout the review session.
      bytes = Buffer.from(bytes.toString().replace(/<script\b[^>]*\bsrc="https?:[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<button class="newsletter-fab"[\s\S]*?<\/button>/g, ''));
    }
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Content-Length': bytes.length });
    res.end(req.method === 'HEAD' ? undefined : bytes);
  } catch { res.writeHead(404); res.end('Not available in this local report preview.'); }
}).listen(port, '127.0.0.1', () => {
  console.log(`Report preview: http://127.0.0.1:${port}/insights/`);
});
