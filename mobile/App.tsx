import { useEffect, useMemo, useState } from "react";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import Constants, { AppOwnership } from "expo-constants";
import * as Linking from "expo-linking";
import * as ImagePicker from "expo-image-picker";
import {
  Alert,
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
  Lock,
  MapPin,
  Moon,
  Pencil,
  Phone,
  Plus,
  Search,
  Sun,
  Trash2,
  type LucideIcon,
  Upload,
  UserRound,
  X,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import type { Session } from "@supabase/supabase-js";

import {
  businesses as initialBusinesses,
  categories,
  citySuggestions,
} from "./src/data";
import {
  completeAuthFromUrl,
  signInWithEmailPassword,
  signInWithGoogle,
  signOut,
} from "./src/auth";
import {
  createBusinessContentItem,
  createBusinessRegistration,
  deleteBusinessContentItem,
  fetchOwnedBusinessContent,
  fetchOwnedBusiness,
  fetchPublishedBusinesses,
  updateBusinessContentItem,
  updateOwnedBusiness,
  type BusinessLogoInput,
  type BusinessRegistrationInput,
} from "./src/directory";
import { isSupabaseConfigured, supabase } from "./src/supabase";
import type {
  Business,
  BusinessContentImageInput,
  BusinessContentInput,
  BusinessContentItem,
  BusinessContentType,
  BusinessContentUpdateInput,
  Locale,
} from "./src/types";

type Tab = "home" | "search" | "register" | "dashboard" | "profile";
type DashboardPanel = "profile" | "services" | "events";

const BUSINESS_SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.76);
const CATEGORY_PICKER_SHEET_HEIGHT = Math.round(
  Dimensions.get("window").height * 0.62,
);
const LOCATION_PICKER_SHEET_HEIGHT = Math.round(
  Dimensions.get("window").height * 0.58,
);
const isExpoGo = Constants.appOwnership === AppOwnership.Expo;

