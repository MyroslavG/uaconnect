"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function getNextPath(formData?: FormData) {
  const next = String(formData?.get("next") ?? "/");

  return next.startsWith("/") ? next : "/";
}

export async function signInWithGoogle(formData?: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/auth/error?message=supabase-not-configured");
  }

  const requestHeaders = await headers();
  const origin =
    requestHeaders.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";
  const next = getNextPath(formData);
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
      queryParams: {
        access_type: "offline",
        prompt: "consent",
      },
    },
  });

  if (error || !data.url) {
    redirect(
      `/auth/error?message=${encodeURIComponent(error?.message ?? "Unable to start Google sign-in")}`,
    );
  }

  redirect(data.url);
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/");
}
