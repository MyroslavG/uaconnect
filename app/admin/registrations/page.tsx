import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, UserRoundX, XCircle } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { AdminBusinessTools } from "@/components/admin-business-tools";
import { AdminRegistrationReviewForm } from "@/components/admin-registration-review-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
type BusinessChange = {
  after: string;
  before: string;
  label: string;
};

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
  let businessesByRegistrationId = new Map<string, BusinessRow>();
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
        .order("updated_at", { ascending: false }),
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

    if (registrations.length > 0) {
      const { data: existingBusinesses, error: existingBusinessesError } =
        await supabase
          .from("businesses")
          .select("*")
          .in(
            "registration_id",
            registrations.map((registration) => registration.id),
          );

      businessesByRegistrationId = new Map(
        (existingBusinesses ?? [])
          .filter((business) => business.registration_id)
          .map((business) => [business.registration_id as string, business]),
      );
      errorMessage = errorMessage || existingBusinessesError?.message || "";
    }
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
                  existingBusiness={businessesByRegistrationId.get(
                    registration.id,
                  )}
                  categories={localizedCategories}
                  locale={locale}
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
  categories,
  existingBusiness,
  locale,
  registration,
  labels,
}: {
  categories: { name: string; slug: string }[];
  existingBusiness?: BusinessRow;
  locale: Locale;
  registration: Registration;
  labels: Record<string, string>;
}) {
  const reviewLabels = getReviewLabels(locale);
  const changes = getBusinessChanges(
    registration,
    existingBusiness,
    labels,
    categories,
    reviewLabels,
  );

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
          {registration.status === "pending" && existingBusiness ? (
            <ChangesPanel changes={changes} labels={reviewLabels} />
          ) : null}
        </div>

        {registration.status === "pending" ? (
          <AdminRegistrationReviewForm
            labels={{
              approve: labels.approve,
              approving: reviewLabels.approving,
              reject: labels.reject,
              rejecting: reviewLabels.rejecting,
              reviewNote: labels.reviewNote,
            }}
            registrationId={registration.id}
            reviewNote={registration.review_note}
          />
        ) : (
          <ReviewedPanel registration={registration} labels={labels} />
        )}
      </CardContent>
    </Card>
  );
}

function ChangesPanel({
  changes,
  labels,
}: {
  changes: BusinessChange[];
  labels: ReturnType<typeof getReviewLabels>;
}) {
  return (
    <div className="mt-5 rounded-lg border bg-background/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-black">{labels.changesTitle}</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {labels.changesIntro}
          </p>
        </div>
        <Badge variant="outline" className="border-hover-blue-border bg-hover-blue">
          {changes.length}
        </Badge>
      </div>
      {changes.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {changes.map((change) => (
            <div key={change.label} className="rounded-md border bg-card p-3">
              <p className="text-sm font-black">{change.label}</p>
              <div className="mt-2 grid gap-2 text-sm md:grid-cols-2">
                <div className="rounded-md bg-muted/70 p-3">
                  <p className="text-xs font-bold uppercase text-muted-foreground">
                    {labels.changedFrom}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-muted-foreground">
                    {change.before || labels.emptyValue}
                  </p>
                </div>
                <div className="rounded-md bg-primary/10 p-3">
                  <p className="text-xs font-bold uppercase text-primary">
                    {labels.changedTo}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words">
                    {change.after || labels.emptyValue}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 rounded-md bg-muted/70 p-3 text-sm text-muted-foreground">
          {labels.noChanges}
        </p>
      )}
    </div>
  );
}

function getBusinessChanges(
  registration: Registration,
  existingBusiness: BusinessRow | undefined,
  labels: Record<string, string>,
  categories: { name: string; slug: string }[],
  reviewLabels: ReturnType<typeof getReviewLabels>,
) {
  if (!existingBusiness) {
    return [];
  }

  const categoryName = (slug: string) =>
    categories.find((category) => category.slug === slug)?.name ?? slug;
  const fields = [
    {
      label: reviewLabels.fieldName,
      before: existingBusiness.name,
      after: registration.business_name,
    },
    {
      label: reviewLabels.fieldCategory,
      before: categoryName(existingBusiness.category_slug),
      after: categoryName(registration.category_slug),
    },
    {
      label: reviewLabels.fieldCity,
      before: existingBusiness.city,
      after: registration.city,
    },
    {
      label: reviewLabels.fieldAddress,
      before: existingBusiness.address,
      after: registration.address ?? labels.noAddress,
    },
    {
      label: reviewLabels.fieldPhone,
      before: existingBusiness.phone ?? labels.noPhone,
      after: registration.phone ?? labels.noPhone,
    },
    {
      label: reviewLabels.fieldWebsite,
      before: existingBusiness.website ?? labels.noWebsite,
      after: registration.website ?? labels.noWebsite,
    },
    {
      label: reviewLabels.fieldInstagram,
      before: existingBusiness.instagram ?? labels.noInstagram,
      after: registration.instagram ?? labels.noInstagram,
    },
    {
      label: reviewLabels.fieldDescription,
      before: existingBusiness.description,
      after: registration.description,
    },
    {
      label: reviewLabels.fieldLogo,
      before: existingBusiness.logo_url ? reviewLabels.hasLogo : reviewLabels.noLogo,
      after: registration.logo_url ? reviewLabels.hasLogo : reviewLabels.noLogo,
      compareBefore: existingBusiness.logo_url ?? "",
      compareAfter: registration.logo_url ?? "",
    },
  ];

  return fields.filter(
    (field) =>
      normalizeChangeValue(field.compareBefore ?? field.before) !==
      normalizeChangeValue(field.compareAfter ?? field.after),
  );
}

function normalizeChangeValue(value: string | null | undefined) {
  return (value ?? "").trim().replace(/\s+/g, " ").toLowerCase();
}

function getReviewLabels(locale: Locale) {
  if (locale === "uk") {
    return {
      approving: "Схвалюємо...",
      rejecting: "Відхиляємо...",
      changesTitle: "Зміни на перевірку",
      changesIntro: "Порівняння з останньою опублікованою версією.",
      changedFrom: "Було",
      changedTo: "Стало",
      noChanges: "Видимих змін не знайдено.",
      emptyValue: "Не вказано",
      fieldName: "Назва",
      fieldCategory: "Категорія",
      fieldCity: "Локація",
      fieldAddress: "Адреса",
      fieldPhone: "Телефон",
      fieldWebsite: "Сайт",
      fieldInstagram: "Instagram",
      fieldDescription: "Опис",
      fieldLogo: "Логотип",
      hasLogo: "Є логотип",
      noLogo: "Немає логотипу",
    };
  }

  return {
    approving: "Approving...",
    rejecting: "Rejecting...",
    changesTitle: "Changes to review",
    changesIntro: "Compared with the last published version.",
    changedFrom: "Before",
    changedTo: "After",
    noChanges: "No visible changes found.",
    emptyValue: "Not provided",
    fieldName: "Name",
    fieldCategory: "Category",
    fieldCity: "Location",
    fieldAddress: "Address",
    fieldPhone: "Phone",
    fieldWebsite: "Website",
    fieldInstagram: "Instagram",
    fieldDescription: "Description",
    fieldLogo: "Logo",
    hasLogo: "Logo present",
    noLogo: "No logo",
  };
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
