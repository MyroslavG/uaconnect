"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Globe2,
  Instagram,
  Link as LinkIcon,
  Lock,
  MapPin,
  Phone,
} from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { AnalyticsLink } from "@/components/analytics-link";
import { BusinessLogo } from "@/components/business-logo";
import { ShareLinkButton } from "@/components/share-link-button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trackAnalyticsEvent } from "@/lib/analytics";
import type { Business, BusinessContentItem } from "@/lib/types";
import {
  formatExternalUrl,
  formatInstagramHandle,
  formatPriceWithCurrency,
  getInstagramUrl,
  getOptimizedImageUrl,
  imageOptimizationPresets,
  cn,
  type ImageOptimizationOptions,
} from "@/lib/utils";
import type { Locale } from "@/lib/i18n";

const TILE_BATCH_SIZE = 20;

export type BusinessContentCardLabels = {
  contactSignInText: string;
  contactSignInTitle: string;
  event: string;
  product: string;
  available: string;
  outOfStock: string;
  free: string;
  link: string;
  online: string;
  service: string;
  signIn: string;
  businessContacts?: string;
  phone?: string;
  website?: string;
  instagram?: string;
  address?: string;
};

export type BusinessContentCardEntry = {
  business?: Pick<
    Business,
    | "address"
    | "category"
    | "city"
    | "id"
    | "instagram"
    | "logoUrl"
    | "name"
    | "phone"
    | "slug"
    | "website"
  >;
  item: BusinessContentItem;
};

type BusinessContentCardsProps = {
  canViewContacts?: boolean;
  entries: BusinessContentCardEntry[];
  labels: BusinessContentCardLabels;
  locale?: Locale;
  nextPath?: string;
  showBusinessName?: boolean;
};

function useSharedContentEntry(entries: BusinessContentCardEntry[]) {
  const searchParams = useSearchParams();
  const sharedContentId = searchParams.get("content");
  const [selectedEntry, setSelectedEntry] =
    useState<BusinessContentCardEntry | null>(null);

  useEffect(() => {
    if (!sharedContentId) {
      return;
    }

    const matchingEntry = entries.find(
      (entry) => entry.item.id === sharedContentId,
    );

    if (matchingEntry) {
      setSelectedEntry(matchingEntry);
    }
  }, [entries, sharedContentId]);

  return [selectedEntry, setSelectedEntry] as const;
}

export function BusinessContentCards({
  canViewContacts = false,
  entries,
  labels,
  locale = "uk",
  nextPath = "/",
  showBusinessName = false,
}: BusinessContentCardsProps) {
  const [selectedEntry, setSelectedEntry] = useSharedContentEntry(entries);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <article
            className="group overflow-hidden rounded-lg border bg-card text-left text-card-foreground shadow-sm transition hover:-translate-y-1 hover:border-hover-blue-border hover:shadow-lift"
            key={`${entry.business?.slug ?? "content"}-${entry.item.id}`}
            onClick={() => setSelectedEntry(entry)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedEntry(entry);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <ContentCardBody
              canViewContacts={canViewContacts}
              entry={entry}
              labels={labels}
              locale={locale}
              showBusinessName={showBusinessName}
            />
          </article>
        ))}
      </div>

      <ContentDetailDialog
        canViewContacts={canViewContacts}
        labels={labels}
        locale={locale}
        nextPath={nextPath}
        onClose={() => setSelectedEntry(null)}
        selectedEntry={selectedEntry}
      />
    </>
  );
}

