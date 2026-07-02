# UAConnect

UAConnect is a Next.js 15 App Router application for discovering Ukrainian-owned and Ukraine-connected businesses in Canada. The app uses TypeScript, Tailwind CSS, local shadcn/ui-style components, Supabase Auth, and a Supabase-ready verification backend.

Ukrainian is the default language. English is available through the header language toggle.

## Features

- Modern responsive homepage, location search, city/category exploration, and business profiles
- Global search page at `/search` with city/category filters and nearby location suggestions
- Map panels use addresses from UAConnect listings instead of generic Google Maps category searches
- Google sign-in through Supabase Auth
- Business owner registration form at `/register`
- Owner dashboard at `/dashboard` with editable business details
- Admin verification queue at `/admin/registrations`
- Manual approval/rejection flow with review notes
- Approved submissions are copied into a Supabase `businesses` table for future directory reads
- Public listings come from approved Supabase businesses
- Dark mode, loading states, SEO-friendly routes, and reusable components

## Tech Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- Local shadcn/ui-style components
- Supabase Auth and database
- `@supabase/ssr`
- `@supabase/supabase-js`
- `next-themes`

## Local Setup

From the repository root, install dependencies:

```bash
pnpm install
```

Create the web env file:

```bash
copy web\.env.example web\.env.local
```

Run the web app from the repository root:

```bash
pnpm web:dev
```

Open:

```text
http://localhost:3000
```

## Supabase Setup

1. Create a Supabase project.
2. In Supabase, open **SQL Editor** and run:

```text
web/supabase/schema.sql
```

3. In Supabase, open **Project Settings -> API** and copy:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Older projects may use:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

4. Restart `pnpm dev`.

## Google Auth Setup

In Google Cloud:

1. Create an OAuth client ID for a Web application.
2. Add this Authorized JavaScript origin for local development:

```text
http://localhost:3000
```

3. Add the Supabase callback URL shown in **Supabase -> Authentication -> Providers -> Google** as an Authorized redirect URI.

In Supabase:

1. Open **Authentication -> Providers -> Google**.
2. Enable Google.
3. Paste the Google Client ID and Client Secret.
4. Open **Authentication -> URL Configuration**.
5. Set Site URL:

```text
http://localhost:3000
```

6. Add Redirect URL:

```text
http://localhost:3000/auth/callback
```

For Vercel, add your production domain too:

```text
https://your-domain.com/auth/callback
```

## Admin Verification

After signing in once with Google, promote your own profile in Supabase SQL Editor:

```sql
update public.profiles
set role = 'admin'
where email = 'you@example.com';
```

Then open:

```text
http://localhost:3000/admin/registrations
```

Business owners submit from `/register`. Their rows start as `pending` in `business_registrations`. Owners can edit their business details from `/dashboard`; edits return the row to `pending` review. When you approve a submission, the app marks it `approved` and upserts a published row into `businesses`.

## Useful Commands

```bash
pnpm web:typecheck
pnpm web:lint
pnpm web:build
```

## Project Structure

```text
app/
  admin/registrations/       Manual business verification
  auth/                      Google OAuth actions and callback
  business/[slug]/           Business profiles
  dashboard/                 Owner dashboard with editable business details
  register/                  Business registration
  search/                    Global search results
  [city]/[category]/         City/category explore pages
components/
  ui/                        Local shadcn/ui-style primitives
  auth-menu.tsx
  business-registration-form.tsx
  business-card.tsx
  search-panel.tsx
data/
  businesses.json            Empty local fallback; public listings come from Supabase
  categories.json
  cities.json
lib/
  supabase/                  Supabase clients, config, database types
  data.ts                    Local city/category taxonomy helpers
  i18n.ts                    UI copy and data localization
  locale.ts                  Locale cookie handling
supabase/
  schema.sql                 Tables, triggers, RLS policies
```

## Vercel Deployment

1. Push the repository to GitHub.
2. Import it into Vercel as a Next.js project.
3. Set **Root Directory** to:

```text
web
```

4. Set Install command:

```bash
pnpm install
```

5. Set Build command:

```bash
pnpm build
```

6. Add environment variables in Vercel:

```env
NEXT_PUBLIC_SITE_URL=https://your-domain.com
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

7. Add your production callback URL in Supabase Auth settings:

```text
https://your-domain.com/auth/callback
```

8. Deploy.
