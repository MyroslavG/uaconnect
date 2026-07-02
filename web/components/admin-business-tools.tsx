"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BriefcaseBusiness, Link2, Mail, Plus } from "lucide-react";

import {
  createAdminBusiness,
  createClaimInvite,
} from "@/app/admin/registrations/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import type { Database } from "@/lib/supabase/database.types";
import type { Category, City } from "@/lib/types";

type BusinessRow = Database["public"]["Tables"]["businesses"]["Row"];

type AdminBusinessToolsProps = {
  categories: Category[];
  cities: City[];
  locale: Locale;
  unownedBusinesses: Pick<BusinessRow, "id" | "name" | "city">[];
};

type ActionState = {
  ok: boolean;
  message: string;
  claimUrl?: string;
  ownerEmail?: string;
};

const initialState: ActionState = {
  ok: false,
  message: "",
};

const text = {
  uk: {
    title: "Додати бізнес вручну",
    intro:
      "Опублікуйте бізнес без власника, а потім створіть приватне посилання для передачі доступу.",
    businessName: "Назва бізнесу",
    category: "Категорія",
    city: "Місто або локація",
    address: "Адреса",
    description: "Опис бізнесу",
    phone: "Телефон",
    website: "Сайт",
    instagram: "Instagram",
    logoFile: "Логотип",
    logoHint: "PNG, JPG, WebP, GIF або SVG до 2 MB.",
    servesAllCanada: "Онлайн · по всій Канаді",
    servesAllCanadaHint:
      "Показувати цей бізнес у пошуку для будь-якого міста або локації в Канаді.",
    required: "Обов'язково",
    optional: "Необов'язково",
    create: "Опублікувати бізнес",
    creating: "Публікуємо...",
    claimTitle: "Посилання для власника",
    claimIntro:
      "Створіть одноразове посилання. Після входу через Google власник підтвердить доступ і побачить бізнес у кабінеті.",
    chooseBusiness: "Бізнес без власника",
    ownerEmail: "Email власника",
    generate: "Створити посилання",
    generating: "Створюємо...",
    noBusinesses: "Немає бізнесів без власника.",
    generatedLink: "Приватне посилання",
    sendEmail: "Надіслати email",
  },
  en: {
    title: "Add business manually",
    intro:
      "Publish a business without an owner, then create a private link to transfer access.",
    businessName: "Business name",
    category: "Category",
    city: "City or location",
    address: "Address",
    description: "Business description",
    phone: "Phone",
    website: "Website",
    instagram: "Instagram",
    logoFile: "Logo",
    logoHint: "PNG, JPG, WebP, GIF, or SVG up to 2 MB.",
    servesAllCanada: "Online · Canada-wide",
    servesAllCanadaHint:
      "Show this business in search for any city or location in Canada.",
    required: "Required",
    optional: "Optional",
    create: "Publish business",
    creating: "Publishing...",
    claimTitle: "Owner claim link",
    claimIntro:
      "Create a one-time link. After Google sign-in, the owner confirms access and sees the business in their dashboard.",
    chooseBusiness: "Unowned business",
    ownerEmail: "Owner email",
    generate: "Create link",
    generating: "Creating...",
    noBusinesses: "No unowned businesses.",
    generatedLink: "Private link",
    sendEmail: "Send email",
  },
} satisfies Record<Locale, Record<string, string>>;

