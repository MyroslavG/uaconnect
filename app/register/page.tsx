import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, LockKeyhole, ShieldCheck } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { BusinessRegistrationForm } from "@/components/business-registration-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { categories, cities } from "@/lib/data";
import {
  getRequestLocale,
} from "@/lib/locale";
import {
  localizeCategories,
  localizeCities,
  type Locale,
} from "@/lib/i18n";
import { getCurrentUser } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Register a business",
  description:
    "Submit a business to UAConnect for manual verification and approval.",
};

const text = {
  uk: {
    kicker: "Реєстрація бізнесу",
    title: "Додайте бізнес на перевірку",
    intro:
      "Увійдіть через Google, надішліть дані бізнесу, а адміністратор вручну перевірить реєстрацію перед публікацією.",
    signInTitle: "Спочатку увійдіть",
    signInText:
      "Google-вхід прив'язує заявку до власника бізнесу й дозволяє бачити статус перевірки.",
    signIn: "Увійти через Google",
    setupTitle: "Supabase ще не налаштовано",
    setupText:
      "Додайте змінні середовища Supabase, застосуйте SQL-схему і перезапустіть dev server.",
    dashboard: "Перейти в кабінет",
    sideLabel: "Перевірка",
    steps: [
      "Надішліть заявку",
      "Ми перевіримо дані",
      "Отримаєте рішення",
      "Бізнес з'явиться на UAConnect",
    ],
    noteTitle: "Що відбувається далі",
    noteText:
      "Після надсилання заявка потрапить на ручну перевірку. Якщо дані підтвердяться, бізнес буде схвалено й додано до UAConnect.",
  },
  en: {
    kicker: "Business registration",
    title: "Submit a business for review",
    intro:
      "Sign in with Google, send the business details, and an admin manually verifies the registration before publishing.",
    signInTitle: "Sign in first",
    signInText:
      "Google sign-in ties the request to the business owner and lets them track verification status.",
    signIn: "Sign in with Google",
    setupTitle: "Supabase is not configured yet",
    setupText:
      "Add Supabase environment variables, apply the SQL schema, and restart the dev server.",
    dashboard: "Open dashboard",
    sideLabel: "Verification",
    steps: [
      "Submit your request",
      "We review the details",
      "You receive a decision",
      "Your business appears on UAConnect",
    ],
    noteTitle: "What happens next",
    noteText:
      "After you submit, your request goes into manual review. Once the details are confirmed, the business can be approved and added to UAConnect.",
  },
} satisfies Record<Locale, Record<string, string | string[]>>;

export default async function RegisterBusinessPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const user = await getCurrentUser();
  const localizedCategories = localizeCategories(categories, locale);
  const localizedCities = localizeCities(cities, locale);

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-8 max-w-3xl">
        <Badge variant="accent">{labels.kicker as string}</Badge>
        <h1 className="mt-4 text-balance text-4xl font-black tracking-normal md:text-6xl">
          {labels.title as string}
        </h1>
        <p className="mt-4 text-lg leading-8 text-muted-foreground">
          {labels.intro as string}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card className="border-white/70 bg-card/95 shadow-sm dark:border-white/10">
          <CardContent className="p-5 md:p-7">
            {!isSupabaseConfigured() ? (
              <SetupState title={labels.setupTitle as string} text={labels.setupText as string} />
            ) : user ? (
              <BusinessRegistrationForm
                categories={localizedCategories}
                cities={localizedCities}
                locale={locale}
              />
            ) : (
              <div className="grid gap-5 py-6 text-center">
                <LockKeyhole className="mx-auto h-12 w-12 text-primary" />
                <div>
                  <h2 className="text-2xl font-black">
                    {labels.signInTitle as string}
                  </h2>
                  <p className="mx-auto mt-2 max-w-md text-muted-foreground">
                    {labels.signInText as string}
                  </p>
                </div>
                <form action={signInWithGoogle}>
                  <input type="hidden" name="next" value="/register" />
                  <Button type="submit" size="lg" className="shadow-glow">
                    {labels.signIn as string}
                  </Button>
                </form>
              </div>
            )}
          </CardContent>
        </Card>

        <aside className="rounded-lg border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-semibold uppercase text-primary">
                {labels.sideLabel as string}
              </p>
              <h2 className="text-xl font-black">{labels.noteTitle as string}</h2>
            </div>
          </div>
          <p className="mt-4 text-sm leading-6 text-muted-foreground">
            {labels.noteText as string}
          </p>
          <Separator className="my-5" />
          <div className="grid gap-3">
            {(labels.steps as string[]).map((step, index) => (
              <div key={step} className="flex items-center gap-3 text-sm font-semibold">
                <span className="grid h-7 w-7 place-items-center rounded-md bg-hover-blue text-hover-blue-foreground">
                  {index + 1}
                </span>
                {step}
              </div>
            ))}
          </div>
          {user ? (
            <Button asChild variant="outline" className="mt-6 w-full">
              <Link href="/dashboard">{labels.dashboard as string}</Link>
            </Button>
          ) : null}
        </aside>
      </div>
    </section>
  );
}

function SetupState({ title, text }: { title: string; text: string }) {
  return (
    <div className="grid gap-4 py-8 text-center">
      <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
      <h2 className="text-2xl font-black">{title}</h2>
      <p className="mx-auto max-w-md text-muted-foreground">{text}</p>
      <code className="mx-auto rounded-md bg-muted px-3 py-2 text-sm">
        .env.local
      </code>
    </div>
  );
}
