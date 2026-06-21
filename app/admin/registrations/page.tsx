import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, UserRoundX, XCircle } from "lucide-react";

import {
  approveRegistration,
  rejectRegistration,
} from "@/app/admin/registrations/actions";
import { signInWithGoogle } from "@/app/auth/actions";
import { AdminBusinessTools } from "@/components/admin-business-tools";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { categories, cities } from "@/lib/data";
import { localizeCategories, localizeCities } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type {
  BusinessRegistrationStatus,
  Database,
} from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Business verification",
  description: "Review and approve UAConnect business registrations.",
};

type Registration =
  Database["public"]["Tables"]["business_registrations"]["Row"];
type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

const text = {
  uk: {
    kicker: "Адмін",
    title: "Перевірка бізнесів",
    intro:
      "Переглядайте заявки, перевіряйте власність вручну та схвалюйте тільки підтверджені бізнеси.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до адмін-перевірки.",
    setup: "Supabase ще не налаштовано.",
    empty: "Заявок поки немає.",
    submissionsTitle: "Заявки на перевірку",
    reviewNote: "Нотатка перевірки",
    approve: "Схвалити",
    reject: "Відхилити",
    pending: "На перевірці",
    approved: "Схвалено",
    rejected: "Відхилено",
    completedTitle: "Заявку вже розглянуто",
    completedText: "Цей бізнес більше не потребує дії.",
    noReviewNote: "Нотатку не додано",
    reviewedAt: "Дата розгляду",
    details: "Деталі",
    category: "Категорія",
    submitted: "Надіслано",
    contact: "Контакт",
    noPhone: "Телефон не вказано",
    noWebsite: "Сайт не вказано",
    noInstagram: "Instagram не вказано",
    noAddress: "Адресу не вказано",
  },
  en: {
    kicker: "Admin",
    title: "Business verification",
    intro:
      "Review submissions, verify ownership manually, and approve only confirmed businesses.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to admin verification.",
    setup: "Supabase is not configured yet.",
    empty: "No submissions yet.",
    submissionsTitle: "Submissions to review",
    reviewNote: "Review note",
    approve: "Approve",
    reject: "Reject",
    pending: "Pending",
    approved: "Approved",
    rejected: "Rejected",
    completedTitle: "Submission already reviewed",
    completedText: "This business does not need another action.",
    noReviewNote: "No review note added",
    reviewedAt: "Reviewed at",
    details: "Details",
    category: "Category",
    submitted: "Submitted",
    contact: "Contact",
    noPhone: "No phone",
    noWebsite: "No website",
    noInstagram: "No Instagram",
    noAddress: "No address",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AdminRegistrationsPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let registrations: Registration[] = [];
  let unownedBusinesses: Pick<BusinessRow, "id" | "name" | "city">[] = [];
  let errorMessage = "";
  const localizedCategories = localizeCategories(categories, locale);
  const localizedCities = localizeCities(cities, locale);

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const [registrationsResult, businessesResult] = await Promise.all([
      supabase
        .from("business_registrations")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("businesses")
        .select("id, name, city")
        .is("owner_id", null)
        .eq("status", "published")
        .order("created_at", { ascending: false }),
    ]);

    registrations = registrationsResult.data ?? [];
    unownedBusinesses = businessesResult.data ?? [];
    errorMessage =
      registrationsResult.error?.message ?? businessesResult.error?.message ?? "";
  }

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-8 max-w-3xl">
        <Badge variant="accent">{labels.kicker}</Badge>
        <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
          {labels.title}
        </h1>
        <p className="mt-3 text-muted-foreground">{labels.intro}</p>
      </div>

      {!isSupabaseConfigured() ? (
        <StateCard icon={<ShieldCheck />} title={labels.setup} />
      ) : !user ? (
        <Card>
          <CardContent className="grid gap-5 p-8 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/admin/registrations" />
              <Button type="submit" size="lg">
                {labels.signIn}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : !isAdmin ? (
        <StateCard icon={<UserRoundX />} title={labels.noAccess} />
      ) : errorMessage ? (
        <StateCard icon={<ShieldCheck />} title={errorMessage} />
      ) : (
        <>
          <AdminBusinessTools
            categories={localizedCategories}
            cities={localizedCities}
            locale={locale}
            unownedBusinesses={unownedBusinesses}
          />

          <div className="mb-4">
            <h2 className="text-2xl font-black">{labels.submissionsTitle}</h2>
          </div>

          {registrations.length === 0 ? (
            <StateCard icon={<ShieldCheck />} title={labels.empty} />
          ) : (
            <div className="grid gap-5">
              {registrations.map((registration) => (
                <RegistrationReviewCard
                  key={registration.id}
                  registration={registration}
                  labels={labels}
                />
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}

function RegistrationReviewCard({
  registration,
  labels,
}: {
  registration: Registration;
  labels: Record<string, string>;
}) {
  return (
    <Card className="border-white/70 bg-card/95 shadow-sm dark:border-white/10">
      <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-black">{registration.business_name}</h2>
            <StatusBadge status={registration.status} labels={labels} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {[registration.city, registration.address || labels.noAddress].join(
              " · ",
            )}
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground">
            {registration.description}
          </p>

          <div className="mt-5 grid gap-3 text-sm md:grid-cols-2">
            <InfoBlock title={labels.contact}>
              <p>{registration.phone || labels.noPhone}</p>
              {registration.website ? (
                <Link
                  href={registration.website}
                  target="_blank"
                  className="text-primary underline-offset-4 hover:underline"
                >
                  {registration.website}
                </Link>
              ) : (
                <p>{labels.noWebsite}</p>
              )}
              {registration.instagram ? (
                <p>{registration.instagram}</p>
              ) : (
                <p>{labels.noInstagram}</p>
              )}
            </InfoBlock>
            <InfoBlock title={labels.details}>
              <p>
                {labels.category}: {registration.category_slug}
              </p>
              <p>
                {labels.submitted}:{" "}
                {new Date(registration.created_at).toLocaleDateString()}
              </p>
            </InfoBlock>
          </div>
        </div>

        {registration.status === "pending" ? (
          <form className="grid gap-3 rounded-lg border bg-background/70 p-4">
            <input type="hidden" name="id" value={registration.id} />
            <Label htmlFor={`review-${registration.id}`}>
              {labels.reviewNote}
            </Label>
            <Textarea
              id={`review-${registration.id}`}
              name="reviewNote"
              defaultValue={registration.review_note ?? ""}
              placeholder={labels.reviewNote}
            />
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <Button formAction={approveRegistration} type="submit">
                {labels.approve}
              </Button>
              <Button
                formAction={rejectRegistration}
                type="submit"
                variant="outline"
              >
                {labels.reject}
              </Button>
            </div>
          </form>
        ) : (
          <ReviewedPanel registration={registration} labels={labels} />
        )}
      </CardContent>
    </Card>
  );
}

function ReviewedPanel({
  registration,
  labels,
}: {
  registration: Registration;
  labels: Record<string, string>;
}) {
  const Icon = registration.status === "approved" ? CheckCircle2 : XCircle;
  const reviewedAt = registration.reviewed_at
    ? new Date(registration.reviewed_at).toLocaleDateString()
    : null;

  return (
    <aside className="grid gap-3 rounded-lg border bg-background/70 p-4">
      <div className="flex items-start gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h3 className="font-black">{labels.completedTitle}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {labels.completedText}
          </p>
        </div>
      </div>
      <div className="rounded-md bg-muted/70 p-3 text-sm leading-6">
        <p className="font-bold">{labels.reviewNote}</p>
        <p className="mt-1 text-muted-foreground">
          {registration.review_note || labels.noReviewNote}
        </p>
      </div>
      {reviewedAt ? (
        <p className="text-sm text-muted-foreground">
          {labels.reviewedAt}: {reviewedAt}
        </p>
      ) : null}
    </aside>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border bg-background/70 p-4">
      <p className="text-xs font-bold uppercase text-primary">{title}</p>
      <div className="mt-2 grid gap-1 text-muted-foreground">{children}</div>
    </div>
  );
}

function StatusBadge({
  status,
  labels,
}: {
  status: BusinessRegistrationStatus;
  labels: Record<string, string>;
}) {
  const className =
    status === "approved"
      ? "border-primary/20 bg-primary/10 text-primary"
      : status === "rejected"
        ? "border-destructive/20 bg-destructive/10 text-destructive"
        : "border-hover-blue-border bg-hover-blue text-hover-blue-foreground";

  return (
    <Badge variant="outline" className={className}>
      {labels[status]}
    </Badge>
  );
}

function StateCard({
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
