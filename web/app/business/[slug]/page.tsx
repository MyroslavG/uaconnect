import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CalendarDays,
  Clock,
  ExternalLink,
  Globe,
  Globe2,
  Instagram,
  Languages,
  LinkIcon,
  MapPin,
  Phone,
  ShieldCheck,
} from "lucide-react";

import { BusinessLogo } from "@/components/business-logo";
import { BusinessProfileActions } from "@/components/business-profile-actions";
import { ContactAccessCard } from "@/components/contact-access-card";
import { MapEmbed } from "@/components/map-embed";
import { SaveBusinessButton } from "@/components/save-business-button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getDirectoryBusiness } from "@/lib/directory-data";
import { copy, localizeBusiness } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/supabase/auth";
import {
  formatExternalUrl,
  formatInstagramHandle,
  formatLocationParts,
  getInstagramUrl,
} from "@/lib/utils";
import type { BusinessContentItem } from "@/lib/types";

type BusinessProfilePageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export function generateStaticParams() {
  return [];
}

export async function generateMetadata({
  params,
}: BusinessProfilePageProps): Promise<Metadata> {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const labels = copy[locale].business;
  const business = await getDirectoryBusiness(slug);

  if (!business) {
    return {
      title: labels.metadataFallback,
    };
  }

  const localizedBusiness = localizeBusiness(business, locale);

  return {
    title: labels.metadataTitle(localizedBusiness.name, localizedBusiness.city),
    description: localizedBusiness.description,
    alternates: {
      canonical: `/business/${business.slug}`,
    },
    openGraph: {
      title: `${business.name} | Kolo`,
      description: localizedBusiness.description,
    },
  };
}

