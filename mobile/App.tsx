import { useEffect, useMemo, useState } from "react";
import * as Linking from "expo-linking";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  ExternalLink,
  Home,
  LayoutDashboard,
  MapPin,
  Moon,
  Phone,
  Plus,
  Search,
  Sun,
  type LucideIcon,
  UserRound,
  X,
} from "lucide-react-native";
import type { Session } from "@supabase/supabase-js";

import {
  businesses as initialBusinesses,
  categories,
  citySuggestions,
} from "./src/data";
import {
  completeAuthFromUrl,
  signInWithGoogle,
  signOut,
} from "./src/auth";
import {
  createBusinessRegistration,
  fetchOwnedBusiness,
  fetchPublishedBusinesses,
  updateOwnedBusiness,
  type BusinessRegistrationInput,
} from "./src/directory";
import { isSupabaseConfigured, supabase } from "./src/supabase";
import type { Business, Locale } from "./src/types";

type Tab = "home" | "search" | "register" | "dashboard" | "profile";

const BUSINESS_SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.76);
const CATEGORY_PICKER_SHEET_HEIGHT = Math.round(
  Dimensions.get("window").height * 0.62,
);
const LOCATION_PICKER_SHEET_HEIGHT = Math.round(
  Dimensions.get("window").height * 0.58,
);

const copy = {
  uk: {
    addBusiness: "Додати",
    address: "Адреса",
    all: "Усі",
    allCanada: "Уся Канада",
    businesses: "бізнесів",
    canadaWide: "Онлайн · вся Канада",
    category: "Категорія",
    chooseCategory: "Виберіть категорію",
    chooseLocation: "Виберіть локацію",
    city: "Місто або локація",
    close: "Закрити",
    contactEmail: "Робочий email",
    contacts: "Контакти",
    dashboard: "Кабінет",
    description: "Опис",
    editProfile: "Редагувати профіль",
    find: "Знайти",
    home: "Головна",
    homeIntro:
      "Знаходьте українські бізнеси, сервіси та спеціалістів у Канаді.",
    homeTitle: "Українські бізнеси поруч",
    location: "Локація",
    manageProfile: "Керувати профілем",
    myLocation: "Моя локація",
    name: "Назва бізнесу",
    noResults: "Нічого не знайдено",
    owner: "Власник",
    phone: "Телефон",
    profile: "Профіль",
    profileIntro: "Особистий профіль, контактні дані та налаштування додатку.",
    popularCategories: "Популярні категорії",
    quickCities: "Міста поруч",
    recommended: "Рекомендації",
    instagram: "Instagram",
    registerIntro: "Подайте бізнес на перевірку або підготуйте профіль.",
    save: "Зберегти",
    saved: "Зміни збережено",
    settings: "Налаштування",
    seeAll: "Усі",
    search: "Пошук",
    searchPlaceholder: "Назва, послуга або категорія",
    selected: "Вибрано",
    signedInAs: "Ви увійшли як",
    submit: "Надіслати",
    submitted: "Заявку надіслано на перевірку.",
    theme: "Тема",
    themeDark: "Темна",
    themeLight: "Світла",
    userProfile: "Ваш профіль",
    website: "Сайт",
  },
  en: {
    addBusiness: "Add",
    address: "Address",
    all: "All",
    allCanada: "All Canada",
    businesses: "businesses",
    canadaWide: "Online · Canada-wide",
    category: "Category",
    chooseCategory: "Choose category",
    chooseLocation: "Choose location",
    city: "City or location",
    close: "Close",
    contactEmail: "Work email",
    contacts: "Contacts",
    dashboard: "Dashboard",
    description: "Description",
    editProfile: "Edit profile",
    find: "Search",
    home: "Home",
    homeIntro:
      "Find Ukrainian-owned businesses, services, and specialists in Canada.",
    homeTitle: "Ukrainian businesses nearby",
    location: "Location",
    manageProfile: "Manage profile",
    myLocation: "My location",
    name: "Business name",
    noResults: "No results found",
    owner: "Owner",
    phone: "Phone",
    profile: "Profile",
    profileIntro: "Personal profile, contact details, and app settings.",
    popularCategories: "Popular categories",
    quickCities: "Nearby cities",
    recommended: "Recommended",
    instagram: "Instagram",
    registerIntro: "Submit a business for review or prepare a profile.",
    save: "Save",
    saved: "Changes saved",
    settings: "Settings",
    seeAll: "All",
    search: "Search",
    searchPlaceholder: "Name, service, or category",
    selected: "Selected",
    signedInAs: "Signed in as",
    submit: "Submit",
    submitted: "Submitted for review.",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    userProfile: "Your profile",
    website: "Website",
  },
} satisfies Record<Locale, Record<string, string>>;

const connectionCopy = {
  uk: {
    noOwnedBusiness: "Бізнес ще не підключено до цього акаунта.",
    notConfigured: "Supabase не налаштовано для мобільного застосунку.",
    notSignedIn: "Ви ще не увійшли.",
    signInGoogle: "Увійти через Google",
    signInRequired: "Спочатку увійдіть.",
    signOut: "Вийти",
  },
  en: {
    noOwnedBusiness: "No business is connected to this account yet.",
    notConfigured: "Supabase is not configured for the mobile app.",
    notSignedIn: "You are not signed in yet.",
    signInGoogle: "Sign in with Google",
    signInRequired: "Sign in first.",
    signOut: "Sign out",
  },
} satisfies Record<Locale, Record<string, string>>;

const nearbyGroups = {
  ottawa: ["ottawa", "stittsville", "kanata", "nepean", "gatineau", "manotick"],
  toronto: ["toronto", "mississauga", "scarborough", "north york", "etobicoke"],
  montreal: ["montreal", "laval", "longueuil"],
  vancouver: ["vancouver", "burnaby", "richmond", "surrey"],
};

const locationAliases: Record<string, string[]> = {
  burnaby: ["burnaby", "бернабі"],
  calgary: ["calgary", "калгарі"],
  edmonton: ["edmonton", "едмонтон"],
  etobicoke: ["etobicoke", "етобіко"],
  gatineau: ["gatineau", "гатіно"],
  halifax: ["halifax", "галіфакс"],
  kanata: ["kanata", "каната"],
  laval: ["laval", "лаваль"],
  longueuil: ["longueuil", "лонгьой", "лонгей"],
  manotick: ["manotick", "manitouk", "манотік", "манітук"],
  mississauga: [
    "mississauga",
    "міссісага",
    "місісага",
    "місіссага",
    "міссіссага",
  ],
  montreal: ["montreal", "montréal", "монреаль"],
  nepean: ["nepean", "непін"],
  "north york": ["north york", "north-york", "норт йорк", "норт-йорк"],
  ottawa: ["ottawa", "оттава", "отава"],
  richmond: ["richmond", "річмонд"],
  scarborough: ["scarborough", "скарборо"],
  stittsville: ["stittsville", "стітсвіл", "ститсвіл", "стітсвіль"],
  surrey: ["surrey", "суррей"],
  toronto: ["toronto", "торонто"],
  vancouver: ["vancouver", "ванкувер"],
  winnipeg: ["winnipeg", "вінніпег"],
};

const defaultOwnedBusiness =
  initialBusinesses.find((business) => business.ownedByCurrentUser) ??
  initialBusinesses[0];

