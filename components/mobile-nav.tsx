"use client";

import Link from "next/link";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
} from "lucide-react";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { LanguageToggle } from "@/components/language-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { copy, type Locale } from "@/lib/i18n";

type MobileNavProps = {
  isAdmin: boolean;
  isSignedIn: boolean;
  locale: Locale;
  supabaseConfigured: boolean;
};

export function MobileNav({
  isAdmin,
  isSignedIn,
  locale,
  supabaseConfigured,
}: MobileNavProps) {
  const labels = copy[locale].header;
  const common = copy[locale].common;

  const navItems = [
    {
      href: "/search",
      icon: Search,
      label: common.search,
    },
    {
      href: "/register",
      icon: BriefcaseBusiness,
      label: labels.listBusiness,
    },
    {
      href: "/dashboard",
      icon: LayoutDashboard,
      label: labels.dashboard,
    },
  ];

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          aria-label={labels.menu}
          className="sm:hidden"
          size="icon"
          variant="ghost"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="left-auto right-0 top-0 h-dvh w-[min(92vw,24rem)] max-w-none translate-x-0 translate-y-0 gap-0 rounded-none border-y-0 border-l bg-background/95 p-0 shadow-2xl backdrop-blur-xl data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right">
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b border-border/70 px-5 py-5">
            <DialogTitle className="flex items-center gap-2 text-xl font-black">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-primary text-[10px] font-black text-primary-foreground shadow-sm">
                UA
              </span>
              UA<span className="text-primary">Connect</span>
            </DialogTitle>
            <DialogDescription>{labels.mobileMenuDescription}</DialogDescription>
          </DialogHeader>

          <nav className="grid gap-2 px-4 py-5" aria-label={labels.ariaNav}>
            {navItems.map((item) => {
              const Icon = item.icon;

              return (
                <DialogClose asChild key={item.href}>
                  <Link
                    className="group flex min-h-12 items-center gap-3 rounded-md border border-border/70 bg-card px-4 text-sm font-black text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground hover:shadow-soft"
                    href={item.href}
                  >
                    <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-white/70 group-hover:text-hover-blue-foreground dark:group-hover:bg-white/10">
                      <Icon className="h-4 w-4" />
                    </span>
                    {item.label}
                  </Link>
                </DialogClose>
              );
            })}

            {isAdmin ? (
              <DialogClose asChild>
                <Link
                  className="group flex min-h-12 items-center gap-3 rounded-md border border-border/70 bg-card px-4 text-sm font-black text-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:border-hover-blue-border hover:bg-hover-blue hover:text-hover-blue-foreground hover:shadow-soft"
                  href="/admin/registrations"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary transition-colors group-hover:bg-white/70 group-hover:text-hover-blue-foreground dark:group-hover:bg-white/10">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  {labels.admin}
                </Link>
              </DialogClose>
            ) : null}
          </nav>

          <div className="grid gap-3 border-y border-border/70 px-4 py-4">
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-3">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {labels.language}
              </span>
              <LanguageToggle locale={locale} />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-muted/60 px-3 py-3">
              <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                {labels.appearance}
              </span>
              <ThemeToggle locale={locale} />
            </div>
          </div>

          <div className="mt-auto px-4 py-5">
            {!supabaseConfigured ? (
              <Button asChild className="w-full" variant="outline">
                <Link href="/register">{labels.setupSupabase}</Link>
              </Button>
            ) : isSignedIn ? (
              <form action={signOut}>
                <Button className="w-full" type="submit" variant="outline">
                  <LogOut className="h-4 w-4" />
                  {labels.signOut}
                </Button>
              </form>
            ) : (
              <form action={signInWithGoogle}>
                <input type="hidden" name="next" value="/dashboard" />
                <Button className="w-full" type="submit">
                  <LogIn className="h-4 w-4" />
                  {labels.signIn}
                </Button>
              </form>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
