"use client";

import { useState, type MouseEvent } from "react";
import { Check, Share2 } from "lucide-react";

import type { Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const PUBLIC_SHARE_URL = (
  process.env.NEXT_PUBLIC_SHARE_URL ?? "https://koloapp.ca"
).replace(/\/+$/, "");

type ShareBusinessButtonProps = {
  businessName: string;
  className?: string;
  href: string;
  locale: Locale;
  variant?: "icon" | "full";
};

export function ShareBusinessButton({
  businessName,
  className,
  href,
  locale,
  variant = "icon",
}: ShareBusinessButtonProps) {
  const [copied, setCopied] = useState(false);
  const labels =
    locale === "uk"
      ? {
          copied: "Посилання скопійовано",
          share: "Поділитися",
          text: `Подивись ${businessName} у Kolo`,
        }
      : {
          copied: "Link copied",
          share: "Share",
          text: `Check out ${businessName} on Kolo`,
        };
  const label = copied ? labels.copied : labels.share;

  async function handleShare(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = new URL(href, PUBLIC_SHARE_URL).toString();

    try {
      if (navigator.share) {
        await navigator.share({
          text: labels.text,
          title: businessName,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      }
    }
  }

  return (
    <button
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center rounded-lg border border-border bg-background/95 text-sm font-black text-foreground shadow-sm transition hover:border-primary hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        variant === "icon" ? "h-10 w-10" : "h-11 gap-2 px-4",
        copied ? "border-primary bg-primary/10 text-primary" : null,
        className,
      )}
      onClick={handleShare}
      title={label}
      type="button"
    >
      {copied ? (
        <Check className="h-4 w-4" strokeWidth={2.7} />
      ) : (
        <Share2 className="h-4 w-4" strokeWidth={2.7} />
      )}
      {variant === "full" ? <span>{label}</span> : null}
    </button>
  );
}