export default function App() {
  const [locale, setLocale] = useState<Locale>("uk");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [directoryBusinesses, setDirectoryBusinesses] =
    useState<Business[]>(initialBusinesses);
  const [ownedBusiness, setOwnedBusiness] = useState<Business | null>(
    isSupabaseConfigured ? null : defaultOwnedBusiness,
  );
  const [session, setSession] = useState<Session | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const labels = { ...copy[locale], ...connectionCopy[locale] };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDataMessage(labels.notConfigured);
      return;
    }

    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (isMounted) {
        setSession(data.session);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
      },
    );

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [labels.notConfigured]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }

    let isMounted = true;

    async function handleAuthUrl(url: string | null) {
      if (!url) {
        return;
      }

      try {
        const completed = await completeAuthFromUrl(url);

        if (completed && isMounted) {
          setAuthMessage("");
        }
      } catch (error) {
        console.error("[kolo:mobile-auth-callback]", error);

        if (isMounted) {
          setAuthMessage(getErrorMessage(error));
        }
      }
    }

    Linking.getInitialURL().then((url) => {
      void handleAuthUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleAuthUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDirectoryBusinesses(initialBusinesses);
      return;
    }

    let isMounted = true;

    async function loadDirectory() {
      try {
        setDataMessage("");
        const publishedBusinesses = await fetchPublishedBusinesses(
          session?.user.id,
        );

        if (isMounted) {
          setDirectoryBusinesses(publishedBusinesses);
        }
      } catch (error) {
        console.error("[kolo:mobile-directory]", error);

        if (isMounted) {
          setDataMessage(getErrorMessage(error));
        }
      }
    }

    void loadDirectory();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setOwnedBusiness(defaultOwnedBusiness);
      return;
    }

    if (!session?.user.id) {
      setOwnedBusiness(null);
      return;
    }

    let isMounted = true;
    const activeSession = session;

    async function loadOwnedBusiness() {
      try {
        const owned = await fetchOwnedBusiness(activeSession.user.id);

        if (isMounted) {
          setOwnedBusiness(
            owned
              ? {
                  ...owned,
                  ownerAvatarUrl: getSessionAvatarUrl(activeSession),
                  ownerName: getSessionName(activeSession),
                }
              : null,
          );
        }
      } catch (error) {
        console.error("[kolo:mobile-owned-business]", error);

        if (isMounted) {
          setAuthMessage(getErrorMessage(error));
        }
      }
    }

    void loadOwnedBusiness();

    return () => {
      isMounted = false;
    };
  }, [session]);

  const businesses = useMemo(
    () =>
      directoryBusinesses.map((business) =>
        ownedBusiness && business.id === ownedBusiness.id
          ? ownedBusiness
          : business,
      ),
    [directoryBusinesses, ownedBusiness],
  );

  const results = useMemo(
    () =>
      businesses.filter((business) => {
        const category = getCategoryName(business.categorySlug, locale);
        const aliases = getSearchAliases(business.categorySlug);
        const locationAliases = getLocationAliases(business.city);
        const haystack = normalize(
          `${business.name} ${business.description} ${business.city} ${locationAliases} ${category} ${aliases}`,
        );
        const matchesQuery = !query.trim() || haystack.includes(normalize(query));
        const matchesCategory =
          selectedCategory === "all" || business.categorySlug === selectedCategory;
        const matchesLocation =
          !location.trim() ||
          business.servesAllCanada ||
          isNearLocation(business.city, location);

        return matchesQuery && matchesCategory && matchesLocation;
      }),
    [businesses, locale, location, query, selectedCategory],
  );

  const profileName = getSessionName(session);
  const profileEmail = session?.user.email ?? labels.notSignedIn;

  async function handleGoogleSignIn() {
    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      await signInWithGoogle();
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        throw error;
      }

      setSession(data.session);

      if (!data.session) {
        setAuthMessage(
          "Google sign-in finished, but no mobile session was saved. Please try again.",
        );
      }
    } catch (error) {
      console.error("[kolo:mobile-auth]", error);
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      await signOut();
      setSession(null);
      setOwnedBusiness(null);
    } catch (error) {
      console.error("[kolo:mobile-signout]", error);
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleBusinessRegistration(input: BusinessRegistrationInput) {
    if (!isSupabaseConfigured) {
      return;
    }

    if (!session?.user.id) {
      throw new Error(labels.signInRequired);
    }

    const createdBusiness = await createBusinessRegistration(
      input,
      session.user.id,
    );
    setOwnedBusiness({
      ...createdBusiness,
      ownerAvatarUrl: getSessionAvatarUrl(session),
      ownerName: profileName,
    });
    setActiveTab("dashboard");
  }

  async function handleBusinessSave(updatedBusiness: Business) {
    if (!isSupabaseConfigured || !session?.user.id) {
      setOwnedBusiness(updatedBusiness);
      return;
    }

    const savedBusiness = await updateOwnedBusiness(
      updatedBusiness,
      session.user.id,
    );
    setOwnedBusiness({
      ...savedBusiness,
      ownerAvatarUrl: getSessionAvatarUrl(session),
      ownerName: profileName,
    });
    setDirectoryBusinesses((currentBusinesses) =>
      currentBusinesses.map((business) =>
        business.registrationId === savedBusiness.id ||
        business.id === savedBusiness.id
          ? {
              ...business,
              ...savedBusiness,
              id: business.id,
              registrationId: business.registrationId,
            }
          : business,
      ),
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode ? styles.darkSafeArea : null]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={styles.appShell}>
        <View style={styles.contentArea}>
          {activeTab === "home" ? (
            <HomeScreen
              businesses={businesses}
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              onBusinessPress={setSelectedBusiness}
              onCategoryPress={(categorySlug) => {
                setSelectedCategory(categorySlug);
                setQuery("");
                setActiveTab("search");
              }}
              onLocationPress={(nextLocation) => {
                setLocation(nextLocation);
                setQuery("");
                setActiveTab("search");
              }}
              onSearchPress={() => setActiveTab("search")}
            />
          ) : null}

          {activeTab === "search" ? (
            <SearchScreen
              dataMessage={dataMessage}
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              location={location}
              query={query}
              results={results}
              selectedCategory={selectedCategory}
              setLocation={setLocation}
              setQuery={setQuery}
              setSelectedBusiness={setSelectedBusiness}
              setSelectedCategory={setSelectedCategory}
            />
          ) : null}

          {activeTab === "register" ? (
            <RegisterScreen
              isDarkMode={isDarkMode}
              isSignedIn={Boolean(session)}
              labels={labels}
              locale={locale}
              onSubmit={handleBusinessRegistration}
            />
          ) : null}

          {activeTab === "dashboard" ? (
            <DashboardScreen
              business={ownedBusiness}
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              onSave={handleBusinessSave}
              profileEmail={profileEmail}
              profileName={profileName}
            />
          ) : null}

          {activeTab === "profile" ? (
            <ProfileScreen
              authMessage={authMessage}
              isDarkMode={isDarkMode}
              isAuthBusy={isAuthBusy}
              isSupabaseConfigured={isSupabaseConfigured}
              labels={labels}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleSignOut}
              profileEmail={profileEmail}
              profileName={profileName}
              session={session}
              setIsDarkMode={setIsDarkMode}
            />
          ) : null}
        </View>

        <View style={[styles.tabBar, isDarkMode ? styles.darkTabBar : null]}>
          <TabButton
            active={activeTab === "home"}
            Icon={Home}
            isDarkMode={isDarkMode}
            label={labels.home}
            onPress={() => setActiveTab("home")}
          />
          <TabButton
            active={activeTab === "search"}
            Icon={Search}
            isDarkMode={isDarkMode}
            label={labels.search}
            onPress={() => setActiveTab("search")}
          />
          <TabButton
            active={activeTab === "register"}
            Icon={Plus}
            isDarkMode={isDarkMode}
            label={labels.addBusiness}
            onPress={() => setActiveTab("register")}
          />
          <TabButton
            active={activeTab === "dashboard"}
            Icon={LayoutDashboard}
            isDarkMode={isDarkMode}
            label={labels.dashboard}
            onPress={() => setActiveTab("dashboard")}
          />
          <TabButton
            active={activeTab === "profile"}
            Icon={UserRound}
            isDarkMode={isDarkMode}
            label={labels.profile}
            onPress={() => setActiveTab("profile")}
          />
        </View>
      </View>

      <BusinessModal
        business={selectedBusiness}
        isDarkMode={isDarkMode}
        labels={labels}
        locale={locale}
        onClose={() => setSelectedBusiness(null)}
        onManage={() => {
          setSelectedBusiness(null);
          setActiveTab("dashboard");
        }}
      />
    </SafeAreaView>
  );
}