export default async function BusinessProfilePage({
  params,
}: BusinessProfilePageProps) {
  const { slug } = await params;
  const locale = await getRequestLocale();
  const labels = copy[locale];
  const user = await getCurrentUser();
  const rawBusiness = await getDirectoryBusiness(slug, user?.id);

  if (!rawBusiness) {
    notFound();
  }

  const isOwner = Boolean(
    user && rawBusiness.ownerId && rawBusiness.ownerId === user.id,
  );
  const canViewContacts = Boolean(user);
  const dashboardHref = rawBusiness.registrationId
    ? `/dashboard#business-${rawBusiness.registrationId}`
    : "/dashboard";
  const business = localizeBusiness(rawBusiness, locale);
  const instagramUrl = rawBusiness.instagram
    ? getInstagramUrl(rawBusiness.instagram)
    : "";
  const instagramHandle = rawBusiness.instagram
    ? formatInstagramHandle(rawBusiness.instagram)
    : "";
  const locationLabel = formatLocationParts(
    business.neighborhood,
    business.city,
  );
  const servesAllCanadaLabel =
    locale === "uk" ? "Онлайн · по всій Канаді" : "Online · Canada-wide";
  const categoryHref = rawBusiness.citySlug
    ? `/${rawBusiness.citySlug}/${rawBusiness.categorySlug}`
    : `/search?category=${rawBusiness.categorySlug}&near=${encodeURIComponent(
        business.city,
      )}`;
  const nextPath = `/business/${rawBusiness.slug}`;
  const contentLabels = getBusinessContentLabels(locale);
  const serviceItems = (business.contentItems ?? []).filter(
    (item) => item.type === "service",
  );
  const eventItems = (business.contentItems ?? []).filter(
    (item) => item.type === "event",
  );

  return (
    <article>
      <section className="container py-6">
        <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-hover-blue-foreground dark:hover:text-hover-blue">
            {labels.common.home}
          </Link>
          <span>/</span>
          <Link
            href={categoryHref}
            className="hover:text-hover-blue-foreground dark:hover:text-hover-blue"
          >
            {business.city} {business.category}
          </Link>
          <span>/</span>
          <span>{business.name}</span>
        </div>

        <div className="relative overflow-hidden rounded-lg border bg-[linear-gradient(135deg,hsl(var(--primary)/0.12),hsl(var(--accent)/0.18)_48%,hsl(var(--muted)))] p-6 md:p-10">
          <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0,transparent_39px,hsl(var(--foreground)/0.05)_40px),linear-gradient(0deg,transparent_0,transparent_39px,hsl(var(--foreground)/0.05)_40px)] bg-[size:40px_40px]" />
          <div className="relative max-w-4xl">
            <div className="flex flex-wrap items-center gap-3">
              <BusinessLogo
                className="h-14 w-14 bg-background/85"
                iconClassName="h-6 w-6"
                logoUrl={business.logoUrl}
                name={business.name}
              />
              <Badge className="border-accent/30 bg-accent/15 text-accent">
                {business.category}
              </Badge>
              {business.servesAllCanada ? (
                <Badge
                  variant="outline"
                  className="bg-secondary text-foreground"
                >
                  <Globe2 className="mr-1.5 h-3.5 w-3.5" />
                  {servesAllCanadaLabel}
                </Badge>
              ) : null}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <h1 className="text-balance text-4xl font-black tracking-normal md:text-6xl">
                {business.name}
              </h1>
              {business.verifiedAt ? (
                <Badge variant="green" className="h-8 gap-1.5 px-3">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  {labels.business.verified}
                </Badge>
              ) : null}
            </div>
            <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
              {locationLabel ? (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-primary" />
                  {locationLabel}
                </span>
              ) : null}
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-primary" />
                {business.hours}
              </span>
            </p>
          </div>
        </div>
      </section>

      <section className="container grid gap-8 pb-12 lg:grid-cols-[1fr_360px]">
        <div>
          <div className="grid gap-8">
            <div>
              <h2 className="text-2xl font-bold">{labels.business.about}</h2>
              <p className="mt-3 max-w-3xl text-base leading-8 text-muted-foreground">
                {business.longDescription}
              </p>
            </div>
            {serviceItems.length > 0 ? (
              <BusinessContentSection
                items={serviceItems}
                labels={contentLabels}
                title={contentLabels.services}
              />
            ) : null}
            {eventItems.length > 0 ? (
              <BusinessContentSection
                items={eventItems}
                labels={contentLabels}
                title={contentLabels.events}
              />
            ) : null}
            <div>
              <h2 className="text-2xl font-bold">
                {labels.business.languages}
              </h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {business.languages.map((language) => (
                  <Badge key={language} variant="green">
                    <Languages className="mr-1.5 h-3.5 w-3.5" />
                    {language}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{labels.business.tags}</h2>
              <div className="mt-3 flex flex-wrap gap-2">
                {business.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
            <div>
              <h2 className="text-2xl font-bold">{labels.business.location}</h2>
              {business.address && canViewContacts ? (
                <>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {business.address}
                  </p>
                  <div className="mt-4 overflow-hidden rounded-lg border bg-card">
                    <MapEmbed
                      query={rawBusiness.address}
                      title={labels.business.mapTitle(business.name)}
                      className="h-80 w-full"
                    />
                  </div>
                </>
              ) : business.address ? (
                <ContactAccessCard
                  className="mt-3 max-w-xl"
                  locale={locale}
                  nextPath={nextPath}
                  tone="map"
                />
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  {labels.business.noAddress}
                </p>
              )}
            </div>
          </div>
        </div>

        <aside className="lg:pt-16">
          <div className="sticky top-24 rounded-lg border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">{labels.common.contact}</h2>
              <SaveBusinessButton
                businessId={rawBusiness.id}
                canSave={canViewContacts}
                isSaved={rawBusiness.isSaved}
                locale={locale}
                slug={rawBusiness.slug}
              />
            </div>
            {canViewContacts ? (
              <div className="mt-4 grid gap-3 text-sm">
                {business.phone ? (
                  <a
                    href={`tel:${business.phone}`}
                    className="flex items-center gap-3 rounded-md border bg-background p-3 transition hover:border-hover-blue-border hover:bg-hover-blue/35"
                  >
                    <Phone className="h-4 w-4 text-primary" />
                    {business.phone}
                  </a>
                ) : null}
                {business.website ? (
                  <a
                    href={business.website}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md border bg-background p-3 transition hover:border-hover-blue-border hover:bg-hover-blue/35"
                  >
                    <Globe className="h-4 w-4 text-primary" />
                    <span className="truncate">
                      {formatExternalUrl(business.website)}
                    </span>
                    <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ) : null}
                {business.instagram ? (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-3 rounded-md border bg-background p-3 transition hover:border-hover-blue-border hover:bg-hover-blue/35"
                  >
                    <Instagram className="h-4 w-4 text-primary" />
                    {instagramHandle}
                    <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ) : null}
                {business.address ? (
                  <div className="flex items-start gap-3 rounded-md border bg-background p-3">
                    <MapPin className="mt-0.5 h-4 w-4 text-primary" />
                    <span>{business.address}</span>
                  </div>
                ) : null}
              </div>
            ) : (
              <ContactAccessCard
                className="mt-4"
                locale={locale}
                nextPath={nextPath}
              />
            )}
            {isOwner ? (
              <>
                <Separator className="my-5" />
                <BusinessProfileActions
                  dashboardHref={dashboardHref}
                  locale={locale}
                />
              </>
            ) : null}
          </div>
        </aside>
      </section>

    </article>
  );
}

function BusinessContentSection({
  items,
  labels,
  title,
}: {
  items: BusinessContentItem[];
  labels: ReturnType<typeof getBusinessContentLabels>;
  title: string;
}) {
  return (
    <section>
      <h2 className="text-2xl font-bold">{title}</h2>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <article
            className="overflow-hidden rounded-lg border bg-card shadow-sm"
            key={item.id}
          >
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt=""
                className="h-48 w-full object-cover"
                src={item.imageUrl}
              />
            ) : null}
            <div className="grid gap-3 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="bg-background">
                  {item.type === "event" ? labels.event : labels.service}
                </Badge>
                {item.isFree ? (
                  <Badge variant="green">{labels.free}</Badge>
                ) : item.price ? (
                  <Badge variant="outline" className="bg-background">
                    {item.price}
                  </Badge>
                ) : null}
                {item.isOnline ? (
                  <Badge variant="secondary">
                    <Globe2 className="mr-1.5 h-3.5 w-3.5" />
                    {labels.online}
                  </Badge>
                ) : null}
              </div>
              <div>
                <h3 className="text-xl font-black leading-tight">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              </div>
              {item.type === "event" ? (
                <div className="grid gap-2 text-sm font-semibold text-muted-foreground">
                  {item.startsAt ? (
                    <span className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-primary" />
                      {formatContentDate(item.startsAt)}
                    </span>
                  ) : null}
                  {item.location ? (
                    <span className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" />
                      {item.location}
                    </span>
                  ) : null}
                  {item.linkUrl ? (
                    <a
                      className="flex items-center gap-2 text-foreground hover:underline"
                      href={formatContentLink(item.linkUrl)}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <LinkIcon className="h-4 w-4 text-primary" />
                      {formatExternalUrl(item.linkUrl)}
                      <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function getBusinessContentLabels(locale: "uk" | "en") {
  return locale === "uk"
    ? {
        services: "Послуги",
        events: "Події",
        service: "Послуга",
        event: "Подія",
        free: "Безкоштовно",
        online: "Онлайн",
      }
    : {
        services: "Services",
        events: "Events",
        service: "Service",
        event: "Event",
        free: "Free",
        online: "Online",
      };
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
