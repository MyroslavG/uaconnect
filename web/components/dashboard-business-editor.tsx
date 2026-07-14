"use client";

import Link from "next/link";
import { type ReactNode, useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  DollarSign,
  Edit3,
  ExternalLink,
  Globe,
  Instagram,
  LinkIcon,
  MapPin,
  Phone,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import {
  createBusinessContentItem,
  deleteBusinessContentItem,
  updateBusinessContentItem,
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
type BusinessContentRow =
  Database["public"]["Tables"]["business_content_items"]["Row"];

type DashboardBusinessEditorProps = {
  categories: Category[];
  cities: City[];
  contentItems: BusinessContentRow[];
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
    servesAllCanada: "Онлайн · по всій Канаді",
    servesAllCanadaHint:
      "Показувати цей бізнес у пошуку для будь-якого міста або локації в Канаді.",
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
    services: "Послуги",
    events: "Події",
    addService: "Додати послугу",
    addEvent: "Додати подію",
    editService: "Редагувати послугу",
    editEvent: "Редагувати подію",
    noServices: "Додайте послуги, щоб люди швидше зрозуміли, що ви пропонуєте.",
    noEvents: "Додайте події, зустрічі або спеціальні пропозиції.",
    title: "Назва",
    contentDescription: "Опис",
    image: "Фото",
    imageHint: "PNG, JPG, WebP або GIF до 5 MB.",
    price: "Ціна",
    free: "Безкоштовно",
    dateTime: "Дата і час",
    location: "Місце",
    online: "Онлайн",
    link: "Посилання",
    add: "Додати",
    update: "Оновити",
    delete: "Видалити",
    deleting: "Видаляємо...",
    emptyPrice: "Не вказано",
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
    servesAllCanada: "Online · Canada-wide",
    servesAllCanadaHint:
      "Show this business in search for any city or location in Canada.",
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
    services: "Services",
    events: "Events",
    addService: "Add service",
    addEvent: "Add event",
    editService: "Edit service",
    editEvent: "Edit event",
    noServices: "Add services so people quickly understand what you offer.",
    noEvents: "Add events, meetups, or special offers.",
    title: "Title",
    contentDescription: "Description",
    image: "Photo",
    imageHint: "PNG, JPG, WebP, or GIF up to 5 MB.",
    price: "Price",
    free: "Free",
    dateTime: "Date and time",
    location: "Location",
    online: "Online",
    link: "Link",
    add: "Add",
    update: "Update",
    delete: "Delete",
    deleting: "Deleting...",
    emptyPrice: "Not listed",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: DashboardActionState = {
  ok: false,
  message: "",
};

export function DashboardBusinessEditor({
  categories,
  cities,
  contentItems,
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
  const serviceItems = contentItems.filter(
    (item) => item.content_type === "service",
  );
  const eventItems = contentItems.filter(
    (item) => item.content_type === "event",
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
                {registration.serves_all_canada ? (
                  <Badge variant="green">{labels.servesAllCanada}</Badge>
                ) : null}
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

                  <label className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4">
                    <input
                      name="servesAllCanada"
                      type="checkbox"
                      defaultChecked={registration.serves_all_canada}
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
        <div className="border-t bg-background/55 p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <ContentColumn
              items={serviceItems}
              labels={labels}
              registrationId={registration.id}
              title={labels.services}
              type="service"
            />
            <ContentColumn
              items={eventItems}
              labels={labels}
              registrationId={registration.id}
              title={labels.events}
              type="event"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ContentColumn({
  items,
  labels,
  registrationId,
  title,
  type,
}: {
  items: BusinessContentRow[];
  labels: Record<string, string>;
  registrationId: string;
  title: string;
  type: "service" | "event";
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    createBusinessContentItem,
    initialState,
  );
  const addLabel = type === "event" ? labels.addEvent : labels.addService;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-black">{title}</h3>
          <p className="text-xs font-semibold text-muted-foreground">
            {items.length}
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button size="sm" type="button" variant="outline">
              <Plus className="h-4 w-4" />
              {addLabel}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{addLabel}</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="grid gap-5">
              <ContentFormFields
                labels={labels}
                registrationId={registrationId}
                type={type}
              />
              <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                <Button disabled={isPending} type="submit">
                  <Save className="h-4 w-4" />
                  {isPending ? labels.saving : labels.add}
                </Button>
                <ActionMessage labels={labels} state={state} />
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-4 grid gap-3">
        {items.length > 0 ? (
          items.map((item) => (
            <ContentItemCard item={item} key={item.id} labels={labels} />
          ))
        ) : (
          <p className="rounded-lg border border-dashed bg-background/70 p-4 text-sm leading-6 text-muted-foreground">
            {type === "event" ? labels.noEvents : labels.noServices}
          </p>
        )}
      </div>
    </section>
  );
}

function ContentItemCard({
  item,
  labels,
}: {
  item: BusinessContentRow;
  labels: Record<string, string>;
}) {
  const router = useRouter();
  const [updateState, updateAction, isUpdating] = useActionState(
    updateBusinessContentItem,
    initialState,
  );
  const [deleteState, deleteAction, isDeleting] = useActionState(
    deleteBusinessContentItem,
    initialState,
  );
  const isEvent = item.content_type === "event";

  useEffect(() => {
    if (updateState.ok || deleteState.ok) {
      router.refresh();
    }
  }, [deleteState.ok, router, updateState.ok]);

  return (
    <article className="overflow-hidden rounded-lg border bg-background">
      {item.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-40 w-full object-cover"
          src={item.image_url}
        />
      ) : null}
      <div className="grid gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="bg-card">
            {isEvent ? labels.events : labels.services}
          </Badge>
          <Badge variant="green">
            {item.is_free ? labels.free : item.price || labels.emptyPrice}
          </Badge>
          {isEvent && item.is_online ? (
            <Badge variant="secondary">
              <Globe className="mr-1.5 h-3.5 w-3.5" />
              {labels.online}
            </Badge>
          ) : null}
        </div>
        <div>
          <h4 className="text-base font-black">{item.title}</h4>
          <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </div>
        {isEvent ? (
          <div className="grid gap-2 text-xs font-semibold text-muted-foreground">
            {item.starts_at ? (
              <span className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                {formatContentDate(item.starts_at)}
              </span>
            ) : null}
            {item.location ? (
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                {item.location}
              </span>
            ) : null}
            {item.link_url ? (
              <a
                className="flex items-center gap-2 text-foreground hover:underline"
                href={formatContentLink(item.link_url)}
                rel="noreferrer"
                target="_blank"
              >
                <LinkIcon className="h-4 w-4 text-primary" />
                {formatExternalUrl(item.link_url)}
              </a>
            ) : null}
          </div>
        ) : null}
        <div className="grid gap-2 sm:grid-cols-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button className="justify-center" type="button" variant="outline">
                <Edit3 className="h-4 w-4" />
                {labels.edit}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {isEvent ? labels.editEvent : labels.editService}
                </DialogTitle>
              </DialogHeader>
              <form action={updateAction} className="grid gap-5">
                <ContentFormFields
                  item={item}
                  labels={labels}
                  registrationId={item.registration_id}
                  type={item.content_type}
                />
                <div className="grid gap-3 sm:grid-cols-[auto_1fr] sm:items-center">
                  <Button disabled={isUpdating} type="submit">
                    <Save className="h-4 w-4" />
                    {isUpdating ? labels.saving : labels.update}
                  </Button>
                  <ActionMessage labels={labels} state={updateState} />
                </div>
              </form>
            </DialogContent>
          </Dialog>
          <form action={deleteAction}>
            <input name="contentId" type="hidden" value={item.id} />
            <input
              name="registrationId"
              type="hidden"
              value={item.registration_id}
            />
            <Button
              className="w-full justify-center"
              disabled={isDeleting}
              type="submit"
              variant="outline"
            >
              <Trash2 className="h-4 w-4" />
              {isDeleting ? labels.deleting : labels.delete}
            </Button>
          </form>
        </div>
        <ActionMessage labels={labels} state={deleteState} />
      </div>
    </article>
  );
}

function ContentFormFields({
  item,
  labels,
  registrationId,
  type,
}: {
  item?: BusinessContentRow;
  labels: Record<string, string>;
  registrationId: string;
  type: "service" | "event";
}) {
  const idPrefix = `${type}-${item?.id ?? registrationId}`;
  const isEvent = type === "event";

  return (
    <>
      <input name="registrationId" type="hidden" value={registrationId} />
      <input name="contentType" type="hidden" value={type} />
      {item ? <input name="contentId" type="hidden" value={item.id} /> : null}

      <div className="grid gap-2">
        <FieldLabel htmlFor={`${idPrefix}-title`} badge={labels.required}>
          {labels.title}
        </FieldLabel>
        <Input
          defaultValue={item?.title ?? ""}
          id={`${idPrefix}-title`}
          name="title"
          required
        />
      </div>

      <div className="grid gap-2">
        <FieldLabel
          htmlFor={`${idPrefix}-description`}
          badge={labels.required}
        >
          {labels.contentDescription}
        </FieldLabel>
        <Textarea
          defaultValue={item?.description ?? ""}
          id={`${idPrefix}-description`}
          name="description"
          required
          rows={4}
        />
      </div>

      <div className="grid gap-2">
        <FieldLabel htmlFor={`${idPrefix}-image`} badge={labels.optional}>
          {labels.image}
        </FieldLabel>
        <Input
          accept="image/png,image/jpeg,image/webp,image/gif"
          id={`${idPrefix}-image`}
          name="imageFile"
          type="file"
        />
        <p className="text-xs text-muted-foreground">{labels.imageHint}</p>
      </div>

      {isEvent ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <FieldLabel htmlFor={`${idPrefix}-startsAt`} badge={labels.required}>
              {labels.dateTime}
            </FieldLabel>
            <Input
              defaultValue={toDateTimeLocal(item?.starts_at)}
              id={`${idPrefix}-startsAt`}
              name="startsAt"
              required
              type="datetime-local"
            />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/35 px-4 py-3">
            <span className="text-sm font-bold">{labels.online}</span>
            <input
              className="h-4 w-4 rounded border-input accent-primary"
              defaultChecked={item?.is_online ?? false}
              name="isOnline"
              type="checkbox"
            />
          </label>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid gap-2">
          <FieldLabel htmlFor={`${idPrefix}-price`} badge={labels.optional}>
            {labels.price}
          </FieldLabel>
          <div className="relative">
            <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              defaultValue={item?.price ?? ""}
              id={`${idPrefix}-price`}
              name="price"
            />
          </div>
        </div>
        <label className="flex items-center justify-between gap-3 rounded-lg border bg-muted/35 px-4 py-3">
          <span className="text-sm font-bold">{labels.free}</span>
          <input
            className="h-4 w-4 rounded border-input accent-primary"
            defaultChecked={item?.is_free ?? false}
            name="isFree"
            type="checkbox"
          />
        </label>
      </div>

      {isEvent ? (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="grid gap-2">
            <FieldLabel htmlFor={`${idPrefix}-location`} badge={labels.optional}>
              {labels.location}
            </FieldLabel>
            <Input
              defaultValue={item?.location ?? ""}
              id={`${idPrefix}-location`}
              name="location"
            />
          </div>
          <div className="grid gap-2">
            <FieldLabel htmlFor={`${idPrefix}-linkUrl`} badge={labels.optional}>
              {labels.link}
            </FieldLabel>
            <Input
              defaultValue={item?.link_url ?? ""}
              id={`${idPrefix}-linkUrl`}
              name="linkUrl"
              type="url"
            />
          </div>
        </div>
      ) : null}
    </>
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
      {state.ok ? state.message || labels.saved : state.message}
    </p>
  );
}

function formatContentDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatContentLink(value: string) {
  return /^https?:\/\//i.test(value) ? value : `https://${value}`;
}

function toDateTimeLocal(value?: string | null) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);

  return localDate.toISOString().slice(0, 16);
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
