import { Coffee } from "lucide-react";

import type { Locale } from "@/lib/i18n";

const supportUrl =
  process.env.NEXT_PUBLIC_BUY_ME_A_COFFEE_URL ??
  "https://buymeacoffee.com/koloapp";

const labels = {
  uk: "Підтримати",
  en: "Support",
} as const;

type SupportWidgetProps = {
  locale: Locale;
};

export function SupportWidget({ locale }: SupportWidgetProps) {
  return (
    <a
      aria-label={`${labels[locale]} Kolo`}
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-4 z-[80] inline-flex h-14 items-center gap-2.5 rounded-full border border-border/70 bg-primary px-5 text-base font-black text-primary-foreground shadow-2xl shadow-foreground/15 transition-all hover:-translate-y-0.5 hover:bg-foreground hover:text-background hover:shadow-foreground/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:border-white/10 dark:shadow-black/40"
      href={supportUrl}
      rel="noreferrer"
      target="_blank"
    >
      <Coffee className="h-5 w-5" />
      <span>{labels[locale]}</span>
    </a>
  );
}
