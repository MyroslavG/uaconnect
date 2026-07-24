import Link from "next/link";
import { ExternalLink, Globe2, Lock, MapPin, Phone } from "lucide-react";

import { BusinessLogo } from "@/components/business-logo";
import { SaveBusinessButton } from "@/components/save-business-button";
import { ShareBusinessButton } from "@/components/share-business-button";
import type { Business } from "@/lib/types";
import { formatExternalUrl, formatLocationParts } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n";

type BusinessCardProps = {
  business: Business;
  canViewContacts: boolean;
  priority?: boolean;
  locale: Locale;
};

export function BusinessCard({
  business,
  canViewContacts,
  locale,
  priority = false,
}: BusinessCardProps) {
  const hasContactPreview = Boolean(business.phone || business.website);
  const distanceLabel =
    typeof business.distanceInKm === "number"
      ? `${business.distanceInKm} km`
      : "";
  const locationLabel = formatLocationParts(
    business.neighborhood,
    business.city,
  );
  const servesAllCanadaLabel =
    locale === "uk" ? "Онлайн · по всій Канаді" : "Online · Canada-wide";
  const contactLockedLabel =
    locale === "uk"
      ? "Увійдіть, щоб побачити контакти"
      : "Sign in to view contact details";
  const descriptionPreview = truncateText(business.description, 150);

  return (
    <Card className="group relative overflow-hidden border-border bg-card shadow-sm transition duration-300 hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-soft">
      <Link
        href={`/business/${business.slug}`}
        className="absolute inset-0 z-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={business.name}
      />
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        <ShareBusinessButton
          businessName={business.name}
          href={`/business/${business.slug}`}
          locale={locale}
        />
        <SaveBusinessButton
          businessId={business.id}
          canSave={canViewContacts}
          isSaved={business.isSaved}
          locale={locale}
          slug={business.slug}
        />
      </div>
      <CardContent className="pointer-events-none relative z-10 grid gap-4 p-4 pr-28">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="accent">{business.category}</Badge>
          <BusinessLogo
            className="h-11 w-11 transition group-hover:border-hover-blue-border group-hover:bg-hover-blue/40"
            loading={priority ? "eager" : "lazy"}
            logoUrl={business.logoUrl}
            name={business.name}
          />
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <span className="line-clamp-2 text-2xl font-black leading-tight transition group-hover:text-hover-blue-foreground dark:group-hover:text-hover-blue-foreground">
              {business.name}
            </span>
            {distanceLabel ? (
              <span className="shrink-0 rounded-md bg-hover-blue px-2 py-1 text-xs font-bold text-hover-blue-foreground">
                {distanceLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            {business.servesAllCanada ? (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-secondary px-2 py-1 font-semibold text-foreground">
                <Globe2 className="h-3.5 w-3.5" />
                {servesAllCanadaLabel}
              </span>
            ) : null}
            {locationLabel ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5" />
                {locationLabel}
              </span>
            ) : null}
          </p>
          <p
            className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground"
            title={business.description}
          >
            {descriptionPreview}
          </p>
        </div>
        {hasContactPreview && canViewContacts ? (
          <div className="grid gap-2 border-t pt-3 text-sm text-muted-foreground">
            {business.phone ? (
              <span className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-primary" />
                {business.phone}
              </span>
            ) : null}
            {business.website ? (
              <span className="flex items-center gap-2 truncate">
                <ExternalLink className="h-4 w-4 text-primary" />
                {formatExternalUrl(business.website)}
              </span>
            ) : null}
          </div>
        ) : null}
        {hasContactPreview && !canViewContacts ? (
          <div className="flex items-center gap-2 border-t pt-3 text-sm font-bold text-muted-foreground">
            <Lock className="h-4 w-4 text-primary" />
            {contactLockedLabel}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function truncateText(text: string, maxLength: number) {
  const trimmedText = text.trim();

  if (trimmedText.length <= maxLength) {
    return trimmedText;
  }

  return `${trimmedText.slice(0, maxLength).trimEnd()}...`;
}
