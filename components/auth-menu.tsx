import Link from "next/link";
import { ShieldCheck, UserRound } from "lucide-react";

import { signInWithGoogle, signOut } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { copy, type Locale } from "@/lib/i18n";

type AuthMenuProps = {
  locale: Locale;
};

export async function AuthMenu({ locale }: AuthMenuProps) {
  const labels = copy[locale].header;

  if (!isSupabaseConfigured()) {
    return (
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <Link href="/register">{labels.setupSupabase}</Link>
      </Button>
    );
  }

  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);

  if (!user) {
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
        <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
          <Link href="/admin/registrations">
            <ShieldCheck className="h-4 w-4" />
            {labels.admin}
          </Link>
        </Button>
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
