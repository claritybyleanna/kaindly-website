import { build } from 'esbuild';
// Source-preserving imports from the user's Claude Design exports.
// Runtime dependencies are bundled locally; no CDN, Babel or API is used in the browser.
await build({
  entryPoints: {
    'report-readiness': 'src/report-design/readiness.jsx',
    'report-fluency': 'src/report-design/fluency.jsx',
  },
  outdir: 'assets/js', bundle: true, minify: true, format: 'esm',
  define: { 'process.env.NODE_ENV': '"production"' },
  legalComments: 'eof', target: ['es2022'],
});
