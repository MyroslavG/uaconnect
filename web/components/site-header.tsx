import Link from "next/link";
import Image from "next/image";

import { AuthMenu } from "@/components/auth-menu";
import { LanguageToggle } from "@/components/language-toggle";
import { MobileNav } from "@/components/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UpdateNotifications } from "@/components/update-notifications";
import { Button } from "@/components/ui/button";
import { getVisibleAnnouncements } from "@/lib/announcements";
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
  const announcements = isSignedIn
    ? await getVisibleAnnouncements(user?.id)
    : [];

  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-background/80 backdrop-blur-xl dark:border-white/10">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label={labels.header.ariaHome}>
          <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-md border bg-card shadow-sm">
            <Image
              alt=""
              className="h-7 w-7 object-contain dark:invert"
              height={28}
              priority
              src="/kolo-logo.png"
              width={28}
            />
          </span>
          <span className="text-lg font-black tracking-normal">
            Kolo
          </span>
        </Link>
        <div className="hidden items-center gap-2 sm:flex">
          <Button asChild className="hidden sm:inline-flex" variant="outline" size="sm">
            <Link href="/register">{labels.header.listBusiness}</Link>
          </Button>
          {isSignedIn ? (
            <UpdateNotifications
              announcements={announcements}
              locale={locale}
            />
          ) : null}
          <AuthMenu
            isAdmin={isAdmin}
            isSignedIn={isSignedIn}
            locale={locale}
            supabaseConfigured={supabaseConfigured}
          />
          <LanguageToggle locale={locale} />
          <ThemeToggle locale={locale} />
        </div>
        <div className="flex items-center gap-2 sm:hidden">
          {isSignedIn ? (
            <UpdateNotifications
              announcements={announcements}
              locale={locale}
            />
          ) : null}
          <MobileNav
            isAdmin={isAdmin}
            isSignedIn={isSignedIn}
            locale={locale}
            supabaseConfigured={supabaseConfigured}
          />
        </div>
      </div>
    </header>
  );
}
