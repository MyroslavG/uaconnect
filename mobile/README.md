# Kolo Mobile

Expo React Native prototype for the Kolo mobile app.

## Run

From the repository root:

```bash
pnpm install
pnpm mobile:dev
```

Then open it in Expo Go, iOS Simulator, Android Emulator, or the web preview.

## Current Flow

- Search by keyword, category, and location
- Canada-wide online business flag
- Business profile modal
- Add-business submission UI
- Owner dashboard editing flow
- Ukrainian/English language toggle

## Environment

Copy the mobile env example when the native app starts using Supabase directly:

```bash
copy mobile\.env.example mobile\.env.local
```

## Google Sign-In

The app uses Supabase OAuth with the Expo deep-link callback.

In the app, open **Profile** and copy the displayed **Redirect URL**. Add that exact value in Supabase:

```text
Supabase -> Authentication -> URL Configuration -> Redirect URLs
```

Also keep the production app scheme for future builds:

```text
kolo://auth/callback
```

In Google Cloud, the OAuth redirect URI still points to Supabase:

```text
https://crakhsgzecsletrywpsj.supabase.co/auth/v1/callback
```
