"use client";

import Link from "next/link";
import { useState } from "react";
import {
  CalendarDays,
  ExternalLink,
  Globe2,
  Link as LinkIcon,
  Lock,
  MapPin,
} from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Business, BusinessContentItem } from "@/lib/types";
import { formatExternalUrl, formatPriceWithCurrency } from "@/lib/utils";

export type BusinessContentCardLabels = {
  contactSignInText: string;
  contactSignInTitle: string;
  event: string;
  free: string;
  link: string;
  online: string;
  service: string;
  signIn: string;
};

export type BusinessContentCardEntry = {
  business?: Pick<Business, "name" | "slug">;
  item: BusinessContentItem;
};

type BusinessContentCardsProps = {
  canViewContacts?: boolean;
  entries: BusinessContentCardEntry[];
  labels: BusinessContentCardLabels;
  nextPath?: string;
  showBusinessName?: boolean;
};

export function BusinessContentCards({
  canViewContacts = false,
  entries,
  labels,
  nextPath = "/",
  showBusinessName = false,
}: BusinessContentCardsProps) {
  const [selectedEntry, setSelectedEntry] =
    useState<BusinessContentCardEntry | null>(null);

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
              showBusinessName={showBusinessName}
            />
          </article>
        ))}
      </div>

      <ContentDetailDialog
        canViewContacts={canViewContacts}
        labels={labels}
        nextPath={nextPath}
        onClose={() => setSelectedEntry(null)}
        selectedEntry={selectedEntry}
      />
    </>
  );
}

export function BusinessContentPulseList({
  canViewContacts = false,
  entries,
  labels,
  nextPath = "/",
}: BusinessContentCardsProps) {
  const [selectedEntry, setSelectedEntry] =
    useState<BusinessContentCardEntry | null>(null);

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
                  {entry.item.type === "event" ? labels.event : labels.service}
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
              <ExternalLink className="mt-1 h-4 w-4 shrink-0 opacity-50 transition group-hover:opacity-100" />
            </div>
          </article>
        ))}
      </div>
      <ContentDetailDialog
        canViewContacts={canViewContacts}
        labels={labels}
        nextPath={nextPath}
        onClose={() => setSelectedEntry(null)}
        selectedEntry={selectedEntry}
      />
    </>
  );
}

function ContentDetailDialog({
  canViewContacts,
  labels,
  nextPath,
  onClose,
  selectedEntry,
}: {
  canViewContacts: boolean;
  labels: BusinessContentCardLabels;
  nextPath: string;
  onClose: () => void;
  selectedEntry: BusinessContentCardEntry | null;
}) {
  return (
    <Dialog
      open={Boolean(selectedEntry)}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        {selectedEntry ? (
          <ContentDetail
            canViewContacts={canViewContacts}
            entry={selectedEntry}
            labels={labels}
            nextPath={nextPath}
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
  showBusinessName,
}: {
  canViewContacts: boolean;
  entry: BusinessContentCardEntry;
  labels: BusinessContentCardLabels;
  showBusinessName: boolean;
}) {
  const { business, item } = entry;

  return (
    <>
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img alt="" className="h-44 w-full object-cover" src={item.imageUrl} />
      ) : null}
      <div className="grid gap-3 p-5">
        <ContentBadges item={item} labels={labels} />
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
  labels,
  nextPath,
}: {
  canViewContacts: boolean;
  entry: BusinessContentCardEntry;
  labels: BusinessContentCardLabels;
  nextPath: string;
}) {
  const { business, item } = entry;
  const hasLockedContacts = !canViewContacts && Boolean(item.location || item.linkUrl);

  return (
    <div className="grid gap-5">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          alt=""
          className="max-h-[22rem] w-full rounded-md object-cover"
          src={item.imageUrl}
        />
      ) : null}
      <DialogHeader>
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <ContentBadges item={item} labels={labels} />
        </div>
        <DialogTitle className="text-3xl font-black tracking-normal">
          {item.title}
        </DialogTitle>
        {business ? (
          <DialogDescription asChild>
            <Link
              className="inline-flex w-fit items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm font-bold text-foreground transition hover:border-hover-blue-border hover:bg-hover-blue"
              href={`/business/${business.slug}`}
            >
              {business.name}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Link>
          </DialogDescription>
        ) : null}
      </DialogHeader>
      <p className="whitespace-pre-line text-sm leading-7 text-muted-foreground">
        {item.description}
      </p>
      <ContentMeta
        canViewContacts={canViewContacts}
        item={item}
        labels={labels}
      />
      {hasLockedContacts ? (
        <LockedContentContacts labels={labels} nextPath={nextPath} />
      ) : null}
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
        {item.type === "event" ? labels.event : labels.service}
      </Badge>
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

function ContentMeta({
  canViewContacts,
  compact = false,
  item,
  labels,
}: {
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
          : "grid gap-3 rounded-md border bg-muted/40 p-4 text-sm font-semibold text-muted-foreground"
      }
    >
      {item.startsAt ? (
        <span className="flex items-center gap-2">
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
          <a
            className="flex items-center gap-2 text-foreground transition hover:text-primary"
            href={formatMapLink(item.location)}
            rel="noreferrer"
            target="_blank"
          >
            <MapPin className="h-4 w-4 text-primary" />
            {item.location}
            <ExternalLink className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
          </a>
        )
      ) : null}
      {linkUrl && compact ? (
        <span className="flex min-w-0 items-center gap-2">
          <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{formatExternalUrl(item.linkUrl ?? "")}</span>
        </span>
      ) : linkUrl ? (
        <a
          className="flex min-w-0 items-center gap-2 text-foreground transition hover:text-primary"
          href={linkUrl}
          onClick={(event) => event.stopPropagation()}
          rel="noreferrer"
          target="_blank"
        >
          <LinkIcon className="h-4 w-4 shrink-0 text-primary" />
          <span className="truncate">{formatExternalUrl(item.linkUrl ?? "")}</span>
          <ExternalLink className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </a>
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
    <div className="rounded-md border bg-muted/40 p-4 text-sm">
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
