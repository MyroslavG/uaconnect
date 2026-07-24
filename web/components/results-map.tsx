"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ExternalLink, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Business } from "@/lib/types";

type ResultsMapBusiness = Pick<Business, "address" | "name" | "slug">;

type ResultsMapProps = {
  businesses: ResultsMapBusiness[];
  title: string;
  labels: {
    mapPreview: string;
    noAddresses: string;
    showing: string;
    openInMaps: string;
  };
};

export function ResultsMap({ businesses, title, labels }: ResultsMapProps) {
  const businessesWithAddresses = useMemo(
    () => businesses.filter((business) => business.address.trim().length > 0),
    [businesses],
  );
  const [selectedSlug, setSelectedSlug] = useState(
    businessesWithAddresses[0]?.slug ?? "",
  );
  const selectedBusiness =
    businessesWithAddresses.find((business) => business.slug === selectedSlug) ??
    businessesWithAddresses[0];

  if (!selectedBusiness) {
    return (
      <div className="grid min-h-[520px] place-items-center bg-muted/60 p-6 text-center">
        <div>
          <MapPin className="mx-auto h-10 w-10 text-primary" />
          <p className="mt-3 text-sm font-bold">{labels.noAddresses}</p>
        </div>
      </div>
    );
  }

  const mapQuery = `${selectedBusiness.name}, ${selectedBusiness.address}`;
  const mapUrl = `https://www.google.com/maps?q=${encodeURIComponent(mapQuery)}&output=embed`;
  const externalMapUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`;

  return (
    <div>
      <iframe
        title={title}
        src={mapUrl}
        className="h-[360px] w-full border-0"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
      <div className="border-t bg-card/95 p-4">
        <p className="text-xs font-black uppercase text-primary">
          {labels.mapPreview}
        </p>
        <p className="mt-1 text-sm font-bold">
          {labels.showing}: {selectedBusiness.name}
        </p>
        <div className="mt-4 grid max-h-52 gap-2 overflow-y-auto pr-1">
          {businessesWithAddresses.map((business) => (
            <button
              key={business.slug}
              type="button"
              onClick={() => setSelectedSlug(business.slug)}
              className={`rounded-md border p-3 text-left text-sm transition hover:border-hover-blue-border hover:bg-hover-blue/35 ${
                business.slug === selectedBusiness.slug
                  ? "border-primary/30 bg-primary/10"
                  : "bg-background"
              }`}
            >
              <span className="block font-black">{business.name}</span>
              <span className="mt-1 block text-muted-foreground">
                {business.address}
              </span>
            </button>
          ))}
        </div>
        <Button asChild variant="outline" className="mt-4 w-full justify-between">
          <Link href={externalMapUrl} target="_blank">
            {labels.openInMaps}
            <ExternalLink className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
