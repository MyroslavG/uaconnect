import Link from "next/link";
import { Bookmark, Check } from "lucide-react";

import { saveSearch } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";

export function SaveSearchButton({
  canSave,
  categorySlug,
  city,
  isSaved,
  localOnly,
  query,
}: {
  canSave: boolean;
  categorySlug?: string;
  city?: string;
  isSaved: boolean;
  localOnly: boolean;
  query?: string;
}) {
  const labels = {
    save: "Стежити за пошуком",
    saved: "Ви стежите за пошуком",
    signIn: "Увійдіть, щоб стежити",
  };
  const label = canSave ? (isSaved ? labels.saved : labels.save) : labels.signIn;

  if (!canSave) {
    return (
      <Button asChild className="rounded-full" size="sm" variant="outline">
        <Link href="/dashboard">
          <Bookmark className="h-3.5 w-3.5" strokeWidth={2.6} />
          {label}
        </Link>
      </Button>
    );
  }

  if (isSaved) {
    return (
      <Button className="rounded-full" disabled size="sm" variant="secondary">
        <Check className="h-3.5 w-3.5" strokeWidth={2.8} />
        {label}
      </Button>
    );
  }

  return (
    <form action={saveSearch}>
      <input name="query" type="hidden" value={query?.trim() ?? ""} />
      <input name="city" type="hidden" value={city?.trim() ?? ""} />
      <input name="categorySlug" type="hidden" value={categorySlug?.trim() ?? ""} />
      <input name="localOnly" type="hidden" value={localOnly ? "1" : "0"} />
      <Button className="rounded-full" size="sm" type="submit" variant="outline">
        <Bookmark className="h-3.5 w-3.5" strokeWidth={2.6} />
        {label}
      </Button>
    </form>
  );
}
