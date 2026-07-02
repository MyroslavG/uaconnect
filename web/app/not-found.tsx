import Link from "next/link";

import { Button } from "@/components/ui/button";
import { copy } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";

export default async function NotFound() {
  const locale = await getRequestLocale();
  const labels = copy[locale].notFound;

  return (
    <div className="container flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
      <p className="text-sm font-semibold uppercase text-primary">
        {labels.kicker}
      </p>
      <h1 className="mt-3 text-4xl font-black tracking-normal">
        {labels.title}
      </h1>
      <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">
        {labels.text}
      </p>
      <Button asChild className="mt-6">
        <Link href="/">{labels.cta}</Link>
      </Button>
    </div>
  );
}
