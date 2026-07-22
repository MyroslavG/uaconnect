import Link from "next/link";
import { Bell, ShieldCheck, UserRound, UsersRound } from "lucide-react";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { copy, type Locale } from "@/lib/i18n";

type AuthMenuProps = {
  locale: Locale;
  isAdmin?: boolean;
  isSignedIn?: boolean;
  supabaseConfigured?: boolean;
};

export async function AuthMenu({
  locale,
  isAdmin: initialIsAdmin,
  isSignedIn: initialIsSignedIn,
  supabaseConfigured: initialSupabaseConfigured,
}: AuthMenuProps) {
  const labels = copy[locale].header;
  const supabaseConfigured =
    initialSupabaseConfigured ?? isSupabaseConfigured();

  if (!supabaseConfigured) {
    return (
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <Link href="/register">{labels.setupSupabase}</Link>
      </Button>
    );
  }

  let isSignedIn = initialIsSignedIn;
  let isAdmin = initialIsAdmin ?? false;

  if (isSignedIn === undefined) {
    const [user, resolvedIsAdmin] = await Promise.all([
      getCurrentUser(),
      isCurrentUserAdmin(),
    ]);

    isSignedIn = Boolean(user);
    isAdmin = resolvedIsAdmin;
  }

  if (!isSignedIn) {
    return (
      <form action={signInWithGoogle}>
        <input type="hidden" name="next" value="/dashboard" />
        <Button type="submit" variant="secondary" size="sm">
          <UserRound className="h-4 w-4" />
          {labels.signIn}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isAdmin ? (
        <>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
          >
            <Link href="/admin/registrations">
              <ShieldCheck className="h-4 w-4" />
              {labels.admin}
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
          >
            <Link href="/admin/users">
              <UsersRound className="h-4 w-4" />
              {labels.adminUsers}
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="hidden md:inline-flex"
          >
            <Link href="/admin/notifications">
              <Bell className="h-4 w-4" />
              {labels.adminNotifications}
            </Link>
          </Button>
        </>
      ) : null}
      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/dashboard">{labels.dashboard}</Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="outline" size="sm">
          {labels.signOut}
        </Button>
      </form>
    </div>
  );
}
