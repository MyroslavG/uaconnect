"use client";

import { useEffect } from "react";

import { markConversationRead } from "@/app/messages/actions";

type MessageReadMarkerProps = {
  conversationId: string;
};

export function MessageReadMarker({ conversationId }: MessageReadMarkerProps) {
  useEffect(() => {
    void markConversationRead(conversationId);
  }, [conversationId]);

  return null;
}
