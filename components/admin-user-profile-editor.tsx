"use client";

import { type ReactNode, useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  BriefcaseBusiness,
  ClipboardList,
  Mail,
  Save,
  ShieldCheck,
  Upload,
  UserRound,
} from "lucide-react";

import {
  updateAdminUserProfile,
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
import type { Locale } from "@/lib/i18n";
import type { Database } from "@/lib/supabase/database.types";
import { getSafeImageUrl } from "@/lib/utils";

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];

type AdminUserProfileEditorProps = {
  businessCount: number;
  currentUserId: string;
  locale: Locale;
  profile: ProfileRow;
  registrationCount: number;
};

const text = {
  uk: {
    admin: "Адмін",
    avatar: "Фото профілю",
    avatarHint: "PNG, JPG, WebP або GIF до 2 MB.",
    businessCount: "Бізнесів",
    clearAvatar: "Прибрати поточне фото",
    contactEmail: "Контактний email",
    edit: "Редагувати",
    googleEmail: "Google email",
    googleHint:
      "Цей email використовується для входу через Google. Тут можна змінити контактний email, який бачать клієнти.",
    name: "Ім'я",
    noEmail: "Email не вказано",
    noName: "Без імені",
    role: "Роль",
    roleAdmin: "Адмін",
    roleUser: "Користувач",
    save: "Зберегти",
    saving: "Зберігаємо...",
    self: "Ваш акаунт",
    registrations: "Заявок",
    title: "Редагувати користувача",
    user: "Користувач",
    userId: "ID",
  },
  en: {
    admin: "Admin",
    avatar: "Profile photo",
    avatarHint: "PNG, JPG, WebP, or GIF up to 2 MB.",
    businessCount: "Businesses",
    clearAvatar: "Remove current photo",
    contactEmail: "Contact email",
    edit: "Edit",
    googleEmail: "Google email",
    googleHint:
      "This email is used for Google sign-in. You can edit the public contact email clients see.",
    name: "Name",
    noEmail: "No email",
    noName: "No name",
    role: "Role",
    roleAdmin: "Admin",
    roleUser: "User",
    save: "Save",
    saving: "Saving...",
    self: "Your account",
    registrations: "Registrations",
    title: "Edit user",
    user: "User",
    userId: "ID",
  },
} satisfies Record<Locale, Record<string, string>>;

const initialState: AdminUserActionState = {
  ok: false,
  message: "",
};

