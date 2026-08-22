import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

type ConversationRow =
  Database["public"]["Tables"]["business_conversations"]["Row"];
type MessageRow = Database["public"]["Tables"]["business_messages"]["Row"];
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

export type BusinessConversation = ConversationRow & {
  business: Pick<
    BusinessRow,
    "category_slug" | "city" | "id" | "logo_url" | "name" | "slug"
  > | null;
  isUnread: boolean;
};

export type BusinessMessage = MessageRow;
export type PendingBusinessConversation = Pick<
  BusinessRow,
  "category_slug" | "city" | "id" | "logo_url" | "name" | "owner_id" | "slug"
>;

export async function getBusinessInbox(
  userId: string,
  selectedConversationId?: string,
  pendingBusinessId?: string,
) {
  if (!isSupabaseConfigured()) {
    return {
      conversations: [] as BusinessConversation[],
      messages: [] as BusinessMessage[],
      pendingBusiness: null as PendingBusinessConversation | null,
      selectedConversation: null as BusinessConversation | null,
      unreadCount: 0,
    };
  }

  const supabase = await createClient();
  const { data: conversationRows } = await supabase
    .rpc("get_my_business_conversations");

  const rows = conversationRows ?? [];
  const visibleRows = rows.filter(hasStoredConversationSummary);
  const businessIds = Array.from(new Set(visibleRows.map((row) => row.business_id)));
  const businessesById = new Map<string, BusinessConversation["business"]>();

  if (businessIds.length > 0) {
    const { data: businessRows } = await supabase
      .from("businesses")
      .select("id, slug, name, city, category_slug, logo_url")
      .in("id", businessIds);

    for (const business of businessRows ?? []) {
      businessesById.set(business.id, business);
    }
  }

  const conversations = visibleRows.map((conversation) => ({
    ...conversation,
    business: businessesById.get(conversation.business_id) ?? null,
    isUnread: isConversationUnread(conversation, userId),
  })).sort(sortConversationsByLatestMessage);
  const unreadCount = conversations.filter((conversation) => conversation.isUnread).length;
  const selectedConversationById = conversations.find(
    (conversation) => conversation.id === selectedConversationId,
  );
  const selectedConversationByBusiness = conversations.find(
    (conversation) =>
      pendingBusinessId && conversation.business_id === pendingBusinessId,
  );
  const selectedConversation =
    selectedConversationById ??
    selectedConversationByBusiness ??
    (pendingBusinessId ? null : conversations[0] ?? null) ??
    null;
  let pendingBusiness: PendingBusinessConversation | null = null;
  let messages: BusinessMessage[] = [];

  if (selectedConversation) {
    const { data: messageRows } = await supabase.rpc(
      "get_business_conversation_messages",
      {
        target_conversation_id: selectedConversation.id,
      },
    );

    messages = messageRows ?? [];
  } else if (pendingBusinessId) {
    const { data: business } = await supabase
      .from("businesses")
      .select("id, slug, name, city, category_slug, logo_url, owner_id")
      .eq("id", pendingBusinessId)
      .eq("status", "published")
      .maybeSingle();

    if (business && business.owner_id !== userId) {
      pendingBusiness = business;
    }
  }

  return {
    conversations,
    messages,
    pendingBusiness,
    selectedConversation,
    unreadCount,
  };
}

export function isConversationUnread(
  conversation: ConversationRow,
  userId: string,
) {
  if (!conversation.last_message_at || conversation.last_sender_id === userId) {
    return false;
  }

  const readAt =
    conversation.business_owner_id === userId
      ? conversation.owner_last_read_at
      : conversation.customer_last_read_at;

  return !readAt || new Date(conversation.last_message_at) > new Date(readAt);
}

function hasStoredConversationSummary(conversation: ConversationRow) {
  return Boolean(
    conversation.last_message_at || conversation.last_message_preview.trim(),
  );
}

function sortConversationsByLatestMessage(
  first: ConversationRow,
  second: ConversationRow,
) {
  return (
    new Date(second.last_message_at ?? second.updated_at).getTime() -
    new Date(first.last_message_at ?? first.updated_at).getTime()
  );
}