const copy = {
  uk: {
    addBusiness: "Додати",
    addContent: "Додати",
    addEvent: "Додати подію",
    addService: "Додати послугу",
    address: "Адреса",
    all: "Усі",
    allCanada: "Уся Канада",
    about: "Про бізнес",
    businesses: "бізнесів",
    canadaWide: "Онлайн · вся Канада",
    category: "Категорія",
    chooseCategory: "Виберіть категорію",
    chooseLocation: "Виберіть локацію",
    city: "Місто або локація",
    cancel: "Скасувати",
    close: "Закрити",
    contactEmail: "Робочий email",
    contacts: "Контакти",
    contactSignInText:
      "Телефон, сайт, Instagram та адресу видно лише після входу.",
    contactSignInTitle: "Увійдіть, щоб побачити контакти",
    contentDescription: "Опис",
    contentItems: "записів",
    contentLink: "Посилання",
    contentPhoto: "Фото",
    contentPhotoHint: "PNG, JPG, WebP або GIF до 5 MB.",
    contentPhotoPermission:
      "Дозвольте доступ до фото, щоб вибрати зображення.",
    contentPhotoSelected: "Фото вибрано",
    contentPhotoUpload: "Додати фото",
    contentDeleted: "Видалено",
    contentSaved: "Додано",
    contentUpdated: "Оновлено",
    dashboard: "Кабінет",
    day: "День",
    delete: "Видалити",
    deleteContentMessage: "Цей запис буде видалено з профілю бізнесу.",
    deleteContentTitle: "Видалити запис?",
    description: "Опис",
    done: "Готово",
    edit: "Редагувати",
    editProfile: "Редагувати профіль",
    email: "Email",
    emailPasswordRequired: "Введіть email і пароль.",
    eventDate: "Дата і час",
    eventDatePlaceholder: "2026-07-20 18:00",
    eventLocation: "Місце або онлайн",
    eventTitle: "Назва події",
    events: "Події",
    find: "Знайти",
    free: "Безкоштовно",
    hour: "Година",
    home: "Головна",
    homeIntro:
      "Знаходьте українські бізнеси, сервіси та спеціалістів у Канаді.",
    homeTitle: "Українські бізнеси поруч",
    latestUpdates: "Нові послуги та події",
    location: "Локація",
    manageProfile: "Керувати профілем",
    myLocation: "Моя локація",
    name: "Назва бізнесу",
    noContentItems: "Поки що нічого не додано.",
    noResults: "Нічого не знайдено",
    owner: "Власник",
    phone: "Телефон",
    password: "Пароль",
    profile: "Профіль",
    profilePreview: "Так профіль бачать люди",
    profileIntro: "Особистий профіль, контактні дані та налаштування додатку.",
    popularCategories: "Популярні категорії",
    price: "Ціна",
    pricePlaceholder: "$100",
    quickCities: "Міста поруч",
    recommended: "Рекомендації",
    featuredBusinesses: "Бізнеси для вас",
    instagram: "Instagram",
    logo: "Логотип",
    logoHint: "PNG, JPG, WebP або GIF до 2 MB.",
    logoPermission: "Дозвольте доступ до фото, щоб вибрати логотип.",
    logoSelected: "Логотип вибрано",
    logoUpload: "Завантажити логотип",
    missingBusinessFields:
      "Заповніть назву бізнесу, місто або локацію та опис.",
    missingContentFields: "Заповніть назву та опис.",
    online: "Онлайн",
    registerIntro: "Подайте бізнес на перевірку або підготуйте профіль.",
    save: "Зберегти",
    saveChanges: "Зберегти зміни",
    saved: "Зміни збережено",
    settings: "Налаштування",
    seeAll: "Усі",
    search: "Пошук",
    searchPlaceholder: "Назва, послуга або категорія",
    selected: "Вибрано",
    serviceTitle: "Назва послуги",
    services: "Послуги",
    signInEmail: "Увійти з email",
    signedInAs: "Ви увійшли як",
    submit: "Надіслати",
    submitted: "Заявку надіслано на перевірку.",
    theme: "Тема",
    themeDark: "Темна",
    themeLight: "Світла",
    time: "Час",
    minute: "Хвилина",
    month: "Місяць",
    userProfile: "Ваш профіль",
    website: "Сайт",
    year: "Рік",
  },
  en: {
    addBusiness: "Add",
    addContent: "Add",
    addEvent: "Add event",
    addService: "Add service",
    address: "Address",
    all: "All",
    allCanada: "All Canada",
    about: "About",
    businesses: "businesses",
    canadaWide: "Online · Canada-wide",
    category: "Category",
    chooseCategory: "Choose category",
    chooseLocation: "Choose location",
    city: "City or location",
    cancel: "Cancel",
    close: "Close",
    contactEmail: "Work email",
    contacts: "Contacts",
    contactSignInText:
      "Phone, website, Instagram, and address are visible after sign-in.",
    contactSignInTitle: "Sign in to view contacts",
    contentDescription: "Description",
    contentItems: "items",
    contentLink: "Link",
    contentPhoto: "Photo",
    contentPhotoHint: "PNG, JPG, WebP, or GIF up to 5 MB.",
    contentPhotoPermission: "Allow photo access to choose an image.",
    contentPhotoSelected: "Photo selected",
    contentPhotoUpload: "Add photo",
    contentDeleted: "Deleted",
    contentSaved: "Added",
    contentUpdated: "Updated",
    dashboard: "Dashboard",
    day: "Day",
    delete: "Delete",
    deleteContentMessage: "This item will be removed from the business profile.",
    deleteContentTitle: "Delete item?",
    description: "Description",
    done: "Done",
    edit: "Edit",
    editProfile: "Edit profile",
    email: "Email",
    emailPasswordRequired: "Enter email and password.",
    eventDate: "Date and time",
    eventDatePlaceholder: "2026-07-20 18:00",
    eventLocation: "Place or online",
    eventTitle: "Event title",
    events: "Events",
    find: "Search",
    free: "Free",
    hour: "Hour",
    home: "Home",
    homeIntro:
      "Find Ukrainian-owned businesses, services, and specialists in Canada.",
    homeTitle: "Ukrainian businesses nearby",
    latestUpdates: "New services & events",
    location: "Location",
    manageProfile: "Manage profile",
    myLocation: "My location",
    name: "Business name",
    noContentItems: "Nothing added yet.",
    noResults: "No results found",
    owner: "Owner",
    phone: "Phone",
    password: "Password",
    profile: "Profile",
    profilePreview: "This is how people see the profile",
    profileIntro: "Personal profile, contact details, and app settings.",
    popularCategories: "Popular categories",
    price: "Price",
    pricePlaceholder: "from $100 or free",
    quickCities: "Nearby cities",
    recommended: "Recommended",
    featuredBusinesses: "Businesses for you",
    instagram: "Instagram",
    logo: "Logo",
    logoHint: "PNG, JPG, WebP, or GIF up to 2 MB.",
    logoPermission: "Allow photo access to choose a logo.",
    logoSelected: "Logo selected",
    logoUpload: "Upload logo",
    missingBusinessFields:
      "Fill in the business name, city or location, and description.",
    missingContentFields: "Fill in the title and description.",
    online: "Online",
    registerIntro: "Submit a business for review or prepare a profile.",
    save: "Save",
    saveChanges: "Save changes",
    saved: "Changes saved",
    settings: "Settings",
    seeAll: "All",
    search: "Search",
    searchPlaceholder: "Name, service, or category",
    selected: "Selected",
    serviceTitle: "Service title",
    services: "Services",
    signInEmail: "Sign in with email",
    signedInAs: "Signed in as",
    submit: "Submit",
    submitted: "Submitted for review.",
    theme: "Theme",
    themeDark: "Dark",
    themeLight: "Light",
    time: "Time",
    minute: "Minute",
    month: "Month",
    userProfile: "Your profile",
    website: "Website",
    year: "Year",
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
  "st-johns": [
    "st. john's",
    "st johns",
    "st. johns",
    "saint johns",
    "newfoundland",
    "newfoundland and labrador",
    "nl",
    "сент джонс",
    "ньюфаундленд",
  ],
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
  const [ownedContentItems, setOwnedContentItems] = useState<
    BusinessContentItem[]
  >([]);
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
          if (__DEV__) {
            console.log("[kolo:mobile-directory]", {
              publicRows: publishedBusinesses.length,
            });
          }

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
      setOwnedContentItems([]);
      return;
    }

    if (!session?.user.id) {
      setOwnedBusiness(null);
      setOwnedContentItems([]);
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

          if (!owned) {
            setOwnedContentItems([]);
          }
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

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user.id || !ownedBusiness) {
      setOwnedContentItems([]);
      return;
    }

    let isMounted = true;
    const ownerId = session.user.id;
    const registrationId = ownedBusiness.registrationId ?? ownedBusiness.id;

    async function loadOwnedContent() {
      try {
        const contentItems = await fetchOwnedBusinessContent(
          ownerId,
          registrationId,
        );

        if (isMounted) {
          setOwnedContentItems(contentItems);
        }
      } catch (error) {
        console.error("[kolo:mobile-owned-content]", error);

        if (isMounted) {
          setAuthMessage(getErrorMessage(error));
        }
      }
    }

    void loadOwnedContent();

    return () => {
      isMounted = false;
    };
  }, [ownedBusiness?.id, ownedBusiness?.registrationId, session?.user.id]);

  const businesses = useMemo(
    () =>
      getUniqueBusinessesById(
        directoryBusinesses.map((business) =>
          ownedBusiness && isOwnedBusinessMatch(business, ownedBusiness)
            ? {
                ...business,
                ...ownedBusiness,
                id: business.id,
                registrationId: business.registrationId ?? ownedBusiness.id,
                contentItems: ownedContentItems,
              }
            : business,
        ),
      ),
    [directoryBusinesses, ownedBusiness, ownedContentItems],
  );
  const totalBusinessesCount = useMemo(
    () => businesses.length,
    [businesses],
  );

  const results = useMemo(
    () =>
      businesses.filter((business) => {
        const searchQuery = getEffectiveSearchQuery(query);
        const category = getCategoryName(business.categorySlug, locale);
        const aliases = getSearchAliases(business.categorySlug);
        const locationAliases = getLocationAliases(business.city);
        const contentText = (business.contentItems ?? [])
          .map((item) => `${item.title} ${item.description} ${item.location ?? ""}`)
          .join(" ");
        const haystack = normalize(
          `${business.name} ${business.description} ${business.city} ${locationAliases} ${category} ${aliases} ${contentText}`,
        );
        const matchesQuery =
          !searchQuery || haystack.includes(normalize(searchQuery));
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

  async function handleEmailSignIn(email: string, password: string) {
    if (!isExpoGo) {
      return;
    }

    if (!email.trim() || !password.trim()) {
      setAuthMessage(labels.emailPasswordRequired);
      return;
    }

    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      const nextSession = await signInWithEmailPassword(email, password);
      setSession(nextSession);

      if (!nextSession) {
        setAuthMessage("Signed in, but no mobile session was saved. Please try again.");
      }
    } catch (error) {
      console.error("[kolo:mobile-email-auth]", error);
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
      setOwnedContentItems([]);
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

  async function handleBusinessContentCreate(input: BusinessContentInput) {
    if (!isSupabaseConfigured || !session?.user.id) {
      const localContentItem: BusinessContentItem = {
        ...input,
        createdAt: new Date().toISOString(),
        id: `local-${Date.now()}`,
        imageUrl: input.image?.uri,
        ownerId: "local",
        status: "published",
      };
      setOwnedContentItems((currentItems) => [localContentItem, ...currentItems]);
      return;
    }

    const createdItem = await createBusinessContentItem(input, session.user.id);
    setOwnedContentItems((currentItems) => [createdItem, ...currentItems]);
  }

  async function handleBusinessContentUpdate(input: BusinessContentUpdateInput) {
    if (!isSupabaseConfigured || !session?.user.id) {
      setOwnedContentItems((currentItems) =>
        currentItems.map((item) =>
          item.id === input.id
            ? {
                ...item,
                ...input,
                imageUrl: input.image?.uri ?? item.imageUrl,
              }
            : item,
        ),
      );
      return;
    }

    const updatedItem = await updateBusinessContentItem(input, session.user.id);
    setOwnedContentItems((currentItems) =>
      currentItems.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
    );
  }

  async function handleBusinessContentDelete(contentItemId: string) {
    if (!isSupabaseConfigured || !session?.user.id) {
      setOwnedContentItems((currentItems) =>
        currentItems.filter((item) => item.id !== contentItemId),
      );
      return;
    }

    await deleteBusinessContentItem(contentItemId, session.user.id);
    setOwnedContentItems((currentItems) =>
      currentItems.filter((item) => item.id !== contentItemId),
    );
  }

  const canViewContacts = Boolean(session);

  return (
    <SafeAreaView style={[styles.safeArea, isDarkMode ? styles.darkSafeArea : null]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      <View style={styles.appShell}>
        <View style={styles.contentArea}>
          {activeTab === "home" ? (
            <HomeScreen
              businesses={businesses}
              canViewContacts={canViewContacts}
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
              canViewContacts={canViewContacts}
              dataMessage={dataMessage}
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              location={location}
              onClearFilters={() => {
                setQuery("");
                setLocation("");
                setSelectedCategory("all");
              }}
              query={query}
              results={results}
              selectedCategory={selectedCategory}
              setLocation={setLocation}
              setQuery={setQuery}
              setSelectedBusiness={setSelectedBusiness}
              setSelectedCategory={setSelectedCategory}
              totalCount={totalBusinessesCount}
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
              contentItems={ownedContentItems}
              onCreateContent={handleBusinessContentCreate}
              onDeleteContent={handleBusinessContentDelete}
              onSave={handleBusinessSave}
              onUpdateContent={handleBusinessContentUpdate}
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
              onEmailSignIn={handleEmailSignIn}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleSignOut}
              session={session}
              setIsDarkMode={setIsDarkMode}
              showEmailPasswordSignIn={isExpoGo}
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
        canViewContacts={canViewContacts}
        isDarkMode={isDarkMode}
        labels={labels}
        locale={locale}
        onClose={() => setSelectedBusiness(null)}
        onRequireSignIn={() => {
          setSelectedBusiness(null);
          setActiveTab("profile");
        }}
        onManage={() => {
          setSelectedBusiness(null);
          setActiveTab("dashboard");
        }}
      />
    </SafeAreaView>
  );
}

function KeyboardAwareScreen({ children }: { children: React.ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.flex}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.screenContent,
          styles.keyboardAwareContent,
        ]}
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function SearchScreen({
  canViewContacts,
  dataMessage,
  isDarkMode,
  labels,
  locale,
  location,
  onClearFilters,
  query,
  results,
  selectedCategory,
  setLocation,
  setQuery,
  setSelectedBusiness,
  setSelectedCategory,
  totalCount,
}: {
  canViewContacts: boolean;
  dataMessage: string;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  location: string;
  onClearFilters: () => void;
  query: string;
  results: Business[];
  selectedCategory: string;
  setLocation: (value: string) => void;
  setQuery: (value: string) => void;
  setSelectedBusiness: (value: Business) => void;
  setSelectedCategory: (value: string) => void;
  totalCount: number;
}) {
  const hasActiveFilters = hasSearchFilters(query, location, selectedCategory);
  const resultCountLabel =
    hasActiveFilters && totalCount > 0
      ? `${results.length}/${totalCount}`
      : `${results.length}`;

  return (
    <KeyboardAwareScreen>
      <View style={[styles.searchPanel, isDarkMode ? styles.darkCard : null]}>
        <Field isDarkMode={isDarkMode} label={labels.search}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={labels.searchPlaceholder}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
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
        <View style={styles.resultsHeaderActions}>
          {hasActiveFilters ? (
            <Pressable
              accessibilityRole="button"
              onPress={onClearFilters}
              style={[
                styles.clearFiltersButton,
                isDarkMode ? styles.darkSettingRow : null,
              ]}
            >
              <X
                color={isDarkMode ? "#A78D78" : "#6E473B"}
                size={15}
                strokeWidth={2.7}
              />
              <Text
                style={[
                  styles.clearFiltersButtonText,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                {labels.allCanada}
              </Text>
            </Pressable>
          ) : null}
          <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
            {resultCountLabel}
          </Text>
        </View>
      </View>

      {dataMessage ? <Text style={styles.errorText}>{dataMessage}</Text> : null}

      {results.length > 0 ? (
        results.map((business) => (
          <BusinessCard
            business={business}
            canViewContacts={canViewContacts}
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
    </KeyboardAwareScreen>
  );
}

function HomeScreen({
  businesses,
  canViewContacts,
  isDarkMode,
  labels,
  locale,
  onBusinessPress,
  onCategoryPress,
  onLocationPress,
  onSearchPress,
}: {
  businesses: Business[];
  canViewContacts: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onBusinessPress: (business: Business) => void;
  onCategoryPress: (categorySlug: string) => void;
  onLocationPress: (location: string) => void;
  onSearchPress: () => void;
}) {
  const uniqueBusinesses = getUniqueBusinessesById(businesses);
  const contentFeedItems = uniqueBusinesses
    .flatMap((business) =>
      (business.contentItems ?? []).map((item) => ({ business, item })),
    )
    .filter(
      ({ item }, index, allItems) =>
        allItems.findIndex(({ item: otherItem }) => otherItem.id === item.id) ===
        index,
    )
    .sort(
      (first, second) =>
        getContentTimestamp(second.item) - getContentTimestamp(first.item),
    )
    .slice(0, 8);
  const feedBusinessKeys = new Set(
    contentFeedItems.map(({ business }) => getBusinessDedupeKey(business)),
  );
  const featuredBusinesses = [
    ...uniqueBusinesses.filter(
      (business) => business.logoUrl || (business.contentItems ?? []).length > 0,
    ),
    ...uniqueBusinesses,
  ]
    .filter(
      (business, index, allBusinesses) => {
        const businessKey = getBusinessDedupeKey(business);

        return (
          !feedBusinessKeys.has(businessKey) &&
          allBusinesses.findIndex((item) => getBusinessDedupeKey(item) === businessKey) ===
            index
        );
      },
    )
    .slice(0, 4);
  const popularCategories = categories
    .map((category) => ({
      ...category,
      count: uniqueBusinesses.filter(
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
          <Search color={isDarkMode ? "#A78D78" : "#6E473B"} size={20} strokeWidth={2.5} />
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
          {labels.latestUpdates}
        </Text>
        <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
          {contentFeedItems.length}
        </Text>
      </View>
      {contentFeedItems.length ? (
        contentFeedItems.map(({ business, item }) => (
          <PublicContentCard
            business={business}
            isDarkMode={isDarkMode}
            item={item}
            key={item.id}
            labels={labels}
            onPress={() => onBusinessPress(business)}
            showBusinessName
          />
        ))
      ) : (
        uniqueBusinesses.slice(0, 3).map((business) => (
          <BusinessCard
            business={business}
            canViewContacts={canViewContacts}
            isDarkMode={isDarkMode}
            key={business.id}
            labels={labels}
            locale={locale}
            onPress={() => onBusinessPress(business)}
          />
        ))
      )}

      {featuredBusinesses.length ? (
        <>
          <View style={styles.homeSectionHeader}>
            <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
              {labels.featuredBusinesses}
            </Text>
            <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
              {featuredBusinesses.length}
            </Text>
          </View>
          {featuredBusinesses.map((business) => (
            <BusinessCard
              business={business}
              canViewContacts={canViewContacts}
              isDarkMode={isDarkMode}
              key={business.id}
              labels={labels}
              locale={locale}
              onPress={() => onBusinessPress(business)}
            />
          ))}
        </>
      ) : null}

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
            <MapPin color={isDarkMode ? "#A78D78" : "#6E473B"} size={16} strokeWidth={2.5} />
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
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("travel-tours");
  const [instagram, setInstagram] = useState("");
  const [logo, setLogo] = useState<BusinessLogoInput | null>(null);
  const [phone, setPhone] = useState("");
  const [servesAllCanada, setServesAllCanada] = useState(false);
  const [website, setWebsite] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogoPick() {
    setSubmitError("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setSubmitError(labels.logoPermission);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      base64: true,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      return;
    }

    setLogo({
      base64: asset.base64,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      uri: asset.uri,
    });
    setSubmitted(false);
  }

  async function handleSubmit() {
    setSubmitError("");
    setSubmitted(false);

    if (!name.trim() || !city.trim() || !description.trim()) {
      setSubmitError(labels.missingBusinessFields);
      return;
    }

    if (isSupabaseConfigured && !isSignedIn) {
      setSubmitError(labels.signInRequired);
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        address,
        categorySlug,
        city,
        description,
        instagram,
        logo,
        name,
        phone,
        servesAllCanada,
        website,
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
    <KeyboardAwareScreen>
      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.addBusiness}
        </Text>
        <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
          {labels.registerIntro}
        </Text>
        <Field isDarkMode={isDarkMode} label={labels.name}>
          <TextInput
            onChangeText={(value) => {
              setName(value);
              setSubmitError("");
            }}
            placeholder={labels.name}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
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
            onChange={(value) => {
              setCity(value);
              setSubmitError("");
            }}
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
            thumbColor={servesAllCanada ? "#E1D4C2" : "#291C0E"}
            trackColor={{ false: "#A78D78", true: "#6E473B" }}
            value={servesAllCanada}
          />
        </View>
        <Field isDarkMode={isDarkMode} label={labels.description}>
          <TextInput
            multiline
            onChangeText={(value) => {
              setDescription(value);
              setSubmitError("");
            }}
            placeholder={labels.description}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[
              styles.input,
              styles.textArea,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={description}
          />
        </Field>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.contacts}
        </Text>
        <Field isDarkMode={isDarkMode} label={labels.phone}>
          <TextInput
            keyboardType="phone-pad"
            onChangeText={setPhone}
            placeholder={labels.phone}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={phone}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.website}>
          <TextInput
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={setWebsite}
            placeholder={labels.website}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={website}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.instagram}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setInstagram}
            placeholder={labels.instagram}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={instagram}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.address}>
          <TextInput
            onChangeText={setAddress}
            placeholder={labels.address}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={address}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.logo}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleLogoPick();
            }}
            style={[
              styles.logoUploadButton,
              isDarkMode ? styles.darkSettingRow : null,
            ]}
          >
            <View style={[styles.logoUploadPreview, isDarkMode ? styles.darkIconBox : null]}>
              {logo ? (
                <Image source={{ uri: logo.uri }} style={styles.logoPreviewImage} />
              ) : (
                <Upload
                  color={isDarkMode ? "#A78D78" : "#6E473B"}
                  size={24}
                  strokeWidth={2.5}
                />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.logoUploadTitle, isDarkMode ? styles.darkText : null]}>
                {logo ? labels.logoSelected : labels.logoUpload}
              </Text>
              <Text style={[styles.logoUploadHint, isDarkMode ? styles.darkMutedText : null]}>
                {logo?.fileName ?? labels.logoHint}
              </Text>
            </View>
          </Pressable>
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
    </KeyboardAwareScreen>
  );
}

function DashboardScreen({
  business,
  contentItems,
  isDarkMode,
  labels,
  locale,
  onCreateContent,
  onDeleteContent,
  onSave,
  onUpdateContent,
  profileEmail,
  profileName,
}: {
  business: Business | null;
  contentItems: BusinessContentItem[];
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onCreateContent: (input: BusinessContentInput) => Promise<void> | void;
  onDeleteContent: (contentItemId: string) => Promise<void> | void;
  onSave: (business: Business) => Promise<void> | void;
  onUpdateContent: (input: BusinessContentUpdateInput) => Promise<void> | void;
  profileEmail: string;
  profileName: string;
}) {
  const [draft, setDraft] = useState(business ?? defaultOwnedBusiness);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activePanel, setActivePanel] = useState<DashboardPanel>("profile");
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  useEffect(() => {
    if (business) {
      setDraft(business);
      setIsEditingProfile(false);
    }
  }, [business]);

  async function handleSave() {
    try {
      setSaved(false);
      setSaveError("");
      setIsSaving(true);
      await onSave(draft);
      setSaved(true);
      setIsEditingProfile(false);
    } catch (error) {
      console.error("[kolo:mobile-dashboard-save]", error);
      setSaveError(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  if (!business) {
    return (
      <KeyboardAwareScreen>
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.dashboard}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.noOwnedBusiness}
          </Text>
        </View>
      </KeyboardAwareScreen>
    );
  }

  const serviceItems = contentItems.filter((item) => item.type === "service");
  const eventItems = contentItems.filter((item) => item.type === "event");

  return (
    <KeyboardAwareScreen>
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
        </View>
      </View>

      <View style={[styles.dashboardTabs, isDarkMode ? styles.darkSettingRow : null]}>
        <DashboardPanelButton
          active={activePanel === "profile"}
          isDarkMode={isDarkMode}
          label={labels.profile}
          onPress={() => setActivePanel("profile")}
        />
        <DashboardPanelButton
          active={activePanel === "services"}
          isDarkMode={isDarkMode}
          label={labels.services}
          onPress={() => setActivePanel("services")}
        />
        <DashboardPanelButton
          active={activePanel === "events"}
          isDarkMode={isDarkMode}
          label={labels.events}
          onPress={() => setActivePanel("events")}
        />
      </View>

      {activePanel === "profile" && !isEditingProfile ? (
        <DashboardProfilePreview
          business={business}
          isDarkMode={isDarkMode}
          labels={labels}
          locale={locale}
          onEdit={() => setIsEditingProfile(true)}
        />
      ) : null}

      {activePanel === "profile" && isEditingProfile ? (
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <View style={styles.dashboardEditHeader}>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
                {labels.editProfile}
              </Text>
              <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                {labels.profilePreview}
              </Text>
            </View>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setDraft(business);
                setIsEditingProfile(false);
                setSaveError("");
                setSaved(false);
              }}
              style={[
                styles.iconActionButton,
                isDarkMode ? styles.darkIconBox : null,
              ]}
            >
              <X
                color={isDarkMode ? "#A78D78" : "#291C0E"}
                size={19}
                strokeWidth={2.7}
              />
            </Pressable>
          </View>
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
              thumbColor={draft.servesAllCanada ? "#E1D4C2" : "#291C0E"}
              trackColor={{ false: "#A78D78", true: "#6E473B" }}
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
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.contacts}
          </Text>
          <Field isDarkMode={isDarkMode} label={labels.phone}>
            <TextInput
              keyboardType="phone-pad"
              onChangeText={(value) => {
                setDraft({ ...draft, phone: value });
                setSaved(false);
              }}
              placeholder={labels.phone}
              placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              value={draft.phone}
            />
          </Field>
          <Field isDarkMode={isDarkMode} label={labels.website}>
            <TextInput
              autoCapitalize="none"
              keyboardType="url"
              onChangeText={(value) => {
                setDraft({ ...draft, website: value });
                setSaved(false);
              }}
              placeholder={labels.website}
              placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              value={draft.website}
            />
          </Field>
          <Field isDarkMode={isDarkMode} label={labels.instagram}>
            <TextInput
              autoCapitalize="none"
              onChangeText={(value) => {
                setDraft({ ...draft, instagram: value });
                setSaved(false);
              }}
              placeholder={labels.instagram}
              placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              value={draft.instagram ?? ""}
            />
          </Field>
          <Field isDarkMode={isDarkMode} label={labels.address}>
            <TextInput
              onChangeText={(value) => {
                setDraft({ ...draft, address: value });
                setSaved(false);
              }}
              placeholder={labels.address}
              placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              value={draft.address ?? ""}
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
      ) : null}

      {activePanel === "services" ? (
        <BusinessContentSection
          business={business}
          contentType="service"
          isDarkMode={isDarkMode}
          items={serviceItems}
          labels={labels}
          onCreate={onCreateContent}
          onDelete={onDeleteContent}
          onUpdate={onUpdateContent}
        />
      ) : null}

      {activePanel === "events" ? (
        <BusinessContentSection
          business={business}
          contentType="event"
          isDarkMode={isDarkMode}
          items={eventItems}
          labels={labels}
          onCreate={onCreateContent}
          onDelete={onDeleteContent}
          onUpdate={onUpdateContent}
        />
      ) : null}
    </KeyboardAwareScreen>
  );
}

function DashboardPanelButton({
  active,
  isDarkMode,
  label,
  onPress,
}: {
  active: boolean;
  isDarkMode: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.dashboardTabButton,
        active ? styles.activeDashboardTabButton : null,
        isDarkMode && !active ? styles.darkIconBox : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.dashboardTabButtonText,
          active ? styles.activeDashboardTabButtonText : null,
          isDarkMode && !active ? styles.darkText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DashboardProfilePreview({
  business,
  isDarkMode,
  labels,
  locale,
  onEdit,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onEdit: () => void;
}) {
  const contacts = getBusinessContacts(business, labels);

  return (
    <View style={[styles.publicProfileCard, isDarkMode ? styles.darkCard : null]}>
      <View style={styles.dashboardPreviewHeader}>
        <View style={styles.flex}>
          <Text style={[styles.fieldLabel, isDarkMode ? styles.darkMutedText : null]}>
            {labels.profilePreview}
          </Text>
          <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
            {business.name}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onEdit}
          style={[
            styles.iconActionButton,
            isDarkMode ? styles.darkIconBox : null,
          ]}
        >
          <Pencil
            color={isDarkMode ? "#A78D78" : "#291C0E"}
            size={19}
            strokeWidth={2.7}
          />
        </Pressable>
      </View>

      <View style={styles.dashboardPreviewHero}>
        <View style={[styles.dashboardPreviewLogo, isDarkMode ? styles.darkIconBox : null]}>
          {business.logoUrl ? (
            <Image source={{ uri: business.logoUrl }} style={styles.logoPreviewImage} />
          ) : (
            <Text style={styles.avatarText}>{getInitials(business.name)}</Text>
          )}
        </View>
        <View style={[styles.flex, styles.dashboardPreviewMeta]}>
          <Text style={[styles.categoryBadge, isDarkMode ? styles.darkBadge : null]}>
            {getCategoryName(business.categorySlug, locale)}
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
        </View>
      </View>

      <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
        {business.description}
      </Text>

      {contacts.length ? (
        <View style={[styles.contactCard, isDarkMode ? styles.darkSettingRow : null]}>
          <Text style={[styles.contactSectionTitle, isDarkMode ? styles.darkText : null]}>
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
    </View>
  );
}

function SelectableChip({
  isDarkMode,
  label,
  onPress,
  selected,
}: {
  isDarkMode: boolean;
  label: string;
  onPress: () => void;
  selected: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.selectableChip,
        isDarkMode ? styles.darkIconBox : null,
        selected ? styles.selectedChip : null,
      ]}
    >
      <Text
        style={[
          styles.selectableChipText,
          isDarkMode ? styles.darkText : null,
          selected ? styles.selectedChipText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ContentDateTimePicker({
  isDarkMode,
  labels,
  onChange,
  value,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
  onChange: (value: string) => void;
  value: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [pickerMode, setPickerMode] = useState<"date" | "time" | "datetime">(
    Platform.OS === "ios" ? "datetime" : "date",
  );
  const [selectedDate, setSelectedDate] = useState(() => getPickerDate(value));

  function handleOpen() {
    setSelectedDate(getPickerDate(value));
    setPickerMode(Platform.OS === "ios" ? "datetime" : "date");
    setIsOpen(true);
  }

  function handleApply() {
    onChange(selectedDate.toISOString());
    setIsOpen(false);
  }

  function handleNativeChange(event: DateTimePickerEvent, nextDate?: Date) {
    if (event.type === "dismissed") {
      setIsOpen(false);
      return;
    }

    if (!nextDate) {
      return;
    }

    if (Platform.OS === "android" && pickerMode === "date") {
      const dateWithCurrentTime = new Date(nextDate);
      dateWithCurrentTime.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0,
      );
      setSelectedDate(dateWithCurrentTime);
      setIsOpen(false);
      setPickerMode("time");
      setTimeout(() => setIsOpen(true), 0);
      return;
    }

    if (Platform.OS === "android" && pickerMode === "time") {
      const dateWithSelectedTime = new Date(selectedDate);
      dateWithSelectedTime.setHours(nextDate.getHours(), nextDate.getMinutes(), 0, 0);
      setSelectedDate(dateWithSelectedTime);
      onChange(dateWithSelectedTime.toISOString());
      setIsOpen(false);
      return;
    }

    setSelectedDate(nextDate);
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={handleOpen}
        style={[
          styles.dateTimeTrigger,
          isDarkMode ? styles.darkInput : null,
        ]}
      >
        <Text
          style={[
            styles.dateTimeTriggerText,
            isDarkMode ? styles.darkText : null,
            !value ? styles.dateTimePlaceholder : null,
          ]}
        >
          {value ? formatContentDate(value) : labels.eventDate}
        </Text>
      </Pressable>

      {Platform.OS === "ios" ? (
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
                styles.nativeDateTimeSheet,
                isDarkMode ? styles.darkPickerSheet : null,
              ]}
            >
              <View style={[styles.pickerHeader, isDarkMode ? styles.darkPickerHeader : null]}>
                <Text style={[styles.pickerTitle, isDarkMode ? styles.darkText : null]}>
                  {labels.eventDate}
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
                    color={isDarkMode ? "#A78D78" : "#291C0E"}
                    size={19}
                    strokeWidth={2.7}
                  />
                </Pressable>
              </View>
              <View style={styles.nativeDateTimeContent}>
                <DateTimePicker
                  display="spinner"
                  mode="datetime"
                  onChange={handleNativeChange}
                  textColor={isDarkMode ? "#E1D4C2" : "#291C0E"}
                  value={selectedDate}
                />
                <PrimaryButton label={labels.done} onPress={handleApply} />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {Platform.OS !== "ios" && isOpen ? (
        <DateTimePicker
          display="default"
          mode={pickerMode === "time" ? "time" : "date"}
          onChange={handleNativeChange}
          value={selectedDate}
        />
      ) : null}
    </>
  );
}

function BusinessContentSection({
  business,
  contentType,
  isDarkMode,
  items,
  labels,
  onCreate,
  onDelete,
  onUpdate,
}: {
  business: Business;
  contentType: BusinessContentType;
  isDarkMode: boolean;
  items: BusinessContentItem[];
  labels: Record<string, string>;
  onCreate: (input: BusinessContentInput) => Promise<void> | void;
  onDelete: (contentItemId: string) => Promise<void> | void;
  onUpdate: (input: BusinessContentUpdateInput) => Promise<void> | void;
}) {
  const isEvent = contentType === "event";
  const [description, setDescription] = useState("");
  const [editingItem, setEditingItem] = useState<BusinessContentItem | null>(null);
  const [image, setImage] = useState<BusinessContentImageInput | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isFree, setIsFree] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [location, setLocation] = useState("");
  const [price, setPrice] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [title, setTitle] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  async function handleImagePick() {
    setErrorMessage("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setErrorMessage(labels.contentPhotoPermission);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      base64: true,
      quality: 0.85,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      return;
    }

    setImage({
      base64: asset.base64,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      uri: asset.uri,
    });
    setSuccessMessage("");
  }

  function resetComposer() {
    setDescription("");
    setEditingItem(null);
    setImage(null);
    setIsFree(false);
    setIsOnline(false);
    setLinkUrl("");
    setLocation("");
    setPrice("");
    setStartsAt("");
    setTitle("");
  }

  function handleEdit(item: BusinessContentItem) {
    setDescription(item.description);
    setEditingItem(item);
    setErrorMessage("");
    setImage(null);
    setIsFree(item.isFree);
    setIsOnline(item.isOnline);
    setLinkUrl(item.linkUrl ?? "");
    setLocation(item.location ?? "");
    setPrice(item.price ?? "");
    setStartsAt(item.startsAt ?? "");
    setSuccessMessage("");
    setTitle(item.title);
    setIsComposerOpen(true);
  }

  function handleAddPress() {
    resetComposer();
    setErrorMessage("");
    setSuccessMessage("");
    setIsComposerOpen(true);
  }

  async function handleSubmit() {
    setErrorMessage("");
    setSuccessMessage("");

    if (!title.trim() || !description.trim()) {
      setErrorMessage(labels.missingContentFields);
      return;
    }

    try {
      setIsSaving(true);
      const input: BusinessContentInput = {
        description,
        image,
        isFree,
        isOnline: isEvent && isOnline,
        linkUrl: isEvent ? linkUrl : undefined,
        location: isEvent ? location : undefined,
        price: isFree ? "" : price,
        registrationId: business.registrationId ?? business.id,
        startsAt: isEvent ? startsAt : undefined,
        title,
        type: contentType,
      };

      if (editingItem) {
        await onUpdate({ ...input, id: editingItem.id });
        setSuccessMessage(labels.contentUpdated);
      } else {
        await onCreate(input);
        setSuccessMessage(labels.contentSaved);
      }

      resetComposer();
      setIsComposerOpen(false);
    } catch (error) {
      console.error("[kolo:mobile-content-save]", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  function handleDelete(item: BusinessContentItem) {
    Alert.alert(labels.deleteContentTitle, labels.deleteContentMessage, [
      {
        style: "cancel",
        text: labels.cancel,
      },
      {
        onPress: () => {
          void deleteItem(item);
        },
        style: "destructive",
        text: labels.delete,
      },
    ]);
  }

  async function deleteItem(item: BusinessContentItem) {
    try {
      setErrorMessage("");
      setSuccessMessage("");
      setIsSaving(true);
      await onDelete(item.id);
      if (editingItem?.id === item.id) {
        resetComposer();
      }
      setSuccessMessage(labels.contentDeleted);
    } catch (error) {
      console.error("[kolo:mobile-content-delete]", error);
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSaving(false);
    }
  }

  const imagePreviewUri = image?.uri ?? editingItem?.imageUrl;

  return (
    <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
      <View style={styles.contentSectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {isEvent ? labels.events : labels.services}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {items.length} {labels.contentItems}
          </Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={handleAddPress}
          style={[
            styles.contentAddButton,
            isDarkMode ? styles.darkIconBox : null,
          ]}
        >
          <Plus
            color={isDarkMode ? "#A78D78" : "#6E473B"}
            size={18}
            strokeWidth={2.7}
          />
          <Text style={[styles.contentAddButtonText, isDarkMode ? styles.darkText : null]}>
            {labels.addContent}
          </Text>
        </Pressable>
      </View>

      {successMessage ? <Text style={styles.successText}>{successMessage}</Text> : null}
      {errorMessage && !isComposerOpen ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

      <View style={styles.contentList}>
        {items.length ? (
          items.map((item) => (
            <BusinessContentCard
              isDarkMode={isDarkMode}
              item={item}
              key={item.id}
              labels={labels}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          ))
        ) : (
          <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
            {labels.noContentItems}
          </Text>
        )}
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsComposerOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isComposerOpen}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
          style={styles.modalBackdrop}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsComposerOpen(false)}
            style={styles.modalDismissLayer}
          />
          <View
            style={[
              styles.contentComposerSheet,
              isDarkMode ? styles.darkModalSheet : null,
            ]}
          >
            <ScrollView
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              <View style={[styles.contentComposer, isDarkMode ? styles.darkSettingRow : null]}>
                <View style={styles.dashboardEditHeader}>
                  <View style={styles.flex}>
                    <Text style={[styles.contentItemTitle, isDarkMode ? styles.darkText : null]}>
                      {editingItem ? labels.edit : labels.addContent}
                    </Text>
                    {editingItem ? (
                      <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                        {editingItem.title}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                      resetComposer();
                      setErrorMessage("");
                      setSuccessMessage("");
                      setIsComposerOpen(false);
                    }}
                    style={[
                      styles.iconActionButton,
                      isDarkMode ? styles.darkIconBox : null,
                    ]}
                  >
                    <X
                      color={isDarkMode ? "#A78D78" : "#291C0E"}
                      size={19}
                      strokeWidth={2.7}
                    />
                  </Pressable>
                </View>

        <Field
          isDarkMode={isDarkMode}
          label={isEvent ? labels.eventTitle : labels.serviceTitle}
        >
          <TextInput
            onChangeText={(value) => {
              setTitle(value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder={isEvent ? labels.eventTitle : labels.serviceTitle}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={title}
          />
        </Field>

        <Field isDarkMode={isDarkMode} label={labels.contentDescription}>
          <TextInput
            multiline
            onChangeText={(value) => {
              setDescription(value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder={labels.contentDescription}
            placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
            style={[
              styles.input,
              styles.textArea,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={description}
          />
        </Field>

        <Field isDarkMode={isDarkMode} label={labels.price}>
          <View style={styles.inlinePickerRow}>
            <TextInput
              editable={!isFree}
              onChangeText={(value) => {
                setPrice(value);
                setSuccessMessage("");
              }}
              placeholder={isFree ? labels.free : labels.pricePlaceholder}
              placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
              style={[
                styles.input,
                styles.inlinePickerInput,
                isFree ? styles.disabledInput : null,
                isDarkMode ? styles.darkInput : null,
              ]}
              value={isFree ? "" : price}
            />
            <SelectableChip
              isDarkMode={isDarkMode}
              label={labels.free}
              onPress={() => {
                setIsFree((value) => !value);
                setPrice("");
                setSuccessMessage("");
              }}
              selected={isFree}
            />
          </View>
        </Field>

        <Field isDarkMode={isDarkMode} label={labels.contentPhoto}>
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              void handleImagePick();
            }}
            style={[
              styles.logoUploadButton,
              isDarkMode ? styles.darkSettingRow : null,
            ]}
          >
            <View style={[styles.logoUploadPreview, isDarkMode ? styles.darkIconBox : null]}>
              {imagePreviewUri ? (
                <Image source={{ uri: imagePreviewUri }} style={styles.logoPreviewImage} />
              ) : (
                <Upload
                  color={isDarkMode ? "#A78D78" : "#6E473B"}
                  size={24}
                  strokeWidth={2.5}
                />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.logoUploadTitle, isDarkMode ? styles.darkText : null]}>
                {imagePreviewUri ? labels.contentPhotoSelected : labels.contentPhotoUpload}
              </Text>
              <Text style={[styles.logoUploadHint, isDarkMode ? styles.darkMutedText : null]}>
                {image?.fileName ??
                  (editingItem?.imageUrl
                    ? labels.contentPhotoSelected
                    : labels.contentPhotoHint)}
              </Text>
            </View>
          </Pressable>
        </Field>

        {isEvent ? (
          <>
            <Field isDarkMode={isDarkMode} label={labels.eventDate}>
              <ContentDateTimePicker
                isDarkMode={isDarkMode}
                labels={labels}
                onChange={(value) => {
                  setStartsAt(value);
                  setSuccessMessage("");
                }}
                value={startsAt}
              />
            </Field>
            <Field isDarkMode={isDarkMode} label={labels.eventLocation}>
              <View style={styles.inlinePickerRow}>
                <TextInput
                  onChangeText={(value) => {
                    setLocation(value);
                    setSuccessMessage("");
                  }}
                  placeholder={labels.eventLocation}
                  placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
                  style={[
                    styles.input,
                    styles.inlinePickerInput,
                    isDarkMode ? styles.darkInput : null,
                  ]}
                  value={location}
                />
                <SelectableChip
                  isDarkMode={isDarkMode}
                  label={labels.online}
                  onPress={() => {
                    setIsOnline((value) => !value);
                    setSuccessMessage("");
                  }}
                  selected={isOnline}
                />
              </View>
            </Field>
            <Field isDarkMode={isDarkMode} label={labels.contentLink}>
              <TextInput
                autoCapitalize="none"
                keyboardType="url"
                onChangeText={(value) => {
                  setLinkUrl(value);
                  setSuccessMessage("");
                }}
                placeholder="https://"
                placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
                style={[styles.input, isDarkMode ? styles.darkInput : null]}
                value={linkUrl}
              />
            </Field>
          </>
        ) : null}

        <PrimaryButton
          disabled={isSaving}
          label={
            editingItem
              ? labels.saveChanges
              : isEvent
                ? labels.addEvent
                : labels.addService
          }
          onPress={() => {
            void handleSubmit();
          }}
        />
                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function BusinessContentCard({
  isDarkMode,
  item,
  labels,
  onDelete,
  onEdit,
}: {
  isDarkMode: boolean;
  item: BusinessContentItem;
  labels: Record<string, string>;
  onDelete: (item: BusinessContentItem) => void;
  onEdit: (item: BusinessContentItem) => void;
}) {
  const metaItems = [
    item.isFree ? labels.free : item.price,
    item.isOnline ? labels.online : undefined,
    item.startsAt ? formatContentDate(item.startsAt) : undefined,
    item.location,
  ].filter((value): value is string => Boolean(value));
  const contentLinkUrl = item.linkUrl ? getWebsiteUrl(item.linkUrl) : null;

  return (
    <View style={[styles.contentItemCard, isDarkMode ? styles.darkSettingRow : null]}>
      {item.imageUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: item.imageUrl }}
          style={styles.contentItemImage}
        />
      ) : null}
      <View style={styles.contentItemHeader}>
        <Text style={[styles.contentItemTitle, isDarkMode ? styles.darkText : null]}>
          {item.title}
        </Text>
        <View style={styles.contentItemActions}>
          <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
            {item.type === "event" ? labels.events : labels.services}
          </Text>
          <Pressable
            accessibilityLabel={labels.edit}
            accessibilityRole="button"
            onPress={() => onEdit(item)}
            style={[
              styles.contentItemActionButton,
              isDarkMode ? styles.darkIconBox : null,
            ]}
          >
            <Pencil
              color={isDarkMode ? "#A78D78" : "#6E473B"}
              size={16}
              strokeWidth={2.6}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={labels.delete}
            accessibilityRole="button"
            onPress={() => onDelete(item)}
            style={[
              styles.contentItemActionButton,
              isDarkMode ? styles.darkIconBox : null,
            ]}
          >
            <Trash2
              color={isDarkMode ? "#E1D4C2" : "#6E473B"}
              size={16}
              strokeWidth={2.6}
            />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}>
        {item.description}
      </Text>
      {metaItems.length ? (
        <Text style={[styles.contentItemMeta, isDarkMode ? styles.darkMutedText : null]}>
          {metaItems.join(" | ")}
        </Text>
      ) : null}
      {item.linkUrl && contentLinkUrl ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void openContactUrl(contentLinkUrl);
          }}
        >
          <Text style={styles.contactLine}>{item.linkUrl}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function ProfileScreen({
  authMessage,
  isDarkMode,
  isAuthBusy,
  isSupabaseConfigured,
  labels,
  onEmailSignIn,
  onSignIn,
  onSignOut,
  session,
  setIsDarkMode,
  showEmailPasswordSignIn,
}: {
  authMessage: string;
  isDarkMode: boolean;
  isAuthBusy: boolean;
  isSupabaseConfigured: boolean;
  labels: Record<string, string>;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  session: Session | null;
  setIsDarkMode: (value: boolean) => void;
  showEmailPasswordSignIn: boolean;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const profileName = getSessionName(session);
  const profileEmail = session?.user.email ?? "";
  const profileAvatarUrl = getSessionAvatarUrl(session);

  async function handleEmailSubmit() {
    await onEmailSignIn(email, password);
    setPassword("");
  }

  return (
    <KeyboardAwareScreen>
      {session ? (
        <View style={[styles.profileHero, isDarkMode ? styles.darkCard : null]}>
          {profileAvatarUrl ? (
            <Image
              source={{ uri: profileAvatarUrl }}
              style={styles.profileAvatarImage}
            />
          ) : (
            <View style={[styles.avatarLarge, isDarkMode ? styles.darkIconBox : null]}>
              <Text style={[styles.avatarText, isDarkMode ? styles.darkText : null]}>
                {getInitials(profileName) || "U"}
              </Text>
            </View>
          )}
          <View style={styles.flex}>
            <Text style={[styles.profileName, isDarkMode ? styles.darkText : null]}>
              {profileName}
            </Text>
            <Text
              style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}
            >
              {profileEmail}
            </Text>
          </View>
        </View>
      ) : null}

      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        {session ? (
          <PrimaryButton
            disabled={isAuthBusy || !isSupabaseConfigured}
            label={labels.signOut}
            onPress={() => {
              void onSignOut();
            }}
          />
        ) : (
          <>
            <PrimaryButton
              disabled={isAuthBusy || !isSupabaseConfigured}
              label={labels.signInGoogle}
              onPress={() => {
                void onSignIn();
              }}
            />

            {showEmailPasswordSignIn ? (
              <View
                style={[
                  styles.contentComposer,
                  isDarkMode ? styles.darkSettingRow : null,
                ]}
              >
                <Field isDarkMode={isDarkMode} label={labels.email}>
                  <TextInput
                    autoCapitalize="none"
                    autoComplete="email"
                    keyboardType="email-address"
                    onChangeText={setEmail}
                    placeholder="email@example.com"
                    placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
                    style={[styles.input, isDarkMode ? styles.darkInput : null]}
                    textContentType="emailAddress"
                    value={email}
                  />
                </Field>
                <Field isDarkMode={isDarkMode} label={labels.password}>
                  <TextInput
                    autoCapitalize="none"
                    onChangeText={setPassword}
                    placeholder={labels.password}
                    placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
                    secureTextEntry
                    style={[styles.input, isDarkMode ? styles.darkInput : null]}
                    textContentType="password"
                    value={password}
                  />
                </Field>
                <PrimaryButton
                  disabled={isAuthBusy || !isSupabaseConfigured}
                  label={labels.signInEmail}
                  onPress={() => {
                    void handleEmailSubmit();
                  }}
                />
              </View>
            ) : null}
          </>
        )}
        {!isSupabaseConfigured ? (
          <Text style={styles.errorText}>{labels.notConfigured}</Text>
        ) : null}
        {authMessage ? <Text style={styles.errorText}>{authMessage}</Text> : null}
      </View>

      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.settings}
        </Text>

        <View style={[styles.settingsRow, isDarkMode ? styles.darkSettingRow : null]}>
          <View style={styles.settingLabelRow}>
            {isDarkMode ? (
              <Moon color="#A78D78" size={20} strokeWidth={2.4} />
            ) : (
              <Sun color="#6E473B" size={20} strokeWidth={2.4} />
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
            thumbColor={isDarkMode ? "#E1D4C2" : "#291C0E"}
            trackColor={{ false: "#A78D78", true: "#6E473B" }}
            value={isDarkMode}
          />
        </View>

      </View>
    </KeyboardAwareScreen>
  );
}

function BusinessCard({
  business,
  canViewContacts,
  isDarkMode,
  labels,
  locale,
  onPress,
}: {
  business: Business;
  canViewContacts: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onPress: () => void;
}) {
  const hasContacts = hasBusinessContacts(business);

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
        {hasBusinessOwnerInfo(business) && business.ownerAvatarUrl ? (
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
      {hasContacts && !canViewContacts ? (
        <View style={[styles.lockedContactNote, isDarkMode ? styles.darkSettingRow : null]}>
          <Lock
            color={isDarkMode ? "#A78D78" : "#6E473B"}
            size={16}
            strokeWidth={2.6}
          />
          <Text style={[styles.lockedContactTitle, isDarkMode ? styles.darkText : null]}>
            {labels.contactSignInTitle}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function BusinessOwnerRow({
  business,
  isDarkMode,
  labels,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
}) {
  const ownerName = business.ownerName.trim();

  return (
    <View style={[styles.businessOwnerRow, isDarkMode ? styles.darkSettingRow : null]}>
      {business.ownerAvatarUrl ? (
        <Image
          source={{ uri: business.ownerAvatarUrl }}
          style={styles.businessOwnerAvatar}
        />
      ) : (
        <View style={[styles.businessOwnerFallback, isDarkMode ? styles.darkIconBox : null]}>
          <UserRound
            color={isDarkMode ? "#A78D78" : "#6E473B"}
            size={17}
            strokeWidth={2.5}
          />
        </View>
      )}
      <View style={styles.flex}>
        <Text style={[styles.businessOwnerLabel, isDarkMode ? styles.darkMutedText : null]}>
          {labels.owner}
        </Text>
        <Text style={[styles.businessOwnerName, isDarkMode ? styles.darkText : null]}>
          {ownerName}
        </Text>
      </View>
    </View>
  );
}

function PublicContentCard({
  business,
  isDarkMode,
  item,
  labels,
  onPress,
  showBusinessName,
}: {
  business: Business;
  isDarkMode: boolean;
  item: BusinessContentItem;
  labels: Record<string, string>;
  onPress?: () => void;
  showBusinessName?: boolean;
}) {
  const metaItems = [
    item.isFree ? labels.free : item.price,
    item.isOnline ? labels.online : undefined,
    item.startsAt ? formatContentDate(item.startsAt) : undefined,
    item.location,
  ].filter((value): value is string => Boolean(value));

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[styles.contentItemCard, isDarkMode ? styles.darkSettingRow : null]}
    >
      {item.imageUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: item.imageUrl }}
          style={styles.contentItemImage}
        />
      ) : null}
      <View style={styles.contentItemHeader}>
        <View style={styles.flex}>
          {showBusinessName ? (
            <Text style={[styles.contentBusinessName, isDarkMode ? styles.darkMutedText : null]}>
              {business.name}
            </Text>
          ) : null}
          <Text style={[styles.contentItemTitle, isDarkMode ? styles.darkText : null]}>
            {item.title}
          </Text>
        </View>
        <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
          {item.type === "event" ? labels.events : labels.services}
        </Text>
      </View>
      <Text style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}>
        {item.description}
      </Text>
      {metaItems.length ? (
        <Text style={[styles.contentItemMeta, isDarkMode ? styles.darkMutedText : null]}>
          {metaItems.join(" | ")}
        </Text>
      ) : null}
    </Pressable>
  );
}

function BusinessModal({
  business,
  canViewContacts,
  isDarkMode,
  labels,
  locale,
  onClose,
  onManage,
  onRequireSignIn,
}: {
  business: Business | null;
  canViewContacts: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onClose: () => void;
  onManage: () => void;
  onRequireSignIn: () => void;
}) {
  const contacts = business ? getBusinessContacts(business, labels) : [];
  const [activeModalTab, setActiveModalTab] = useState<"about" | "services" | "events">(
    "about",
  );
  const contentItems = business?.contentItems ?? [];
  const serviceItems = contentItems.filter((item) => item.type === "service");
  const eventItems = contentItems.filter((item) => item.type === "event");

  useEffect(() => {
    setActiveModalTab("about");
  }, [business?.id]);

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
                    color={isDarkMode ? "#A78D78" : "#291C0E"}
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
              {hasBusinessOwnerInfo(business) ? (
                <BusinessOwnerRow
                  business={business}
                  isDarkMode={isDarkMode}
                  labels={labels}
                />
              ) : null}

              <View style={[styles.dashboardTabs, isDarkMode ? styles.darkSettingRow : null]}>
                <DashboardPanelButton
                  active={activeModalTab === "about"}
                  isDarkMode={isDarkMode}
                  label={labels.about}
                  onPress={() => setActiveModalTab("about")}
                />
                <DashboardPanelButton
                  active={activeModalTab === "services"}
                  isDarkMode={isDarkMode}
                  label={labels.services}
                  onPress={() => setActiveModalTab("services")}
                />
                <DashboardPanelButton
                  active={activeModalTab === "events"}
                  isDarkMode={isDarkMode}
                  label={labels.events}
                  onPress={() => setActiveModalTab("events")}
                />
              </View>

              {activeModalTab === "about" ? (
                <>
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
                      {canViewContacts ? (
                        contacts.map((contact) => (
                          <ContactRow
                            contact={contact}
                            isDarkMode={isDarkMode}
                            key={contact.key}
                          />
                        ))
                      ) : (
                        <ContactSignInPrompt
                          isDarkMode={isDarkMode}
                          labels={labels}
                          onPress={onRequireSignIn}
                        />
                      )}
                    </View>
                  ) : null}
                </>
              ) : null}

              {activeModalTab === "services" ? (
                serviceItems.length ? (
                  serviceItems.map((item) => (
                    <PublicContentCard
                      business={business}
                      isDarkMode={isDarkMode}
                      item={item}
                      key={item.id}
                      labels={labels}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
                    {labels.noContentItems}
                  </Text>
                )
              ) : null}

              {activeModalTab === "events" ? (
                eventItems.length ? (
                  eventItems.map((item) => (
                    <PublicContentCard
                      business={business}
                      isDarkMode={isDarkMode}
                      item={item}
                      key={item.id}
                      labels={labels}
                    />
                  ))
                ) : (
                  <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
                    {labels.noContentItems}
                  </Text>
                )
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

function ContactSignInPrompt({
  isDarkMode,
  labels,
  onPress,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
  onPress: () => void;
}) {
  return (
    <View style={[styles.contactSignInPrompt, isDarkMode ? styles.darkIconBox : null]}>
      <View style={[styles.contactIcon, isDarkMode ? styles.darkSettingRow : null]}>
        <Lock color={isDarkMode ? "#A78D78" : "#6E473B"} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.contactSectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.contactSignInTitle}
        </Text>
        <Text style={[styles.contactSignInText, isDarkMode ? styles.darkMutedText : null]}>
          {labels.contactSignInText}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onPress}
          style={styles.contactSignInButton}
        >
          <Text style={styles.contactSignInButtonText}>{labels.signInGoogle}</Text>
        </Pressable>
      </View>
    </View>
  );
}

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
        <Icon color={isDarkMode ? "#A78D78" : "#6E473B"} size={18} strokeWidth={2.5} />
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

function GoogleLogo({ size }: { size: number }) {
  return (
    <Svg height={size} viewBox="0 0 48 48" width={size}>
      <Path
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20c10 0 19-7.3 19-20 0-1.3-.1-2.3-.4-3.5z"
        fill="#4285F4"
      />
      <Path
        d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.6 8.3 6.3 14.7z"
        fill="#EA4335"
      />
      <Path
        d="M24 44c5.2 0 9.9-2 13.4-5.3l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.8l-6.5 5C9.5 39.6 16.2 44 24 44z"
        fill="#34A853"
      />
      <Path
        d="M12.7 28.2c-.4-1.3-.7-2.7-.7-4.2s.2-2.9.7-4.2l-6.5-5C4.8 17.6 4 20.7 4 24s.8 6.4 2.2 9.2l6.5-5z"
        fill="#FBBC05"
      />
    </Svg>
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
        color={active ? "#E1D4C2" : isDarkMode ? "#A78D78" : "#6E473B"}
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
                  color={isDarkMode ? "#A78D78" : "#291C0E"}
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
          placeholderTextColor={isDarkMode ? "#BEB5A9" : "#6E473B"}
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
          <MapPin color={isDarkMode ? "#A78D78" : "#6E473B"} size={20} strokeWidth={2.5} />
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
                  color={isDarkMode ? "#A78D78" : "#291C0E"}
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
                        color={isDarkMode ? "#A78D78" : "#6E473B"}
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

function hasBusinessOwnerInfo(business: Business) {
  return Boolean(
    business.ownerId &&
      (business.ownerName.trim() || business.ownerAvatarUrl?.trim()),
  );
}

function hasBusinessContacts(business: Business) {
  return Boolean(
    business.phone ||
      business.website ||
      business.instagram ||
      business.address,
  );
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

function formatContentDate(value: string) {
  const parsedDate = new Date(value.replace(" ", "T"));

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return parsedDate.toLocaleDateString(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

function getContentTimestamp(item: BusinessContentItem) {
  const value = item.startsAt ?? item.createdAt ?? "";
  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function getUniqueBusinesses(businesses: Business[]) {
  return businesses.filter(
    (business, index, allBusinesses) =>
      allBusinesses.findIndex(
        (item) => getBusinessDedupeKey(item) === getBusinessDedupeKey(business),
      ) === index,
  );
}

function getUniqueBusinessesById(businesses: Business[]) {
  const seenIds = new Set<string>();

  return businesses.filter((business) => {
    if (seenIds.has(business.id)) {
      return false;
    }

    seenIds.add(business.id);
    return true;
  });
}

function isOwnedBusinessMatch(publicBusiness: Business, ownedBusiness: Business) {
  if (publicBusiness.id === ownedBusiness.id) {
    return true;
  }

  const ownedRegistrationId = ownedBusiness.registrationId ?? ownedBusiness.id;

  return Boolean(
    publicBusiness.registrationId &&
      publicBusiness.registrationId === ownedRegistrationId,
  );
}

function getBusinessDedupeKey(business: Business) {
  if (business.registrationId) {
    return `registration:${business.registrationId}`;
  }

  if (business.slug) {
    return `slug:${business.slug}`;
  }

  return [
    "business",
    business.ownerId ?? "",
    normalize(business.name),
    normalize(business.city),
    business.categorySlug,
  ].join(":");
}

function getEffectiveSearchQuery(query: string) {
  const trimmedQuery = query.trim();
  const normalizedQuery = normalize(trimmedQuery);
  const allQueries = new Set(["all", "all businesses", "усі", "всі", "усе", "все"]);

  return allQueries.has(normalizedQuery) ? "" : trimmedQuery;
}

function hasSearchFilters(query: string, location: string, selectedCategory: string) {
  return Boolean(
    getEffectiveSearchQuery(query) ||
      location.trim() ||
      selectedCategory !== "all",
  );
}

function getPickerDate(value: string) {
  const parsedDate = value ? new Date(value) : null;

  if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return new Date();
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
    bookkeepers:
      "bookkeeper bookkeeping accountant accounting payroll invoices reporting tax finance бухгалтер бухгалтерія облік зарплата рахунки звітність фінанси",
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
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
  },
  activeCategoryOptionText: {
    color: "#291C0E",
  },
  activeLocationOption: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
  },
  activeLocationOptionText: {
    color: "#291C0E",
  },
  activeDashboardTabButton: {
    backgroundColor: "#291C0E",
    borderColor: "#291C0E",
  },
  activeDashboardTabButtonText: {
    color: "#E1D4C2",
  },
  activeTabButton: {
    backgroundColor: "#291C0E",
  },
  appShell: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarLarge: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderRadius: 22,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: {
    color: "#291C0E",
    fontSize: 17,
    fontWeight: "900",
  },
  businessCard: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 18,
    shadowColor: "#291C0E",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
  },
  businessName: {
    color: "#291C0E",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  businessOwnerAvatar: {
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  businessOwnerFallback: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 18,
    borderWidth: 1,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  businessOwnerLabel: {
    color: "#6E473B",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  businessOwnerName: {
    color: "#291C0E",
    fontSize: 14,
    fontWeight: "900",
  },
  businessOwnerRow: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 10,
  },
  card: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
  },
  clearFiltersButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  clearFiltersButtonText: {
    color: "#6E473B",
    fontSize: 12,
    fontWeight: "900",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#E1D4C2",
    borderColor: "#6E473B",
    borderRadius: 8,
    borderWidth: 1,
    color: "#291C0E",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryOption: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
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
    backgroundColor: "#A78D78",
    borderRadius: 999,
    color: "#291C0E",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  categoryOptionText: {
    color: "#291C0E",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  categoryPickerButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  categoryPickerChevron: {
    color: "#6E473B",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryPickerList: {
    gap: 10,
    padding: 18,
    paddingBottom: 34,
  },
  categoryPickerSheet: {
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: CATEGORY_PICKER_SHEET_HEIGHT,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#291C0E",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  categoryPickerText: {
    color: "#291C0E",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  cityText: {
    color: "#6E473B",
    fontSize: 14,
    fontWeight: "700",
  },
  contactCard: {
    backgroundColor: "#A78D78",
    borderRadius: 14,
    gap: 10,
    padding: 14,
  },
  contactIcon: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  contactLabel: {
    color: "#6E473B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  contactLine: {
    color: "#6E473B",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  contactRow: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  contactSectionTitle: {
    color: "#291C0E",
    fontSize: 15,
    fontWeight: "900",
  },
  contactSignInButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#6E473B",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  contactSignInButtonText: {
    color: "#E1D4C2",
    fontSize: 14,
    fontWeight: "900",
  },
  contactSignInPrompt: {
    alignItems: "flex-start",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  contactSignInText: {
    color: "#6E473B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginTop: 4,
  },
  contentArea: {
    flex: 1,
    minHeight: 0,
  },
  contentAddButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  contentAddButtonText: {
    color: "#291C0E",
    fontSize: 13,
    fontWeight: "900",
  },
  contentBusinessName: {
    color: "#6E473B",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  contentComposer: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  contentComposerSheet: {
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 16,
    maxHeight: Math.round(Dimensions.get("window").height * 0.84),
    overflow: "hidden",
    shadowColor: "#291C0E",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  contentItemCard: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  contentItemActionButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 10,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  contentItemActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 6,
  },
  contentItemHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  contentItemImage: {
    aspectRatio: 1.8,
    borderRadius: 14,
    width: "100%",
  },
  contentItemMeta: {
    color: "#6E473B",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  contentItemTitle: {
    color: "#291C0E",
    flex: 1,
    fontSize: 17,
    fontWeight: "900",
    lineHeight: 22,
  },
  contentList: {
    gap: 10,
  },
  contentSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dateTimePlaceholder: {
    color: "#6E473B",
  },
  dateTimeTrigger: {
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  dateTimeTriggerText: {
    color: "#291C0E",
    fontSize: 16,
    fontWeight: "800",
  },
  descriptionText: {
    color: "#6E473B",
    fontSize: 15,
    lineHeight: 22,
  },
  disabledButton: {
    opacity: 0.58,
  },
  disabledInput: {
    opacity: 0.72,
  },
  darkCard: {
    backgroundColor: "#6E473B",
    borderColor: "#A78D78",
  },
  darkAccentText: {
    color: "#A78D78",
  },
  darkActiveOption: {
    backgroundColor: "#6E473B",
    borderColor: "#A78D78",
  },
  darkActiveOptionText: {
    color: "#A78D78",
  },
  darkBadge: {
    backgroundColor: "#291C0E",
    borderColor: "#A78D78",
    color: "#A78D78",
  },
  darkBusinessCard: {
    backgroundColor: "#6E473B",
    borderColor: "#A78D78",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
  },
  darkEmptyState: {
    backgroundColor: "#291C0E",
    color: "#BEB5A9",
  },
  darkIconBox: {
    backgroundColor: "#291C0E",
    borderColor: "#6E473B",
  },
  darkInput: {
    backgroundColor: "#291C0E",
    borderColor: "#6E473B",
    color: "#E1D4C2",
  },
  darkModalSheet: {
    backgroundColor: "#291C0E",
    borderColor: "#6E473B",
    shadowColor: "#000000",
  },
  darkMutedText: {
    color: "#BEB5A9",
  },
  darkOnlineBadge: {
    backgroundColor: "#6E473B",
    color: "#A78D78",
  },
  darkPickerHeader: {
    borderBottomColor: "#6E473B",
  },
  darkPickerOption: {
    backgroundColor: "#291C0E",
    borderColor: "#6E473B",
  },
  darkPickerSheet: {
    backgroundColor: "#291C0E",
    borderColor: "#6E473B",
    shadowColor: "#000000",
  },
  darkSafeArea: {
    backgroundColor: "#291C0E",
  },
  darkSettingRow: {
    backgroundColor: "#6E473B",
    borderColor: "#A78D78",
  },
  darkTabBar: {
    backgroundColor: "#6E473B",
    borderColor: "#A78D78",
  },
  darkText: {
    color: "#E1D4C2",
  },
  dashboardEditHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  dashboardPreviewHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  dashboardPreviewHero: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  dashboardPreviewMeta: {
    gap: 10,
  },
  dashboardPreviewLogo: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 20,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    overflow: "hidden",
    width: 68,
  },
  dashboardTabButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
  },
  dashboardTabButtonText: {
    color: "#291C0E",
    fontSize: 13,
    fontWeight: "900",
  },
  dashboardTabs: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 6,
  },
  emptyState: {
    backgroundColor: "#A78D78",
    borderRadius: 16,
    color: "#6E473B",
    fontSize: 16,
    fontWeight: "700",
    padding: 18,
    textAlign: "center",
  },
  errorText: {
    backgroundColor: "#A78D78",
    borderColor: "#A78D78",
    borderRadius: 12,
    borderWidth: 1,
    color: "#6E473B",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    padding: 12,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: "#291C0E",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  flex: {
    flex: 1,
  },
  googleLogoLarge: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 22,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  categoryPreviewCard: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 8,
    minHeight: 94,
    padding: 14,
    shadowColor: "#291C0E",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
  },
  categoryPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryPreviewMeta: {
    color: "#6E473B",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryPreviewName: {
    color: "#291C0E",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  cityPill: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
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
    color: "#291C0E",
    fontSize: 14,
    fontWeight: "900",
  },
  homeHero: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 28,
    borderWidth: 1,
    gap: 13,
    padding: 20,
    shadowColor: "#291C0E",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  homeIntro: {
    color: "#6E473B",
    fontSize: 16,
    lineHeight: 23,
  },
  homeKicker: {
    alignSelf: "flex-start",
    backgroundColor: "#291C0E",
    borderColor: "#6E473B",
    borderRadius: 8,
    borderWidth: 1,
    color: "#E1D4C2",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  homeSearchButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
  },
  homeSearchText: {
    color: "#6E473B",
    fontSize: 14,
    fontWeight: "700",
  },
  homeSearchTitle: {
    color: "#291C0E",
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
    color: "#291C0E",
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 36,
  },
  input: {
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    color: "#291C0E",
    fontSize: 16,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  inlinePickerInput: {
    flex: 1,
  },
  inlinePickerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  iconActionButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  keyboardAwareContent: {
    paddingBottom: 128,
  },
  locationOption: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
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
    backgroundColor: "#E1D4C2",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  locationOptionText: {
    color: "#291C0E",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  locationPickerButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
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
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: LOCATION_PICKER_SHEET_HEIGHT,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#291C0E",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  lockedContactNote: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  lockedContactTitle: {
    color: "#291C0E",
    fontSize: 12,
    fontWeight: "900",
  },
  logoPreviewImage: {
    borderRadius: 13,
    height: "100%",
    width: "100%",
  },
  logoUploadButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 82,
    padding: 12,
  },
  logoUploadHint: {
    color: "#6E473B",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  logoUploadPreview: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 15,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    width: 54,
  },
  logoUploadTitle: {
    color: "#291C0E",
    fontSize: 15,
    fontWeight: "900",
  },
  cardOwnerAvatar: {
    borderColor: "#A78D78",
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
    color: "#6E473B",
    fontSize: 16,
    lineHeight: 24,
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
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
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: BUSINESS_SHEET_HEIGHT,
    overflow: "hidden",
    shadowColor: "#291C0E",
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
    color: "#291C0E",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  mutedText: {
    color: "#6E473B",
    fontSize: 15,
    lineHeight: 22,
  },
  nativeDateTimeContent: {
    gap: 12,
    padding: 18,
    paddingBottom: 28,
  },
  nativeDateTimeSheet: {
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#291C0E",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  onlineBadge: {
    backgroundColor: "#E1D4C2",
    borderRadius: 8,
    color: "#6E473B",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#6E473B",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#E1D4C2",
    fontSize: 16,
    fontWeight: "900",
  },
  publicProfileCard: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    padding: 18,
    shadowColor: "#291C0E",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 24,
  },
  pickerBackdrop: {
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerHeader: {
    alignItems: "center",
    borderBottomColor: "#A78D78",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pickerTitle: {
    color: "#291C0E",
    fontSize: 18,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 22,
    borderWidth: 1,
    flexDirection: "row",
    gap: 14,
    padding: 16,
  },
  profileHero: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 16,
    padding: 18,
  },
  profileName: {
    color: "#291C0E",
    fontSize: 19,
    fontWeight: "900",
  },
  profileAvatarImage: {
    borderRadius: 22,
    height: 68,
    width: 68,
  },
  resultCount: {
    backgroundColor: "#6E473B",
    borderRadius: 8,
    color: "#E1D4C2",
    fontSize: 14,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  resultsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  resultsHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  safeArea: {
    backgroundColor: "#E1D4C2",
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
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 14,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#A78D78",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#291C0E",
    fontSize: 16,
    fontWeight: "900",
  },
  selectableChip: {
    alignItems: "center",
    backgroundColor: "#E1D4C2",
    borderColor: "#A78D78",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  selectableChipText: {
    color: "#291C0E",
    fontSize: 14,
    fontWeight: "900",
  },
  selectedChip: {
    backgroundColor: "#291C0E",
    borderColor: "#291C0E",
  },
  selectedChipText: {
    color: "#E1D4C2",
  },
  sectionTitle: {
    color: "#291C0E",
    fontSize: 24,
    fontWeight: "900",
  },
  settingLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  settingMeta: {
    color: "#6E473B",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  settingsRow: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  successText: {
    backgroundColor: "#E1D4C2",
    borderRadius: 12,
    color: "#6E473B",
    fontSize: 14,
    fontWeight: "900",
    padding: 12,
  },
  statusPill: {
    backgroundColor: "#E1D4C2",
    borderColor: "#6E473B",
    borderRadius: 999,
    borderWidth: 1,
    color: "#291C0E",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  switchLabel: {
    color: "#291C0E",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: "#A78D78",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  tabBar: {
    backgroundColor: "#A78D78",
    borderColor: "#6E473B",
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    gap: 4,
    marginBottom: -14,
    marginTop: 8,
    padding: 5,
    shadowColor: "#291C0E",
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.12,
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
