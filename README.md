# earnlYne

Commission tracker for account executives, with a free plan and paid Pro subscriptions.

- **Free:** current-quarter dashboard, unlimited deals this quarter, full comp plan setup.
- **Pro ($11/month, $89/year, or $179 lifetime):** every quarter and history, Pay check, Take-home and reinvesting planner, year-to-date pay against OTE, CSV export.

Built with **Next.js 14** (website + app), **Supabase** (logins + database), **Stripe** (payments) and **Vercel** (hosting).

---

## What's in this folder

| Path | What it is |
|---|---|
| `src/lib/commission.ts` | The commission engine: tiers, retroactive accelerators, renewals, clawbacks, payouts, take-home. Every number on the site comes from here. |
| `src/lib/commission.test.ts` | 16 tests that check the engine against the Jordan Rivera sample numbers from the test site. |
| `src/lib/billing.ts` | Prices shown on the site, Free vs Pro features, and who counts as Pro. |
| `supabase/migrations/0001_init.sql` | Database tables and security rules. Run once in Supabase. |
| `src/app/` | Pages: home, pricing, FAQ, signup/login, and the app under `/app`. |
| `src/app/api/stripe/` | Checkout, billing portal, and the webhook that turns Pro on and off. |
| `.env.example` | The secret keys the site needs (template). |

---

## Setup from zero (about 1–2 hours the first time)

You'll create four free accounts, paste some keys, and deploy. Do everything in **test mode** first; no real money moves until step 8.

### 1. Install the tools on your computer

1. **Node.js 20 or newer:** download the LTS installer from nodejs.org and run it.
2. **Git:** run the Git for Windows installer (`Git-2.55.0.3-64-bit.exe`) and accept the defaults.
3. Open a terminal (Windows: **Git Bash** from the Start menu), go to this folder, and install the code's packages:
   ```bash
   cd path/to/earnlyne
   npm install
   npm test        # should say 21 passed
   ```

### 2. Put the code on GitHub

1. Create a free account at github.com, then **New repository** → name it `earnlyne` → **Private** → Create. Don't add a README.
2. In the terminal, in this folder:
   ```bash
   git init
   git add .
   git commit -m "earnlYne first version"
   git branch -M main
   git remote add origin https://github.com/YOUR-USERNAME/earnlyne.git
   git push -u origin main
   ```
   (GitHub Desktop works too, if you prefer clicking.)

### 3. Create the database (Supabase)

1. Sign up at supabase.com → **New project**. Pick a region near your users and save the database password somewhere safe.
2. **SQL Editor → New query**: paste all of `supabase/migrations/0001_init.sql` and click **Run**. You should see "Success".
3. **Project Settings → API**: copy the **Project URL**, the **anon public** key and the **service_role** key. Keep the service_role key secret.
4. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` for now (you'll change it in step 7).
   - Redirect URLs: add `http://localhost:3000/auth/callback`.
5. **Authentication → Providers → Email**: leave it on, with "Confirm email" on.
6. *Optional, Google sign-in:* **Providers → Google**, then follow Supabase's guide to create a Google OAuth client. If you skip this, hide the Google button by deleting the `<Google next={next} />` lines in `src/components/AuthForms.tsx`.

### 4. Set up payments (Stripe, test mode)

1. Sign up at stripe.com. Keep the **Test mode** switch on.
2. **Product catalog → Add product**: name it `earnlYne Pro`. Add three prices:
   - $11.00 USD, **Recurring**, Monthly
   - $89.00 USD, **Recurring**, Yearly
   - $179.00 USD, **One-off**
   Copy each price's ID (starts with `price_`).
3. **Settings → Billing → Customer portal**: turn it on. Allow customers to cancel (at the end of the period), update payment methods, and switch between the monthly and yearly prices.
4. **Developers → API keys**: copy the **Secret key** (`sk_test_…`).

### 5. Run it on your computer

1. Copy `.env.example` to a new file named `.env.local` and fill in every value from steps 3 and 4.
2. Install the Stripe CLI (search "Stripe CLI install"), then in a second terminal:
   ```bash
   stripe login
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```
   Copy the `whsec_…` it prints into `STRIPE_WEBHOOK_SECRET` in `.env.local`.
3. Start the site:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000, sign up, set up a plan, add deals.
4. Test a purchase: Pricing → **Get Pro monthly** → pay with test card `4242 4242 4242 4242`, any future date, any CVC. You land on Settings and Pro turns on within a few seconds.

### 6. Deploy (Vercel)

