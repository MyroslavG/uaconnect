import { isSupabaseConfigured, supabase } from "./supabase";
import type { Business } from "./types";

type ConversationRow = {
  id: string;
  business_id: string;
  business_owner_id: string;
  customer_id: string;
  customer_name: string | null;
  customer_email: string | null;
  last_message_preview: string;
  last_message_at: string | null;
  last_sender_id: string | null;
  customer_last_read_at: string | null;
  owner_last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

type ConversationBusinessRow = {
  id: string;
  slug: string | null;
  name: string;
  city: string;
  category_slug: string;
  logo_url: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type ConversationUnreadMessageRow = {
  conversation_id: string;
  sender_id: string;
  created_at: string;
};

export type MobileConversation = {
  id: string;
  businessId: string;
  businessOwnerId: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  lastMessagePreview: string;
  lastMessageAt?: string;
  lastSenderId?: string;
  customerLastReadAt?: string;
  ownerLastReadAt?: string;
  business?: ConversationBusinessRow;
  isUnread: boolean;
  unreadCount: number;
};

export type MobileMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  isUnread?: boolean;
};

export type MobileMessageSendResult = {
  conversationId: string;
  messageId: string;
};

export async function fetchBusinessConversations(userId: string) {
  if (!isSupabaseConfigured) {
    return [];
  }

  const { data, error } = await supabase.rpc("get_my_business_conversations");

  if (error) {
    throw error;
  }

  const conversationRows = (data ?? []) as ConversationRow[];
  const visibleConversationRows = conversationRows.filter(hasStoredConversationSummary);
  const businessIds = Array.from(
    new Set(visibleConversationRows.map((row) => row.business_id)),
  );
  const businessesById = new Map<string, ConversationBusinessRow>();

  if (businessIds.length > 0) {
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, slug, name, city, category_slug, logo_url")
      .in("id", businessIds);

    for (const business of (businesses ?? []) as ConversationBusinessRow[]) {
      businessesById.set(business.id, business);
    }
  }

  const unreadCountsByConversationId = await fetchConversationUnreadCounts(
    visibleConversationRows,
    userId,
  );

  return visibleConversationRows.map((row) =>
    mapConversation(
      row,
      userId,
      businessesById,
      unreadCountsByConversationId.get(row.id),
    ),
  ).sort(sortConversationsByLatestMessage);
}

export async function fetchBusinessMessages(
  conversationId: string,
  viewerId?: string,
  conversation?: MobileConversation | null,
) {
  if (!isSupabaseConfigured || isDraftConversationId(conversationId)) {
    return [];
  }

  const { data, error } = await supabase.rpc(
    "get_business_conversation_messages",
    {
      target_conversation_id: conversationId,
    },
  );

  if (error) {
    throw error;
  }

  const readAt =
    viewerId && conversation
      ? getConversationReadAt(conversation, viewerId)
      : undefined;

  return ((data ?? []) as MessageRow[]).map((row) =>
    mapMessage(row, viewerId, readAt),
  );
}

export async function getOrCreateBusinessConversation({
  business,
  customerEmail,
  customerName,
}: {
  business: Business;
  customerEmail?: string | null;
  customerId: string;
  customerName?: string | null;
}) {
  if (!isSupabaseConfigured || !business.ownerId) {
    throw new Error("Messaging is not available for this business yet.");
  }

  const { data, error } = await supabase.rpc("start_business_conversation", {
    customer_email: customerEmail ?? null,
    customer_name: customerName ?? customerEmail ?? null,
    target_business_id: business.id,
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("Messaging is not available for this business yet.");
  }

  return data as string;
}

export async function sendMobileBusinessMessage({
  body,
  conversation,
  customerEmail,
  customerName,
}: {
  body: string;
  conversation: MobileConversation;
  customerEmail?: string | null;
  customerName?: string | null;
}): Promise<MobileMessageSendResult> {
  const trimmedBody = body.trim();

  if (!trimmedBody || trimmedBody.length > 2000) {
    throw new Error("Message must include text and be under 2000 characters.");
  }

  if (isDraftConversationId(conversation.id)) {
    const { data, error } = await supabase.rpc(
      "send_business_message_to_business",
      {
        customer_email: customerEmail ?? undefined,
        customer_name: customerName ?? customerEmail ?? undefined,
        message_body: trimmedBody,
        target_business_id: conversation.businessId,
      },
    );

    if (error) {
      throw error;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result?.conversation_id || !result?.message_id) {
      throw new Error("Message could not be sent.");
    }

    return {
      conversationId: result.conversation_id,
      messageId: result.message_id,
    };
  }

  const { data, error } = await supabase.rpc("send_business_message", {
    message_body: trimmedBody,
    target_conversation_id: conversation.id,
  });

  if (error) {
    throw error;
  }

  return {
    conversationId: conversation.id,
    messageId: typeof data === "string" ? data : conversation.id,
  };
}

export async function markMobileConversationRead(
  conversation: MobileConversation,
  _userId: string,
) {
  if (isDraftConversationId(conversation.id)) {
    return new Date().toISOString();
  }

  const { data, error } = await supabase.rpc(
    "mark_business_conversation_read",
    {
      target_conversation_id: conversation.id,
    },
  );

  if (error) {
    throw error;
  }

  return typeof data === "string" ? data : new Date().toISOString();
}

export function isDraftConversationId(conversationId: string) {
  return conversationId.startsWith("draft:");
}

function hasStoredConversationSummary(row: ConversationRow) {
  return Boolean(row.last_message_at || row.last_message_preview.trim());
}

function mapConversation(
  row: ConversationRow,
  userId: string,
  businessesById: Map<string, ConversationBusinessRow>,
  unreadCount?: number,
): MobileConversation {
  const storedPreview = row.last_message_preview.trim();
  const conversation: MobileConversation = {
    id: row.id,
    businessId: row.business_id,
    businessOwnerId: row.business_owner_id,
    customerEmail: row.customer_email ?? undefined,
    customerId: row.customer_id,
    customerLastReadAt: row.customer_last_read_at ?? undefined,
    customerName: row.customer_name ?? undefined,
    lastMessageAt: row.last_message_at ?? undefined,
    lastMessagePreview: storedPreview,
    lastSenderId: row.last_sender_id ?? undefined,
    ownerLastReadAt: row.owner_last_read_at ?? undefined,
    business: businessesById.get(row.business_id),
    isUnread: false,
    unreadCount: 0,
  };

  const fallbackUnread = isUnreadConversation(conversation, userId);
  conversation.unreadCount =
    unreadCount !== undefined ? unreadCount : fallbackUnread ? 1 : 0;
  conversation.isUnread = conversation.unreadCount > 0;

  return conversation;
}

function mapMessage(
  row: MessageRow,
  viewerId?: string,
  readAt?: string,
): MobileMessage {
  return {
    body: row.body,
    conversationId: row.conversation_id,
    createdAt: row.created_at,
    id: row.id,
    isUnread: isUnreadMessage(row, viewerId, readAt),
    senderId: row.sender_id,
  };
}

async function fetchConversationUnreadCounts(
  conversations: ConversationRow[],
  userId: string,
) {
  const unreadCountsByConversationId = new Map<string, number>();
  const conversationIds = conversations.map((conversation) => conversation.id);

  if (!conversationIds.length) {
    return unreadCountsByConversationId;
  }

  const { data, error } = await supabase
    .from("business_messages")
    .select("conversation_id, sender_id, created_at")
    .in("conversation_id", conversationIds)
    .neq("sender_id", userId);

  if (error) {
    console.error("[kolo:mobile-message-unread-counts]", error);
    return unreadCountsByConversationId;
  }

  const readAtByConversationId = new Map(
    conversations.map((conversation) => [
      conversation.id,
      conversation.business_owner_id === userId
        ? conversation.owner_last_read_at
        : conversation.customer_last_read_at,
    ]),
  );

  for (const message of (data ?? []) as ConversationUnreadMessageRow[]) {
    const readAt = readAtByConversationId.get(message.conversation_id);

    if (isUnreadMessage(message, userId, readAt ?? undefined)) {
      unreadCountsByConversationId.set(
        message.conversation_id,
        (unreadCountsByConversationId.get(message.conversation_id) ?? 0) + 1,
      );
    }
  }

  return unreadCountsByConversationId;
}

function getConversationReadAt(
  conversation: MobileConversation,
  userId: string,
) {
  return conversation.businessOwnerId === userId
    ? conversation.ownerLastReadAt
    : conversation.customerLastReadAt;
}

function isUnreadConversation(conversation: MobileConversation, userId: string) {
  if (!conversation.lastMessageAt || conversation.lastSenderId === userId) {
    return false;
  }

  const readAt =
    conversation.businessOwnerId === userId
      ? conversation.ownerLastReadAt
      : conversation.customerLastReadAt;

  return !readAt || new Date(conversation.lastMessageAt) > new Date(readAt);
}

function isUnreadMessage(
  message: ConversationUnreadMessageRow | MessageRow,
  viewerId?: string,
  readAt?: string,
) {
  if (!viewerId || message.sender_id === viewerId) {
    return false;
  }

  if (!readAt) {
    return true;
  }

  return new Date(message.created_at) > new Date(readAt);
}

function sortConversationsByLatestMessage(
  first: MobileConversation,
  second: MobileConversation,
) {
  return (
    new Date(second.lastMessageAt ?? second.customerLastReadAt ?? 0).getTime() -
    new Date(first.lastMessageAt ?? first.customerLastReadAt ?? 0).getTime()
  );
}
