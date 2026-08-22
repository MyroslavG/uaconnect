import Link from "next/link";
import { MessageCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";

type MessageBusinessButtonProps = {
  businessId: string;
  businessOwnerId?: string;
  isOwner: boolean;
  isSignedIn: boolean;
  locale: Locale;
  slug: string;
};

export function MessageBusinessButton({
  businessId,
  businessOwnerId,
  isOwner,
  isSignedIn,
  locale,
  slug,
}: MessageBusinessButtonProps) {
  if (!businessOwnerId) {
    return null;
  }

  const labels = {
    inbox: locale === "uk" ? "Повідомлення" : "Messages",
    message: locale === "uk" ? "Написати бізнесу" : "Message business",
    signIn:
      locale === "uk" ? "Увійдіть, щоб написати" : "Sign in to message",
  };

  if (isOwner) {
    return (
      <Button asChild className="w-full" variant="secondary">
        <Link href="/messages">
          <MessageCircle className="h-4 w-4" />
          {labels.inbox}
        </Link>
      </Button>
    );
  }

  if (!isSignedIn) {
    return (
      <Button asChild className="w-full" variant="secondary">
        <Link href={`/dashboard?next=${encodeURIComponent(`/business/${slug}`)}`}>
          <MessageCircle className="h-4 w-4" />
          {labels.signIn}
        </Link>
      </Button>
    );
  }

  return (
    <Button asChild className="w-full">
      <Link
        href={`/messages?business=${encodeURIComponent(
          businessId,
        )}&return=${encodeURIComponent(`/business/${slug}`)}`}
      >
        <MessageCircle className="h-4 w-4" />
        {labels.message}
      </Link>
    </Button>
  );
}
