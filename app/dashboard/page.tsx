import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ClipboardList, LockKeyhole } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { DashboardBusinessEditor } from "@/components/dashboard-business-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories, cities } from "@/lib/data";
import { localizeCategories, localizeCities } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import type { Database } from "@/lib/supabase/database.types";
import { getCurrentUser } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Track UAConnect business registration submissions.",
};

type Registration =
  Database["public"]["Tables"]["business_registrations"]["Row"];

const text = {
  uk: {
    kicker: "Кабінет",
    title: "Ваші бізнеси",
    intro: "Редагуйте інформацію про бізнеси, які ви надіслали на перевірку.",
    signInTitle: "Увійдіть, щоб побачити заявки",
    signIn: "Увійти через Google",
    setup: "Supabase ще не налаштовано.",
    empty: "Поки немає заявок.",
  },
  en: {
    kicker: "Dashboard",
    title: "Your businesses",
    intro: "Edit details for businesses you have submitted for review.",
    signInTitle: "Sign in to see submissions",
    signIn: "Sign in with Google",
    setup: "Supabase is not configured yet.",
    empty: "No submissions yet.",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const user = await getCurrentUser();
  const localizedCategories = localizeCategories(categories, locale);
  const localizedCities = localizeCities(cities, locale);
  let registrations: Registration[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("business_registrations")
      .select("*")
      .eq("owner_id", user.id)
      .order("created_at", { ascending: false });

    registrations = data ?? [];
    errorMessage = error?.message ?? "";
  }

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-8 max-w-3xl">
        <div>
          <Badge variant="accent">{labels.kicker}</Badge>
          <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
            {labels.title}
          </h1>
          <p className="mt-3 text-muted-foreground">{labels.intro}</p>
        </div>
      </div>

      {!isSupabaseConfigured() ? (
        <EmptyState icon={<ClipboardList />} title={labels.setup} />
      ) : !user ? (
        <Card className="border-white/70 bg-card/95 dark:border-white/10">
          <CardContent className="grid gap-5 p-8 text-center">
            <LockKeyhole className="mx-auto h-12 w-12 text-primary" />
            <h2 className="text-2xl font-black">{labels.signInTitle}</h2>
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/dashboard" />
              <Button type="submit" size="lg">
                {labels.signIn}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : errorMessage ? (
        <EmptyState icon={<ClipboardList />} title={errorMessage} />
      ) : registrations.length === 0 ? (
        <EmptyState icon={<ClipboardList />} title={labels.empty} />
      ) : (
        <div className="grid gap-4">
          {registrations.map((registration) => (
            <DashboardBusinessEditor
              key={registration.id}
              registration={registration}
              categories={localizedCategories}
              cities={localizedCities}
              locale={locale}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptyState({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border bg-card p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
        <p className="text-lg font-bold">{title}</p>
      </div>
    </div>
  );
}