export function AdminUserProfileEditor({
  businessCount,
  currentUserId,
  locale,
  profile,
  registrationCount,
}: AdminUserProfileEditorProps) {
  const labels = text[locale];
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    updateAdminUserProfile,
    initialState,
  );
  const name = profile.full_name?.trim() || labels.noName;
  const contactEmail = profile.contact_email?.trim() || "";
  const googleEmail = profile.email?.trim() || "";
  const safeAvatarUrl = getSafeImageUrl(profile.avatar_url ?? "");
  const isCurrentUser = profile.id === currentUserId;

  useEffect(() => {
    if (state.ok) {
      router.refresh();
    }
  }, [router, state.ok]);

  return (
    <Card className="min-w-0 border-white/70 bg-card/95 shadow-sm dark:border-white/10">
      <CardContent className="grid min-w-0 gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={name} safeAvatarUrl={safeAvatarUrl} />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-xl font-black">{name}</h2>
              {profile.role === "admin" ? (
                <Badge variant="accent">{labels.admin}</Badge>
              ) : (
                <Badge variant="outline">{labels.user}</Badge>
              )}
              {isCurrentUser ? (
                <Badge variant="outline">{labels.self}</Badge>
              ) : null}
            </div>
            <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
              <InfoLine
                icon={<ShieldCheck className="h-4 w-4 text-primary" />}
                label={labels.googleEmail}
                value={googleEmail || labels.noEmail}
              />
              <InfoLine
                icon={<Mail className="h-4 w-4 text-primary" />}
                label={labels.contactEmail}
                value={contactEmail || labels.noEmail}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs font-bold uppercase text-muted-foreground">
              <CountPill
                icon={<BriefcaseBusiness />}
                label={labels.businessCount}
                value={businessCount}
              />
              <CountPill
                icon={<ClipboardList />}
                label={labels.registrations}
                value={registrationCount}
              />
              <span className="max-w-full truncate rounded-md bg-muted px-2 py-1">
                {labels.userId}: {profile.id.slice(0, 8)}
              </span>
            </div>
          </div>
        </div>

        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" className="justify-center">
              <UserRound className="h-4 w-4" />
              {labels.edit}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[calc(100dvh-1rem)] overflow-y-auto p-4 sm:max-w-2xl sm:p-6">
            <DialogHeader>
              <DialogTitle>{labels.title}</DialogTitle>
              <DialogDescription>{labels.googleHint}</DialogDescription>
            </DialogHeader>

            <form action={formAction} className="grid min-w-0 gap-5">
              <input type="hidden" name="userId" value={profile.id} />

              <div className="flex items-center gap-4 rounded-lg border bg-muted/50 p-4">
                <Avatar name={name} safeAvatarUrl={safeAvatarUrl} />
                <div className="min-w-0">
                  <p className="truncate text-lg font-black">{name}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {labels.googleEmail}: {googleEmail || labels.noEmail}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {labels.contactEmail}: {contactEmail || labels.noEmail}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-user-name-${profile.id}`}>
                    {labels.name}
                  </Label>
                  <Input
                    id={`admin-user-name-${profile.id}`}
                    name="fullName"
                    defaultValue={profile.full_name ?? ""}
                  />
                </div>
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-user-contact-${profile.id}`}>
                    {labels.contactEmail}
                  </Label>
                  <Input
                    id={`admin-user-contact-${profile.id}`}
                    name="contactEmail"
                    type="email"
                    defaultValue={profile.contact_email ?? ""}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <div className="grid min-w-0 gap-2">
                  <Label htmlFor={`admin-user-role-${profile.id}`}>
                    {labels.role}
                  </Label>
                  <select
                    id={`admin-user-role-${profile.id}`}
                    name="role"
                    defaultValue={profile.role}
                    className="h-11 w-full min-w-0 rounded-md border border-input bg-background/85 px-3 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
                  >
                    <option value="user">{labels.roleUser}</option>
                    <option value="admin">{labels.roleAdmin}</option>
                  </select>
                </div>
                <div className="grid min-w-0 gap-2 rounded-lg border bg-background p-3">
                  <p className="flex items-center gap-2 text-sm font-bold">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    {labels.googleEmail}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {googleEmail || labels.noEmail}
                  </p>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor={`admin-user-avatar-${profile.id}`}>
                  {labels.avatar}
                </Label>
                <Input
                  id={`admin-user-avatar-${profile.id}`}
                  name="avatarFile"
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                />
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Upload className="h-3.5 w-3.5" />
                  {labels.avatarHint}
                </p>
                {safeAvatarUrl ? (
                  <label className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                    <input
                      name="clearAvatar"
                      type="checkbox"
                      className="h-4 w-4 rounded border-input accent-primary"
                    />
                    {labels.clearAvatar}
                  </label>
                ) : null}
              </div>

              <ActionMessage state={state} />

              <Button type="submit" disabled={isPending}>
                <Save className="h-4 w-4" />
                {isPending ? labels.saving : labels.save}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function Avatar({
  name,
  safeAvatarUrl,
}: {
  name: string;
  safeAvatarUrl: string;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

  return (
    <span
      aria-label={safeAvatarUrl ? name : undefined}
      className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 bg-cover bg-center text-sm font-black text-primary ring-1 ring-primary/15"
      role={safeAvatarUrl ? "img" : undefined}
      style={
        safeAvatarUrl
          ? { backgroundImage: `url(${JSON.stringify(safeAvatarUrl)})` }
          : undefined
      }
    >
      {safeAvatarUrl ? null : initials || <UserRound className="h-6 w-6" />}
    </span>
  );
}

function CountPill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md bg-muted px-2 py-1 [&_svg]:h-3.5 [&_svg]:w-3.5 [&_svg]:text-primary">
      {icon}
      {value} {label}
    </span>
  );
}

function InfoLine({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <p className="flex min-w-0 items-center gap-2">
      <span className="shrink-0">{icon}</span>
      <span className="shrink-0 font-bold text-foreground">{label}:</span>
      <span className="truncate">{value}</span>
    </p>
  );
}

function ActionMessage({ state }: { state: AdminUserActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
        state.ok
          ? "border-primary/25 bg-primary/10 text-primary"
          : "border-destructive/20 bg-destructive/10 text-destructive"
      }`}
    >
      {state.message}
    </p>
  );
}
