"use client";

import { type ReactNode, useActionState, useState } from "react";
import { Send } from "lucide-react";

import { submitBusinessRegistration } from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Category, City } from "@/lib/types";
import type { Locale } from "@/lib/i18n";
import type { RegistrationActionState } from "@/app/register/actions";

type BusinessRegistrationFormProps = {
  categories: Category[];
  cities: City[];
  locale: Locale;
};

const text = {
  uk: {
    requiredSection: "Обов'язкові поля",
    optionalSection: "Необов'язкові поля",
    required: "Обов'язково",
    optional: "Необов'язково",
    businessName: "Назва бізнесу",
    category: "Категорія",
    otherCategory: "Інше",
    otherCategoryNote:
      "Опишіть вашу категорію в описі бізнесу, і вона буде додана після перевірки.",
    city: "Місто або локація",
    address: "Адреса",
    phone: "Телефон",
    website: "Сайт",
    instagram: "Instagram",
    description: "Опис бізнесу",
    submit: "Надіслати на перевірку",
    pending: "Надсилаємо...",
    success: "Заявку успішно надіслано на перевірку.",
  },
  en: {
    requiredSection: "Required fields",
    optionalSection: "Optional fields",
    required: "Required",
    optional: "Optional",
    businessName: "Business name",
    category: "Category",
    otherCategory: "Other",
    otherCategoryNote:
      "Describe your category in the business description, and it will be added after review.",
    city: "City or location",
    address: "Address",
    phone: "Phone",
    website: "Website",
    instagram: "Instagram",
    description: "Business description",
    submit: "Submit for review",
    pending: "Submitting...",
    success: "Your business was successfully submitted for review.",
  },
};

const initialRegistrationState: RegistrationActionState = {
  ok: false,
  message: "",
};

export function BusinessRegistrationForm({
  categories,
  cities,
  locale,
}: BusinessRegistrationFormProps) {
  const labels = text[locale];
  const [state, formAction, isPending] = useActionState(
    submitBusinessRegistration,
    initialRegistrationState,
  );
  const [categorySlug, setCategorySlug] = useState(
    categories[0]?.slug ?? "other",
  );

  return (
    <form action={formAction} className="grid gap-5">
      <div className="grid gap-4">
        <FormSectionTitle title={labels.requiredSection} />
        <div className="grid gap-2">
          <FieldLabel htmlFor="businessName" badge={labels.required}>
            {labels.businessName}
          </FieldLabel>
          <Input id="businessName" name="businessName" required />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <FieldLabel htmlFor="categorySlug" badge={labels.required}>
              {labels.category}
            </FieldLabel>
            <select
              id="categorySlug"
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
          <div className="grid gap-2">
            <FieldLabel htmlFor="city" badge={labels.required}>
              {labels.city}
            </FieldLabel>
            <input
              id="city"
              name="city"
              required
              list="registration-cities"
              className="h-11 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
            />
            <datalist id="registration-cities">
              {cities.map((city) => (
                <option key={city.slug} value={city.name} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid gap-2">
          <FieldLabel htmlFor="description" badge={labels.required}>
            {labels.description}
          </FieldLabel>
          <Textarea id="description" name="description" required rows={5} />
        </div>
      </div>

      <div className="grid gap-4 border-t pt-5">
        <FormSectionTitle title={labels.optionalSection} />
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <FieldLabel htmlFor="address" badge={labels.optional}>
              {labels.address}
            </FieldLabel>
            <Input id="address" name="address" />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="phone" badge={labels.optional}>
              {labels.phone}
            </FieldLabel>
            <Input id="phone" name="phone" type="tel" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <FieldLabel htmlFor="website" badge={labels.optional}>
              {labels.website}
            </FieldLabel>
            <Input id="website" name="website" type="url" />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor="instagram" badge={labels.optional}>
              {labels.instagram}
            </FieldLabel>
            <Input id="instagram" name="instagram" />
          </div>
        </div>
      </div>

      <Button
        type="submit"
        size="lg"
        className="justify-center"
        disabled={isPending}
      >
        <Send className="h-4 w-4" />
        {isPending ? labels.pending : labels.submit}
      </Button>
      {state.message ? (
        <div
          className={`rounded-lg border p-4 text-sm font-semibold ${
            state.ok
              ? "border-primary/25 bg-primary/10 text-primary"
              : "border-destructive/25 bg-destructive/10 text-destructive"
          }`}
        >
          {state.ok ? labels.success : state.message}
        </div>
      ) : null}
    </form>
  );
}

function FormSectionTitle({ title }: { title: string }) {
  return (
    <h2 className="text-sm font-black uppercase tracking-normal text-primary">
      {title}
    </h2>
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
