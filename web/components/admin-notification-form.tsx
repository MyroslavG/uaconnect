"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createNotification,
  type AdminNotificationActionState,
} from "@/app/admin/notifications/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";

type AdminNotificationFormProps = {
  locale: Locale;
};

const initialState: AdminNotificationActionState = {
  ok: false,
  message: "",
};

export function AdminNotificationForm({ locale }: AdminNotificationFormProps) {
  const labels =
    locale === "uk"
      ? {
          badgeEn: "Badge англійською",
          badgeUk: "Badge українською",
          bodyEn: "Текст англійською",
          bodyUk: "Текст українською",
          ctaEn: "CTA англійською",
          ctaUk: "CTA українською",
          draft: "Чернетка",
          href: "Посилання",
          published: "Опублікувати",
          status: "Статус",
          submit: "Створити оновлення",
          titleEn: "Заголовок англійською",
          titleUk: "Заголовок українською",
        }
      : {
          badgeEn: "Badge in English",
          badgeUk: "Badge in Ukrainian",
          bodyEn: "Body in English",
          bodyUk: "Body in Ukrainian",
          ctaEn: "CTA in English",
          ctaUk: "CTA in Ukrainian",
          draft: "Draft",
          href: "Link",
          published: "Publish",
          status: "Status",
          submit: "Create update",
          titleEn: "Title in English",
          titleUk: "Title in Ukrainian",
        };
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createNotification,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label={labels.titleUk} name="titleUk" required />
        <Field label={labels.titleEn} name="titleEn" required />
        <Field label={labels.badgeUk} name="badgeUk" placeholder="Нове" />
        <Field label={labels.badgeEn} name="badgeEn" placeholder="New" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextAreaField label={labels.bodyUk} name="bodyUk" required />
        <TextAreaField label={labels.bodyEn} name="bodyEn" required />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Field label={labels.href} name="href" placeholder="/dashboard" />
        <Field label={labels.ctaUk} name="ctaUk" placeholder="Відкрити" />
        <Field label={labels.ctaEn} name="ctaEn" placeholder="Open" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="status">{labels.status}</Label>
        <select
          className="flex h-11 w-full rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
          defaultValue="published"
          id="status"
          name="status"
        >
          <option value="published">{labels.published}</option>
          <option value="draft">{labels.draft}</option>
        </select>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button className="sm:w-fit" disabled={isPending} type="submit">
          {isPending ? "..." : labels.submit}
        </Button>
        <ActionMessage state={state} />
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} placeholder={placeholder} required={required} />
    </div>
  );
}

function TextAreaField({
  label,
  name,
  required,
}: {
  label: string;
  name: string;
  required?: boolean;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} required={required} rows={5} />
    </div>
  );
}

function ActionMessage({ state }: { state: AdminNotificationActionState }) {
  if (!state.message) {
    return null;
  }

  return (
    <p
      className={
        state.ok
          ? "text-sm font-semibold text-primary"
          : "text-sm font-semibold text-destructive"
      }
    >
      {state.message}
    </p>
  );
}
