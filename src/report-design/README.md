# Interactive report designs

These source components are imported from the user's Claude Design ZIP exports:

- `readiness.jsx`: AI Readiness Assessment Webpage.html
- `fluency.jsx`: The Fluency Advantage Webpage.html
- `scrolly.jsx`: the exported ara-scrolly.jsx eight-stage scroll narrative
- `design-system.js`: exported KAINDLY component bundle (React import added)

Run `npm run build:reports` after changing these source files. This compiles the pinned local React dependencies into `assets/js/report-readiness.js` and `assets/js/report-fluency.js`; the browser does not download React/Babel from a CDN. Preserve the generated assets with source changes because the existing site serves static files.

Original page CSS stays in each report's HTML. Exported brand tokens live in `assets/css/report-design.css`; integration and responsive fixes live in `assets/css/report-interactions.css`. Original images are in `assets/images/report-design/`.

The report dialogs are static siblings of the React root. Components call the shared `openReportDownload` / `openReportShare` functions in `assets/js/report.js`, preserving validation, separate optional consent, PDF routing, focus restoration, and no-storage preview behavior. Hub forms remain independently initialized.

Deliberate source-data qualifications: the Academy baseline uses n=177 and rounded published percentages; its Count view explains that exact counts are unavailable. The sentiment slider keeps its visual transition but displays only the observed 25% / 0% endpoints for matched n=112. Scatter points retain the provided export's coordinates and interactions, explicitly labeled illustrative pending source-level validation. Aggregate profiles match the PDF. No user/visitor records are collected.

The methodology link opens the original interactive Method component in a native modal. The full PDF remains accessible from its source action. Test with `tests/report-preview.browser.mjs`; see `docs/report-preview.md` for commands and current verification.
