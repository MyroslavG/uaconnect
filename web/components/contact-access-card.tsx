import { Lock } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const labels = {
  uk: {
    action: "Увійти через Google",
    contactText:
      "Телефон, сайт, Instagram та адресу бізнесу видно лише після входу.",
    contactTitle: "Увійдіть, щоб побачити контакти",
    mapText: "Адреси та карта доступні після входу.",
    mapTitle: "Увійдіть, щоб побачити локації",
  },
  en: {
    action: "Sign in with Google",
    contactText:
      "Phone, website, Instagram, and business address are visible after sign-in.",
    contactTitle: "Sign in to view contacts",
    mapText: "Addresses and the map are available after sign-in.",
    mapTitle: "Sign in to view locations",
  },
} satisfies Record<Locale, Record<string, string>>;

type ContactAccessCardProps = {
  className?: string;
  locale: Locale;
  nextPath: string;
  tone?: "contact" | "map";
};

export function ContactAccessCard({
  className,
  locale,
  nextPath,
  tone = "contact",
}: ContactAccessCardProps) {
  const copy = labels[locale];
  const title = tone === "map" ? copy.mapTitle : copy.contactTitle;
  const text = tone === "map" ? copy.mapText : copy.contactText;

  return (
    <div
      className={cn(
        "rounded-lg border bg-background p-4 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-black">{title}</h3>
          <p className="mt-1 leading-6 text-muted-foreground">{text}</p>
        </div>
      </div>
      <form action={signInWithGoogle} className="mt-4">
        <input name="next" type="hidden" value={nextPath} />
        <Button className="w-full" type="submit">
          {copy.action}
        </Button>
      </form>
    </div>
  );
}