1. Sign up at vercel.com with your GitHub account → **Add New → Project** → import `earnlyne`.
2. Before clicking Deploy, open **Environment Variables** and add every variable from `.env.local`. Set `NEXT_PUBLIC_SITE_URL` to the address Vercel will give you (e.g. `https://earnlyne.vercel.app`); you can fix it after the first deploy.
3. Click **Deploy**.

> Vercel's free Hobby plan is for personal, non-commercial projects. A site that charges customers needs Vercel Pro (currently $20 per member per month).

### 7. Connect the live site

1. **Supabase → Authentication → URL Configuration:** set Site URL to your live address and add `https://YOUR-SITE/auth/callback` to Redirect URLs.
2. **Stripe → Developers → Webhooks → Add endpoint:**
   - URL: `https://YOUR-SITE/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy its **Signing secret** into Vercel as `STRIPE_WEBHOOK_SECRET`, then **Redeploy**.
3. Do one test purchase on the live site with the 4242 card.
4. *Domain:* buy your domain (check `earnlyne.com` is actually available first; your brief notes this was never verified), then add it in **Vercel → Project → Settings → Domains** and update `NEXT_PUBLIC_SITE_URL`, the Supabase URLs and the Stripe webhook URL to match.

### 8. Before taking real money

- [ ] Replace the placeholder **Terms** and **Privacy** pages (`src/app/terms`, `src/app/privacy`) with attorney-reviewed versions.
- [ ] Form your business entity and put its name and support email in those pages.
- [ ] **Custom email sender:** Supabase's built-in email is only meant for testing and has low sending limits. Connect an email provider (Resend, Postmark, SendGrid…) in **Supabase → Authentication → SMTP** so signup and reset emails arrive reliably.
- [ ] Upgrade Supabase to **Pro** (free projects pause after a week without activity and have no automatic backups).
- [ ] In Stripe, complete account activation, switch to **Live mode**, and create the product, the three prices and the webhook **again in live mode** (test and live are separate). Put the live keys and price IDs in Vercel and redeploy.
- [ ] Decide on sales tax: SaaS is taxable in some US states. Stripe Tax can calculate it; turn it on in Stripe and add `automatic_tax: { enabled: true }` to the Checkout call in `src/app/api/stripe/checkout/route.ts`.
- [ ] Make one real purchase with your own card, then refund it from Stripe.

---

## Running costs (approximate, check current pricing)

| Service | Cost |
|---|---|
| Vercel Pro | $20/month per member |
| Supabase Pro | from $25/month |
| Stripe | 2.9% + 30¢ per US card payment, plus about 0.7% for subscription billing |
| Domain | ~$10–20/year |

On an $11 monthly subscription, Stripe keeps about $0.70, leaving about $10.30.

---

## How it works

- **Logins:** Supabase Auth (email + password, optional Google). `src/middleware.ts` refreshes the session and sends signed-out visitors from `/app` to `/login`.
- **Privacy:** every table has Row Level Security, so each user can only read and write their own rows. Users can read their billing row but can't change it.
- **Billing:** the pricing page posts to `/api/stripe/checkout`, which opens Stripe Checkout. Stripe calls `/api/stripe/webhook`, which writes the `billing` table. That table alone decides Free vs Pro (`src/lib/billing.ts`). Users manage or cancel through Stripe's portal (`/api/stripe/portal`). Buying Lifetime cancels any running subscription.
- **Gating:** Free users always see the current quarter. Pay check, Take-home, other quarters, year-to-date and CSV export check for Pro on the server, so the limit can't be bypassed from the browser.
- **Comp plan versions:** saving a plan creates a new version and keeps the old ones.
- **Audit trail:** every edit to a deal is logged with the old value, new value and time.

### Changing what's free

Edit `PRO_FEATURES` / `FREE_FEATURES` in `src/lib/billing.ts` for the wording, and the `ent.tier !== 'pro'` checks in the pages (and `resolveQuarter` in `src/lib/quarter.ts`) for the behavior.

### Changing prices

Create the new price in Stripe, put its ID in the matching `STRIPE_PRICE_*` variable, and update the amount in `PRICING` in `src/lib/billing.ts`.

## Commands

```bash
npm run dev        # local site at http://localhost:3000
npm test           # commission engine + billing tests
npm run typecheck  # TypeScript check
npm run build      # production build (what Vercel runs)
```

## Not built yet

From the build brief: CSV/CRM import and reconciliation, PPTX/XLSX report exports, kanban view, benchmarks, referrals, shareable quota card, KPI selection at onboarding, and mobile-specific layouts beyond the responsive design. The data model leaves room for each.
