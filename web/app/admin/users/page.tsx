import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, UserRoundX, UsersRound } from "lucide-react";

import { signInWithGoogle } from "@/app/auth/actions";
import {
  AdminBusinessProfileEditor,
  type AdminEditableBusiness,
} from "@/components/admin-business-profile-editor";
import {
  AdminBusinessOwnerTransfer,
  type ConnectBusinessOption,
  type TransferBusinessOption,
  type TransferOwnerOption,
} from "@/components/admin-business-owner-transfer";
import { AdminUserProfileEditor } from "@/components/admin-user-profile-editor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { categories, cities } from "@/lib/data";
import { localizeCategories, localizeCities } from "@/lib/i18n";
import { getRequestLocale } from "@/lib/locale";
import { getCurrentUser, isCurrentUserAdmin } from "@/lib/supabase/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createClient } from "@/lib/supabase/server";
import type { Locale } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Manage Kolo user profile information.",
};

type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type BusinessRow = Pick<
  Database["public"]["Tables"]["businesses"]["Row"],
  "id" | "name" | "owner_id" | "registration_id" | "slug" | "status"
>;
type RegistrationRow = Pick<
  Database["public"]["Tables"]["business_registrations"]["Row"],
  | "address"
  | "business_name"
  | "category_slug"
  | "city"
  | "description"
  | "id"
  | "instagram"
  | "owner_id"
  | "phone"
  | "serves_all_canada"
  | "status"
  | "website"
>;

const text = {
  uk: {
    kicker: "Адмін",
    title: "Користувачі",
    intro:
      "Редагуйте профільну інформацію користувачів: ім'я, контактний email, фото та роль.",
    signIn: "Увійти через Google",
    noAccess: "У вас немає доступу до керування користувачами.",
    setup: "Supabase ще не налаштовано.",
    empty: "Користувачів поки немає.",
    users: "Користувачів",
    admins: "Адмінів",
    businesses: "Бізнесів",
    businessReview: "Перевірка бізнесів",
  },
  en: {
    kicker: "Admin",
    title: "Users",
    intro:
      "Edit user profile information: name, contact email, photo, and role.",
    signIn: "Sign in with Google",
    noAccess: "You do not have access to user management.",
    setup: "Supabase is not configured yet.",
    empty: "No users yet.",
    users: "Users",
    admins: "Admins",
    businesses: "Businesses",
    businessReview: "Business review",
  },
} satisfies Record<Locale, Record<string, string>>;

