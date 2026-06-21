import Link from "next/link";
import { ExternalLink, MapPin, Phone } from "lucide-react";

import { BusinessLogo } from "@/components/business-logo";
import { BusinessOwnerChip } from "@/components/business-owner-chip";
import type { Business } from "@/lib/types";
import { formatExternalUrl, formatLocationParts } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Locale } from "@/lib/i18n";

type BusinessCardProps = {
  business: Business;
  priority?: boolean;
  locale: Locale;
};

export function BusinessCard({
  business,
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

  return (
    <Card className="group overflow-hidden border-white/70 bg-card/95 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-lift dark:border-white/10">
      <Link
        href={`/business/${business.slug}`}
        className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-label={business.name}
      >
        <CardContent className="grid gap-4 p-4">
          <div className="flex items-start justify-between gap-3">
            <Badge variant="accent">{business.category}</Badge>
            <BusinessLogo
              className="h-11 w-11 transition group-hover:border-hover-blue-border group-hover:bg-hover-blue/40"
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
              {locationLabel ? (
                <span className="inline-flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5" />
                  {locationLabel}
                </span>
              ) : null}
            </p>
            <BusinessOwnerChip
              avatarUrl={business.ownerAvatarUrl}
              className="mt-3"
              name={business.ownerName}
            />
            <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
              {business.description}
            </p>
          </div>
          {hasContactPreview ? (
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
        </CardContent>
      </Link>
    </Card>
  );
}