export function BusinessContentTiles({
  canViewContacts = false,
  entries,
  labels,
  locale = "uk",
  nextPath = "/",
}: BusinessContentCardsProps) {
  const [selectedEntry, setSelectedEntry] = useSharedContentEntry(entries);
  const [visibleCount, setVisibleCount] = useState(TILE_BATCH_SIZE);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const imageEntries = useMemo(
    () =>
      entries.filter((entry) =>
        Boolean(
          getContentImageUrls(entry.item, imageOptimizationPresets.thumbnail)[0],
        ),
      ),
    [entries],
  );
  const tileEntries = imageEntries.length ? imageEntries : entries;
  const visibleEntries = tileEntries.slice(0, visibleCount);
  const hasMoreTiles = visibleCount < tileEntries.length;

  useEffect(() => {
    setVisibleCount(TILE_BATCH_SIZE);
  }, [entries]);

  useEffect(() => {
    if (!hasMoreTiles) {
      return;
    }

    const sentinel = sentinelRef.current;

    if (!sentinel) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisibleCount((currentCount) =>
            Math.min(currentCount + TILE_BATCH_SIZE, tileEntries.length),
          );
        }
      },
      { rootMargin: "640px 0px" },
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreTiles, tileEntries.length, visibleCount]);

  return (
    <>
      <div className="grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-4 xl:grid-cols-5">
        {visibleEntries.map((entry) => {
          const coverImageUrl = getContentImageUrls(
            entry.item,
            imageOptimizationPresets.thumbnail,
          )[0];

          return (
            <article
              className="group relative aspect-[4/5] overflow-hidden rounded-sm bg-muted text-left ring-1 ring-border/70 transition hover:ring-2 hover:ring-foreground/30"
              key={`${entry.business?.slug ?? "content"}-${entry.item.id}`}
              onClick={() => setSelectedEntry(entry)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setSelectedEntry(entry);
                }
              }}
              role="button"
              tabIndex={0}
            >
              {coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  decoding="async"
                  loading="lazy"
                  src={coverImageUrl}
                />
              ) : (
                <div className="h-full w-full bg-secondary" />
              )}
              <span className="absolute inset-0 bg-black/0 transition group-hover:bg-black/15" />
            </article>
          );
        })}
      </div>

      {hasMoreTiles ? (
        <div
          ref={sentinelRef}
          className="mt-5 grid grid-cols-3 gap-1.5 sm:gap-2 md:grid-cols-4 xl:grid-cols-5"
        >
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              className="aspect-[4/5] animate-pulse rounded-sm bg-muted"
              key={`content-tile-loading-${index}`}
            />
          ))}
        </div>
      ) : null}

      <ContentDetailDialog
        canViewContacts={canViewContacts}
        entries={tileEntries}
        labels={labels}
        locale={locale}
        nextPath={nextPath}
        onClose={() => setSelectedEntry(null)}
        onSelectEntry={setSelectedEntry}
        selectedEntry={selectedEntry}
      />
    </>
  );
}

export function BusinessContentPulseList({
  canViewContacts = false,
  entries,
  labels,
  locale = "uk",
  nextPath = "/",
}: BusinessContentCardsProps) {
  const [selectedEntry, setSelectedEntry] = useSharedContentEntry(entries);

  return (
    <>
      <div className="mt-5 grid gap-3">
        {entries.map((entry) => (
          <article
            className="group rounded-md border bg-background p-4 transition hover:border-hover-blue-border hover:bg-hover-blue"
            key={`${entry.business?.slug ?? "content"}-${entry.item.id}`}
            onClick={() => setSelectedEntry(entry)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSelectedEntry(entry);
              }
            }}
            role="button"
            tabIndex={0}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase text-muted-foreground">
                  {getContentTypeLabel(entry.item, labels)}
                </p>
                <h3 className="mt-1 line-clamp-1 font-black">
                  {entry.item.title}
                </h3>
                {entry.business ? (
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">
                    {entry.business.name}
                  </p>
                ) : null}
              </div>
              <div className="mt-1 flex shrink-0 items-center gap-2">
                <ShareLinkButton
                  className="h-9 w-9"
                  href={getContentShareHref(entry)}
                  locale={locale}
                  text={getContentShareText(entry, locale)}
                  title={entry.item.title}
                />
                <ExternalLink className="h-4 w-4 opacity-50 transition group-hover:opacity-100" />
              </div>
            </div>
          </article>
        ))}
      </div>
      <ContentDetailDialog
        canViewContacts={canViewContacts}
        labels={labels}
        locale={locale}
        nextPath={nextPath}
        onClose={() => setSelectedEntry(null)}
        selectedEntry={selectedEntry}
      />
    </>
  );
}

