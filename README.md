# KAINDLY Website

The production KAINDLY website is a lightweight seven-route static site built from the official 2026 brand system.

## Pages

- `/` - Home
- `/collective/` - The Kaindly Collective
- `/assessment/` - AI Readiness Assessment
- `/insights/` - Curated Insights and category filters
- `/insights/kaindly-standards/` - How We Show Up, the KAINDLY Standards
- `/about/` - Founders, purpose, and values
- `/contact/` - Acuity scheduling, messaging, and assessment access

## Embedded Experiences

- Home: Typeform readiness experience `01KJ3V41DCC0V9P0VT0T97XK4E`
- Assessment: Typeform `01KJ3TB8AV4EBVV6P51RE768EB`
- Contact message: Typeform `01KZS1XDVQMV2J1AP4SMMSTQZ6`
- Contact scheduling: Acuity owner `38041134`, with an inline scheduler, direct fallback, and general booking bar
- Collective membership: [Circle founding-member checkout](https://kaindly.circle.so/checkout/founding-member)

Each third-party embed has a visible direct link so visitors can continue if an embed is blocked.

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

- Analytics requirements and account details
- Final custom-domain DNS configuration