function SearchScreen({
  dataMessage,
  isDarkMode,
  labels,
  locale,
  location,
  query,
  results,
  selectedCategory,
  setLocation,
  setQuery,
  setSelectedBusiness,
  setSelectedCategory,
}: {
  dataMessage: string;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  location: string;
  query: string;
  results: Business[];
  selectedCategory: string;
  setLocation: (value: string) => void;
  setQuery: (value: string) => void;
  setSelectedBusiness: (value: Business) => void;
  setSelectedCategory: (value: string) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.searchPanel, isDarkMode ? styles.darkCard : null]}>
        <Field isDarkMode={isDarkMode} label={labels.search}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={labels.searchPlaceholder}
            placeholderTextColor={isDarkMode ? "#758882" : "#7b8581"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={query}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.location}>
          <LocationPicker
            allowAll
            isDarkMode={isDarkMode}
            labels={labels}
            onChange={setLocation}
            placeholder={labels.city}
            showMyLocation
            value={location}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.category}>
          <CategoryPicker
            allowAll
            isDarkMode={isDarkMode}
            labels={labels}
            locale={locale}
            onSelect={setSelectedCategory}
            selectedSlug={selectedCategory}
          />
        </Field>
      </View>

      <View style={styles.resultsHeader}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.find}
        </Text>
        <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
          {results.length}
        </Text>
      </View>

      {dataMessage ? <Text style={styles.errorText}>{dataMessage}</Text> : null}

      {results.length > 0 ? (
        results.map((business) => (
          <BusinessCard
            business={business}
            isDarkMode={isDarkMode}
            key={business.id}
            labels={labels}
            locale={locale}
            onPress={() => setSelectedBusiness(business)}
          />
        ))
      ) : (
        <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
          {labels.noResults}
        </Text>
      )}
    </ScrollView>
  );
}

