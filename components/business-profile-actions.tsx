import Link from "next/link";

import { Button } from "@/components/ui/button";
import { copy, type Locale } from "@/lib/i18n";

type BusinessProfileActionsProps = {
  dashboardHref: string;
  locale: Locale;
};

export function BusinessProfileActions({
  dashboardHref,
  locale,
}: BusinessProfileActionsProps) {
  const labels = copy[locale].claim;

  return (
    <Button asChild className="w-full justify-center">
      <Link href={dashboardHref}>{labels.claim}</Link>
    </Button>
  );
}
