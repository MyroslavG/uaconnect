import Link from "next/link";
import { Bookmark } from "lucide-react";

import { toggleSavedBusiness } from "@/app/dashboard/actions";
import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type SaveBusinessButtonProps = {
  businessId: string;
  canSave: boolean;
  className?: string;
  isSaved?: boolean;
  locale: Locale;
  slug: string;
  variant?: "icon" | "full";
};

export function SaveBusinessButton({
  businessId,
  canSave,
  className,
  isSaved = false,
  locale,
  slug,
  variant = "icon",
}: SaveBusinessButtonProps) {
  const labels = {
    save: locale === "uk" ? "Зберегти" : "Save",
    saved: locale === "uk" ? "Збережено" : "Saved",
    signIn: locale === "uk" ? "Увійдіть, щоб зберегти" : "Sign in to save",
  };
  const label = canSave ? (isSaved ? labels.saved : labels.save) : labels.signIn;
  const buttonClassName = cn(
    "inline-flex items-center justify-center rounded-lg border bg-background/95 text-sm font-black text-foreground shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    variant === "icon" ? "h-10 w-10" : "h-11 gap-2 px-4",
    isSaved ? "border-primary bg-primary/10 text-primary" : "border-border",
    className,
  );

  if (!canSave) {
    return (
      <Link
        aria-label={label}
        className={buttonClassName}
        href="/dashboard"
        title={label}
      >
        <Bookmark
          className="h-4 w-4"
          fill={isSaved ? "currentColor" : "none"}
          strokeWidth={2.6}
        />
        {variant === "full" ? <span>{label}</span> : null}
      </Link>
    );
  }

  return (
    <form action={toggleSavedBusiness}>
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="intent" value={isSaved ? "remove" : "save"} />
      <input type="hidden" name="slug" value={slug} />
      <button
        aria-label={label}
        aria-pressed={isSaved}
        className={buttonClassName}
        title={label}
        type="submit"
      >
        <Bookmark
          className="h-4 w-4"
          fill={isSaved ? "currentColor" : "none"}
          strokeWidth={2.6}
        />
        {variant === "full" ? <span>{label}</span> : null}
      </button>
    </form>
  );
}
