"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  ExternalLink,
  MapPin,
  Pencil,
  Save,
  Upload,
} from "lucide-react";

import {
  updateAdminBusinessDetails,
  type AdminUserActionState,
} from "@/app/admin/users/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import type { Category, City } from "@/lib/types";

export type AdminEditableBusiness = {
  address: string;
  businessName: string;
  categorySlug: string;
  city: string;
  description: string;
  instagram: string;
  ownerLabel: string;
  phone: string;
  publicOwnerLabel: string;
  registrationId: string;
  slug: string;
  status: string;
  website: string;
};

type AdminBusinessProfileEditorProps = {
  businesses: AdminEditableBusiness[];
  categories: Category[];
  cities: City[];
  locale: Locale;
};

const text = {
  uk: {
    title: "Бізнес-профілі",
    intro:
      "Редагуйте бізнес-інформацію від імені адміністратора. Зміни одразу синхронізуються із публічним профілем, якщо він вже існує.",
    empty: "Бізнесів поки немає.",
    edit: "Редагувати",
    editTitle: "Редагувати бізнес",
    editIntro: "Оновіть дані, які бачить власник і користувачі.",
    owner: "Власник заявки",
    publicOwner: "Публічний власник",
    businessName: "Назва бізнесу",
    category: "Категорія",
    city: "Місто або локація",
    address: "Адреса",
    description: "Опис",
    phone: "Телефон",
    website: "Сайт",
    instagram: "Instagram",
    logo: "Логотип",
    logoHint: "PNG, JPG, WebP, GIF або SVG до 2 MB.",
    save: "Зберегти",
    saving: "Зберігаємо...",
    noPublicProfile: "Публічний профіль ще не створено",
    view: "Відкрити",
  },
  en: {
    title: "Business profiles",
    intro:
      "Edit business information as an admin. Changes sync to the public profile immediately when one exists.",
    empty: "No businesses yet.",
    edit: "Edit",
    editTitle: "Edit business",
    editIntro: "Update the details owners and visitors see.",
    owner: "Registration owner",
    publicOwner: "Public owner",
    businessName: "Business name",
    category: "Category",
    city: "City or location",
    address: "Address",
    description: "Description",
    phone: "Phone",
    website: "Website",
    instagram: "Instagram",
    logo: "Logo",
    logoHint: "PNG, JPG, WebP, GIF, or SVG up to 2 MB.",
    save: "Save",
    saving: "Saving...",
    noPublicProfile: "No public profile yet",
    view: "Open",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: AdminUserActionState = {
  ok: false,
  message: "",
};

export function AdminBusinessProfileEditor({
  businesses,
  categories,
  cities,
  locale,
}: AdminBusinessProfileEditorProps) {
  const labels = text[locale];

  return (
    <Card className="min-w-0 border-white/70 bg-card/95 shadow-sm dark:border-white/10">
      <CardContent className="min-w-0 p-5">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <BriefcaseBusiness className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-black">{labels.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {labels.intro}
            </p>
          </div>
        </div>

        {businesses.length === 0 ? (
          <p className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
            {labels.empty}
          </p>
        ) : (
          <div className="grid min-w-0 gap-3">
            {businesses.map((business) => (
              <BusinessEditRow
                key={business.registrationId}
                business={business}
                categories={categories}
                cities={cities}
                labels={labels}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function BusinessEditRow({
  business,
  categories,
  cities,
  labels,
}: {
  business: AdminEditableBusiness;
  categories: Category[];
  cities: City[];
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateAdminBusinessDetails,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <div className="grid min-w-0 gap-4 rounded-lg border bg-background/70 p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="min-w-0 truncate text-xl font-black">
            {business.businessName}
          </h3>
          <Badge variant="outline">{business.status}</Badge>
          <Badge variant="accent">
            {categories.find((item) => item.slug === business.categorySlug)
              ?.name ?? business.categorySlug}
          </Badge>
        </div>
        <p className="mt-2 flex min-w-0 items-center gap-2 truncate text-sm text-muted-foreground">
          <MapPin className="h-4 w-4 shrink-0 text-primary" />
          {business.city}
          {business.address ? `, ${business.address}` : ""}
        </p>
        <div className="mt-3 grid min-w-0 gap-1 text-xs font-bold uppercase text-muted-foreground md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <p className="min-w-0 break-words">
            {labels.owner}:{" "}
            <span className="normal-case text-foreground">
              {business.ownerLabel}
            </span>
          </p>
          <p className="min-w-0 break-words">
            {labels.publicOwner}:{" "}
            <span className="normal-case text-foreground">
              {business.publicOwnerLabel}
            </span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 lg:justify-end">
        {business.slug ? (
          <Button asChild variant="outline" size="sm">
            <a href={`/business/${business.slug}`} target="_blank">
              <ExternalLink className="h-4 w-4" />
              {labels.view}
            </a>
          </Button>
        ) : null}
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" size="sm">
              <Pencil className="h-4 w-4" />
              {labels.edit}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>{labels.editTitle}</DialogTitle>
              <DialogDescription>{labels.editIntro}</DialogDescription>
            </DialogHeader>

            <form action={formAction} className="grid min-w-0 gap-5">
              <input
                type="hidden"
                name="registrationId"
                value={business.registrationId}
              />

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-business-name-${business.registrationId}`}>
                    {labels.businessName}
                  </Label>
                  <Input
                    id={`admin-business-name-${business.registrationId}`}
                    name="businessName"
                    defaultValue={business.businessName}
                    required
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label
                    htmlFor={`admin-business-category-${business.registrationId}`}
                  >
                    {labels.category}
                  </Label>
                  <select
                    id={`admin-business-category-${business.registrationId}`}
                    name="categorySlug"
                    defaultValue={business.categorySlug}
                    required
                    className="h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                  >
                    {categories.map((category) => (
                      <option key={category.slug} value={category.slug}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-business-city-${business.registrationId}`}>
                    {labels.city}
                  </Label>
                  <input
                    id={`admin-business-city-${business.registrationId}`}
                    name="city"
                    defaultValue={business.city}
                    required
                    list={`admin-business-cities-${business.registrationId}`}
                    className="h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition placeholder:text-muted-foreground focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                  />
                  <datalist id={`admin-business-cities-${business.registrationId}`}>
                    {cities.map((city) => (
                      <option key={city.slug} value={city.name} />
                    ))}
                  </datalist>
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-business-address-${business.registrationId}`}>
                    {labels.address}
                  </Label>
                  <Input
                    id={`admin-business-address-${business.registrationId}`}
                    name="address"
                    defaultValue={business.address}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`admin-business-description-${business.registrationId}`}>
                  {labels.description}
                </Label>
                <Textarea
                  id={`admin-business-description-${business.registrationId}`}
                  name="description"
                  defaultValue={business.description}
                  required
                  rows={4}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-business-phone-${business.registrationId}`}>
                    {labels.phone}
                  </Label>
                  <Input
                    id={`admin-business-phone-${business.registrationId}`}
                    name="phone"
                    type="tel"
                    defaultValue={business.phone}
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-business-website-${business.registrationId}`}>
                    {labels.website}
                  </Label>
                  <Input
                    id={`admin-business-website-${business.registrationId}`}
                    name="website"
                    type="url"
                    defaultValue={business.website}
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-business-instagram-${business.registrationId}`}>
                    {labels.instagram}
                  </Label>
                  <Input
                    id={`admin-business-instagram-${business.registrationId}`}
                    name="instagram"
                    defaultValue={business.instagram}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`admin-business-logo-${business.registrationId}`}>
                  {labels.logo}
                </Label>
                <Input
                  id={`admin-business-logo-${business.registrationId}`}
                  name="logoFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml"
                />
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  {labels.logoHint}
                </p>
              </div>

              {state.message ? (
                <p
                  className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                    state.ok
                      ? "border-primary/25 bg-primary/10 text-primary"
                      : "border-destructive/20 bg-destructive/10 text-destructive"
                  }`}
                >
                  {state.message}
                </p>
              ) : null}

              <Button type="submit" disabled={isPending}>
                <Save className="h-4 w-4" />
                {isPending ? labels.saving : labels.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
