import Link from "next/link";

import { AuthMenu } from "@/components/auth-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { copy, type Locale } from "@/lib/i18n";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type SiteHeaderProps = {
  locale: Locale;
};

export async function SiteHeader({ locale }: SiteHeaderProps) {
  const labels = copy[locale];
  const supabaseConfigured = isSupabaseConfigured();
  const [user, isAdmin] = supabaseConfigured
    ? await Promise.all([getCurrentUser(), isCurrentUserAdmin()])
    : [null, false];
  const isSignedIn = Boolean(user);

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-background/80 backdrop-blur-xl dark:border-white/10">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label={labels.header.ariaHome}>
          <span className="relative grid h-9 w-9 overflow-hidden rounded-md bg-primary shadow-sm ring-1 ring-white/60 dark:ring-white/15">
            <span className="absolute inset-x-0 bottom-0 h-2 bg-accent" />
            <span className="relative flex items-center justify-center text-[10px] font-black leading-none text-primary-foreground">
              UA
            </span>
          </span>
          <span className="text-lg font-black tracking-normal">
            UA<span className="text-primary">Connect</span>
          </span>
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild className="hidden sm:inline-flex" variant="outline" size="sm">
            <Link href="/register">{labels.header.listBusiness}</Link>
          </Button>
          <AuthMenu
            isAdmin={isAdmin}
            isSignedIn={isSignedIn}
            locale={locale}
            supabaseConfigured={supabaseConfigured}
          />
          <LanguageToggle locale={locale} />
          <ThemeToggle locale={locale} />
        </div>
        <MobileNav
          isAdmin={isAdmin}
          isSignedIn={isSignedIn}
          locale={locale}
          supabaseConfigured={supabaseConfigured}
        />
      </div>
    </header>
  );
}
