"use client";

import { useActionState, useEffect, useRef } from "react";

import {
  createOutreachProspect,
  type AdminProspectActionState,
} from "@/app/admin/prospects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Locale } from "@/lib/i18n";
import type {
  OutreachProspectPriority,
  OutreachProspectStatus,
} from "@/lib/supabase/database.types";

type AdminProspectFormProps = {
  categories: Array<{ name: string; slug: string }>;
  cities: Array<{ name: string; province: string; slug: string }>;
  defaultCategory?: string;
  defaultCity?: string;
  locale: Locale;
};

const initialState: AdminProspectActionState = {
  ok: false,
  message: "",
};

const statuses: OutreachProspectStatus[] = [
  "new",
  "contacted",
  "interested",
  "added",
  "rejected",
];

const priorities: OutreachProspectPriority[] = ["medium", "high", "low"];

export function AdminProspectForm({
  categories,
  cities,
  defaultCategory,
  defaultCity,
  locale,
}: AdminProspectFormProps) {
  const labels =
    locale === "uk"
      ? {
          businessName: "Назва бізнесу",
          category: "Категорія",
          city: "Місто",
          contactName: "Контактна особа",
          email: "Email",
          instagram: "Instagram",
          nextFollowUpAt: "Дата follow-up",
          nextStep: "Наступний крок",
          notes: "Нотатки",
          phone: "Телефон",
          priority: "Пріоритет",
          source: "Джерело",
          status: "Статус",
          submit: "Додати prospect",
          website: "Website",
        }
      : {
          businessName: "Business name",
          category: "Category",
          city: "City",
          contactName: "Contact person",
          email: "Email",
          instagram: "Instagram",
          nextFollowUpAt: "Follow-up date",
          nextStep: "Next step",
          notes: "Notes",
          phone: "Phone",
          priority: "Priority",
          source: "Source",
          status: "Status",
          submit: "Add prospect",
          website: "Website",
        };
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, isPending] = useActionState(
    createOutreachProspect,
    initialState,
  );

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state.ok]);

  return (
    <form ref={formRef} action={formAction} className="grid gap-5">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.8fr)_minmax(0,0.9fr)]">
        <Field label={labels.businessName} name="businessName" required />
        <SelectField
          defaultValue={defaultCity}
          label={labels.city}
          name="city"
          options={cities.map((city) => ({
            label: `${city.name}, ${city.province}`,
            value: city.slug,
          }))}
        />
        <SelectField
          defaultValue={defaultCategory}
          label={labels.category}
          name="categorySlug"
          options={categories.map((category) => ({
            label: category.name,
            value: category.slug,
          }))}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Field label={labels.contactName} name="contactName" />
        <Field label={labels.email} name="email" type="email" />
        <Field label={labels.phone} name="phone" />
        <Field label={labels.instagram} name="instagram" placeholder="@handle" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field label={labels.website} name="website" placeholder="example.com" />
        <Field
          label={labels.source}
          name="source"
          placeholder="coverage, Instagram, Google, referral..."
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <SelectField
          label={labels.status}
          name="status"
          options={statuses.map((status) => ({
            label: getReadableLabel(status),
            value: status,
          }))}
        />
        <SelectField
          label={labels.priority}
          name="priority"
          options={priorities.map((priority) => ({
            label: getReadableLabel(priority),
            value: priority,
          }))}
        />
        <Field label={labels.nextFollowUpAt} name="nextFollowUpAt" type="date" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <TextAreaField label={labels.nextStep} name="nextStep" rows={3} />
        <TextAreaField label={labels.notes} name="notes" rows={3} />
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
  type = "text",
}: {
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
        id={name}
        name={name}
        placeholder={placeholder}
        required={required}
        type={type}
      />
    </div>
  );
}

function SelectField({
  defaultValue,
  label,
  name,
  options,
}: {
  defaultValue?: string;
  label: string;
  name: string;
  options: Array<{ label: string; value: string }>;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <select
        className="flex h-11 w-full rounded-md border border-input bg-background/85 px-3 py-2 text-sm shadow-sm outline-none transition focus:border-primary/45 focus:ring-2 focus:ring-ring/25"
        defaultValue={defaultValue ?? options[0]?.value}
        id={name}
        name={name}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function TextAreaField({
  label,
  name,
  rows,
}: {
  label: string;
  name: string;
  rows: number;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={name}>{label}</Label>
      <Textarea id={name} name={name} rows={rows} />
    </div>
  );
}

function ActionMessage({ state }: { state: AdminProspectActionState }) {
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
