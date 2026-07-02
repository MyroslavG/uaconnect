"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function getNextPath(formData?: FormData) {
  const next = String(formData?.get("next") ?? "/");

  return next.startsWith("/") ? next : "/";
}

function getAuthOrigin(requestOrigin: string | null) {
  const configuredOrigin = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(
    /\/$/,
    "",
  );

  if (process.env.NODE_ENV === "production" && configuredOrigin) {
    return configuredOrigin;
  }

  return requestOrigin ?? configuredOrigin ?? "http://localhost:3000";
}

export async function signInWithGoogle(formData?: FormData) {
  if (!isSupabaseConfigured()) {
    redirect("/auth/error?message=supabase-not-configured");
  }

  const requestHeaders = await headers();
  const origin = getAuthOrigin(requestHeaders.get("origin"));
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
