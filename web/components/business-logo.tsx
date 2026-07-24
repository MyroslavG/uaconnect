"use client";

import { useEffect, useState } from "react";

import { cn, getSafeImageUrl } from "@/lib/utils";

type BusinessLogoProps = {
  className?: string;
  logoUrl?: string | null;
  name: string;
};

export function BusinessLogo({
  className,
  logoUrl,
  name,
}: BusinessLogoProps) {
  const safeLogoUrl = getSafeImageUrl(logoUrl);
  const [hasImageError, setHasImageError] = useState(false);
  const canShowLogo = Boolean(safeLogoUrl && !hasImageError);

  useEffect(() => {
    setHasImageError(false);
  }, [safeLogoUrl]);

  if (!canShowLogo) {
    return null;
  }

  return (
    <span
      aria-label={`${name} logo`}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md bg-background/80 text-primary shadow-sm ring-1 ring-border",
        className,
      )}
      role="img"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt=""
        className="h-full w-full object-contain"
        onError={() => setHasImageError(true)}
        src={safeLogoUrl}
      />
    </span>
  );
}
