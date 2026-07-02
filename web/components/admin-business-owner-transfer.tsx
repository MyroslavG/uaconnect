"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Save } from "lucide-react";

import {
  connectPublicBusinessToOwner,
  transferBusinessOwnership,
  type AdminUserActionState,
} from "@/app/admin/users/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { Locale } from "@/lib/i18n";

export type TransferBusinessOption = {
  id: string;
  name: string;
  publicOwnerLabel: string;
  registrationOwnerLabel: string;
  status: string;
};

export type ConnectBusinessOption = {
  id: string;
  name: string;
  slug: string;
  status: string;
};

export type TransferOwnerOption = {
  id: string;
  label: string;
};

type AdminBusinessOwnerTransferProps = {
  businesses: TransferBusinessOption[];
  connectableBusinesses: ConnectBusinessOption[];
  locale: Locale;
  owners: TransferOwnerOption[];
};

const text = {
  uk: {
    title: "Передати бізнес іншому акаунту",
    intro:
      "Використовуйте це, коли власник увійшов з іншого Google email. Передача оновить і заявку, і публічний бізнес.",
    business: "Бізнес",
    owner: "Новий власник",
    chooseBusiness: "Оберіть бізнес",
    chooseOwner: "Оберіть акаунт",
    current: "Заявка",
    public: "Публічний",
    transfer: "Передати",
    transferring: "Передаємо...",
    noBusinesses: "Немає бізнесів для передачі.",
    noOwners: "Немає користувачів.",
    connectTitle: "Під'єднати бізнес без власника",
    connectIntro:
      "Для бізнесів, створених вручну без заявки, буде створено схвалену заявку і під'єднано її до вибраного Google акаунту.",
    connectBusiness: "Бізнес без заявки",
    connect: "Під'єднати",
    connecting: "Під'єднуємо...",
    noConnectable: "Немає бізнесів без заявки.",
  },
  en: {
    title: "Transfer business to another account",
    intro:
      "Use this when an owner signed in with another Google email. Transfer updates both the registration and the public business.",
    business: "Business",
    owner: "New owner",
    chooseBusiness: "Choose business",
    chooseOwner: "Choose account",
    current: "Registration",
    public: "Public",
    transfer: "Transfer",
    transferring: "Transferring...",
    noBusinesses: "No businesses to transfer.",
    noOwners: "No users.",
    connectTitle: "Connect unlinked business",
    connectIntro:
      "For manually created businesses without a registration, this creates an approved registration and connects it to the selected Google account.",
    connectBusiness: "Business without registration",
    connect: "Connect",
    connecting: "Connecting...",
    noConnectable: "No unlinked businesses.",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: AdminUserActionState = {
  ok: false,
  message: "",
};

export function AdminBusinessOwnerTransfer({
  businesses,
  connectableBusinesses,
  locale,
  owners,
}: AdminBusinessOwnerTransferProps) {
  const labels = text[locale];
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    transferBusinessOwnership,
    initialState,
  );
  const [connectState, connectAction, isConnecting] = useActionState(
    connectPublicBusinessToOwner,
    initialState,
  );
  const canSubmit = businesses.length > 0 && owners.length > 0;
  const canConnect = connectableBusinesses.length > 0 && owners.length > 0;

  useEffect(() => {
    if (state.ok || connectState.ok) {
      router.refresh();
    }
  }, [connectState.ok, router, state.ok]);

  return (
    <Card className="min-w-0 border-white/70 bg-card/95 shadow-sm dark:border-white/10">
      <CardContent className="min-w-0 p-5">
        <div className="mb-5 flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <ArrowRightLeft className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 className="text-2xl font-black">{labels.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {labels.intro}
            </p>
          </div>
        </div>

        <form
          action={formAction}
          className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
        >
          <label className="grid min-w-0 gap-2">
            <Label htmlFor="transfer-registration">{labels.business}</Label>
            <select
              id="transfer-registration"
              name="registrationId"
              required
              disabled={!canSubmit}
              className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
            >
              <option value="">
                {businesses.length ? labels.chooseBusiness : labels.noBusinesses}
              </option>
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} · {labels.current}:{" "}
                  {business.registrationOwnerLabel} · {labels.public}:{" "}
                  {business.publicOwnerLabel} · {business.status}
                </option>
              ))}
            </select>
          </label>

          <label className="grid min-w-0 gap-2">
            <Label htmlFor="transfer-owner">{labels.owner}</Label>
            <select
              id="transfer-owner"
              name="ownerId"
              required
              disabled={!canSubmit}
              className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
            >
              <option value="">
                {owners.length ? labels.chooseOwner : labels.noOwners}
              </option>
              {owners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.label}
                </option>
              ))}
            </select>
          </label>

          <Button type="submit" disabled={isPending || !canSubmit}>
            <Save className="h-4 w-4" />
            {isPending ? labels.transferring : labels.transfer}
          </Button>
        </form>

        {state.message ? (
          <p
            className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${
              state.ok
                ? "border-primary/25 bg-primary/10 text-primary"
                : "border-destructive/20 bg-destructive/10 text-destructive"
            }`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="mt-6 border-t pt-5">
          <div className="mb-4">
            <h3 className="text-lg font-black">{labels.connectTitle}</h3>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              {labels.connectIntro}
            </p>
          </div>

          <form
            action={connectAction}
            className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end"
          >
            <label className="grid min-w-0 gap-2">
              <Label htmlFor="connect-business">{labels.connectBusiness}</Label>
              <select
                id="connect-business"
                name="businessId"
                required
                disabled={!canConnect}
                className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
              >
                <option value="">
                  {connectableBusinesses.length
                    ? labels.chooseBusiness
                    : labels.noConnectable}
                </option>
                {connectableBusinesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} · {business.slug} · {business.status}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid min-w-0 gap-2">
              <Label htmlFor="connect-owner">{labels.owner}</Label>
              <select
                id="connect-owner"
                name="ownerId"
                required
                disabled={!canConnect}
                className="min-h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25 disabled:opacity-60"
              >
                <option value="">
                  {owners.length ? labels.chooseOwner : labels.noOwners}
                </option>
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.label}
                  </option>
                ))}
              </select>
            </label>

            <Button type="submit" disabled={isConnecting || !canConnect}>
              <Save className="h-4 w-4" />
              {isConnecting ? labels.connecting : labels.connect}
            </Button>
          </form>

          {connectState.message ? (
            <p
              className={`mt-4 rounded-md border px-3 py-2 text-sm font-semibold ${
                connectState.ok
                  ? "border-primary/25 bg-primary/10 text-primary"
                  : "border-destructive/20 bg-destructive/10 text-destructive"
              }`}
            >
              {connectState.message}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
