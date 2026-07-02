import Link from "next/link";

import { Button } from "@/components/ui/button";

type AuthErrorPageProps = {
  searchParams: Promise<{
    message?: string;
  }>;
};

export default async function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const { message } = await searchParams;
  const text =
    message === "supabase-not-configured"
      ? "Supabase is not configured yet. Add your Supabase URL and publishable key to .env.local, then restart the dev server."
      : "We could not finish authentication. Check your Supabase Google provider and redirect URL settings.";

  return (
    <section className="container flex min-h-[60vh] items-center justify-center py-16">
      <div className="max-w-xl rounded-lg border bg-card p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase text-primary">Authentication</p>
        <h1 className="mt-3 text-3xl font-black tracking-normal">
          Sign-in needs attention
        </h1>
        <p className="mt-3 text-muted-foreground">{text}</p>
        <Button asChild className="mt-6">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </section>
  );
}
