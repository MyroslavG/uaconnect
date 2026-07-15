import { isSupabaseConfigured, supabase } from "./supabase";

export async function deleteCurrentAccount() {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured for the mobile app.");
  }

  const { error } = await supabase.rpc("delete_current_user_account");

  if (error) {
    throw error;
  }

  await supabase.auth.signOut();
}
