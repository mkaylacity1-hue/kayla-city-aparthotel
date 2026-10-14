# Kayla City ApartHotel — Console (Phase 0)

Staff-facing hotel management system. Phase 0 covers the foundation only:
project structure, auth, database schema + security, and the reusable
design system. Feature pages (bookings, guests, pricing, etc.) come in
later phases.

## Stack

- **Next.js 14** (App Router) + TypeScript — deployed on **Vercel**
- **Supabase** — Postgres database, Auth, Storage (for signatures)
- **Tailwind CSS** — styling, driven by design tokens in `src/app/globals.css`
- **GitHub** — private repo, version control

## Getting set up locally

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Connect your Supabase project**
   - Go to your Supabase project → Project Settings → API.
   - Copy `.env.example` to `.env.local`:
     ```bash
     cp .env.example .env.local
     ```
   - Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   - **Never commit `.env.local`** — it's already in `.gitignore`.

3. **Run the database migration**
   - Install the Supabase CLI if you don't have it: `npm install -g supabase`
   - Link your project: `supabase link --project-ref <your-project-ref>`
   - Push the schema: `supabase db push`
   - This creates all Phase 0 tables (`properties`, `staff`, `unit_types`,
     `units`, `seasonal_rates`, `guests`, `bookings`, `signatures`,
     `housekeeping_tasks`) and their Row Level Security policies, and
     seeds the "Kayla City ApartHotel" property row.

4. **Create your first staff user (yourself, as admin)**
   - In the Supabase dashboard: Authentication → Users → Add user (email + password).
   - Copy that user's ID.
   - In the SQL editor, run:
     ```sql
     insert into public.staff (id, property_id, full_name, role)
     values (
       '<paste the user id here>',
       (select id from public.properties where name = 'Kayla City ApartHotel'),
       'Your Name',
       'admin'
     );
     ```
   - Repeat for front desk and housekeeping staff, using their role instead of `admin`.

5. **Run the app**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` and sign in with the account you just created.

## Deploying to Vercel

1. Push this repo to GitHub (private repo, personal account).
2. In Vercel: New Project → import the GitHub repo.
3. Add the same environment variables from `.env.local` in Vercel's
   Project Settings → Environment Variables.
4. Deploy. Every push to `main` will auto-deploy.

## How the pieces fit together

- **Roles & permissions** — defined in one place: `src/lib/auth/roles.ts`.
  Admin sees everything, Front Desk sees day-to-day operations, Housekeeping
  sees only their tasks. This also matches the database's Row Level
  Security policies, so permissions are enforced twice: once for a clean
  UI, and once at the database level so it can never be bypassed.
- **Design tokens** — all colors live in `src/app/globals.css` as CSS
  variables (`--color-*`). To change the palette (e.g. a new accent color
  later), edit that one file — every component updates automatically.
  Light/dark mode both read from the same token names.
- **Pricing** — each unit type (Studio, 1BR, 2BR, 3BR) has an editable
  `base_price_per_night`. Individual units can optionally override that
  price. `seasonal_rates` lets you set date-range pricing (e.g. holiday
  rates) on top of the base price, without touching code.
- **Guest e-signature** — guests never log in. Staff run check-in, and the
  guest's signature is captured and stored as a file (Supabase Storage),
  linked to the booking via the `signatures` table.

## Project structure

```
src/
  app/
    (auth)/login/          — staff sign-in page
    (dashboard)/           — everything behind login, role-gated nav
    globals.css            — design tokens (colors, fonts)
  components/
    ui/                    — reusable design system (Button, Input, Table,
                              Dialog, ConfirmDialog, states, search/filter, toast)
  lib/
    auth/roles.ts           — role/permission map
    supabase/               — browser + server Supabase clients
  types/database.types.ts   — TypeScript types matching the DB schema
supabase/
  migrations/0001_init.sql  — full schema + Row Level Security
```
