import type { Metadata } from "next";
import Link from "next/link";
import { Mail, ShieldCheck, Smartphone, Store } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getRequestLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with Kolo accounts, business profiles, and app support.",
};

const supportEmail = "myroslav@kredance.com";

const text = {
  uk: {
    badge: "Підтримка",
    title: "Підтримка Kolo",
    intro:
      "Ми допоможемо з входом в акаунт, бізнес-профілем, контактами, видаленням акаунта або питаннями щодо застосунку.",
    emailLabel: "Написати в підтримку",
    response: "Зазвичай відповідаємо протягом 1-2 робочих днів.",
    sections: [
      {
        icon: "account",
        title: "Акаунт і вхід",
        text: "Допомога з Google Sign-In, Sign in with Apple, email-входом або видаленням акаунта.",
      },
      {
        icon: "business",
        title: "Бізнес-профіль",
        text: "Питання щодо додавання бізнесу, редагування опису, контактів, логотипу, послуг або подій.",
      },
      {
        icon: "safety",
        title: "Безпека та дані",
        text: "Запити на виправлення, приховування або видалення персональної інформації.",
      },
    ],
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
    badge: "Support",
    title: "Kolo Support",
    intro:
      "We can help with account access, business profiles, contact details, account deletion, and app questions.",
    emailLabel: "Email support",
    response: "We usually respond within 1-2 business days.",
    sections: [
      {
        icon: "account",
        title: "Account and Sign-In",
        text: "Help with Google Sign-In, Sign in with Apple, email sign-in, or account deletion.",
      },
      {
        icon: "business",
        title: "Business Profiles",
        text: "Questions about adding a business, editing descriptions, contacts, logos, services, or events.",
      },
      {
        icon: "safety",
        title: "Safety and Data",
        text: "Requests to correct, hide, or delete personal information.",
      },
    ],
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
    <section className="container max-w-5xl py-12 md:py-16">
      <Badge variant="outline" className="bg-card text-foreground">
        {labels.badge}
      </Badge>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_340px] lg:items-start">
        <div>
          <h1 className="text-4xl font-black tracking-normal md:text-6xl">
            {labels.title}
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
            {labels.intro}
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {labels.sections.map((section) => (
              <article
                className="rounded-lg border bg-card p-5 shadow-sm"
                key={section.title}
              >
                <span className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                  <SupportIcon type={section.icon} />
                </span>
                <h2 className="mt-4 text-xl font-black">{section.title}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {section.text}
                </p>
              </article>
            ))}
          </div>
        </div>

        <aside className="rounded-lg border bg-card p-5 shadow-sm">
          <h2 className="text-xl font-black">{labels.emailLabel}</h2>
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
  );
}

function SupportIcon({ type }: { type: string }) {
  if (type === "business") {
    return <Store className="h-5 w-5" />;
  }

  if (type === "safety") {
    return <ShieldCheck className="h-5 w-5" />;
  }

  return <Smartphone className="h-5 w-5" />;
}
