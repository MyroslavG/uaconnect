"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ShieldCheck } from "lucide-react";

import { claimBusinessInvite } from "@/app/claim/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Locale } from "@/lib/i18n";

type ClaimBusinessInviteDialogProps = {
  businessName: string;
  city: string;
  locale: Locale;
  token: string;
};

type ClaimActionState = {
  ok: boolean;
  message: string;
};

const initialState: ClaimActionState = {
  ok: false,
  message: "",
};

const text = {
  uk: {
    open: "Підтвердити доступ",
    title: "Підтвердити бізнес",
    description:
      "Після підтвердження цей бізнес буде прив'язаний до вашого Google акаунта і з'явиться у кабінеті для редагування.",
    business: "Бізнес",
    city: "Локація",
    confirm: "Підтвердити",
    confirming: "Підтверджуємо...",
    cancel: "Не зараз",
  },
  en: {
    open: "Confirm access",
    title: "Confirm business access",
    description:
      "After confirmation, this business will be connected to your Google account and appear in your dashboard for editing.",
    business: "Business",
    city: "Location",
    confirm: "Confirm",
    confirming: "Confirming...",
    cancel: "Not now",
  },
} satisfies Record<Locale, Record<string, string>>;

export function ClaimBusinessInviteDialog({
  businessName,
  city,
  locale,
  token,
}: ClaimBusinessInviteDialogProps) {
  const labels = text[locale];
  const [state, formAction, isPending] = useActionState(
    claimBusinessInvite,
    initialState,
  );

  return (
    <Dialog defaultOpen>
      <DialogTrigger asChild>
        <Button size="lg">
          <ShieldCheck className="h-4 w-4" />
          {labels.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 rounded-lg border bg-muted/60 p-4 text-sm">
          <div>
            <p className="font-bold">{labels.business}</p>
            <p className="mt-1 text-muted-foreground">{businessName}</p>
          </div>
          <div>
            <p className="font-bold">{labels.city}</p>
            <p className="mt-1 text-muted-foreground">{city}</p>
          </div>
        </div>

        <form action={formAction} className="grid gap-4">
          <input type="hidden" name="token" value={token} />
          {state.message ? (
            <p className="rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
              {state.message}
            </p>
          ) : null}
          <DialogFooter>
            <Button asChild type="button" variant="outline">
              <Link href="/">{labels.cancel}</Link>
            </Button>
            <Button type="submit" disabled={isPending}>
              <ShieldCheck className="h-4 w-4" />
              {isPending ? labels.confirming : labels.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