function HomeScreen({
  businesses,
  isDarkMode,
  labels,
  locale,
  onBusinessPress,
  onCategoryPress,
  onLocationPress,
  onSearchPress,
}: {
  businesses: Business[];
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onBusinessPress: (business: Business) => void;
  onCategoryPress: (categorySlug: string) => void;
  onLocationPress: (location: string) => void;
  onSearchPress: () => void;
}) {
  const recommendedBusinesses = businesses.slice(0, 3);
  const popularCategories = categories
    .map((category) => ({
      ...category,
      count: businesses.filter(
        (business) => business.categorySlug === category.slug,
      ).length,
    }))
    .filter((category) => category.count > 0)
    .sort((first, second) => second.count - first.count)
    .slice(0, 6);
  const quickCities = citySuggestions.slice(0, 8);

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.homeHero, isDarkMode ? styles.darkCard : null]}>
        <Text style={[styles.homeTitle, isDarkMode ? styles.darkText : null]}>
          {labels.homeTitle}
        </Text>
        <Text style={[styles.homeIntro, isDarkMode ? styles.darkMutedText : null]}>
          {labels.homeIntro}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onSearchPress}
          style={[
            styles.homeSearchButton,
            isDarkMode ? styles.darkSettingRow : null,
          ]}
        >
          <Search color={isDarkMode ? "#d8f1f7" : "#287365"} size={20} strokeWidth={2.5} />
          <View style={styles.flex}>
            <Text style={[styles.homeSearchTitle, isDarkMode ? styles.darkText : null]}>
              {labels.search}
            </Text>
            <Text style={[styles.homeSearchText, isDarkMode ? styles.darkMutedText : null]}>
              {labels.searchPlaceholder}
            </Text>
          </View>
        </Pressable>
      </View>

      <View style={styles.homeSectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.recommended}
        </Text>
        <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
          {recommendedBusinesses.length}
        </Text>
      </View>
      {recommendedBusinesses.map((business) => (
        <BusinessCard
          business={business}
          isDarkMode={isDarkMode}
          key={business.id}
          labels={labels}
          locale={locale}
          onPress={() => onBusinessPress(business)}
        />
      ))}

      <View style={styles.homeSectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.popularCategories}
        </Text>
      </View>
      <View style={styles.categoryPreviewGrid}>
        {popularCategories.map((category) => (
          <Pressable
            accessibilityRole="button"
            key={category.slug}
            onPress={() => onCategoryPress(category.slug)}
            style={[
              styles.categoryPreviewCard,
              isDarkMode ? styles.darkCard : null,
            ]}
          >
            <Text style={[styles.categoryPreviewName, isDarkMode ? styles.darkText : null]}>
              {category.name[locale]}
            </Text>
            <Text style={[styles.categoryPreviewMeta, isDarkMode ? styles.darkMutedText : null]}>
              {category.count} {labels.businesses}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.homeSectionHeader}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.quickCities}
        </Text>
      </View>
      <View style={styles.cityPillGrid}>
        {quickCities.map((city) => (
          <Pressable
            accessibilityRole="button"
            key={city}
            onPress={() => onLocationPress(city)}
            style={[styles.cityPill, isDarkMode ? styles.darkSettingRow : null]}
          >
            <MapPin color={isDarkMode ? "#d8f1f7" : "#287365"} size={16} strokeWidth={2.5} />
            <Text style={[styles.cityPillText, isDarkMode ? styles.darkText : null]}>
              {city}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function RegisterScreen({
  isDarkMode,
  isSignedIn,
  labels,
  locale,
  onSubmit,
}: {
  isDarkMode: boolean;
  isSignedIn: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onSubmit: (input: BusinessRegistrationInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Ottawa");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("travel-tours");
  const [servesAllCanada, setServesAllCanada] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitError("");
    setSubmitted(false);

    if (!name.trim() || !city.trim() || !description.trim()) {
      return;
    }

    if (isSupabaseConfigured && !isSignedIn) {
      setSubmitError(labels.signInRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        categorySlug,
        city,
        description,
        name,
        servesAllCanada,
      });
      setSubmitted(true);
    } catch (error) {
      console.error("[kolo:mobile-registration]", error);
      setSubmitError(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.flex}
    >
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.addBusiness}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.registerIntro}
          </Text>
          <Field isDarkMode={isDarkMode} label={labels.name}>
            <TextInput
              onChangeText={setName}
              placeholder={labels.name}
              placeholderTextColor={isDarkMode ? "#758882" : "#7b8581"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              value={name}
            />
          </Field>
          <Field isDarkMode={isDarkMode} label={labels.category}>
            <CategoryPicker
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              onSelect={setCategorySlug}
              selectedSlug={categorySlug}
            />
          </Field>
          <Field isDarkMode={isDarkMode} label={labels.city}>
            <LocationPicker
              isDarkMode={isDarkMode}
              labels={labels}
              onChange={setCity}
              placeholder={labels.city}
              value={city}
            />
          </Field>
          <View style={[styles.switchRow, isDarkMode ? styles.darkSettingRow : null]}>
            <Text style={[styles.switchLabel, isDarkMode ? styles.darkText : null]}>
              {labels.canadaWide}
            </Text>
            <Switch
              onValueChange={setServesAllCanada}
              thumbColor={servesAllCanada ? "#ffffff" : "#153f38"}
              trackColor={{ false: "#b7cbc5", true: "#287365" }}
              value={servesAllCanada}
            />
          </View>
          <Field isDarkMode={isDarkMode} label={labels.description}>
            <TextInput
              multiline
              onChangeText={setDescription}
              placeholder={labels.description}
              placeholderTextColor={isDarkMode ? "#758882" : "#7b8581"}
              style={[
                styles.input,
                styles.textArea,
                isDarkMode ? styles.darkInput : null,
              ]}
              value={description}
            />
          </Field>
          <PrimaryButton
            label={labels.submit}
            disabled={isSubmitting}
            onPress={() => {
              void handleSubmit();
            }}
          />
          {submitError ? <Text style={styles.errorText}>{submitError}</Text> : null}
          {submitted ? <Text style={styles.successText}>{labels.submitted}</Text> : null}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function DashboardScreen({
  business,
  isDarkMode,
  labels,
  locale,
  onSave,
  profileEmail,
  profileName,
}: {
  business: Business | null;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onSave: (business: Business) => Promise<void> | void;
  profileEmail: string;
  profileName: string;
}) {
  const [draft, setDraft] = useState(business ?? defaultOwnedBusiness);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (business) {
      setDraft(business);
    }
  }, [business]);

  async function handleSave() {
    try {
      setSaved(false);
      setSaveError("");
      setIsSaving(true);
      await onSave(draft);
      setSaved(true);
    } catch (error) {
      console.error("[kolo:mobile-dashboard-save]", error);
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!business) {
    return (
      <ScrollView
        contentContainerStyle={styles.screenContent}
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.dashboard}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.noOwnedBusiness}
          </Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.profileCard, isDarkMode ? styles.darkCard : null]}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{getInitials(profileName)}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={[styles.profileName, isDarkMode ? styles.darkText : null]}>
            {profileName}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {profileEmail}
          </Text>
          <Text style={styles.contactLine}>business@kolo.app</Text>
        </View>
      </View>

      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.editProfile}
        </Text>
        <Field isDarkMode={isDarkMode} label={labels.name}>
          <TextInput
            onChangeText={(value) => {
              setDraft({ ...draft, name: value });
              setSaved(false);
            }}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={draft.name}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.category}>
          <CategoryPicker
            isDarkMode={isDarkMode}
            labels={labels}
            locale={locale}
            onSelect={(categorySlug) => {
              setDraft({ ...draft, categorySlug });
              setSaved(false);
            }}
            selectedSlug={draft.categorySlug}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.city}>
          <LocationPicker
            isDarkMode={isDarkMode}
            labels={labels}
            onChange={(value) => {
              setDraft({ ...draft, city: value });
              setSaved(false);
            }}
            placeholder={labels.city}
            value={draft.city}
          />
        </Field>
        <View style={[styles.switchRow, isDarkMode ? styles.darkSettingRow : null]}>
          <Text style={[styles.switchLabel, isDarkMode ? styles.darkText : null]}>
            {labels.canadaWide}
          </Text>
          <Switch
            onValueChange={(value) => {
              setDraft({ ...draft, servesAllCanada: value });
              setSaved(false);
            }}
            thumbColor={draft.servesAllCanada ? "#ffffff" : "#153f38"}
            trackColor={{ false: "#b7cbc5", true: "#287365" }}
            value={draft.servesAllCanada}
          />
        </View>
        <Field isDarkMode={isDarkMode} label={labels.description}>
          <TextInput
            multiline
            onChangeText={(value) => {
              setDraft({ ...draft, description: value });
              setSaved(false);
            }}
            style={[
              styles.input,
              styles.textArea,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={draft.description}
          />
        </Field>
        <PrimaryButton
          disabled={isSaving}
          label={labels.save}
          onPress={() => {
            void handleSave();
          }}
        />
        {saveError ? <Text style={styles.errorText}>{saveError}</Text> : null}
        {saved ? <Text style={styles.successText}>{labels.saved}</Text> : null}
      </View>
    </ScrollView>
  );
}

function ProfileScreen({
  authMessage,
  isDarkMode,
  isAuthBusy,
  isSupabaseConfigured,
  labels,
  onSignIn,
  onSignOut,
  profileEmail,
  profileName,
  session,
  setIsDarkMode,
}: {
  authMessage: string;
  isDarkMode: boolean;
  isAuthBusy: boolean;
  isSupabaseConfigured: boolean;
  labels: Record<string, string>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  profileEmail: string;
  profileName: string;
  session: Session | null;
  setIsDarkMode: (value: boolean) => void;
}) {
  return (
    <ScrollView
      contentContainerStyle={styles.screenContent}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      {session ? (
        <View style={[styles.profileHero, isDarkMode ? styles.darkCard : null]}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{getInitials(profileName)}</Text>
          </View>
          <View style={styles.flex}>
            <Text style={[styles.profileName, isDarkMode ? styles.darkText : null]}>
              {profileName}
            </Text>
            <Text
              style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}
            >
              {labels.signedInAs}
            </Text>
            <Text style={styles.contactLine}>{profileEmail}</Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        <PrimaryButton
          disabled={isAuthBusy || !isSupabaseConfigured}
          label={session ? labels.signOut : labels.signInGoogle}
          onPress={() => {
            void (session ? onSignOut() : onSignIn());
          }}
        />
        {!isSupabaseConfigured ? (
          <Text style={styles.errorText}>{labels.notConfigured}</Text>
        ) : null}
        {authMessage ? <Text style={styles.errorText}>{authMessage}</Text> : null}

        {session ? (
          <>
            <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
              {labels.userProfile}
            </Text>
            <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
              {labels.profileIntro}
            </Text>

            <View style={styles.profileInfoGrid}>
              <ProfileInfo
                isDarkMode={isDarkMode}
                label={labels.name}
                value={profileName}
              />
              <ProfileInfo
                isDarkMode={isDarkMode}
                label={labels.contactEmail}
                value={profileEmail}
              />
              <ProfileInfo
                isDarkMode={isDarkMode}
                label="Google"
                value={session.user.email ?? ""}
              />
            </View>
          </>
        ) : null}
      </View>

      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.settings}
        </Text>

        <View style={[styles.settingsRow, isDarkMode ? styles.darkSettingRow : null]}>
          <View style={styles.settingLabelRow}>
            {isDarkMode ? (
              <Moon color="#d8f1f7" size={20} strokeWidth={2.4} />
            ) : (
              <Sun color="#287365" size={20} strokeWidth={2.4} />
            )}
            <View>
              <Text
                style={[
                  styles.switchLabel,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                {labels.theme}
              </Text>
              <Text
                style={[
                  styles.settingMeta,
                  isDarkMode ? styles.darkMutedText : null,
                ]}
              >
                {isDarkMode ? labels.themeDark : labels.themeLight}
              </Text>
            </View>
          </View>
          <Switch
            onValueChange={setIsDarkMode}
            thumbColor={isDarkMode ? "#ffffff" : "#153f38"}
            trackColor={{ false: "#b7cbc5", true: "#287365" }}
            value={isDarkMode}
          />
        </View>

      </View>
    </ScrollView>
  );
}

function ProfileInfo({
  isDarkMode,
  label,
  value,
}: {
  isDarkMode: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={[styles.profileInfoItem, isDarkMode ? styles.darkSettingRow : null]}>
      <Text style={[styles.fieldLabel, isDarkMode ? styles.darkMutedText : null]}>
        {label}
      </Text>
      <Text style={[styles.profileInfoValue, isDarkMode ? styles.darkText : null]}>
        {value}
      </Text>
    </View>
  );
}

function BusinessCard({
  business,
  isDarkMode,
  labels,
  locale,
  onPress,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.businessCard, isDarkMode ? styles.darkBusinessCard : null]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.categoryBadge, isDarkMode ? styles.darkBadge : null]}>
          {getCategoryName(business.categorySlug, locale)}
        </Text>
        {business.ownerAvatarUrl ? (
          <Image
            source={{ uri: business.ownerAvatarUrl }}
            style={styles.cardOwnerAvatar}
          />
        ) : null}
      </View>
      <Text style={[styles.businessName, isDarkMode ? styles.darkText : null]}>
        {business.name}
      </Text>
      <View style={styles.metaRow}>
        {business.servesAllCanada ? (
          <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
            {labels.canadaWide}
          </Text>
        ) : null}
        <Text style={[styles.cityText, isDarkMode ? styles.darkMutedText : null]}>
          {business.city}
        </Text>
      </View>
      <Text style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}>
        {business.description}
      </Text>
    </Pressable>
  );
}