export default async function AdminUsersPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];
  const localizedCategories = localizeCategories(categories, locale);
  const localizedCities = localizeCities(cities, locale);
  const [user, isAdmin] = await Promise.all([
    getCurrentUser(),
    isCurrentUserAdmin(),
  ]);
  let profiles: ProfileRow[] = [];
  let registrations: RegistrationRow[] = [];
  let publicBusinesses: BusinessRow[] = [];
  let businessCounts = new Map<string, number>();
  let registrationCounts = new Map<string, number>();
  let errorMessage = "";

  if (isSupabaseConfigured() && user && isAdmin) {
    const supabase = await createClient();
    const [profilesResult, businessesResult, registrationsResult] =
      await Promise.all([
        supabase
          .from("profiles")
          .select("*")
          .order("updated_at", { ascending: false }),
        supabase
          .from("businesses")
          .select("id, name, owner_id, registration_id, slug, status"),
        supabase
          .from("business_registrations")
          .select(
            "id, business_name, category_slug, city, address, phone, website, instagram, description, serves_all_canada, owner_id, status",
          )
          .order("business_name", { ascending: true }),
      ]);

    profiles = profilesResult.data ?? [];
    publicBusinesses = businessesResult.data ?? [];
    registrations = registrationsResult.data ?? [];
    businessCounts = getOwnerCounts(publicBusinesses);
    registrationCounts = getOwnerCounts(registrations);
    errorMessage =
      profilesResult.error?.message ??
      businessesResult.error?.message ??
      registrationsResult.error?.message ??
      "";
  }

  const adminCount = profiles.filter((profile) => profile.role === "admin").length;
  const businessCount = [...businessCounts.values()].reduce(
    (total, count) => total + count,
    0,
  );
  const profileById = new Map(profiles.map((profile) => [profile.id, profile]));
  const publicOwnerByRegistrationId = new Map(
    publicBusinesses
      .filter((business) => business.registration_id)
      .map((business) => [
        business.registration_id as string,
        business.owner_id,
      ]),
  );
  const publicBusinessByRegistrationId = new Map(
    publicBusinesses
      .filter((business) => business.registration_id)
      .map((business) => [business.registration_id as string, business]),
  );
  const ownerOptions = profiles.map((profile) => ({
    id: profile.id,
    label: getProfileLabel(profile),
  })) satisfies TransferOwnerOption[];
  const transferBusinesses = registrations.map((registration) => {
    const publicOwnerId =
      publicOwnerByRegistrationId.get(registration.id) ?? null;

    return {
      id: registration.id,
      name: registration.business_name,
      publicOwnerLabel: publicOwnerId
        ? getProfileLabel(profileById.get(publicOwnerId) ?? null)
        : "None",
      registrationOwnerLabel: getProfileLabel(
        profileById.get(registration.owner_id) ?? null,
      ),
      status: registration.status,
    };
  }) satisfies TransferBusinessOption[];
  const connectableBusinesses = publicBusinesses
    .filter((business) => !business.registration_id)
    .map((business) => ({
      id: business.id,
      name: business.name,
      slug: business.slug,
      status: business.status,
    })) satisfies ConnectBusinessOption[];
  const editableBusinesses = registrations.map((registration) => {
    const publicBusiness = publicBusinessByRegistrationId.get(registration.id);
    const publicOwnerId = publicBusiness?.owner_id ?? null;

    return {
      address: registration.address ?? "",
      businessName: registration.business_name,
      categorySlug: registration.category_slug,
      city: registration.city,
      description: registration.description,
      instagram: registration.instagram ?? "",
      ownerLabel: getProfileLabel(profileById.get(registration.owner_id) ?? null),
      phone: registration.phone ?? "",
      publicOwnerLabel: publicOwnerId
        ? getProfileLabel(profileById.get(publicOwnerId) ?? null)
        : "None",
      registrationId: registration.id,
      servesAllCanada: registration.serves_all_canada,
      slug: publicBusiness?.slug ?? "",
      status: publicBusiness?.status ?? registration.status,
      website: registration.website ?? "",
    };
  }) satisfies AdminEditableBusiness[];

  return (
    <section className="container py-10 md:py-14">
      <div className="mb-8 grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
        <div className="min-w-0 max-w-3xl">
          <Badge variant="accent">{labels.kicker}</Badge>
          <h1 className="mt-4 text-4xl font-black tracking-normal md:text-5xl">
            {labels.title}
          </h1>
          <p className="mt-3 text-muted-foreground">{labels.intro}</p>
        </div>
        {user && isAdmin ? (
          <Button asChild variant="outline" className="justify-center">
            <Link href="/admin/registrations">
              <ShieldCheck className="h-4 w-4" />
              {labels.businessReview}
            </Link>
          </Button>
        ) : null}
      </div>

      {!isSupabaseConfigured() ? (
        <StateCard icon={<ShieldCheck />} title={labels.setup} />
      ) : !user ? (
        <Card>
          <CardContent className="grid gap-5 p-8 text-center">
            <ShieldCheck className="mx-auto h-12 w-12 text-primary" />
            <form action={signInWithGoogle}>
              <input type="hidden" name="next" value="/admin/users" />
              <Button type="submit" size="lg">
                {labels.signIn}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : !isAdmin ? (
        <StateCard icon={<UserRoundX />} title={labels.noAccess} />
      ) : errorMessage ? (
        <StateCard icon={<ShieldCheck />} title={errorMessage} />
      ) : profiles.length === 0 ? (
        <StateCard icon={<UsersRound />} title={labels.empty} />
      ) : (
        <div className="grid min-w-0 gap-5">
          <div className="grid min-w-0 gap-3 sm:grid-cols-3">
            <Metric label={labels.users} value={profiles.length} />
            <Metric label={labels.admins} value={adminCount} />
            <Metric label={labels.businesses} value={businessCount} />
          </div>

          <AdminBusinessOwnerTransfer
            businesses={transferBusinesses}
            connectableBusinesses={connectableBusinesses}
            locale={locale}
            owners={ownerOptions}
          />

          <AdminBusinessProfileEditor
            businesses={editableBusinesses}
            categories={localizedCategories}
            cities={localizedCities}
            locale={locale}
          />

          <div className="grid min-w-0 gap-4">
            {profiles.map((profile) => (
              <AdminUserProfileEditor
                key={profile.id}
                businessCount={businessCounts.get(profile.id) ?? 0}
                currentUserId={user.id}
                locale={locale}
                profile={profile}
                registrationCount={registrationCounts.get(profile.id) ?? 0}
              />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function getOwnerCounts(rows: Array<BusinessRow | RegistrationRow>) {
  const counts = new Map<string, number>();

  for (const row of rows) {
    if (!row.owner_id) {
      continue;
    }

    counts.set(row.owner_id, (counts.get(row.owner_id) ?? 0) + 1);
  }

  return counts;
}

function getProfileLabel(profile: ProfileRow | null) {
  if (!profile) {
    return "Unknown user";
  }

  const name = profile.full_name?.trim();
  const email = profile.email?.trim();
  const contactEmail = profile.contact_email?.trim();
  const primary = name || email || contactEmail || "Unnamed user";
  const secondary = email && email !== primary ? email : contactEmail;

  return secondary ? `${primary} (${secondary})` : primary;
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-4 shadow-sm">
      <p className="text-3xl font-black">{value}</p>
      <p className="mt-1 text-xs font-bold uppercase text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function StateCard({
  icon,
  title,
}: {
  icon: ReactNode;
  title: string;
}) {
  return (
    <div className="grid min-h-64 place-items-center rounded-lg border bg-card p-8 text-center">
      <div>
        <div className="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-md bg-primary/10 text-primary [&_svg]:h-6 [&_svg]:w-6">
          {icon}
        </div>
        <p className="text-lg font-bold">{title}</p>
      </div>
    </div>
  );
}
