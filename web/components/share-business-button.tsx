import { ShareLinkButton } from "@/components/share-link-button";
import type { Locale } from "@/lib/i18n";

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
  const text =
    locale === "uk"
      ? `Подивись ${businessName} у Kolo`
      : `Check out ${businessName} on Kolo`;

  return (
    <ShareLinkButton
      className={className}
      href={href}
      locale={locale}
      text={text}
      title={businessName}
      variant={variant}
    />
  );
}
