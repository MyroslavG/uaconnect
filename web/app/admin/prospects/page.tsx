import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import {
  BarChart3,
  BriefcaseBusiness,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Grid3X3,
  Mail,
  Phone,
  RadioTower,
  ShieldCheck,
  Trash2,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import {
  deleteOutreachProspect,
  updateOutreachProspect,
} from "@/app/admin/prospects/actions";
import { signInWithGoogle } from "@/app/auth/actions";
import { AdminProspectForm } from "@/components/admin-prospect-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories, cities, getCategory, getCity } from "@/lib/data";
import {
  localizeCategories,
  localizeCategory,
  localizeCities,
  localizeCity,
  type Locale,
} from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type {
  Database,
  OutreachProspectPriority,
  OutreachProspectStatus,
} from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin prospects",
  description: "Track Kolo business outreach prospects.",
};

type OutreachProspectRow =
  Database["public"]["Tables"]["outreach_prospects"]["Row"];

type AdminProspectsPageProps = {
  searchParams?: Promise<{
    category?: string;
    city?: string;
  }>;
};

const statuses: OutreachProspectStatus[] = [
  "new",
  "contacted",
  "interested",
  "added",
  "rejected",
];

const priorities: OutreachProspectPriority[] = ["low", "medium", "high"];

const text = {
  uk: {
    kicker: "Адмін",
    title: "Outreach prospects",
    intro:
      "Список потенційних бізнесів для outreach: кого знайти, з ким зв'язатися, який наступний крок і що вже додано в Kolo.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до prospects.",
    setup: "Supabase ще не налаштовано.",
    schemaMissing:
      "Таблицю outreach_prospects ще не створено. Запустіть оновлений schema.sql у Supabase.",
    analytics: "Аналітика",
    coverage: "Coverage",
    media: "Media KPI",
    registrations: "Перевірка бізнесів",
    users: "Користувачі",
    addProspect: "Додати prospect",
    listTitle: "Prospects",
    empty: "Prospects поки немає.",
    total: "Усього",
    highPriority: "High priority",
    due: "Follow-up due",
    interested: "Interested",
    added: "Added",
    cityCategory: "Місто / категорія",
    contacts: "Контакти",
    nextStep: "Наступний крок",
    notes: "Нотатки",
    priority: "Пріоритет",
    status: "Статус",
    followUp: "Follow-up",
    save: "Зберегти",
    delete: "Видалити",
    openCoverage: "Відкрити gap",
    noContact: "Контакт ще не додано.",
    source: "Джерело",
  },
  en: {
    kicker: "Admin",
    title: "Outreach prospects",
    intro:
      "A working list of potential businesses for outreach: who to find, who to contact, next steps, and what has been added to Kolo.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to prospects.",
    setup: "Supabase is not configured yet.",
    schemaMissing:
      "The outreach_prospects table has not been created yet. Run the updated schema.sql in Supabase.",
    analytics: "Analytics",
    coverage: "Coverage",
    media: "Media KPI",
    registrations: "Business review",
    users: "Users",
    addProspect: "Add prospect",
    listTitle: "Prospects",
    empty: "No prospects yet.",
    total: "Total",
    highPriority: "High priority",
    due: "Follow-up due",
    interested: "Interested",
    added: "Added",
    cityCategory: "City / category",
    contacts: "Contacts",
    nextStep: "Next step",
    notes: "Notes",
    priority: "Priority",
    status: "Status",
    followUp: "Follow-up",
    save: "Save",
    delete: "Delete",
    openCoverage: "Open gap",
    noContact: "No contact added yet.",
    source: "Source",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AdminProspectsPage({
  searchParams,
}: AdminProspectsPageProps) {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const defaultCity = getCity(resolvedSearchParams.city ?? "")?.slug;
  const defaultCategory = getCategory(resolvedSearchParams.category ?? "")?.slug;
  const localizedCities = localizeCities(cities, locale);
  const localizedCategories = localizeCategories(categories, locale);
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let prospects: OutreachProspectRow[] = [];
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("outreach_prospects")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(500);

    prospects = data ?? [];
    errorMessage = error
      ? isProspectsSchemaError(error.message)
        ? labels.schemaMissing
        : error.message
      : "";
  }

  if (!isSupabaseConfigured()) {
    return <StatusCard text={labels.setup} />;
  }

  if (!user) {
    return (
      <StatusCard text={labels.noAccess}>
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value="/admin/prospects" />
          <Button type="submit">{labels.signIn}</Button>
        </form>
      </StatusCard>
    );
  }

  if (!isAdmin) {
    return <StatusCard text={labels.noAccess} />;
  }

  const summary = getProspectsSummary(prospects);

  return (
    <main className="container grid gap-8 py-10">
      <section className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-3xl">
          <Badge className="mb-4 w-fit" variant="secondary">
            {labels.kicker}
          </Badge>
          <h1 className="text-4xl font-black tracking-normal sm:text-5xl">
            {labels.title}
          </h1>
          <p className="mt-4 text-lg leading-8 text-muted-foreground">
            {labels.intro}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button asChild variant="outline">
            <Link href="/admin/coverage">
              <Grid3X3 className="h-4 w-4" />
              {labels.coverage}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/analytics">
              <BarChart3 className="h-4 w-4" />
              {labels.analytics}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/media">
              <RadioTower className="h-4 w-4" />
              {labels.media}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/registrations">
              <ShieldCheck className="h-4 w-4" />
              {labels.registrations}
            </Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/admin/users">
              <UsersRound className="h-4 w-4" />
              {labels.users}
            </Link>
          </Button>
        </div>
      </section>

      {errorMessage ? (
        <Card className="border-destructive/30 bg-destructive/10">
          <CardContent className="p-5 text-sm font-semibold text-destructive">
            {errorMessage}
          </CardContent>
        </Card>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard Icon={BriefcaseBusiness} label={labels.total} value={summary.total} />
        <MetricCard
          Icon={ShieldCheck}
          label={labels.highPriority}
          value={summary.highPriority}
        />
        <MetricCard Icon={CalendarClock} label={labels.due} value={summary.due} />
        <MetricCard
          Icon={UsersRound}
          label={labels.interested}
          value={summary.interested}
        />
        <MetricCard Icon={CheckCircle2} label={labels.added} value={summary.added} />
      </section>

      <Card>
        <CardContent className="grid gap-6 p-5 sm:p-6">
          <div>
            <h2 className="text-2xl font-black">{labels.addProspect}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {defaultCity || defaultCategory
                ? labels.openCoverage
                : labels.cityCategory}
            </p>
          </div>
          <AdminProspectForm
            categories={localizedCategories}
            cities={localizedCities}
            defaultCategory={defaultCategory}
            defaultCity={defaultCity}
            locale={locale}
          />
        </CardContent>
      </Card>

      <section className="grid gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl font-black">{labels.listTitle}</h2>
          <Badge variant="outline">{prospects.length}</Badge>
        </div>

        {prospects.length ? (
          <div className="grid gap-4">
            {prospects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                labels={labels}
                locale={locale}
                prospect={prospect}
              />
            ))}
          </div>
        ) : (
          <p className="rounded-md border bg-muted/30 p-5 text-sm font-semibold text-muted-foreground">
            {labels.empty}
          </p>
        )}
      </section>
    </main>
  );
}

function StatusCard({
  children,
  text,
}: {
  children?: ReactNode;
  text: string;
}) {
  return (
    <main className="container py-10">
      <Card>
        <CardContent className="grid gap-4 p-6">
          <p className="text-sm font-semibold text-muted-foreground">{text}</p>
          {children}
        </CardContent>
      </Card>
    </main>
  );
}

function MetricCard({
  Icon,
  label,
  value,
}: {
  Icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <p className="mt-5 text-3xl font-black">{value}</p>
        <p className="mt-3 text-sm font-bold text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}

function ProspectCard({
  labels,
  locale,
  prospect,
}: {
  labels: (typeof text)["uk"];
  locale: Locale;
  prospect: OutreachProspectRow;
}) {
  const city = getCity(prospect.city);
  const category = getCategory(prospect.category_slug);
  const cityLabel = city ? localizeCity(city, locale).name : prospect.city;
  const categoryLabel = category
    ? localizeCategory(category, locale).name
    : getReadableLabel(prospect.category_slug);
  const hasContact = Boolean(
    prospect.website || prospect.instagram || prospect.email || prospect.phone,
  );

  return (
    <Card>
      <CardContent className="grid gap-5 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap gap-2">
              <Badge variant={prospect.priority === "high" ? "default" : "outline"}>
                {getPriorityLabel(prospect.priority, locale)}
              </Badge>
              <Badge variant="secondary">
                {getStatusLabel(prospect.status, locale)}
              </Badge>
              {prospect.source ? (
                <Badge variant="outline">
                  {labels.source}: {prospect.source}
                </Badge>
              ) : null}
            </div>
            <h3 className="mt-3 text-2xl font-black">{prospect.business_name}</h3>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">
              {cityLabel} · {categoryLabel}
            </p>
            {prospect.contact_name ? (
              <p className="mt-2 text-sm font-semibold">
                {prospect.contact_name}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 lg:justify-end">
            {city && category ? (
              <Button asChild size="sm" variant="outline">
                <Link href={`/${city.slug}/${category.slug}`}>
                  <ExternalLink className="h-4 w-4" />
                  {labels.openCoverage}
                </Link>
              </Button>
            ) : null}
            <form action={deleteOutreachProspect}>
              <input name="prospectId" type="hidden" value={prospect.id} />
              <Button size="sm" type="submit" variant="ghost">
                <Trash2 className="h-4 w-4" />
                {labels.delete}
              </Button>
            </form>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-xs font-black uppercase tracking-normal text-muted-foreground">
              {labels.contacts}
            </p>
            {hasContact ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {prospect.website ? (
                  <ContactButton href={prospect.website} label="Website" />
                ) : null}
                {prospect.instagram ? (
                  <ContactButton
                    href={`https://instagram.com/${prospect.instagram.replace(/^@/, "")}`}
                    label={`@${prospect.instagram.replace(/^@/, "")}`}
                  />
                ) : null}
                {prospect.email ? (
                  <ContactButton
                    href={`mailto:${prospect.email}`}
                    Icon={Mail}
                    label={prospect.email}
                  />
                ) : null}
                {prospect.phone ? (
                  <ContactButton
                    href={`tel:${prospect.phone}`}
                    Icon={Phone}
                    label={prospect.phone}
                  />
                ) : null}
              </div>
            ) : (
              <p className="mt-3 text-sm font-semibold text-muted-foreground">
                {labels.noContact}
              </p>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-4">
            <p className="text-xs font-black uppercase tracking-normal text-muted-foreground">
              {labels.nextStep}
            </p>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
              {prospect.next_step || "-"}
            </p>
            {prospect.next_follow_up_at ? (
              <Badge className="mt-3" variant="outline">
                {formatDate(prospect.next_follow_up_at, locale)}
              </Badge>
            ) : null}
          </div>
        </div>

        {prospect.notes ? (
          <p className="rounded-md border bg-muted/30 p-4 text-sm leading-6 text-muted-foreground">
            {prospect.notes}
          </p>
        ) : null}

        <form
          action={updateOutreachProspect}
          className="grid gap-4 rounded-md border bg-card p-4 lg:grid-cols-[0.8fr_0.8fr_0.9fr_1.2fr_1.2fr_auto]"
        >
          <input name="prospectId" type="hidden" value={prospect.id} />
          <InlineSelect
            defaultValue={prospect.status}
            label={labels.status}
            name="status"
            options={statuses.map((status) => ({
              label: getStatusLabel(status, locale),
              value: status,
            }))}
          />
          <InlineSelect
            defaultValue={prospect.priority}
            label={labels.priority}
            name="priority"
            options={priorities.map((priority) => ({
              label: getPriorityLabel(priority, locale),
              value: priority,
            }))}
          />
          <InlineField
            defaultValue={prospect.next_follow_up_at ?? ""}
            label={labels.followUp}
            name="nextFollowUpAt"
            type="date"
          />
          <InlineTextArea
            defaultValue={prospect.next_step ?? ""}
            label={labels.nextStep}
            name="nextStep"
          />
          <InlineTextArea
            defaultValue={prospect.notes ?? ""}
            label={labels.notes}
            name="notes"
          />
          <div className="flex items-end">
            <Button className="w-full" type="submit">
              {labels.save}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function ContactButton({
  href,
  Icon = ExternalLink,
  label,
}: {
  href: string;
  Icon?: LucideIcon;
  label: string;
}) {
  return (
    <Button asChild size="sm" variant="outline">
      <a href={href} rel="noreferrer" target="_blank">
        <Icon className="h-4 w-4" />
        {label}
      </a>
    </Button>
  );
}

function InlineField({
  defaultValue,
  label,
  name,
  type = "text",
}: {
  defaultValue: string;
  label: string;
  name: string;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-normal text-muted-foreground">
      {label}
      <input
        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold normal-case text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
        defaultValue={defaultValue}
        name={name}
        type={type}
      />
    </label>
  );
}

function InlineSelect({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-normal text-muted-foreground">
      {label}
      <select
        className="h-10 rounded-md border border-input bg-background px-3 text-sm font-semibold normal-case text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
        defaultValue={defaultValue}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function InlineTextArea({
  defaultValue,
  label,
  name,
}: {
  defaultValue: string;
  label: string;
  name: string;
}) {
  return (
    <label className="grid gap-2 text-xs font-black uppercase tracking-normal text-muted-foreground">
      {label}
      <textarea
        className="min-h-10 rounded-md border border-input bg-background px-3 py-2 text-sm font-semibold normal-case text-foreground outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
        defaultValue={defaultValue}
        name={name}
        rows={2}
      />
    </label>
  );
}

function getProspectsSummary(prospects: OutreachProspectRow[]) {
  const today = new Date().toISOString().slice(0, 10);
  const activeProspects = prospects.filter(
    (prospect) => !["added", "rejected"].includes(prospect.status),
  );

  return {
    added: prospects.filter((prospect) => prospect.status === "added").length,
    due: activeProspects.filter(
      (prospect) =>
        prospect.next_follow_up_at && prospect.next_follow_up_at <= today,
    ).length,
    highPriority: activeProspects.filter(
      (prospect) => prospect.priority === "high",
    ).length,
    interested: prospects.filter((prospect) => prospect.status === "interested")
      .length,
    total: prospects.length,
  };
}

function getStatusLabel(status: OutreachProspectStatus, locale: Locale) {
  const labels = {
    uk: {
      added: "Додано",
      contacted: "Контакт був",
      interested: "Зацікавлені",
      new: "Новий",
      rejected: "Відхилено",
    },
    en: {
      added: "Added",
      contacted: "Contacted",
      interested: "Interested",
      new: "New",
      rejected: "Rejected",
    },
  } satisfies Record<Locale, Record<OutreachProspectStatus, string>>;

  return labels[locale][status];
}

function getPriorityLabel(priority: OutreachProspectPriority, locale: Locale) {
  const labels = {
    uk: {
      high: "Високий",
      low: "Низький",
      medium: "Середній",
    },
    en: {
      high: "High",
      low: "Low",
      medium: "Medium",
    },
  } satisfies Record<Locale, Record<OutreachProspectPriority, string>>;

  return labels[locale][priority];
}

function formatDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "uk" ? "uk-CA" : "en-CA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function getReadableLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isProspectsSchemaError(message: string) {
  return (
    message.includes("outreach_prospects") &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("Could not find"))
  );
}
