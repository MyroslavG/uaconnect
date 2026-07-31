import type { Metadata } from "next";
import Link from "next/link";
import {
  Coffee,
  Handshake,
  Mail,
  ShieldCheck,
  Smartphone,
  Store,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getRequestLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Support Kolo, partner with the platform, or get help with accounts and business profiles.",
};

const supportEmail = "myroslav@kredance.com";
const partnerSupportUrl =
  process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL ??
  "https://buymeacoffee.com/koloapp";

const text = {
  uk: {
    badge: "Підтримка Kolo",
    title: "Підтримайте розвиток Kolo",
    intro:
      "Kolo допомагає людям знаходити українські бізнеси в Канаді. Партнерська підтримка допомагає розвивати платформу, покривати технічні витрати й запускати нові функції для спільноти.",
    partnerTitle: "Партнери Kolo",
    partnerText:
      "Внесок у розвиток Kolo підтримує інфраструктуру, модерацію бізнесів, покращення пошуку, аналітику та нові інструменти для власників бізнесів.",
    coffeeLabel: "Підтримати Kolo",
    coffeeNote: "Buy Me a Coffee відкриється в новій вкладці.",
    impactTitle: "Що підтримує партнерство",
    impactItems: [
      {
        icon: "tech",
        title: "Інфраструктура",
        text: "Хостинг, база даних, карти, аналітика та стабільна робота web і mobile застосунків.",
      },
      {
        icon: "business",
        title: "Якість каталогу",
        text: "Модерація, перевірка бізнесів, чисті категорії та точні профілі.",
      },
      {
        icon: "growth",
        title: "Нові функції",
        text: "Пошук, профілі бізнесів, товари, події, послуги й кращі інструменти для власників.",
      },
    ],
    helpTitle: "Потрібна допомога?",
    helpText:
      "Якщо у вас питання щодо акаунта, бізнес-профілю, контактів або видалення акаунта, напишіть у підтримку.",
    emailLabel: "Написати в підтримку",
    response: "Зазвичай відповідаємо протягом 1-2 робочих днів.",
    includeTitle: "Що вказати в повідомленні",
    includeItems: [
      "Ваше ім'я та email, з яким ви входите в Kolo.",
      "Назву бізнесу, якщо питання стосується бізнес-профілю.",
      "Короткий опис проблеми та скриншот, якщо він допоможе.",
    ],
    privacy: "Політика конфіденційності",
    home: "На головну",
  },
  en: {
    badge: "Kolo Support",
    title: "Support Kolo's growth",
    intro:
      "Kolo helps people discover Ukrainian businesses across Canada. Partner support helps us improve the platform, cover technical costs, and build useful features for the community.",
    partnerTitle: "Kolo Partners",
    partnerText:
      "Supporting Kolo helps fund infrastructure, business moderation, better search, analytics, and new tools for business owners.",
    coffeeLabel: "Support Kolo",
    coffeeNote: "Buy Me a Coffee opens in a new tab.",
    impactTitle: "What partnership supports",
    impactItems: [
      {
        icon: "tech",
        title: "Infrastructure",
        text: "Hosting, database, maps, analytics, and reliable web and mobile app operations.",
      },
      {
        icon: "business",
        title: "Directory quality",
        text: "Moderation, business verification, clean categories, and accurate profiles.",
      },
      {
        icon: "growth",
        title: "New features",
        text: "Search, business profiles, products, events, services, and better tools for owners.",
      },
    ],
    helpTitle: "Need help?",
    helpText:
      "For account access, business profiles, contact details, or account deletion, email support.",
    emailLabel: "Email support",
    response: "We usually respond within 1-2 business days.",
    includeTitle: "What to include",
    includeItems: [
      "Your name and the email you use to sign in to Kolo.",
      "The business name, if your question is about a business profile.",
      "A short description of the issue and a screenshot if helpful.",
    ],
    privacy: "Privacy Policy",
    home: "Back to home",
  },
} as const;

export default async function SupportPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];

  return (
    <main className="bg-background">
      <section className="container max-w-6xl py-12 md:py-16">
        <Badge variant="outline" className="bg-card text-foreground">
          {labels.badge}
        </Badge>

        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_380px] lg:items-start">
          <div>
            <h1 className="max-w-4xl text-4xl font-black tracking-normal md:text-6xl">
              {labels.title}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-muted-foreground">
              {labels.intro}
            </p>

            <div className="mt-8 rounded-lg border bg-card p-5 shadow-sm md:p-6">
              <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
                <div className="max-w-2xl">
                  <span className="grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary">
                    <Handshake className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-2xl font-black">
                    {labels.partnerTitle}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {labels.partnerText}
                  </p>
                </div>
                <div className="shrink-0">
                  <Button asChild size="lg">
                    <a
                      href={partnerSupportUrl}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Coffee className="h-4 w-4" />
                      {labels.coffeeLabel}
                    </a>
                  </Button>
                  <p className="mt-2 text-xs font-semibold text-muted-foreground">
                    {labels.coffeeNote}
                  </p>
                </div>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-2xl font-black">{labels.impactTitle}</h2>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {labels.impactItems.map((item) => (
                  <article
                    className="rounded-lg border bg-card p-5 shadow-sm"
                    key={item.title}
                  >
                    <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                      <SupportIcon type={item.icon} />
                    </span>
                    <h3 className="mt-4 text-xl font-black">{item.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {item.text}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>

          <aside className="rounded-lg border bg-card p-5 shadow-sm">
            <h2 className="text-xl font-black">{labels.helpTitle}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {labels.helpText}
            </p>
            <a
              className="mt-4 flex items-center gap-3 rounded-md border bg-background p-3 text-sm font-bold transition hover:border-hover-blue-border hover:bg-hover-blue"
              href={`mailto:${supportEmail}?subject=Kolo%20Support`}
            >
              <Mail className="h-4 w-4 text-primary" />
              {supportEmail}
            </a>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              {labels.response}
            </p>

            <div className="mt-6 rounded-md border bg-background p-4">
              <h3 className="font-black">{labels.includeTitle}</h3>
              <ul className="mt-3 grid gap-2 text-sm leading-6 text-muted-foreground">
                {labels.includeItems.map((item) => (
                  <li className="flex gap-2" key={item}>
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Link
                className="rounded-md border bg-background px-3 py-2 text-sm font-bold transition hover:border-hover-blue-border hover:bg-hover-blue"
                href="/privacy"
              >
                {labels.privacy}
              </Link>
              <Link
                className="rounded-md border bg-background px-3 py-2 text-sm font-bold transition hover:border-hover-blue-border hover:bg-hover-blue"
                href="/"
              >
                {labels.home}
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SupportIcon({ type }: { type: string }) {
  if (type === "business") {
    return <Store className="h-5 w-5" />;
  }

  if (type === "growth") {
    return <ShieldCheck className="h-5 w-5" />;
  }

  return <Smartphone className="h-5 w-5" />;
}