function BusinessModal({
  business,
  isDarkMode,
  labels,
  locale,
  onClose,
  onManage,
}: {
  business: Business | null;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onClose: () => void;
  onManage: () => void;
}) {
  const contacts = business ? getBusinessContacts(business, labels) : [];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={Boolean(business)}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalDismissLayer}
        />
        <View style={[styles.modalSheet, isDarkMode ? styles.darkModalSheet : null]}>
          {business ? (
            <ScrollView
              bounces
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
              showsVerticalScrollIndicator
              style={styles.modalScroll}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.categoryBadge, isDarkMode ? styles.darkBadge : null]}>
                  {getCategoryName(business.categorySlug, locale)}
                </Text>
                <Pressable
                  accessibilityLabel={labels.close}
                  accessibilityRole="button"
                  onPress={onClose}
                  style={[
                    styles.modalCloseButton,
                    isDarkMode ? styles.darkSettingRow : null,
                  ]}
                >
                  <X
                    color={isDarkMode ? "#d8f1f7" : "#153f38"}
                    size={19}
                    strokeWidth={2.7}
                  />
                </Pressable>
              </View>
              <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                {business.name}
              </Text>
              <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                {business.servesAllCanada ? labels.canadaWide : business.city}
              </Text>
              <OwnerChip
                business={business}
                isDarkMode={isDarkMode}
                labels={labels}
                prominent
              />
              <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                {business.description}
              </Text>
              {contacts.length ? (
                <View style={[styles.contactCard, isDarkMode ? styles.darkSettingRow : null]}>
                  <Text
                    style={[
                      styles.contactSectionTitle,
                      isDarkMode ? styles.darkText : null,
                    ]}
                  >
                    {labels.contacts}
                  </Text>
                  {contacts.map((contact) => (
                    <ContactRow
                      contact={contact}
                      isDarkMode={isDarkMode}
                      key={contact.key}
                    />
                  ))}
                </View>
              ) : null}
              {business.ownedByCurrentUser ? (
                <PrimaryButton label={labels.manageProfile} onPress={onManage} />
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type ContactItem = {
  Icon: LucideIcon;
  key: string;
  label: string;
  url: string;
  value: string;
};

function ContactRow({
  contact,
  isDarkMode,
}: {
  contact: ContactItem;
  isDarkMode: boolean;
}) {
  const Icon = contact.Icon;

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        void openContactUrl(contact.url);
      }}
      style={[styles.contactRow, isDarkMode ? styles.darkSettingRow : null]}
    >
      <View style={[styles.contactIcon, isDarkMode ? styles.darkIconBox : null]}>
        <Icon color={isDarkMode ? "#d8f1f7" : "#287365"} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.contactLabel, isDarkMode ? styles.darkMutedText : null]}>
          {contact.label}
        </Text>
        <Text style={styles.contactLine}>
          {contact.value}
        </Text>
      </View>
    </Pressable>
  );
}

function OwnerChip({
  business,
  isDarkMode,
  labels,
  prominent,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
  prominent?: boolean;
}) {
  const ownerName = getBusinessOwnerName(business);

  if (!ownerName) {
    return null;
  }

  return (
    <View
      style={[
        styles.ownerChip,
        prominent ? styles.ownerChipProminent : null,
        isDarkMode ? styles.darkSettingRow : null,
      ]}
    >
      {business.ownerAvatarUrl ? (
        <Image
          source={{ uri: business.ownerAvatarUrl }}
          style={styles.ownerAvatar}
        />
      ) : (
        <View style={[styles.ownerAvatarFallback, isDarkMode ? styles.darkIconBox : null]}>
          <UserRound
            color={isDarkMode ? "#d8f1f7" : "#287365"}
            size={17}
            strokeWidth={2.5}
          />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={[styles.ownerChipLabel, isDarkMode ? styles.darkMutedText : null]}>
          {labels.owner}
        </Text>
        <Text
          numberOfLines={prominent ? 2 : 1}
          style={[styles.ownerChipName, isDarkMode ? styles.darkText : null]}
        >
          {ownerName}
        </Text>
      </View>
    </View>
  );
}

function TabButton({
  active,
  Icon,
  isDarkMode,
  label,
  onPress,
}: {
  active: boolean;
  Icon: LucideIcon;
  isDarkMode: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.tabButton, active ? styles.activeTabButton : null]}
    >
      <Icon
        color={active ? "#ffffff" : isDarkMode ? "#d8e1de" : "#5d6a66"}
        size={21}
        strokeWidth={2.6}
      />
    </Pressable>
  );
}

