"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Edit3,
  ExternalLink,
  Globe,
  Instagram,
  MapPin,
  Phone,
  Save,
} from "lucide-react";

import {
  updateBusinessRegistration,
  type DashboardActionState,
} from "@/app/dashboard/actions";
import { BusinessLogo } from "@/components/business-logo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import type {
  BusinessRegistrationStatus,
  Database,
} from "@/lib/supabase/database.types";
import type { Category, City } from "@/lib/types";
import { formatExternalUrl, formatInstagramHandle } from "@/lib/utils";

type Registration =
  Database["public"]["Tables"]["business_registrations"]["Row"];
type PublishedBusiness = Database["public"]["Tables"]["businesses"]["Row"];

type DashboardBusinessEditorProps = {
  categories: Category[];
  cities: City[];
  locale: Locale;
  publishedBusiness?: PublishedBusiness;
  registration: Registration;
};

const text = {
  uk: {
    businessName: "Назва бізнесу",
    category: "Категорія",
    otherCategory: "Інше",
    otherCategoryNote:
      "Опишіть вашу категорію в описі бізнесу, і вона буде додана після перевірки.",
    city: "Місто або локація",
    address: "Адреса",
    description: "Опис бізнесу",
    edit: "Редагувати",
    editTitle: "Редагувати профіль бізнесу",
    logoFile: "Логотип",
    logoHint: "Завантажте новий файл, щоб замінити поточний логотип. PNG, JPG, WebP, GIF або SVG до 2 MB.",
    viewProfile: "Переглянути профіль",
    phone: "Телефон",
    website: "Сайт",
    instagram: "Instagram",
    required: "Обов'язково",
    optional: "Необов'язково",
    save: "Зберегти зміни",
    saving: "Зберігаємо...",
    saved: "Зміни збережено і надіслано на перевірку.",
    pending: "На перевірці",
    approved: "Опубліковано",
    rejected: "Відхилено",
    reviewed: "Коментар адміністратора",
    noContact: "Контакти ще не додані",
  },
  en: {
    businessName: "Business name",
    category: "Category",
    otherCategory: "Other",
    otherCategoryNote:
      "Describe your category in the business description, and it will be added after review.",
    city: "City or location",
    address: "Address",
    description: "Business description",
    edit: "Edit",
    editTitle: "Edit business profile",
    logoFile: "Logo",
    logoHint: "Upload a new file to replace the current logo. PNG, JPG, WebP, GIF, or SVG up to 2 MB.",
    viewProfile: "View profile",
    phone: "Phone",
    website: "Website",
    instagram: "Instagram",
    required: "Required",
    optional: "Optional",
    save: "Save changes",
    saving: "Saving...",
    saved: "Changes saved and sent for review.",
    pending: "Pending review",
    approved: "Published",
    rejected: "Rejected",
    reviewed: "Admin note",
    noContact: "No contact details yet",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: DashboardActionState = {
  ok: false,
  message: "",
};

export function DashboardBusinessEditor({
  categories,
  cities,
  locale,
  publishedBusiness,
  registration,
}: DashboardBusinessEditorProps) {
  const labels = text[locale];
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateBusinessRegistration,
    initialState,
  );
  const initialCategorySlug = categories.some(
    (category) => category.slug === registration.category_slug,
  )
    ? registration.category_slug
    : "other";
  const [categorySlug, setCategorySlug] = useState(initialCategorySlug);
  const category = categories.find(
    (candidate) => candidate.slug === registration.category_slug,
  );
  const logoUrl = registration.logo_url ?? publishedBusiness?.logo_url ?? "";
  const hasContact = Boolean(
    registration.phone || registration.website || registration.instagram,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <Card
      id={`business-${registration.id}`}
      className="scroll-mt-24 overflow-hidden border-white/70 bg-card/95 shadow-sm dark:border-white/10"
    >
      <CardContent className="p-0">
        <div className="relative border-b bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--accent)/0.15)_42%,hsl(var(--background)))] p-5">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_31px,hsl(var(--foreground)/0.045)_32px),linear-gradient(0deg,transparent_0,transparent_31px,hsl(var(--foreground)/0.045)_32px)] bg-[size:32px_32px]" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex max-w-full flex-wrap items-center gap-2">
                <Badge variant="accent">
                  {category?.name ?? registration.category_slug}
                </Badge>
                <StatusBadge status={registration.status} labels={labels} />
              </div>
              <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal">
                {registration.business_name}
              </h2>
              <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                {registration.city}
                {registration.address ? `, ${registration.address}` : ""}
              </p>
            </div>
            <BusinessLogo
              className="h-16 w-16 bg-background/85"
              iconClassName="h-7 w-7"
              logoUrl={logoUrl}
              name={registration.business_name}
            />
          </div>
        </div>

        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_280px]">
          <div className="grid gap-4">
            <p className="line-clamp-3 text-sm leading-6 text-muted-foreground">
              {registration.description}
            </p>

            <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
              {hasContact ? (
                <>
                  {registration.phone ? (
                    <span className="flex items-center gap-2 rounded-md border bg-background p-3">
                      <Phone className="h-4 w-4 text-primary" />
                      {registration.phone}
                    </span>
                  ) : null}
                  {registration.website ? (
                    <span className="flex items-center gap-2 truncate rounded-md border bg-background p-3">
                      <Globe className="h-4 w-4 text-primary" />
                      {formatExternalUrl(registration.website)}
                    </span>
                  ) : null}
                  {registration.instagram ? (
                    <span className="flex items-center gap-2 rounded-md border bg-background p-3">
                      <Instagram className="h-4 w-4 text-primary" />
                      {formatInstagramHandle(registration.instagram)}
                    </span>
                  ) : null}
                </>
              ) : (
                <span className="rounded-md border bg-background p-3">
                  {labels.noContact}
                </span>
              )}
            </div>

            {registration.review_note ? (
              <p className="rounded-lg border bg-muted/70 p-4 text-sm leading-6">
                <span className="font-bold">{labels.reviewed}:</span>{" "}
                {registration.review_note}
              </p>
            ) : null}
          </div>

          <aside className="grid content-start gap-3 rounded-lg border bg-background/70 p-4">
            <Dialog>
              <DialogTrigger asChild>
                <Button className="w-full justify-center" type="button">
                  <Edit3 className="h-4 w-4" />
                  {labels.edit}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
                <DialogHeader>
                  <DialogTitle>{labels.editTitle}</DialogTitle>
                </DialogHeader>
                <form action={formAction} className="grid gap-5">
                  <input type="hidden" name="id" value={registration.id} />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`businessName-${registration.id}`}
                        badge={labels.required}
                      >
                        {labels.businessName}
                      </FieldLabel>
                      <Input
                        id={`businessName-${registration.id}`}
                        name="businessName"
                        defaultValue={registration.business_name}
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`categorySlug-${registration.id}`}
                        badge={labels.required}
                      >
                        {labels.category}
                      </FieldLabel>
                      <select
                        id={`categorySlug-${registration.id}`}
                        name="categorySlug"
                        value={categorySlug}
                        onChange={(event) => setCategorySlug(event.target.value)}
                        required
                        className="h-11 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                      >
                        {categories.map((item) => (
                          <option key={item.slug} value={item.slug}>
                            {item.name}
                          </option>
                        ))}
                        <option value="other">{labels.otherCategory}</option>
                      </select>
                      {categorySlug === "other" ? (
                        <p className="rounded-md border border-hover-blue-border bg-hover-blue/35 px-3 py-2 text-xs font-semibold leading-5 text-hover-blue-foreground">
                          {labels.otherCategoryNote}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`city-${registration.id}`}
                        badge={labels.required}
                      >
                        {labels.city}
                      </FieldLabel>
                      <input
                        id={`city-${registration.id}`}
                        name="city"
                        defaultValue={registration.city}
                        required
                        list={`dashboard-cities-${registration.id}`}
                        className="h-11 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                      />
                      <datalist id={`dashboard-cities-${registration.id}`}>
                        {cities.map((city) => (
                          <option key={city.slug} value={city.name} />
                        ))}
                      </datalist>
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`logoFile-${registration.id}`}
                        badge={labels.optional}
                      >
                        {labels.logoFile}
                      </FieldLabel>
                      <Input
                        id={`logoFile-${registration.id}`}
                        name="logoFile"
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                      />
                      <p className="text-xs text-muted-foreground">
                        {labels.logoHint}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <FieldLabel
                      htmlFor={`description-${registration.id}`}
                      badge={labels.required}
                    >
                      {labels.description}
                    </FieldLabel>
                    <Textarea
                      id={`description-${registration.id}`}
                      name="description"
                      defaultValue={registration.description}
                      required
                      rows={4}
                    />
                  </div>

                  <div className="grid gap-4 border-t pt-5 md:grid-cols-2">
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`address-${registration.id}`}
                        badge={labels.optional}
                      >
                        {labels.address}
                      </FieldLabel>
                      <Input
                        id={`address-${registration.id}`}
                        name="address"
                        defaultValue={registration.address ?? ""}
                      />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`phone-${registration.id}`}
                        badge={labels.optional}
                      >
                        {labels.phone}
                      </FieldLabel>
                      <Input
                        id={`phone-${registration.id}`}
                        name="phone"
                        type="tel"
                        defaultValue={registration.phone ?? ""}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`website-${registration.id}`}
                        badge={labels.optional}
                      >
                        {labels.website}
                      </FieldLabel>
                      <Input
                        id={`website-${registration.id}`}
                        name="website"
                        type="url"
                        defaultValue={registration.website ?? ""}
                      />
                    </div>
                    <div className="grid gap-2">
                      <FieldLabel
                        htmlFor={`instagram-${registration.id}`}
                        badge={labels.optional}
                      >
                        {labels.instagram}
                      </FieldLabel>
                      <Input
                        id={`instagram-${registration.id}`}
                        name="instagram"
                        defaultValue={registration.instagram ?? ""}
                      />
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                    <Button
                      type="submit"
                      disabled={isPending}
                      className="justify-center"
                    >
                      <Save className="h-4 w-4" />
                      {isPending ? labels.saving : labels.save}
                    </Button>
                    <ActionMessage labels={labels} state={state} />
                  </div>
                </form>
              </DialogContent>
            </Dialog>
            {publishedBusiness ? (
              <Button asChild variant="outline" className="w-full justify-center">
                <Link href={`/business/${publishedBusiness.slug}`}>
                  <ExternalLink className="h-4 w-4" />
                  {labels.viewProfile}
                </Link>
              </Button>
            ) : null}
          </aside>
        </div>
      </CardContent>
    </Card>
  );
}

function ActionMessage({
  labels,
  state,
}: {
  labels: Record<string, string>;
  state: DashboardActionState;
}) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
        state.ok
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-destructive/25 bg-destructive/10 text-destructive"
      }`}
    >
      {state.ok ? labels.saved : state.message}
    </p>
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
    <Badge variant="outline" className={`${className} max-w-full text-[11px]`}>
      {labels[status]}
    </Badge>
  );
}

function FieldLabel({
  badge,
  children,
  htmlFor,
}: {
  badge: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="flex items-center justify-between gap-3">
      <span>{children}</span>
      <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
        {badge}
      </span>
    </Label>
  );
}
