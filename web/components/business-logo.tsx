import { Building2 } from "lucide-react";

import { cn, getSafeImageUrl } from "@/lib/utils";

type BusinessLogoProps = {
  className?: string;
  iconClassName?: string;
  logoUrl?: string | null;
  name: string;
};

export function BusinessLogo({
  className,
  iconClassName,
  logoUrl,
  name,
}: BusinessLogoProps) {
  const safeLogoUrl = getSafeImageUrl(logoUrl);

  return (
    <span
      aria-label={safeLogoUrl ? `${name} logo` : undefined}
      className={cn(
        "grid shrink-0 place-items-center overflow-hidden rounded-md bg-background/80 text-primary shadow-sm ring-1 ring-border",
        safeLogoUrl && "bg-cover bg-center bg-no-repeat",
        className,
      )}
      role={safeLogoUrl ? "img" : undefined}
      style={
        safeLogoUrl
          ? { backgroundImage: `url(${JSON.stringify(safeLogoUrl)})` }
          : undefined
      }
    >
      {safeLogoUrl ? null : (
        <Building2 className={cn("h-5 w-5", iconClassName)} />
      )}
    </span>
  );
}
