import Link from "next/link";
import {
  ArrowRight,
  Building2,
  ExternalLink,
  MapPin,
  Phone,
} from "lucide-react";

import type { Business } from "@/lib/types";
import { formatExternalUrl } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { copy, type Locale } from "@/lib/i18n";

type BusinessCardProps = {
  business: Business;
  priority?: boolean;
  locale: Locale;
};

export function BusinessCard({
  business,
  locale,
}: BusinessCardProps) {
  const labels = copy[locale].business;
  const hasContactPreview = Boolean(business.phone || business.website);
  const distanceLabel =
    typeof business.distanceInKm === "number"
      ? `${business.distanceInKm} km`
      : "";

  return (
    <Card className="group overflow-hidden border-white/70 bg-card/95 shadow-sm backdrop-blur transition duration-300 hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-lift dark:border-white/10">
      <CardContent className="grid gap-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <Badge variant="accent">{business.category}</Badge>
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-background/80 text-primary shadow-sm ring-1 ring-border transition group-hover:border-hover-blue-border group-hover:bg-hover-blue/40">
            <Building2 className="h-5 w-5" />
          </span>
        </div>
        <div>
          <div className="flex items-start justify-between gap-3">
            <Link
              href={`/business/${business.slug}`}
              className="line-clamp-2 text-2xl font-black leading-tight hover:text-hover-blue-foreground dark:hover:text-hover-blue-foreground"
            >
              {business.name}
            </Link>
            {distanceLabel ? (
              <span className="shrink-0 rounded-md bg-hover-blue px-2 py-1 text-xs font-bold text-hover-blue-foreground">
                {distanceLabel}
              </span>
            ) : null}
          </div>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {business.neighborhood}, {business.city}
            </span>
          </p>
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
        <Button asChild variant="outline" className="justify-between">
          <Link href={`/business/${business.slug}`}>
            {labels.openProfile}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
