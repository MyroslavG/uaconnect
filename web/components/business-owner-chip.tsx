import { UserRound } from "lucide-react";

import { cn, getSafeImageUrl } from "@/lib/utils";

type BusinessOwnerChipProps = {
  avatarUrl?: string | null;
  className?: string;
  name?: string | null;
};

export function BusinessOwnerChip({
  avatarUrl,
  className,
  name,
}: BusinessOwnerChipProps) {
  const ownerName = name?.trim();

  if (!ownerName) {
    return null;
  }

  const safeAvatarUrl = getSafeImageUrl(avatarUrl);

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-2 rounded-md border bg-background/80 px-2.5 py-1.5 text-sm font-semibold text-foreground shadow-sm",
        className,
      )}
    >
      <span
        aria-label={safeAvatarUrl ? ownerName : undefined}
        className={cn(
          "grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-hover-blue text-primary ring-1 ring-border",
          safeAvatarUrl && "bg-cover bg-center bg-no-repeat",
        )}
        role={safeAvatarUrl ? "img" : undefined}
        style={
          safeAvatarUrl
            ? { backgroundImage: `url(${JSON.stringify(safeAvatarUrl)})` }
            : undefined
        }
      >
        {safeAvatarUrl ? null : <UserRound className="h-3.5 w-3.5" />}
      </span>
      <span className="truncate">{ownerName}</span>
    </span>
  );
}
