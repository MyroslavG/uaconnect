import type { Metadata } from "next";
import Link from "next/link";
import { Inbox, MessageCircle, SendHorizontal } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { sendBusinessMessage } from "@/app/messages/actions";
import { BusinessLogo } from "@/components/business-logo";
import { MessageAutoRefresh } from "@/components/message-auto-refresh";
import { MessageReadMarker } from "@/components/message-read-marker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { copy, type Locale } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getBusinessInbox, type BusinessConversation } from "@/lib/messages";
import { getCurrentUser } from "@/lib/supabase/auth";

export const metadata: Metadata = {
  title: "Messages",
  description: "Message Ukrainian-owned businesses on Kolo.",
};

type MessagesPageProps = {
  searchParams?: Promise<{
    business?: string;
    conversation?: string;
    error?: string;
    return?: string;
  }>;
};

const text = {
  uk: {
    kicker: "Повідомлення",
    title: "Ваші розмови",
    intro: "Пишіть бізнесам напряму й відповідайте клієнтам зі свого кабінету.",
    signInTitle: "Увійдіть, щоб бачити повідомлення",
    signIn: "Увійти",
    emptyTitle: "Розмов поки немає",
    emptyText: "Відкрийте профіль бізнесу й натисніть «Написати бізнесу».",
    unread: "Нове",
    customer: "Клієнт",
    business: "Бізнес",
    openBusiness: "Відкрити бізнес",
    composePlaceholder: "Напишіть повідомлення...",
    send: "Надіслати",
    messageError: "Повідомлення має містити текст до 2000 символів.",
  },
  en: {
    kicker: "Messages",
    title: "Your conversations",
    intro: "Message businesses directly and reply to customers from your account.",
    signInTitle: "Sign in to view messages",
    signIn: "Sign in",
    emptyTitle: "No conversations yet",
    emptyText: "Open a business profile and choose “Message business.”",
    unread: "New",
    customer: "Customer",
    business: "Business",
    openBusiness: "Open business",
    composePlaceholder: "Write a message...",
    send: "Send",
    messageError: "Messages must include text and be under 2000 characters.",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function MessagesPage({ searchParams }: MessagesPageProps) {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const common = copy[locale].common;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const user = await getCurrentUser();

  if (!user) {
    return (
      <section className="container py-12">
        <Card className="mx-auto max-w-xl border-white/70 bg-card/95 text-center shadow-sm dark:border-white/10">
          <CardContent className="grid gap-5 p-8">
            <MessageCircle className="mx-auto h-12 w-12 text-primary" />
            <div>
              <Badge variant="accent">{labels.kicker}</Badge>
              <h1 className="mt-4 text-3xl font-black">{labels.signInTitle}</h1>
            </div>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/messages" />
              <Button type="submit" size="lg">
                {labels.signIn}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>
    );
  }

  const inbox = await getBusinessInbox(
    user.id,
    resolvedSearchParams.conversation,
    resolvedSearchParams.business,
  );
  const selectedConversation = inbox.selectedConversation;
  const hasMessageError = resolvedSearchParams.error === "message";

  return (
    <section className="container py-8 md:py-12">
      <MessageAutoRefresh />
      <div className="mb-6 max-w-3xl">
        <Badge variant="accent">{labels.kicker}</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
          {labels.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{labels.intro}</p>
      </div>

      {inbox.conversations.length === 0 && !selectedConversation && !inbox.pendingBusiness ? (
        <Card className="border-dashed bg-card/80">
          <CardContent className="grid gap-3 p-8 text-center">
            <Inbox className="mx-auto h-10 w-10 text-primary" />
            <h2 className="text-2xl font-black">{labels.emptyTitle}</h2>
            <p className="text-sm text-muted-foreground">{labels.emptyText}</p>
            <Button asChild className="mx-auto mt-2">
              <Link href="/search">{common.search}</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid min-h-[620px] gap-4 lg:grid-cols-[360px_1fr]">
          <Card className="overflow-hidden border-border bg-card shadow-sm">
            <div className="border-b px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-black">{labels.kicker}</h2>
                {inbox.unreadCount > 0 ? (
                  <Badge variant="green">{inbox.unreadCount}</Badge>
                ) : null}
              </div>
            </div>
            <nav className="grid max-h-[620px] overflow-y-auto p-2">
              {inbox.conversations.map((conversation) => (
                <ConversationLink
                  conversation={conversation}
                  isActive={conversation.id === selectedConversation?.id}
                  key={conversation.id}
                  labels={labels}
                  locale={locale}
                  userId={user.id}
                />
              ))}
            </nav>
          </Card>

          <Card className="flex min-h-[620px] flex-col overflow-hidden border-border bg-card shadow-sm">
            {selectedConversation ? (
              <>
                <MessageReadMarker conversationId={selectedConversation.id} />
                <ThreadHeader
                  conversation={selectedConversation}
                  labels={labels}
                  userId={user.id}
                />
                <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 md:p-6">
                  {inbox.messages.length ? inbox.messages.map((message) => {
                    const isMine = message.sender_id === user.id;

                    return (
                      <div
                        className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                        key={message.id}
                      >
                        <div
                          className={`max-w-[78%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm ${
                            isMine
                              ? "bg-primary text-primary-foreground"
                              : "border bg-background text-foreground"
                          }`}
                        >
                          <p>{message.body}</p>
                          <p
                            className={`mt-2 text-[11px] font-semibold ${
                              isMine
                                ? "text-primary-foreground/75"
                                : "text-muted-foreground"
                            }`}
                          >
                            {formatMessageDate(message.created_at, locale)}
                          </p>
                        </div>
                      </div>
                    );
                  }) : null}
                </div>
                <form
                  action={sendBusinessMessage}
                  className="grid gap-3 border-t bg-background p-4"
                >
                  <input
                    type="hidden"
                    name="conversationId"
                    value={selectedConversation.id}
                  />
                  {hasMessageError ? (
                    <p className="text-sm font-semibold text-destructive">
                      {labels.messageError}
                    </p>
                  ) : null}
                  <Textarea
                    maxLength={2000}
                    name="body"
                    placeholder={labels.composePlaceholder}
                    required
                  />
                  <Button className="justify-self-end" type="submit">
                    <SendHorizontal className="h-4 w-4" />
                    {labels.send}
                  </Button>
                </form>
              </>
            ) : inbox.pendingBusiness ? (
              <>
                <PendingThreadHeader
                  business={inbox.pendingBusiness}
                  labels={labels}
                />
                <div className="flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4 md:p-6" />
                <form
                  action={sendBusinessMessage}
                  className="grid gap-3 border-t bg-background p-4"
                >
                  <input
                    type="hidden"
                    name="businessId"
                    value={inbox.pendingBusiness.id}
                  />
                  {hasMessageError ? (
                    <p className="text-sm font-semibold text-destructive">
                      {labels.messageError}
                    </p>
                  ) : null}
                  <Textarea
                    maxLength={2000}
                    name="body"
                    placeholder={labels.composePlaceholder}
                    required
                  />
                  <Button className="justify-self-end" type="submit">
                    <SendHorizontal className="h-4 w-4" />
                    {labels.send}
                  </Button>
                </form>
              </>
            ) : null}
          </Card>
        </div>
      )}
    </section>
  );
}

function ConversationLink({
  conversation,
  isActive,
  labels,
  locale,
  userId,
}: {
  conversation: BusinessConversation;
  isActive: boolean;
  labels: Record<string, string>;
  locale: Locale;
  userId: string;
}) {
  const title = getConversationTitle(conversation, userId);
  const subtitle =
    conversation.business_owner_id === userId
      ? conversation.customer_email || labels.customer
      : conversation.business?.city || labels.business;

  return (
    <Link
      className={`grid gap-2 rounded-md border px-3 py-3 transition hover:border-hover-blue-border hover:bg-hover-blue/35 ${
        isActive
          ? "border-primary bg-primary/10"
          : "border-transparent bg-transparent"
      }`}
      href={`/messages?conversation=${conversation.id}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-black">{title}</p>
          <p className="truncate text-xs font-semibold text-muted-foreground">
            {subtitle}
          </p>
        </div>
        {conversation.isUnread ? (
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-primary" />
        ) : null}
      </div>
      {conversation.last_message_preview ? (
        <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
          {conversation.last_message_preview}
        </p>
      ) : null}
      <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
        {conversation.last_message_at
          ? formatMessageDate(conversation.last_message_at, locale)
          : labels.unread}
      </p>
    </Link>
  );
}

function ThreadHeader({
  conversation,
  labels,
  userId,
}: {
  conversation: BusinessConversation;
  labels: Record<string, string>;
  userId: string;
}) {
  const isOwner = conversation.business_owner_id === userId;
  const title = getConversationTitle(conversation, userId);
  const subtitle = isOwner
    ? conversation.customer_email || labels.customer
    : conversation.business?.city || labels.business;

  return (
    <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <BusinessLogo
          className="h-11 w-11 bg-card"
          logoUrl={conversation.business?.logo_url}
          name={conversation.business?.name ?? title}
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black">{title}</h2>
          <p className="truncate text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {conversation.business?.slug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/business/${conversation.business.slug}`}>
            {labels.openBusiness}
          </Link>
        </Button>
      ) : null}
    </header>
  );
}

function PendingThreadHeader({
  business,
  labels,
}: {
  business: {
    city: string;
    logo_url: string | null;
    name: string;
    slug: string | null;
  };
  labels: Record<string, string>;
}) {
  return (
    <header className="flex items-center justify-between gap-4 border-b bg-background px-4 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <BusinessLogo
          className="h-11 w-11 bg-card"
          logoUrl={business.logo_url}
          name={business.name}
        />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-black">{business.name}</h2>
          <p className="truncate text-sm text-muted-foreground">{business.city}</p>
        </div>
      </div>
      {business.slug ? (
        <Button asChild variant="outline" size="sm">
          <Link href={`/business/${business.slug}`}>
            {labels.openBusiness}
          </Link>
        </Button>
      ) : null}
    </header>
  );
}

function getConversationTitle(
  conversation: BusinessConversation,
  userId: string,
) {
  if (conversation.business_owner_id === userId) {
    return conversation.customer_name || conversation.customer_email || "Customer";
  }

  return conversation.business?.name ?? "Business";
}

function formatMessageDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-CA" : "en-CA", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}
