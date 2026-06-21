"use client";

import { type ReactNode, useActionState, useState } from "react";
import { Save } from "lucide-react";

import {
  updateBusinessRegistration,
  type DashboardActionState,
} from "@/app/dashboard/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, City } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type {
  BusinessRegistrationStatus,
  Database,
} from "@/lib/supabase/database.types";

type Registration =
  Database["public"]["Tables"]["business_registrations"]["Row"];

type DashboardBusinessEditorProps = {
  registration: Registration;
  categories: Category[];
  cities: City[];
  locale: Locale;
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
    phone: "Телефон",
    website: "Сайт",
    instagram: "Instagram",
    required: "Обов'язково",
    optional: "Необов'язково",
    save: "Зберегти зміни",
    saving: "Зберігаємо...",
    saved: "Зміни збережено і надіслано на перевірку.",
    pending: "На перевірці",
    approved: "Схвалено",
    rejected: "Відхилено",
    reviewed: "Коментар адміністратора",
    submitted: "Надіслано",
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
    phone: "Phone",
    website: "Website",
    instagram: "Instagram",
    required: "Required",
    optional: "Optional",
    save: "Save changes",
    saving: "Saving...",
    saved: "Changes saved and sent for review.",
    pending: "Pending review",
    approved: "Approved",
    rejected: "Rejected",
    reviewed: "Admin note",
    submitted: "Submitted",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: DashboardActionState = {
  ok: false,
  message: "",
};

export function DashboardBusinessEditor({
  registration,
  categories,
  cities,
  locale,
}: DashboardBusinessEditorProps) {
  const labels = text[locale];
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

  return (
    <Card
      id={`business-${registration.id}`}
      className="scroll-mt-24 border-white/70 bg-card/95 shadow-sm dark:border-white/10"
    >
      <CardContent className="p-5">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-black">{registration.business_name}</h2>
              <StatusBadge status={registration.status} labels={labels} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              {labels.submitted}:{" "}
              {new Date(registration.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {registration.review_note ? (
          <p className="mb-5 rounded-lg border bg-muted/70 p-4 text-sm leading-6">
            <span className="font-bold">{labels.reviewed}:</span>{" "}
            {registration.review_note}
          </p>
        ) : null}

        <form action={formAction} className="grid gap-5">
          <input type="hidden" name="id" value={registration.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <FieldLabel htmlFor={`businessName-${registration.id}`} badge={labels.required}>
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
              <FieldLabel htmlFor={`categorySlug-${registration.id}`} badge={labels.required}>
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
                {categories.map((category) => (
                  <option key={category.slug} value={category.slug}>
                    {category.name}
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
              <FieldLabel htmlFor={`city-${registration.id}`} badge={labels.required}>
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
          </div>

          <div className="grid gap-2">
            <FieldLabel htmlFor={`description-${registration.id}`} badge={labels.required}>
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
              <FieldLabel htmlFor={`address-${registration.id}`} badge={labels.optional}>
                {labels.address}
              </FieldLabel>
              <Input
                id={`address-${registration.id}`}
                name="address"
                defaultValue={registration.address ?? ""}
              />
            </div>
            <div className="grid gap-2">
              <FieldLabel htmlFor={`phone-${registration.id}`} badge={labels.optional}>
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
              <FieldLabel htmlFor={`website-${registration.id}`} badge={labels.optional}>
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
              <FieldLabel htmlFor={`instagram-${registration.id}`} badge={labels.optional}>
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
            <Button type="submit" disabled={isPending} className="justify-center">
              <Save className="h-4 w-4" />
              {isPending ? labels.saving : labels.save}
            </Button>
            {state.message ? (
              <p
                className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                  state.ok
                    ? "border-primary/25 bg-primary/10 text-primary"
                    : "border-destructive/25 bg-destructive/10 text-destructive"
                }`}
              >
                {state.ok ? labels.saved : state.message}
              </p>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
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

function FieldLabel({
  htmlFor,
  badge,
  children,
}: {
  htmlFor: string;
  badge: string;
  children: ReactNode;
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
