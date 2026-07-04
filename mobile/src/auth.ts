import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { isSupabaseConfigured, supabase } from "./supabase";

WebBrowser.maybeCompleteAuthSession();

export function getAuthRedirectUrl() {
  return Linking.createURL("auth/callback");
}

export async function completeAuthFromUrl(callbackUrl: string) {
  const authCode = getCallbackParam(callbackUrl, "code");

  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
      throw error;
    }

    return true;
  }

  const accessToken = getCallbackParam(callbackUrl, "access_token");
  const refreshToken = getCallbackParam(callbackUrl, "refresh_token");

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return true;
  }

  return false;
}

export async function signInWithGoogle() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const redirectTo = getAuthRedirectUrl();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.url) {
    throw new Error("Supabase did not return an OAuth URL.");
  }

  if (!authUrlIncludesRedirect(data.url, redirectTo)) {
    console.warn(
      "[kolo:mobile-auth] OAuth URL may not be using the app redirect URL.",
      { redirectTo },
    );
  }

  console.log("[kolo:mobile-auth] Redirect URL:", redirectTo);

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo, {
    preferEphemeralSession: true,
  });

  console.log("[kolo:mobile-auth] Browser result:", result.type);

  if (result.type !== "success") {
    throw new Error(
      `Google sign-in did not return to the app. Add this exact Redirect URL in Supabase Auth settings: ${redirectTo}`,
    );
  }

  if (await completeAuthFromUrl(result.url)) {
    return;
  }

  throw new Error("Could not complete the Google sign-in callback.");
}

export async function signInWithEmailPassword(email: string, password: string) {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw error;
  }

  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut();
}

function getCallbackParam(callbackUrl: string, name: string) {
  const [, queryAndHash = ""] = callbackUrl.split("?");
  const [query = "", hash = ""] = queryAndHash.split("#");
  const hashOnly = callbackUrl.includes("#") ? callbackUrl.split("#")[1] : "";
  const sources = [query, hash, hashOnly];

  for (const source of sources) {
    for (const pair of source.split("&")) {
      const [rawKey, rawValue = ""] = pair.split("=");

      if (decodeURIComponent(rawKey) === name) {
        return decodeURIComponent(rawValue.replace(/\+/g, " "));
      }
    }
  }

  return null;
}

function authUrlIncludesRedirect(authUrl: string, redirectTo: string) {
  const encodedRedirect = encodeURIComponent(redirectTo);

  return authUrl.includes(encodedRedirect) || authUrl.includes(redirectTo);
}