export function AdminBusinessTools({
  categories,
  cities,
  locale,
  unownedBusinesses,
}: AdminBusinessToolsProps) {
  const labels = text[locale];
  const router = useRouter();
  const [createState, createAction, isCreating] = useActionState(
    createAdminBusiness,
    initialState,
  );
  const [claimState, claimAction, isGenerating] = useActionState(
    createClaimInvite,
    initialState,
  );
  const emailBody = claimState.claimUrl
    ? encodeURIComponent(
        locale === "uk"
          ? `Вітаю! Я створив(ла) для вас доступ до профілю бізнесу на UAConnect. Відкрийте це посилання, увійдіть через Google і підтвердіть доступ:\n\n${claimState.claimUrl}`
          : `Hi! I created access for your business profile on UAConnect. Open this link, sign in with Google, and confirm access:\n\n${claimState.claimUrl}`,
      )
    : "";
  const emailSubject = encodeURIComponent(
    locale === "uk"
      ? "Доступ до профілю бізнесу на UAConnect"
      : "UAConnect business profile access",
  );

  useEffect(() => {
    if (createState.ok) {
      router.refresh();
    }
  }, [createState.ok, router]);

  return (
    <div className="mb-8 grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className="border-white/70 bg-card/95 shadow-sm dark:border-white/10">
        <CardContent className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <BriefcaseBusiness className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black">{labels.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {labels.intro}
              </p>
            </div>
          </div>

          <form action={createAction} className="grid gap-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.businessName} badge={labels.required}>
                <Input name="businessName" required />
              </Field>
              <Field label={labels.category} badge={labels.required}>
                <select
                  name="categorySlug"
                  required
                  className="h-11 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                >
                  <option value="">{labels.category}</option>
                  {categories.map((category) => (
                    <option key={category.slug} value={category.slug}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label={labels.city} badge={labels.required}>
                <input
                  name="city"
                  required
                  list="admin-business-cities"
                  className="h-11 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                />
                <datalist id="admin-business-cities">
                  {cities.map((city) => (
                    <option key={city.slug} value={city.name} />
                  ))}
                </datalist>
              </Field>
              <Field label={labels.address} badge={labels.optional}>
                <Input name="address" />
              </Field>
            </div>

            <Field label={labels.description} badge={labels.required}>
              <Textarea name="description" required rows={4} />
            </Field>

            <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
              <input
                name="servesAllCanada"
                type="checkbox"
                className="mt-1 h-4 w-4 rounded border-input accent-primary"
              />
              <span>
                <span className="block text-sm font-bold">
                  {labels.servesAllCanada}
                </span>
                <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                  {labels.servesAllCanadaHint}
                </span>
              </span>
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label={labels.phone} badge={labels.optional}>
                <Input name="phone" type="tel" />
              </Field>
              <Field label={labels.website} badge={labels.optional}>
                <Input name="website" type="url" />
              </Field>
              <Field label={labels.instagram} badge={labels.optional}>
                <Input name="instagram" />
              </Field>
            </div>
            <Field label={labels.logoFile} badge={labels.optional}>
              <Input
                name="logoFile"
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
              />
              <p className="text-xs text-muted-foreground">{labels.logoHint}</p>
            </Field>

            <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
              <Button type="submit" disabled={isCreating}>
                <Plus className="h-4 w-4" />
                {isCreating ? labels.creating : labels.create}
              </Button>
              <ActionMessage state={createState} />
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-white/70 bg-card/95 shadow-sm dark:border-white/10">
        <CardContent className="p-5">
          <div className="mb-5 flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <Link2 className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black">{labels.claimTitle}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {labels.claimIntro}
              </p>
            </div>
          </div>

          <form action={claimAction} className="grid gap-4">
            <Field label={labels.chooseBusiness} badge={labels.required}>
              <select
                name="businessId"
                required
                disabled={unownedBusinesses.length === 0}
                className="h-11 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
              >
                <option value="">
                  {unownedBusinesses.length
                    ? labels.chooseBusiness
                    : labels.noBusinesses}
                </option>
                {unownedBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} · {business.city}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={labels.ownerEmail} badge={labels.optional}>
              <Input name="ownerEmail" type="email" />
            </Field>

            <Button
              type="submit"
              disabled={isGenerating || unownedBusinesses.length === 0}
            >
              <Link2 className="h-4 w-4" />
              {isGenerating ? labels.generating : labels.generate}
            </Button>
            <ActionMessage state={claimState} />
          </form>

          {claimState.claimUrl ? (
            <div className="mt-5 grid gap-3 rounded-lg border border-primary/20 bg-primary/10 p-4">
              <Label className="text-sm font-black">{labels.generatedLink}</Label>
              <Input readOnly value={claimState.claimUrl} />
              {claimState.ownerEmail ? (
                <Button asChild variant="outline">
                  <a
                    href={`mailto:${claimState.ownerEmail}?subject=${emailSubject}&body=${emailBody}`}
                  >
                    <Mail className="h-4 w-4" />
                    {labels.sendEmail}
                  </a>
                </Button>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  badge,
  children,
  label,
}: {
  badge: string;
  children: React.ReactNode;
  label: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="flex items-center justify-between gap-3 text-sm font-bold">
        {label}
        <span className="rounded-md bg-muted px-2 py-0.5 text-[11px] font-bold text-muted-foreground">
          {badge}
        </span>
      </span>
      {children}
    </label>
  );
}

function ActionMessage({ state }: { state: ActionState }) {
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
      {state.message}
    </p>
  );
}
