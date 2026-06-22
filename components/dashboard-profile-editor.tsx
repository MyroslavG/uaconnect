"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, Save, Upload, UserRound } from "lucide-react";

import {
  updateOwnerProfile,
  type DashboardActionState,
} from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
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
import type { Locale } from "@/lib/i18n";
import { getSafeImageUrl } from "@/lib/utils";

type DashboardProfileEditorProps = {
  avatarUrl: string;
  contactEmail: string;
  googleEmail: string;
  locale: Locale;
  name: string;
};

const text = {
  uk: {
    trigger: "Редагувати профіль",
    title: "Профіль власника",
    description:
      "Ці дані використовуються в UAConnect. Email Google акаунта показаний окремо і керується через Google.",
    name: "Ім'я",
    contactEmail: "Контактний email",
    googleEmail: "Google акаунт",
    googleHint:
      "Цей email використовується для входу. Щоб змінити сам Google акаунт, потрібно перепідключити бізнес до іншого акаунта.",
    photo: "Фото профілю",
    photoHint: "PNG, JPG, WebP або GIF до 2 MB.",
    save: "Зберегти",
    saving: "Зберігаємо...",
    saved: "Профіль збережено.",
  },
  en: {
    trigger: "Edit profile",
    title: "Owner profile",
    description:
      "These details are used on UAConnect. Your Google account email is shown separately and managed by Google.",
    name: "Name",
    contactEmail: "Contact email",
    googleEmail: "Google account",
    googleHint:
      "This email is used for sign-in. To change the Google account itself, transfer the business to another account.",
    photo: "Profile photo",
    photoHint: "PNG, JPG, WebP, or GIF up to 2 MB.",
    save: "Save",
    saving: "Saving...",
    saved: "Profile saved.",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: DashboardActionState = {
  ok: false,
  message: "",
};

export function DashboardProfileEditor({
  avatarUrl,
  contactEmail,
  googleEmail,
  locale,
  name,
}: DashboardProfileEditorProps) {
  const labels = text[locale];
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateOwnerProfile,
    initialState,
  );
  const safeAvatarUrl = getSafeImageUrl(avatarUrl);

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="gap-2">
          <UserRound className="h-4 w-4" />
          {labels.trigger}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{labels.title}</DialogTitle>
          <DialogDescription>{labels.description}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="grid gap-5">
          <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
            <span
              aria-label={safeAvatarUrl ? name : undefined}
              className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-background bg-cover bg-center text-lg font-black text-primary ring-1 ring-border"
              role={safeAvatarUrl ? "img" : undefined}
              style={
                safeAvatarUrl
                  ? { backgroundImage: `url(${JSON.stringify(safeAvatarUrl)})` }
                  : undefined
              }
            >
              {safeAvatarUrl ? null : <UserRound className="h-7 w-7" />}
            </span>
            <div className="min-w-0">
              <p className="truncate text-lg font-black">{name}</p>
              <p className="truncate text-sm text-muted-foreground">
                {contactEmail || googleEmail}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="owner-full-name">{labels.name}</Label>
              <Input
                id="owner-full-name"
                name="fullName"
                defaultValue={name}
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="owner-contact-email">
                {labels.contactEmail}
              </Label>
              <Input
                id="owner-contact-email"
                name="contactEmail"
                type="email"
                defaultValue={contactEmail}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="owner-avatar-file">{labels.photo}</Label>
            <Input
              id="owner-avatar-file"
              name="avatarFile"
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
            />
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Upload className="h-3.5 w-3.5" />
              {labels.photoHint}
            </p>
          </div>

          <div className="rounded-lg border bg-background p-4">
            <p className="flex items-center gap-2 text-sm font-bold">
              <Mail className="h-4 w-4 text-primary" />
              {labels.googleEmail}
            </p>
            <p className="mt-1 truncate text-sm text-muted-foreground">
              {googleEmail}
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {labels.googleHint}
            </p>
          </div>

          {state.message ? (
            <p
              className={`rounded-md border px-3 py-2 text-sm font-semibold ${
                state.ok
                  ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-destructive/20 bg-destructive/10 text-destructive"
              }`}
            >
              {state.ok ? labels.saved : state.message}
            </p>
          ) : null}

          <Button type="submit" disabled={isPending}>
            <Save className="h-4 w-4" />
            {isPending ? labels.saving : labels.save}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
