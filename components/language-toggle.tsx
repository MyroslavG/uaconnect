"use client";

import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { copy, localeCookieName, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type LanguageToggleProps = {
  locale: Locale;
};

export function LanguageToggle({ locale }: LanguageToggleProps) {
  const router = useRouter();
  const labels = copy[locale].language;

  function setLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <div
      aria-label={labels.label}
      className="grid grid-cols-2 rounded-md border bg-background/80 p-0.5 shadow-sm"
      role="group"
    >
      {(["uk", "en"] as const).map((item) => (
        <Button
          key={item}
          aria-pressed={locale === item}
          className={cn(
            "h-8 px-2 text-xs",
            locale === item
              ? "bg-primary text-primary-foreground"
              : "bg-transparent shadow-none hover:bg-hover-blue hover:text-hover-blue-foreground",
          )}
          onClick={() => setLocale(item)}
          type="button"
          variant={locale === item ? "default" : "ghost"}
        >
          {labels[item]}
        </Button>
      ))}
    </div>
  );
}
