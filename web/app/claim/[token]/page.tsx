import type { Metadata } from "next";
import { Link2Off, LockKeyhole, ShieldCheck } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import { ClaimBusinessInviteDialog } from "@/components/claim-business-invite-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n";

type ClaimPageProps = {
  params: Promise<{
    token: string;
  }>;
};

const text = {
  uk: {
    metadata: "Підтвердити бізнес",
    kicker: "Доступ власника",
    title: "Підтвердіть доступ до бізнесу",
    intro:
      "Це приватне посилання створене адміністратором Kolo для передачі профілю власнику бізнесу.",
    signInTitle: "Увійдіть через Google",
    signInText:
      "Після входу ви побачите підтвердження і зможете прив'язати бізнес до свого акаунта.",
    signIn: "Увійти через Google",
    setup: "Supabase ще не налаштовано.",
    invalidTitle: "Посилання недоступне",
    invalidText:
      "Це посилання вже використано, протерміновано або більше не активне.",
    expires: "Дійсне до",
  },
  en: {
    metadata: "Claim business",
    kicker: "Owner access",
    title: "Confirm business access",
    intro:
      "This private link was created by a Kolo admin to transfer a profile to the business owner.",
    signInTitle: "Sign in with Google",
    signInText:
      "After sign-in, you will see the confirmation and can connect the business to your account.",
    signIn: "Sign in with Google",
    setup: "Supabase is not configured yet.",
    invalidTitle: "Link unavailable",
    invalidText:
      "This link has already been used, expired, or is no longer active.",
    expires: "Valid until",
  },
} satisfies Record<Locale, Record<string, string>>;

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();

  return {
    title: text[locale].metadata,
  };
}

export default async function ClaimBusinessPage({ params }: ClaimPageProps) {
  const { token } = await params;
  const locale = await getRequestLocale();
  const labels = text[locale];
  const user = await getCurrentUser();
  const invite = isSupabaseConfigured()
    ? await getClaimInvite(token)
    : { data: null, error: labels.setup };

  return (
    <section className="container grid min-h-[calc(100vh-4rem)] place-items-center py-10">
      <Card className="w-full max-w-2xl border-white/70 bg-card/95 shadow-sm dark:border-white/10">
        <CardContent className="grid gap-6 p-6 text-center md:p-8">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-md bg-primary/10 text-primary">
            {invite.data ? (
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <Link2Off className="h-7 w-7" />
            )}
          </div>

          <div>
            <Badge variant="accent">{labels.kicker}</Badge>
            <h1 className="mt-4 text-3xl font-black tracking-normal md:text-4xl">
              {invite.data ? labels.title : labels.invalidTitle}
            </h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
              {invite.data ? labels.intro : invite.error || labels.invalidText}
            </p>
          </div>

          {invite.data ? (
            <div className="rounded-lg border bg-muted/60 p-4 text-left">
              <p className="text-lg font-black">{invite.data.business_name}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {invite.data.city}
              </p>
              <p className="mt-3 text-xs font-bold uppercase text-muted-foreground">
                {labels.expires}:{" "}
                {new Date(invite.data.expires_at).toLocaleDateString()}
              </p>
            </div>
          ) : null}

          {invite.data && !user ? (
            <div className="grid gap-4 rounded-lg border bg-background/70 p-5">
              <LockKeyhole className="mx-auto h-8 w-8 text-primary" />
              <div>
                <h2 className="text-xl font-black">{labels.signInTitle}</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {labels.signInText}
                </p>
              </div>
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value={`/claim/${token}`} />
                <Button type="submit" size="lg">
                  {labels.signIn}
                </Button>
              </form>
            </div>
          ) : null}

          {invite.data && user ? (
            <ClaimBusinessInviteDialog
              businessName={invite.data.business_name}
              city={invite.data.city}
              locale={locale}
              token={token}
            />
          ) : null}
        </CardContent>
      </Card>
    </section>
  );
}

async function getClaimInvite(token: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .rpc("get_business_claim_invite", {
      invite_token: token,
    })
    .maybeSingle();

  return {
    data,
    error: error?.message ?? null,
  };
}
