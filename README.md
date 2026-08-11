# KAINDLY Website

The production KAINDLY website is a lightweight five-page static site built from the official 2026 brand system.

## Pages

- `/` - Home
- `/collective/` - The Kaindly Collective
- `/insights/` - Curated Insights previews and category filters
- `/about/` - Founders, purpose, and values
- `/contact/` - Acuity scheduling

## Scheduling

All booking actions use Acuity owner ID `38041134`. The Contact page includes:

- the Acuity booking-button integration;
- the Acuity booking-bar integration; and
- a plain direct-scheduling link that remains available if an embed is blocked.

## Verify the Site

Run the dependency-free automated checks:

```bash
npm test
```

Preview locally from the repository root:

```bash
python3 -m http.server 4173
```

Then visit `http://localhost:4173`.

## Publish With GitHub Pages

1. Create an empty GitHub repository.
2. Connect this local repository:

   ```bash
   git remote add origin https://github.com/YOUR-ACCOUNT/YOUR-REPOSITORY.git
   git push -u origin main
   ```

3. In the GitHub repository, open **Settings > Pages**.
4. Choose **Deploy from a branch**, select `main`, choose the repository root, and save.
5. Add the custom domain only after DNS is ready. The site's canonical metadata currently targets `https://www.kaindly.ai`.

The `.nojekyll` file keeps GitHub Pages in direct static-file mode.

## Brand Sources

The web assets in `assets/brand/` are copied from the official RGB digital logo kit without alteration. The site uses Jost as the launch-safe fallback for the licensed Causten heading family, plus Archivo and Urbanist from Google Fonts.

Local source packages, the original prototype, and the Squarespace export are intentionally ignored so they are not published with the website.

## Inputs to Add Later

- Approved full article content
- A dedicated Collective enrollment or checkout URL
- Analytics requirements and account details
- Final custom-domain DNS configuration
