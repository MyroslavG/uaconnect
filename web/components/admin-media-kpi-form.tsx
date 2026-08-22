"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createMediaKpiSnapshot,
  type AdminMediaActionState,
} from "@/app/admin/media/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type {
  MediaCampaignType,
  MediaChannel,
} from "@/lib/supabase/database.types";
import type { Locale } from "@/lib/i18n";

type AdminMediaKpiFormProps = {
  locale: Locale;
};

const initialState: AdminMediaActionState = {
  ok: false,
  message: "",
};

const campaignTypes: MediaCampaignType[] = [
  "announcement",
  "guest_call",
  "interview",
  "partnership",
  "social",
  "other",
];

const channels: MediaChannel[] = [
  "instagram",
  "tiktok",
  "youtube",
  "facebook",
  "linkedin",
  "newsletter",
  "website",
  "offline",
  "other",
];

export function AdminMediaKpiForm({ locale }: AdminMediaKpiFormProps) {
  const labels =
    locale === "uk"
      ? {
          businessLeads: "Бізнес-ліди",
          campaignName: "Назва кампанії / гостя",
          campaignType: "Тип",
          channel: "Канал",
          clicks: "Кліки",
          followers: "Підписники",
          notes: "Нотатки",
          registrations: "Реєстрації",
          snapshotDate: "Дата snapshot",
          submit: "Зберегти KPI",
          url: "Посилання",
          views: "Перегляди",
          watchTimeMinutes: "Watch time, хв",
        }
      : {
          businessLeads: "Business leads",
          campaignName: "Campaign / guest name",
          campaignType: "Type",
          channel: "Channel",
          clicks: "Clicks",
          followers: "Followers",
          notes: "Notes",
          registrations: "Registrations",
          snapshotDate: "Snapshot date",
          submit: "Save KPI",
          url: "Link",
          views: "Views",
          watchTimeMinutes: "Watch time, min",
        };
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createMediaKpiSnapshot,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
        <Field label={labels.campaignName} name="campaignName" required />
        <SelectField
          label={labels.campaignType}
          name="campaignType"
          options={campaignTypes}
        />
        <SelectField label={labels.channel} name="channel" options={channels} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label={labels.url}
          name="url"
          placeholder="https://instagram.com/..."
          type="url"
        />
        <Field
          defaultValue={new Date().toISOString().slice(0, 10)}
          label={labels.snapshotDate}
          name="snapshotDate"
          type="date"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Field label={labels.followers} name="followers" type="number" />
        <Field label={labels.views} name="views" type="number" />
        <Field
          label={labels.watchTimeMinutes}
          name="watchTimeMinutes"
          type="number"
        />
        <Field label={labels.clicks} name="clicks" type="number" />
        <Field label={labels.registrations} name="registrations" type="number" />
        <Field label={labels.businessLeads} name="businessLeads" type="number" />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="notes">{labels.notes}</Label>
        <Textarea id="notes" name="notes" rows={3} />
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
  defaultValue,
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  defaultValue?: string;
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Input
        defaultValue={defaultValue}
        id={name}
        min={type === "number" ? 0 : undefined}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function SelectField({
  label,
  name,
  options,
}: {
  label: string;
  name: string;
  options: string[];
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className="flex h-11 w-full rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getReadableLabel(option)}
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionMessage({ state }: { state: AdminMediaActionState }) {
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

function getReadableLabel(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}
