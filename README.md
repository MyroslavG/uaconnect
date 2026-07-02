# UAConnect

UAConnect is now organized as a small product workspace:

- `web/` - the existing Next.js 15 web app
- `mobile/` - a new Expo React Native app prototype that mirrors the core mobile flow

Ukrainian remains the default language across the product.

## Quick Start

Install dependencies from the repository root:

```bash
pnpm install
```

Run the web app:

```bash
pnpm web:dev
```

Run the Expo app:

```bash
pnpm mobile:dev
```

## Useful Commands

```bash
pnpm web:typecheck
pnpm web:lint
pnpm web:build
pnpm mobile:typecheck
```

## Structure

```text
web/
  app/             Next.js App Router routes
  components/      Web UI components
  data/            Web taxonomy data
  lib/             Web helpers and Supabase clients
  supabase/        SQL schema and RLS policies
mobile/
  App.tsx          Expo app shell and mobile flow
  src/data.ts      Mobile prototype data
  src/types.ts     Mobile TypeScript types
```

## Deployment Notes

For Vercel, set the project **Root Directory** to `web`. The web app keeps its own `package.json`, `next.config.ts`, Tailwind config, and Supabase schema inside that folder.

The root `netlify.toml` is still only the redirect from the old Netlify URL to Vercel.
