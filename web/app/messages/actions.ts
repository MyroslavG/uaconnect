"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";

import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export async function startBusinessConversation(formData: FormData) {
  const businessId = String(formData.get("businessId") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const fallbackPath = slug ? `/business/${slug}` : "/search";

  if (!isSupabaseConfigured() || !businessId) {
    redirect(fallbackPath);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/dashboard?next=${encodeURIComponent(fallbackPath)}`);
  }

  redirect(
    `/messages?business=${encodeURIComponent(
      businessId,
    )}&return=${encodeURIComponent(fallbackPath)}`,
  );
}

export async function sendBusinessMessage(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "").trim();
  const businessId = String(formData.get("businessId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const activePath = conversationId
    ? `/messages?conversation=${encodeURIComponent(conversationId)}`
    : businessId
      ? `/messages?business=${encodeURIComponent(businessId)}`
      : "/messages";

  if (!conversationId && !businessId) {
    redirect("/messages");
  }

  if (!body || body.length > 2000) {
    redirect(`${activePath}&error=message`);
  }

  if (!isSupabaseConfigured()) {
    redirect(activePath);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/dashboard?next=/messages");
  }

  if (!conversationId && businessId) {
    const { data, error } = await supabase.rpc(
      "send_business_message_to_business",
      {
        customer_email: user.email ?? null,
        customer_name: getUserDisplayName(user),
        message_body: body,
        target_business_id: businessId,
      },
    );
    const result = data?.[0];

    if (error || !result?.conversation_id) {
      redirect(`${activePath}&error=message`);
    }

    revalidatePath("/messages");
    redirect(`/messages?conversation=${result.conversation_id}`);
  }

  const { data: conversation } = await supabase
    .from("business_conversations")
    .select("id, business_owner_id, customer_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (
    !conversation ||
    (conversation.business_owner_id !== user.id &&
      conversation.customer_id !== user.id)
  ) {
    redirect("/messages");
  }

  const { error: messageError } = await supabase.rpc("send_business_message", {
    message_body: body,
    target_conversation_id: conversation.id,
  });

  if (messageError) {
    redirect(`/messages?conversation=${conversation.id}&error=message`);
  }

  revalidatePath("/messages");
  redirect(`/messages?conversation=${conversation.id}`);
}

export async function markConversationRead(conversationId: string) {
  if (!isSupabaseConfigured() || !conversationId) {
    return;
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return;
  }

  await supabase.rpc("mark_business_conversation_read", {
    target_conversation_id: conversationId,
  });

  revalidatePath("/messages");
}

function getUserDisplayName(user: User) {
  const metadataName = user.user_metadata.full_name;

  return typeof metadataName === "string" && metadataName.trim()
    ? metadataName.trim()
    : user.email ?? null;
}