function ContentDetailDialog({
  canViewContacts,
  entries,
  labels,
  locale,
  nextPath,
  onClose,
  onSelectEntry,
  selectedEntry,
}: {
  canViewContacts: boolean;
  entries?: BusinessContentCardEntry[];
  labels: BusinessContentCardLabels;
  locale: Locale;
  nextPath: string;
  onClose: () => void;
  onSelectEntry?: (entry: BusinessContentCardEntry) => void;
  selectedEntry: BusinessContentCardEntry | null;
}) {
  const selectedIndex =
    selectedEntry && entries
      ? entries.findIndex((entry) => entry.item.id === selectedEntry.item.id)
      : -1;
  const canNavigate =
    Boolean(entries?.length && entries.length > 1) && selectedIndex >= 0;

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    void trackAnalyticsEvent({
      business_id: selectedEntry.business?.id,
      business_name: selectedEntry.business?.name,
      business_slug: selectedEntry.business?.slug,
      content_item_id: selectedEntry.item.id,
      content_type: selectedEntry.item.type,
      event_type: "content_view",
      metadata: {
        title: selectedEntry.item.title,
      },
    });
  }, [selectedEntry]);

  return (
    <Dialog
      open={Boolean(selectedEntry)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="w-[calc(100vw-1.5rem)] max-w-6xl overflow-hidden p-0 sm:max-w-6xl">
        {selectedEntry ? (
          <ContentDetail
            canViewContacts={canViewContacts}
            entry={selectedEntry}
            hasNext={canNavigate}
            hasPrevious={canNavigate}
            labels={labels}
            locale={locale}
            nextPath={nextPath}
            onNext={
              canNavigate && entries && onSelectEntry
                ? () =>
                    onSelectEntry(
                      entries[(selectedIndex + 1) % entries.length],
                    )
                : undefined
            }
            onPrevious={
              canNavigate && entries && onSelectEntry
                ? () =>
                    onSelectEntry(
                      entries[
                        selectedIndex === 0
                          ? entries.length - 1
                          : selectedIndex - 1
                      ],
                    )
                : undefined
            }
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function ContentCardBody({
  canViewContacts,
  entry,
  labels,
  locale,
  showBusinessName,
}: {
  canViewContacts: boolean;
  entry: BusinessContentCardEntry;
  labels: BusinessContentCardLabels;
  locale: Locale;
  showBusinessName: boolean;
}) {
  const { business, item } = entry;
  const coverImageUrl = getContentImageUrls(
    item,
    imageOptimizationPresets.thumbnail,
  )[0];

  return (
    <>
      {coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="h-44 w-full object-cover"
          decoding="async"
          loading="lazy"
          src={coverImageUrl}
        />
      ) : null}
      <div className="grid gap-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <ContentBadges item={item} labels={labels} />
          <ShareLinkButton
            className="shrink-0"
            href={getContentShareHref(entry)}
            locale={locale}
            text={getContentShareText(entry, locale)}
            title={item.title}
          />
        </div>
        <div>
          {showBusinessName && business ? (
            <p className="mb-2 line-clamp-1 text-sm font-semibold text-muted-foreground">
              {business.name}
            </p>
          ) : null}
          <h3 className="line-clamp-2 text-xl font-black leading-tight">
            {item.title}
          </h3>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
            {item.description}
          </p>
        </div>
        <ContentMeta
          canViewContacts={canViewContacts}
          item={item}
          labels={labels}
          compact
        />
      </div>
    </>
  );
}

function ContentDetail({
  canViewContacts,
  entry,
  hasNext = false,
  hasPrevious = false,
  labels,
  locale,
  nextPath,
  onNext,
  onPrevious,
}: {
  canViewContacts: boolean;
  entry: BusinessContentCardEntry;
  hasNext?: boolean;
  hasPrevious?: boolean;
  labels: BusinessContentCardLabels;
  locale: Locale;
  nextPath: string;
  onNext?: () => void;
  onPrevious?: () => void;
}) {
  const { business, item } = entry;
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const businessContacts = getBusinessContactItems(business);
  const hasLockedContacts =
    !canViewContacts &&
    Boolean(item.location || item.linkUrl || businessContacts.length);
  const imageUrls = getContentImageUrls(item, imageOptimizationPresets.detail);
  const hasImages = imageUrls.length > 0;
  const hasLongDescription = item.description.trim().length > 260;

  useEffect(() => {
    setIsCaptionExpanded(false);
  }, [item.id]);

  return (
    <div
      className={cn(
        "grid max-h-[90vh] overflow-hidden",
        hasImages ? "lg:grid-cols-[minmax(0,1fr)_420px]" : null,
      )}
    >
      {hasImages ? (
        <div className="relative min-h-0 bg-black">
          <ContentImageGallery imageUrls={imageUrls} />
          {hasPrevious && onPrevious ? (
            <button
              aria-label="Previous"
              className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
              onClick={onPrevious}
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          ) : null}
          {hasNext && onNext ? (
            <button
              aria-label="Next"
              className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-black/35 text-white backdrop-blur transition hover:bg-black/55"
              onClick={onNext}
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="flex min-h-0 flex-col bg-background">
        <DialogHeader className="border-b border-border/80 p-4 pr-12">
          <div className="flex min-w-0 items-center justify-between gap-3">
            {business ? (
              <Link
                className="flex min-w-0 items-center gap-3 rounded-md transition hover:text-primary"
                href={`/business/${business.slug}`}
              >
                <BusinessLogo
                  className="h-10 w-10 bg-card"
                  logoUrl={business.logoUrl}
                  name={business.name}
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black leading-5">
                    {business.name}
                  </span>
                  <span className="block truncate text-xs font-bold text-muted-foreground">
                    {getContentTypeLabel(item, labels)}
                  </span>
                </span>
              </Link>
            ) : (
              <span className="text-xs font-black uppercase text-muted-foreground">
                {getContentTypeLabel(item, labels)}
              </span>
            )}
            <ShareLinkButton
              className="shrink-0"
              href={getContentShareHref(entry)}
              locale={locale}
              text={getContentShareText(entry, locale)}
              title={item.title}
            />
          </div>
          <DialogTitle className="mt-4 line-clamp-2 text-2xl font-black tracking-normal">
            {item.title}
          </DialogTitle>
          <DialogDescription asChild>
            <div className="mt-2">
              <ContentBadges item={item} labels={labels} />
            </div>
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="rounded-lg border bg-card p-4">
            <p
              className={cn(
                "whitespace-pre-line text-sm leading-7 text-muted-foreground",
                hasLongDescription && !isCaptionExpanded
                  ? "line-clamp-5"
                  : null,
                hasLongDescription && isCaptionExpanded
                  ? "max-h-56 overflow-y-auto pr-2"
                  : null,
              )}
            >
              {item.description}
            </p>
            {hasLongDescription ? (
              <button
                className="mt-3 inline-flex items-center gap-1 text-xs font-black text-foreground transition hover:text-primary"
                onClick={() =>
                  setIsCaptionExpanded((currentValue) => !currentValue)
                }
                type="button"
              >
                {isCaptionExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span className="sr-only">
                  {isCaptionExpanded ? "Close" : "More"}
                </span>
              </button>
            ) : null}
          </div>
          <div className="mt-4 grid gap-4">
            <ContentMeta
              business={business}
              canViewContacts={canViewContacts}
              item={item}
              labels={labels}
            />
            {businessContacts.length > 0 ? (
              <BusinessContactBlock
                businessContacts={businessContacts}
                canViewContacts={canViewContacts}
                labels={labels}
              />
            ) : null}
            {hasLockedContacts ? (
              <LockedContentContacts labels={labels} nextPath={nextPath} />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function ContentImageGallery({ imageUrls }: { imageUrls: string[] }) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const activeImageUrl = imageUrls[activeImageIndex];
  const hasMultipleImages = imageUrls.length > 1;
  const imageUrlsKey = imageUrls.join("|");

  useEffect(() => {
    setActiveImageIndex(0);
  }, [imageUrlsKey]);

  if (!activeImageUrl) {
    return null;
  }

  return (
    <div className="h-full overflow-hidden bg-black">
      <div className="relative h-[46vh] min-h-[18rem] w-full lg:h-[90vh] lg:min-h-[40rem]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          className="h-full w-full object-contain"
          decoding="async"
          src={activeImageUrl}
        />
        {hasMultipleImages ? (
          <>
            <button
              aria-label="Previous"
              className="absolute left-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/90 text-foreground shadow-sm transition hover:bg-white"
              onClick={() =>
                setActiveImageIndex((currentIndex) =>
                  currentIndex === 0 ? imageUrls.length - 1 : currentIndex - 1,
                )
              }
              type="button"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              aria-label="Next"
              className="absolute right-4 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/90 text-foreground shadow-sm transition hover:bg-white"
              onClick={() =>
                setActiveImageIndex((currentIndex) =>
                  currentIndex === imageUrls.length - 1 ? 0 : currentIndex + 1,
                )
              }
              type="button"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-black text-white">
              {activeImageIndex + 1}/{imageUrls.length}
            </span>
          </>
        ) : null}
      </div>
    </div>
  );
}

function ContentBadges({
  item,
  labels,
}: {
  item: BusinessContentItem;
  labels: BusinessContentCardLabels;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="bg-background">
        {getContentTypeLabel(item, labels)}
      </Badge>
      {item.type === "product" ? (
        <Badge variant={item.isAvailable ? "green" : "outline"}>
          {item.isAvailable ? labels.available : labels.outOfStock}
        </Badge>
      ) : null}
      {item.isFree ? (
        <Badge variant="green">{labels.free}</Badge>
      ) : item.price ? (
        <Badge variant="outline" className="bg-background">
          {formatPriceWithCurrency(item.price)}
        </Badge>
      ) : null}
      {item.isOnline ? (
        <Badge variant="secondary">
          <Globe2 className="mr-1.5 h-3.5 w-3.5" />
          {labels.online}
        </Badge>
      ) : null}
    </div>
  );
}

function BusinessContactBlock({
  businessContacts,
  canViewContacts,
  labels,
}: {
  businessContacts: BusinessContactItem[];
  canViewContacts: boolean;
  labels: BusinessContentCardLabels;
}) {
  if (!canViewContacts) {
    return null;
  }

  return (
    <div className="grid gap-3 rounded-lg border bg-card p-4 text-sm">
      <h3 className="font-black">
        {labels.businessContacts ?? "Business contacts"}
      </h3>
      <div className="grid gap-2">
        {businessContacts.map((contact) => (
          <AnalyticsLink
            analytics={{
              businessId: contact.businessId,
              businessName: contact.businessName,
              businessSlug: contact.businessSlug,
              contactType: contact.type,
            }}
            className="flex min-w-0 items-center gap-3 rounded-lg border bg-background px-3 py-2.5 font-semibold text-foreground transition hover:border-hover-blue-border hover:bg-hover-blue"
            href={contact.href}
            key={`${contact.type}-${contact.value}`}
            rel={contact.external ? "noreferrer" : undefined}
            target={contact.external ? "_blank" : undefined}
          >
            {contact.icon}
            <span className="truncate">{contact.value}</span>
            {contact.external ? (
              <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            ) : null}
          </AnalyticsLink>
        ))}
      </div>
    </div>
  );
}

function ContentMeta({
  business,
  canViewContacts,
  compact = false,
  item,
  labels,
}: {
  business?: BusinessContentCardEntry["business"];
  canViewContacts: boolean;
  compact?: boolean;
  item: BusinessContentItem;
  labels: BusinessContentCardLabels;
}) {
  const linkUrl =
    canViewContacts && item.linkUrl ? formatContentLink(item.linkUrl) : "";
  const hasLockedContacts = !canViewContacts && Boolean(item.location || item.linkUrl);
  const hasMeta =
    item.startsAt ||
    (canViewContacts && item.location) ||
    linkUrl ||
    (compact && hasLockedContacts);

  if (!hasMeta) {
    return null;
  }

  return (
    <div
      className={
        compact
          ? "mt-1 grid gap-2 text-sm font-semibold text-muted-foreground"
          : "grid gap-2 text-sm font-semibold text-muted-foreground"
      }
    >
      {item.startsAt ? (
        <span
          className={cn(
            "flex items-center gap-2",
            compact ? null : "rounded-lg border bg-card px-3 py-2.5",
          )}
        >
          <CalendarDays className="h-4 w-4 text-primary" />
          {formatContentDate(item.startsAt)}
        </span>
      ) : null}
      {canViewContacts && item.location ? (
        compact ? (
          <span className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            {item.location}
          </span>
        ) : (
          <AnalyticsLink
            analytics={{
              businessId: business?.id,
              businessName: business?.name,
              businessSlug: business?.slug,
              contactType: "route",
              contentItemId: item.id,
              contentType: item.type,
            }}
            className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-foreground transition hover:border-hover-blue-border hover:bg-hover-blue"
            href={formatMapLink(item.location)}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin className="h-4 w-4 text-primary" />
            {item.location}
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </AnalyticsLink>
        )
      ) : null}
      {linkUrl && compact ? (
        <span className="flex min-w-0 items-center gap-2">
          <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{formatExternalUrl(item.linkUrl ?? "")}</span>
        </span>
      ) : linkUrl ? (
        <AnalyticsLink
          analytics={{
            businessId: business?.id,
            businessName: business?.name,
            businessSlug: business?.slug,
            contactType: "link",
            contentItemId: item.id,
            contentType: item.type,
          }}
            className="flex min-w-0 items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-foreground transition hover:border-hover-blue-border hover:bg-hover-blue"
          href={linkUrl}
          onClick={(event) => event.stopPropagation()}
          rel="noreferrer"
          target="_blank"
        >
          <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{formatExternalUrl(item.linkUrl ?? "")}</span>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </AnalyticsLink>
      ) : null}
      {hasLockedContacts && compact ? (
        <span className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          {labels.contactSignInTitle}
        </span>
      ) : null}
    </div>
  );
}

function LockedContentContacts({
  labels,
  nextPath,
}: {
  labels: BusinessContentCardLabels;
  nextPath: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4 text-sm">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Lock className="h-4 w-4" />
        </span>
        <div>
          <h3 className="font-black">{labels.contactSignInTitle}</h3>
          <p className="mt-1 leading-6 text-muted-foreground">
            {labels.contactSignInText}
          </p>
        </div>
      </div>
      <form action={signInWithGoogle} className="mt-4">
        <input name="next" type="hidden" value={nextPath} />
        <button
          className="inline-flex h-11 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-black text-primary-foreground transition hover:bg-primary/90"
          type="submit"
        >
          {labels.signIn}
        </button>
      </form>
    </div>
  );
}

function getContentShareHref(entry: BusinessContentCardEntry) {
  const businessSlug = entry.business?.slug?.trim();

  if (businessSlug) {
    return `/business/${encodeURIComponent(
      businessSlug,
    )}?content=${encodeURIComponent(entry.item.id)}`;
  }

  return `/search?query=${encodeURIComponent(entry.item.title)}`;
}

function getContentShareText(entry: BusinessContentCardEntry, locale: Locale) {
  if (locale === "uk") {
    return entry.business
      ? `Подивись ${entry.item.title} від ${entry.business.name} у Kolo`
      : `Подивись ${entry.item.title} у Kolo`;
  }

  return entry.business
    ? `Check out ${entry.item.title} by ${entry.business.name} on Kolo`
    : `Check out ${entry.item.title} on Kolo`;
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

function formatMapLink(value: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    value,
  )}`;
}

type BusinessContactItem = {
  businessId?: string;
  businessName?: string;
  businessSlug?: string;
  external?: boolean;
  href: string;
  icon: ReactNode;
  type: "phone" | "website" | "instagram" | "route";
  value: string;
};

function getBusinessContactItems(
  business: BusinessContentCardEntry["business"],
): BusinessContactItem[] {
  if (!business) {
    return [];
  }

  const contacts: BusinessContactItem[] = [];

  if (business.phone) {
    contacts.push({
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      href: `tel:${business.phone}`,
      icon: <Phone className="h-4 w-4 shrink-0 text-primary" />,
      type: "phone",
      value: business.phone,
    });
  }

  if (business.website) {
    contacts.push({
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      external: true,
      href: formatContentLink(business.website),
      icon: <Globe2 className="h-4 w-4 shrink-0 text-primary" />,
      type: "website",
      value: formatExternalUrl(business.website),
    });
  }

  if (business.instagram) {
    contacts.push({
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      external: true,
      href: getInstagramUrl(business.instagram),
      icon: <Instagram className="h-4 w-4 shrink-0 text-primary" />,
      type: "instagram",
      value: formatInstagramHandle(business.instagram),
    });
  }

  if (business.address) {
    contacts.push({
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      external: true,
      href: formatMapLink(
        business.city ? `${business.address}, ${business.city}` : business.address,
      ),
      icon: <MapPin className="h-4 w-4 shrink-0 text-primary" />,
      type: "route",
      value: business.address,
    });
  }

  return contacts;
}

function getContentTypeLabel(
  item: BusinessContentItem,
  labels: BusinessContentCardLabels,
) {
  if (item.type === "event") {
    return labels.event;
  }

  if (item.type === "product") {
    return labels.product;
  }

  return labels.service;
}

function getContentImageUrls(
  item: BusinessContentItem,
  options: ImageOptimizationOptions = imageOptimizationPresets.detail,
) {
  const imageUrls =
    item.imageUrls
      ?.map((url) => getOptimizedImageUrl(url, options))
      .filter((url): url is string => Boolean(url)) ?? [];
  const coverImageUrl = getOptimizedImageUrl(item.imageUrl, options);

  if (coverImageUrl && !imageUrls.includes(coverImageUrl)) {
    return [coverImageUrl, ...imageUrls];
  }

  return imageUrls;
}