function CategoryPicker({
  allowAll,
  isDarkMode,
  labels,
  locale,
  onSelect,
  selectedSlug,
}: {
  allowAll?: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onSelect: (value: string) => void;
  selectedSlug: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const options = allowAll
    ? [{ name: { en: labels.all, uk: labels.all }, slug: "all" }, ...categories]
    : categories;
  const selectedLabel =
    selectedSlug === "all" ? labels.all : getCategoryName(selectedSlug, locale);

  function handleSelect(slug: string) {
    onSelect(slug);
    setIsOpen(false);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[
          styles.categoryPickerButton,
          isDarkMode ? styles.darkInput : null,
        ]}
      >
        <Text style={[styles.categoryPickerText, isDarkMode ? styles.darkText : null]}>
          {selectedLabel}
        </Text>
        <Text
          style={[
            styles.categoryPickerChevron,
            isDarkMode ? styles.darkAccentText : null,
          ]}
        >
          v
        </Text>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isOpen}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.modalDismissLayer}
          />
          <View
            style={[
              styles.categoryPickerSheet,
              isDarkMode ? styles.darkPickerSheet : null,
            ]}
          >
            <View style={[styles.pickerHeader, isDarkMode ? styles.darkPickerHeader : null]}>
              <Text style={[styles.pickerTitle, isDarkMode ? styles.darkText : null]}>
                {labels.chooseCategory}
              </Text>
              <Pressable
                accessibilityLabel={labels.close}
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={[
                  styles.modalCloseButton,
                  isDarkMode ? styles.darkSettingRow : null,
                ]}
              >
                <X
                  color={isDarkMode ? "#d8f1f7" : "#153f38"}
                  size={19}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.categoryPickerList}
              showsVerticalScrollIndicator
            >
              {options.map((category) => {
                const isSelected = selectedSlug === category.slug;

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={category.slug}
                    onPress={() => handleSelect(category.slug)}
                    style={[
                      styles.categoryOption,
                      isDarkMode ? styles.darkPickerOption : null,
                      isSelected ? styles.activeCategoryOption : null,
                      isDarkMode && isSelected ? styles.darkActiveOption : null,
                    ]}
                  >
                    <Text
                      style={[
                        styles.categoryOptionText,
                        isDarkMode ? styles.darkText : null,
                        isSelected ? styles.activeCategoryOptionText : null,
                        isDarkMode && isSelected ? styles.darkActiveOptionText : null,
                      ]}
                    >
                      {category.name[locale]}
                    </Text>
                    {isSelected ? (
                      <Text style={styles.categoryOptionCheck}>
                        {labels.selected}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function LocationPicker({
  allowAll,
  isDarkMode,
  labels,
  onChange,
  placeholder,
  showMyLocation,
  value,
}: {
  allowAll?: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onChange: (value: string) => void;
  placeholder: string;
  showMyLocation?: boolean;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const options = [
    ...(allowAll ? [labels.allCanada] : []),
    ...(showMyLocation ? [labels.myLocation] : []),
    ...citySuggestions,
  ];

  function handleSelect(location: string) {
    if (location === labels.allCanada) {
      onChange("");
    } else {
      onChange(location === labels.myLocation ? "Stittsville" : location);
    }

    setIsOpen(false);
  }

  return (
    <>
      <View style={styles.locationPickerRow}>
        <TextInput
          autoCapitalize="words"
          onChangeText={onChange}
          placeholder={allowAll ? labels.allCanada : placeholder}
          placeholderTextColor={isDarkMode ? "#758882" : "#7b8581"}
          style={[
            styles.input,
            styles.locationPickerInput,
            isDarkMode ? styles.darkInput : null,
          ]}
          value={value}
        />
        <Pressable
          accessibilityLabel={labels.chooseLocation}
          accessibilityRole="button"
          onPress={() => setIsOpen(true)}
          style={[
            styles.locationPickerButton,
            isDarkMode ? styles.darkIconBox : null,
          ]}
        >
          <MapPin color={isDarkMode ? "#d8f1f7" : "#287365"} size={20} strokeWidth={2.5} />
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isOpen}
      >
        <View style={styles.pickerBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.modalDismissLayer}
          />
          <View
            style={[
              styles.locationPickerSheet,
              isDarkMode ? styles.darkPickerSheet : null,
            ]}
          >
            <View style={[styles.pickerHeader, isDarkMode ? styles.darkPickerHeader : null]}>
              <Text style={[styles.pickerTitle, isDarkMode ? styles.darkText : null]}>
                {labels.chooseLocation}
              </Text>
              <Pressable
                accessibilityLabel={labels.close}
                accessibilityRole="button"
                onPress={() => setIsOpen(false)}
                style={[
                  styles.modalCloseButton,
                  isDarkMode ? styles.darkSettingRow : null,
                ]}
              >
                <X
                  color={isDarkMode ? "#d8f1f7" : "#153f38"}
                  size={19}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>
            <ScrollView
              contentContainerStyle={styles.locationPickerList}
              showsVerticalScrollIndicator
            >
              {options.map((location) => {
                const selectedValue =
                  location === labels.allCanada
                    ? ""
                    : location === labels.myLocation
                      ? "Stittsville"
                      : location;
                const isSelected =
                  normalize(value) === normalize(selectedValue);

                return (
                  <Pressable
                    accessibilityRole="button"
                    key={location}
                    onPress={() => handleSelect(location)}
                    style={[
                      styles.locationOption,
                      isDarkMode ? styles.darkPickerOption : null,
                      isSelected ? styles.activeLocationOption : null,
                      isDarkMode && isSelected ? styles.darkActiveOption : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.locationOptionIcon,
                        isDarkMode ? styles.darkIconBox : null,
                      ]}
                    >
                      <MapPin
                        color={isDarkMode ? "#d8f1f7" : "#287365"}
                        size={17}
                        strokeWidth={2.5}
                      />
                    </View>
                    <Text
                      style={[
                        styles.locationOptionText,
                        isDarkMode ? styles.darkText : null,
                        isSelected ? styles.activeLocationOptionText : null,
                        isDarkMode && isSelected ? styles.darkActiveOptionText : null,
                      ]}
                    >
                      {location}
                    </Text>
                    {isSelected ? (
                      <Text style={styles.categoryOptionCheck}>
                        {labels.selected}
                      </Text>
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function Field({
  children,
  isDarkMode,
  label,
}: {
  children: React.ReactNode;
  isDarkMode?: boolean;
  label: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, isDarkMode ? styles.darkMutedText : null]}>
        {label}
      </Text>
      {children}
    </View>
  );
}

function PrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, disabled ? styles.disabledButton : null]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function getCategoryName(slug: string, locale: Locale) {
  return categories.find((category) => category.slug === slug)?.name[locale] ?? slug;
}

function getBusinessContacts(
  business: Business,
  labels: Record<string, string>,
): ContactItem[] {
  const contacts: ContactItem[] = [];
  const phoneUrl = getPhoneUrl(business.phone);
  const websiteUrl = getWebsiteUrl(business.website);
  const instagramUrl = getInstagramUrl(business.instagram);
  const addressUrl = getAddressUrl(business.address, business.city);

  if (business.phone && phoneUrl) {
    contacts.push({
      Icon: Phone,
      key: "phone",
      label: labels.phone,
      url: phoneUrl,
      value: business.phone,
    });
  }

  if (business.website && websiteUrl) {
    contacts.push({
      Icon: ExternalLink,
      key: "website",
      label: labels.website,
      url: websiteUrl,
      value: business.website,
    });
  }

  if (business.instagram && instagramUrl) {
    contacts.push({
      Icon: ExternalLink,
      key: "instagram",
      label: labels.instagram,
      url: instagramUrl,
      value: formatInstagramValue(business.instagram),
    });
  }

  if (business.address && addressUrl) {
    contacts.push({
      Icon: MapPin,
      key: "address",
      label: labels.address,
      url: addressUrl,
      value: business.address,
    });
  }

  return contacts;
}

async function openContactUrl(url: string) {
  try {
    await Linking.openURL(url);
  } catch (error) {
    console.error("[kolo:mobile-contact-link]", error);
  }
}

function getPhoneUrl(phone: string) {
  const normalizedPhone = phone.replace(/[^\d+]/g, "");

  return normalizedPhone ? `tel:${normalizedPhone}` : null;
}

function getWebsiteUrl(website: string) {
  const trimmedWebsite = website.trim();

  if (!trimmedWebsite) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedWebsite)) {
    return trimmedWebsite;
  }

  return `https://${trimmedWebsite}`;
}

function getInstagramUrl(instagram?: string) {
  const handle = getInstagramHandle(instagram);

  return handle ? `https://www.instagram.com/${handle}` : null;
}

function formatInstagramValue(instagram: string) {
  const handle = getInstagramHandle(instagram);

  return handle ? `@${handle}` : instagram.trim();
}

function getInstagramHandle(instagram?: string) {
  const trimmedInstagram = instagram?.trim() ?? "";

  if (!trimmedInstagram) {
    return null;
  }

  const withoutProtocol = trimmedInstagram.replace(/^https?:\/\//i, "");
  const withoutHost = withoutProtocol
    .replace(/^www\.instagram\.com\//i, "")
    .replace(/^instagram\.com\//i, "");
  const handle = withoutHost.replace(/^@/, "").split(/[/?#]/)[0]?.trim();

  return handle || null;
}

function getAddressUrl(address?: string, city?: string) {
  const trimmedAddress = address?.trim() ?? "";

  if (!trimmedAddress) {
    return null;
  }

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    [trimmedAddress, city].filter(Boolean).join(", "),
  )}`;
}

function getSessionName(session: Session | null) {
  const metadata = session?.user.user_metadata as
    | Record<string, unknown>
    | undefined;
  const fullName = metadata?.full_name;
  const name = metadata?.name;

  if (typeof fullName === "string" && fullName.trim()) {
    return fullName.trim();
  }

  if (typeof name === "string" && name.trim()) {
    return name.trim();
  }

  return session?.user.email ?? "Guest";
}

function getSessionAvatarUrl(session: Session | null) {
  const metadata = session?.user.user_metadata as
    | Record<string, unknown>
    | undefined;
  const avatarUrl = metadata?.avatar_url ?? metadata?.picture;

  return typeof avatarUrl === "string" && avatarUrl.trim()
    ? avatarUrl.trim()
    : undefined;
}

function getBusinessOwnerName(business: Business) {
  return business.ownerName?.trim() ?? "";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected error";
}

function isNearLocation(city: string, location: string) {
  const normalizedCity = normalize(city);
  const normalizedLocation = normalize(location);
  const canonicalCity = getCanonicalLocationKey(city);
  const canonicalLocation = getCanonicalLocationKey(location);

  if (
    normalizedCity.includes(normalizedLocation) ||
    normalizedLocation.includes(normalizedCity) ||
    getLocationAliases(city).includes(normalizedLocation) ||
    getLocationAliases(location).includes(normalizedCity)
  ) {
    return true;
  }

  if (canonicalCity && canonicalLocation && canonicalCity === canonicalLocation) {
    return true;
  }

  return Object.values(nearbyGroups).some(
    (group) =>
      Boolean(canonicalCity) &&
      Boolean(canonicalLocation) &&
      group.includes(canonicalCity) &&
      group.includes(canonicalLocation),
  );
}

function getCanonicalLocationKey(value: string) {
  const normalizedValue = normalize(value);

  if (!normalizedValue) {
    return "";
  }

  for (const [canonicalLocation, aliases] of Object.entries(locationAliases)) {
    if (
      aliases.some((alias) => {
        const normalizedAlias = normalize(alias);

        return (
          normalizedValue === normalizedAlias ||
          normalizedValue.includes(normalizedAlias) ||
          normalizedAlias.includes(normalizedValue)
        );
      })
    ) {
      return canonicalLocation;
    }
  }

  return normalizedValue;
}

function getLocationAliases(value: string) {
  const canonicalLocation = getCanonicalLocationKey(value);
  const aliases = locationAliases[canonicalLocation] ?? [value];

  return aliases.map(normalize).join(" ");
}

function getSearchAliases(categorySlug: string) {
  const aliases: Record<string, string> = {
    "advertising-services":
      "advertising marketing design print branding social media реклама маркетинг дизайн друк брендинг соцмережі",
    "auto-repair":
      "auto car repair detailing mechanic авто автосервіс ремонт детайлінг механік",
    beauty:
      "beauty hair nails makeup brows salon краса волосся нігті макіяж брови салон",
    cleaning:
      "cleaning cleaner housekeeping move out прибирання клінінг чистка",
    construction:
      "construction renovation contractor repair building будівництво ремонт майстер",
    events:
      "events party wedding decor planning івенти події весілля декор свято",
    flowers:
      "flowers florist bouquets квіти флорист букети",
    "grocery-stores":
      "food grocery bakery catering products їжа продукти пекарня кейтеринг",
    "insurance-brokers":
      "insurance broker страхування страховий брокер",
    "it-services":
      "it tech software websites automation ai support technology сайти техпідтримка автоматизація",
    lawyers:
      "law lawyer legal attorney immigration юрист юридичні правова імміграція",
    photographers:
      "photo video photography photographer фотo відео фотограф зйомка",
    realtors:
      "realtor real estate home mortgage рієлтор нерухомість житло",
    "repair-services":
      "repair handyman appliance furniture service ремонт майстер техніка меблі",
    restaurants:
      "food restaurant cafe bakery catering kitchen їжа ресторан кафе пекарня кейтеринг кухня",
    shops:
      "shop store retail boutique магазин крамниця товари",
    "textile-decor":
      "textile decor pillows curtains upholstery home текстиль декор подушки штори перетяжка",
    "travel-tours":
      "travel tours trips tickets vacation подорожі тури квитки відпочинок",
    tutors:
      "tutor lessons teacher education репетитор уроки навчання викладач",
    "wellness-care":
      "wellness yoga trainer meditation mental health self care здоров'я йога тренер медитація психолог",
  };

  return aliases[categorySlug] ?? "";
}

function normalize(value: string) {
  return value.trim().toLowerCase();
}

const styles = StyleSheet.create({
  activeCategoryOption: {
    backgroundColor: "#eef8f6",
    borderColor: "#9ccdc2",
  },
  activeCategoryOptionText: {
    color: "#153f38",
  },
  activeLocationOption: {
    backgroundColor: "#eef8f6",
    borderColor: "#9ccdc2",
  },
  activeLocationOptionText: {
    color: "#153f38",
  },
  activeTabButton: {
    backgroundColor: "#153f38",
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#d8f1f7",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarLarge: {
    alignItems: "center",
    backgroundColor: "#d8f1f7",
    borderRadius: 22,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: {
    color: "#153f38",
    fontSize: 17,
    fontWeight: "900",
  },
  businessCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e4ebe8",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    shadowColor: "#0e2f2a",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  businessName: {
    color: "#101817",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#e4ebe8",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#d8f1f7",
    borderColor: "#a9dff0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#26728a",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e0e8e5",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  categoryOptionCheck: {
    backgroundColor: "#d8f1f7",
    borderRadius: 999,
    color: "#26728a",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  categoryOptionText: {
    color: "#101817",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  categoryPickerButton: {
    alignItems: "center",
    backgroundColor: "#fbfcfa",
    borderColor: "#d7e0dd",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  categoryPickerChevron: {
    color: "#287365",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryPickerList: {
    gap: 10,
    padding: 18,
    paddingBottom: 34,
  },
  categoryPickerSheet: {
    backgroundColor: "#fbfcfa",
    borderColor: "#d8e7e2",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: CATEGORY_PICKER_SHEET_HEIGHT,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#0e2f2a",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  categoryPickerText: {
    color: "#101817",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  cityText: {
    color: "#5d6a66",
    fontSize: 14,
    fontWeight: "700",
  },
  contactCard: {
    backgroundColor: "#f4f8f6",
    borderRadius: 14,
    gap: 10,
    padding: 14,
  },
  contactIcon: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e1de",
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  contactLabel: {
    color: "#5d6a66",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  contactLine: {
    color: "#287365",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  contactRow: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e0e8e5",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  contactSectionTitle: {
    color: "#153f38",
    fontSize: 15,
    fontWeight: "900",
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  descriptionText: {
    color: "#5d6a66",
    fontSize: 15,
    lineHeight: 22,
  },
  disabledButton: {
    opacity: 0.58,
  },
  darkCard: {
    backgroundColor: "#172421",
    borderColor: "#2a3f3a",
  },
  darkAccentText: {
    color: "#d8f1f7",
  },
  darkActiveOption: {
    backgroundColor: "#12352f",
    borderColor: "#4fb8aa",
  },
  darkActiveOptionText: {
    color: "#d8f1f7",
  },
  darkBadge: {
    backgroundColor: "#153f38",
    borderColor: "#4fb8aa",
    color: "#d8f1f7",
  },
  darkBusinessCard: {
    backgroundColor: "#172421",
    borderColor: "#2a3f3a",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
  },
  darkEmptyState: {
    backgroundColor: "#172421",
    color: "#9fb0ab",
  },
  darkIconBox: {
    backgroundColor: "#101b18",
    borderColor: "#2a3f3a",
  },
  darkInput: {
    backgroundColor: "#101b18",
    borderColor: "#2a3f3a",
    color: "#f5faf8",
  },
  darkModalSheet: {
    backgroundColor: "#101b18",
    borderColor: "#2a3f3a",
    shadowColor: "#000000",
  },
  darkMutedText: {
    color: "#9fb0ab",
  },
  darkOnlineBadge: {
    backgroundColor: "#12352f",
    color: "#d8f1f7",
  },
  darkPickerHeader: {
    borderBottomColor: "#2a3f3a",
  },
  darkPickerOption: {
    backgroundColor: "#172421",
    borderColor: "#2a3f3a",
  },
  darkPickerSheet: {
    backgroundColor: "#101b18",
    borderColor: "#2a3f3a",
    shadowColor: "#000000",
  },
  darkSafeArea: {
    backgroundColor: "#0f1816",
  },
  darkSettingRow: {
    backgroundColor: "#0f1816",
    borderColor: "#2a3f3a",
  },
  darkTabBar: {
    backgroundColor: "#172421",
    borderColor: "#2a3f3a",
  },
  darkText: {
    color: "#f5faf8",
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    color: "#5d6a66",
    fontSize: 16,
    fontWeight: "700",
    padding: 18,
    textAlign: "center",
  },
  errorText: {
    backgroundColor: "#fff1f0",
    borderColor: "#ffd3cf",
    borderRadius: 12,
    borderWidth: 1,
    color: "#b42318",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    padding: 12,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: "#153f38",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  flex: {
    flex: 1,
  },
  categoryPreviewCard: {
    backgroundColor: "#ffffff",
    borderColor: "#e0e8e5",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 8,
    minHeight: 94,
    padding: 14,
    shadowColor: "#0e2f2a",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
  },
  categoryPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryPreviewMeta: {
    color: "#65736f",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryPreviewName: {
    color: "#101817",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  cityPill: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e7e2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  cityPillGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  cityPillText: {
    color: "#153f38",
    fontSize: 14,
    fontWeight: "900",
  },
  homeHero: {
    backgroundColor: "#ffffff",
    borderColor: "#e4ebe8",
    borderRadius: 28,
    borderWidth: 1,
    gap: 13,
    padding: 20,
    shadowColor: "#0e2f2a",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
  },
  homeIntro: {
    color: "#65736f",
    fontSize: 16,
    lineHeight: 23,
  },
  homeKicker: {
    alignSelf: "flex-start",
    backgroundColor: "#d8f1f7",
    borderColor: "#a9dff0",
    borderRadius: 8,
    borderWidth: 1,
    color: "#26728a",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  homeSearchButton: {
    alignItems: "center",
    backgroundColor: "#f4f8f6",
    borderColor: "#d8e7e2",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
  },
  homeSearchText: {
    color: "#65736f",
    fontSize: 14,
    fontWeight: "700",
  },
  homeSearchTitle: {
    color: "#153f38",
    fontSize: 15,
    fontWeight: "900",
  },
  homeSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  homeTitle: {
    color: "#101817",
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 36,
  },
  input: {
    backgroundColor: "#fbfcfa",
    borderColor: "#d7e0dd",
    borderRadius: 14,
    borderWidth: 1,
    color: "#101817",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  locationOption: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e0e8e5",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  locationOptionIcon: {
    alignItems: "center",
    backgroundColor: "#eef5f2",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  locationOptionText: {
    color: "#101817",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  locationPickerButton: {
    alignItems: "center",
    backgroundColor: "#eef5f2",
    borderColor: "#d7e0dd",
    borderRadius: 14,
    borderWidth: 1,
    height: 52,
    justifyContent: "center",
    width: 52,
  },
  locationPickerInput: {
    flex: 1,
  },
  locationPickerList: {
    gap: 10,
    padding: 18,
    paddingBottom: 34,
  },
  locationPickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  locationPickerSheet: {
    backgroundColor: "#fbfcfa",
    borderColor: "#d8e7e2",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: LOCATION_PICKER_SHEET_HEIGHT,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#0e2f2a",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  cardOwnerAvatar: {
    borderColor: "#d8e7e2",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    width: 44,
  },
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  modalBackdrop: {
    backgroundColor: "rgba(16, 24, 23, 0.28)",
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBody: {
    color: "#42504c",
    fontSize: 16,
    lineHeight: 24,
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: "#eef5f2",
    borderColor: "#d8e7e2",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  modalDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalSheet: {
    backgroundColor: "#fbfcfa",
    borderColor: "#d8e7e2",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: BUSINESS_SHEET_HEIGHT,
    overflow: "hidden",
    shadowColor: "#0e2f2a",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  modalContent: {
    gap: 14,
    padding: 22,
    paddingBottom: 54,
    paddingTop: 30,
  },
  modalScroll: {
    flex: 1,
  },
  modalTitle: {
    color: "#101817",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  mutedText: {
    color: "#65736f",
    fontSize: 15,
    lineHeight: 22,
  },
  onlineBadge: {
    backgroundColor: "#e4f4ef",
    borderRadius: 8,
    color: "#287365",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  ownerAvatar: {
    borderRadius: 15,
    height: 30,
    width: 30,
  },
  ownerAvatarFallback: {
    alignItems: "center",
    backgroundColor: "#d8f1f7",
    borderRadius: 15,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  ownerChip: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#f4f8f6",
    borderColor: "#d8e7e2",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 9,
    maxWidth: "100%",
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  ownerChipLabel: {
    color: "#5d6a66",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  ownerChipName: {
    color: "#153f38",
    fontSize: 13,
    fontWeight: "900",
  },
  ownerChipProminent: {
    alignSelf: "stretch",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#287365",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "900",
  },
  pickerBackdrop: {
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerHeader: {
    alignItems: "center",
    borderBottomColor: "#e1ebe7",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pickerTitle: {
    color: "#101817",
    fontSize: 18,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#d8e1de",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  profileHero: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#e4ebe8",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    padding: 18,
  },
  profileInfoGrid: {
    gap: 10,
  },
  profileInfoItem: {
    backgroundColor: "#f4f8f6",
    borderColor: "#e0e8e5",
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
    padding: 13,
  },
  profileInfoValue: {
    color: "#101817",
    fontSize: 15,
    fontWeight: "800",
  },
  profileName: {
    color: "#101817",
    fontSize: 19,
    fontWeight: "900",
  },
  resultCount: {
    backgroundColor: "#d8f1f7",
    borderRadius: 8,
    color: "#26728a",
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  safeArea: {
    backgroundColor: "#f7f7f3",
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  screenContent: {
    gap: 13,
    paddingBottom: 18,
    paddingTop: 4,
  },
  searchPanel: {
    backgroundColor: "#ffffff",
    borderColor: "#e4ebe8",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#cbd8d4",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#153f38",
    fontSize: 16,
    fontWeight: "900",
  },
  sectionTitle: {
    color: "#101817",
    fontSize: 24,
    fontWeight: "900",
  },
  settingLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  settingMeta: {
    color: "#65736f",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  settingsRow: {
    alignItems: "center",
    backgroundColor: "#f4f8f6",
    borderColor: "#e0e8e5",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    backgroundColor: "#e4f4ef",
    borderRadius: 12,
    color: "#287365",
    fontSize: 14,
    fontWeight: "900",
    padding: 12,
  },
  switchLabel: {
    color: "#153f38",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: "#f4f8f6",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  tabBar: {
    backgroundColor: "#ffffff",
    borderColor: "#e4ebe8",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: -14,
    marginTop: 8,
    padding: 5,
    shadowColor: "#0e2f2a",
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 16,
    width: "100%",
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 20,
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
  },
  textArea: {
    minHeight: 118,
    paddingTop: 14,
    textAlignVertical: "top",
  },
});
