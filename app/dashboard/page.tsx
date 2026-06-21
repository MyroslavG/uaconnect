import type { Metadata } from "next";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CheckCircle2,
  ClipboardList,
  Clock3,
  LockKeyhole,
  UserRound,
} from "lucide-react";

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
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

type OwnerProfile = {
  avatarUrl: string;
  email: string;
  name: string;
};

const text = {
  uk: {
    kicker: "Кабінет",
    title: "Ваші бізнеси",
    intro: "Редагуйте інформацію про бізнеси, які ви надіслали на перевірку.",
    signInTitle: "Увійдіть, щоб побачити заявки",
    signIn: "Увійти через Google",
    setup: "Supabase ще не налаштовано.",
    empty: "Поки немає заявок.",
    greeting: "Вітаємо",
    ownerLabel: "Профіль власника",
    total: "Бізнесів",
    totalShort: "Усього",
    approved: "Опубліковано",
    approvedShort: "Публічні",
    pending: "На перевірці",
    pendingShort: "Перевірка",
    fallbackName: "Власник бізнесу",
  },
  en: {
    kicker: "Dashboard",
    title: "Your businesses",
    intro: "Edit details for businesses you have submitted for review.",
    signInTitle: "Sign in to see submissions",
    signIn: "Sign in with Google",
    setup: "Supabase is not configured yet.",
    empty: "No submissions yet.",
    greeting: "Welcome",
    ownerLabel: "Owner profile",
    total: "Businesses",
    totalShort: "Total",
    approved: "Published",
    approvedShort: "Public",
    pending: "Pending",
    pendingShort: "Pending",
    fallbackName: "Business owner",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function DashboardPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const user = await getCurrentUser();
  const localizedCategories = localizeCategories(categories, locale);
  const localizedCities = localizeCities(cities, locale);
  let registrations: Registration[] = [];
  let publishedBusinessesByRegistrationId = new Map<string, BusinessRow>();
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

    if (registrations.length > 0) {
      const { data: businesses } = await supabase
        .from("businesses")
        .select("*")
        .in(
          "registration_id",
          registrations.map((registration) => registration.id),
        );

      publishedBusinessesByRegistrationId = new Map(
        (businesses ?? [])
          .filter((business) => business.registration_id)
          .map((business) => [business.registration_id as string, business]),
      );
    }
  }

  const ownerProfile = user
    ? getOwnerProfile(user, labels.fallbackName)
    : null;

  return (
    <section className="container py-10 md:py-14">
      {ownerProfile ? (
        <DashboardHero
          labels={labels}
          owner={ownerProfile}
          registrations={registrations}
        />
      ) : (
        <div className="mb-8 max-w-3xl">
          <Badge variant="accent">{labels.kicker}</Badge>
          <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
            {labels.title}
          </h1>
          <p className="mt-3 text-muted-foreground">{labels.intro}</p>
        </div>
      )}

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
              publishedBusiness={publishedBusinessesByRegistrationId.get(
                registration.id,
              )}
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

function getOwnerProfile(
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>,
  fallbackName: string,
): OwnerProfile {
  const fullName = user.user_metadata.full_name;
  const avatarUrl = user.user_metadata.avatar_url;

  return {
    avatarUrl: typeof avatarUrl === "string" ? avatarUrl : "",
    email: user.email ?? "",
    name:
      typeof fullName === "string" && fullName.trim()
        ? fullName
        : user.email ?? fallbackName,
  };
}

function DashboardHero({
  labels,
  owner,
  registrations,
}: {
  labels: Record<string, string>;
  owner: OwnerProfile;
  registrations: Registration[];
}) {
  const approvedCount = registrations.filter(
    (registration) => registration.status === "approved",
  ).length;
  const pendingCount = registrations.filter(
    (registration) => registration.status === "pending",
  ).length;

  return (
    <div className="mb-8 overflow-hidden rounded-lg border bg-card shadow-sm">
      <div className="relative bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--accent)/0.16)_45%,hsl(var(--background)))] p-5 md:p-7">
        <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_39px,hsl(var(--foreground)/0.045)_40px),linear-gradient(0deg,transparent_0,transparent_39px,hsl(var(--foreground)/0.045)_40px)] bg-[size:40px_40px]" />
        <div className="relative grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="flex items-start gap-4">
            <UserAvatar owner={owner} />
            <div>
              <Badge variant="accent">{labels.ownerLabel}</Badge>
              <h1 className="mt-3 text-4xl font-black tracking-normal md:text-5xl">
                {labels.greeting}, {owner.name}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {owner.email}
              </p>
              <p className="mt-3 max-w-2xl text-muted-foreground">
                {labels.intro}
              </p>
            </div>
          </div>
          <div className="grid gap-2 sm:min-w-96 sm:grid-cols-3">
            <StatCard
              icon={<BriefcaseBusiness />}
              label={labels.total}
              shortLabel={labels.totalShort}
              value={registrations.length}
            />
            <StatCard
              icon={<CheckCircle2 />}
              label={labels.approved}
              shortLabel={labels.approvedShort}
              value={approvedCount}
            />
            <StatCard
              icon={<Clock3 />}
              label={labels.pending}
              shortLabel={labels.pendingShort}
              value={pendingCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserAvatar({ owner }: { owner: OwnerProfile }) {
  const initials = owner.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 bg-cover bg-center text-lg font-black text-primary ring-1 ring-primary/15"
      style={
        owner.avatarUrl
          ? { backgroundImage: `url(${JSON.stringify(owner.avatarUrl)})` }
          : undefined
      }
    >
      {owner.avatarUrl ? null : initials || <UserRound className="h-7 w-7" />}
    </span>
  );
}

function StatCard({
  icon,
  label,
  shortLabel,
  value,
}: {
  icon: ReactNode;
  label: string;
  shortLabel: string;
  value: number;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-lg border bg-background/80 p-3 shadow-sm sm:block">
      <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:h-4 [&_svg]:w-4 sm:mb-2">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-black leading-none">{value}</p>
        <p className="mt-1 text-[11px] font-bold uppercase leading-4 text-muted-foreground">
          <span className="sm:hidden">{shortLabel}</span>
          <span className="hidden sm:inline">{label}</span>
        </p>
      </div>
    </div>
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
