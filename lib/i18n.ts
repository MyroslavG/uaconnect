import type { Business, Category, City } from "@/lib/types";

export const localeCookieName = "uaconnect-locale";
export const defaultLocale = "uk";
export const supportedLocales = ["uk", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export function normalizeLocale(value: string | undefined | null): Locale {
  return value === "en" ? "en" : defaultLocale;
}

export const copy = {
  uk: {
    common: {
      home: "Головна",
      search: "Пошук",
      city: "Місто",
      category: "Категорія",
      explore: "Пошук",
      apply: "Застосувати",
      clearSearch: "Очистити пошук",
      contact: "Контакти",
    },
    header: {
      ariaHome: "Головна UAConnect",
      ariaNav: "Основна навігація",
      explore: "Пошук",
      listBusiness: "Додати бізнес",
      setupSupabase: "Налаштувати Supabase",
      signIn: "Увійти",
      signOut: "Вийти",
      dashboard: "Кабінет",
      admin: "Адмін",
      menu: "Відкрити меню",
      mobileMenuDescription: "Навігація, акаунт і налаштування",
      language: "Мова",
      appearance: "Тема",
    },
    theme: {
      toggle: "Перемкнути темну тему",
    },
    language: {
      label: "Мова",
      uk: "Укр",
      en: "Eng",
    },
    search: {
      label: "Пошук",
      placeholder: "вареники, рієлтор, репетитор...",
      submit: "Знайти",
      keyword: "Ключове слово",
      keywordPlaceholder: "Назва, послуга, район",
      location: "Локація",
      locationPlaceholder: "Місто, район або поштова зона",
      useCurrentLocation: "Використати мою локацію",
      locating: "Визначаємо локацію...",
      locationUnavailable: "Геолокація недоступна у цьому браузері",
      locationDenied: "Не вдалося отримати локацію",
      currentLocation: "Моя локація",
      closestCity: (city: string) => `Найближчий доступний hub: ${city}`,
      citySuggestion: "Доступне місто",
      nearbySuggestion: (city: string, distance: number) =>
        `Поруч із hub ${city} · ${distance} км`,
      allCategories: "Усі категорії",
      selectCity: "Введіть локацію",
      selectCategory: "Оберіть категорію",
      categorySearchPlaceholder: "Пошук категорії",
      categoryNoResults: "Категорій не знайдено",
      filterCity: "Фільтр за локацією",
      filterCategory: "Фільтр за категорією",
    },
    home: {
      heroAlt: "Канадська міська вулиця з ресторанами та локальними бізнесами",
      badge: "Пошук українських бізнесів",
      intro:
        "Гарний спосіб знайти українські ресторани, консультантів, майстрів, репетиторів, продуктові магазини та сервіси в Канаді.",
      collageRestaurantAlt: "Затишний український ресторан",
      collageRestaurantLabel: "Ресторани",
      collageRestaurantTitle: "Смак дому зовсім поруч.",
      collageBeautyAlt: "Стильна локальна б'юті-студія",
      collageBeautyLabel: "Краса",
      collageGroceryAlt: "Полиця локального продуктового магазину",
      collageGroceryLabel: "Продукти",
      categoryKicker: "Пошук за потребою",
      categoryTitle: "Почніть з того, що вам потрібно",
      categoryText:
        "Оберіть послугу, місто і швидко перейдіть від пошуку до бізнесу, з яким варто зв'язатися.",
      featuredKicker: "Добірка",
      featuredTitle: "Кілька місць, з яких варто почати",
      featuredCta: "Переглянути бізнеси",
      cityKicker: "Вибір міста",
      cityTitle: "Почніть з міста, де ви живете",
      cityText:
        "Почніть із найближчого канадського hub-міста, а потім звузьте пошук за потрібною послугою.",
      cityExplore: "Переглянути місто",
      cityAltSuffix: "вигляд міста",
      ownerAlt: "Люди обговорюють профіль локального бізнесу",
    },
    explore: {
      fallbackTitle: "Пошук",
      badge: "Українські бізнеси",
      title: (category: string, city: string) => `${category} у місті ${city}`,
      description: (categoryDescription: string) =>
        `${categoryDescription} Знайдіть місце, куди варто зателефонувати, завітати або зберегти на потім.`,
      places: (count: number) => `${count} місць`,
      languages: (count: number) => `${count} мов`,
      localContacts: "Локальні контакти",
      noPlaces: "Нічого не знайдено",
      noPlacesText:
        "Спробуйте очистити пошук або обрати інше місто чи категорію.",
      mapPreview: "Карта",
      mapNoAddresses: "Для цих результатів ще немає адрес на карті.",
      mapShowing: "Показуємо",
      openInMaps: "Відкрити в Google Maps",
      area: (city: string) => `Район ${city}`,
      metadataDescription: (category: string, city: string, province: string) =>
        `Знайдіть українські бізнеси в категорії "${category}" у місті ${city}, ${province}.`,
      mapTitle: (category: string, city: string) =>
        `Карта: ${category} у місті ${city}`,
    },
    business: {
      metadataFallback: "Профіль бізнесу",
      metadataTitle: (name: string, city: string) => `${name} у місті ${city}`,
      mainImage: (name: string) => `${name}: головне фото`,
      galleryImage: (name: string, index: number) =>
        `${name}: фото галереї ${index}`,
      about: "Про бізнес",
      languages: "Мови спілкування",
      tags: "Ключові послуги",
      verified: "Перевірено",
      location: "Локація",
      noAddress: "Адресу ще не вказано.",
      mapTitle: (name: string) => `Карта: ${name}`,
      keepExploring: "Продовжити пошук",
      related: "Схожі бізнеси",
      exploreSimilar: "Переглянути схожі",
      cardAlt: (name: string) => `${name}: фото бізнесу або послуги`,
      openProfile: "Відкрити профіль",
    },
    claim: {
      claim: "Керувати профілем",
    },
    footer: {
      text:
        "Знаходьте українські ресторани, консультантів, магазини, майстрів і локальні сервіси в Канаді.",
      cities: "Міста",
      categories: "Категорії",
    },
    notFound: {
      kicker: "Не знайдено",
      title: "Цей профіль поки недоступний.",
      text:
        "Спробуйте переглянути доступні канадські міста й категорії.",
      cta: "На головну",
    },
  },
  en: {
    common: {
      home: "Home",
      search: "Search",
      city: "City",
      category: "Category",
      explore: "Explore",
      apply: "Apply",
      clearSearch: "Clear search",
      contact: "Contact",
    },
    header: {
      ariaHome: "UAConnect home",
      ariaNav: "Primary navigation",
      explore: "Explore",
      listBusiness: "List a business",
      setupSupabase: "Set up Supabase",
      signIn: "Sign in",
      signOut: "Sign out",
      dashboard: "Dashboard",
      admin: "Admin",
      menu: "Open menu",
      mobileMenuDescription: "Navigation, account, and settings",
      language: "Language",
      appearance: "Theme",
    },
    theme: {
      toggle: "Toggle dark mode",
    },
    language: {
      label: "Language",
      uk: "Укр",
      en: "Eng",
    },
    search: {
      label: "Search",
      placeholder: "Pierogi, realtor, tutor...",
      submit: "Search",
      keyword: "Keyword",
      keywordPlaceholder: "Name, service, neighborhood",
      location: "Location",
      locationPlaceholder: "City, neighborhood, or postal area",
      useCurrentLocation: "Use my location",
      locating: "Finding your location...",
      locationUnavailable: "Geolocation is not available in this browser",
      locationDenied: "Could not access your location",
      currentLocation: "My location",
      closestCity: (city: string) => `Nearest available hub: ${city}`,
      citySuggestion: "Available city",
      nearbySuggestion: (city: string, distance: number) =>
        `Near ${city} hub · ${distance} km`,
      allCategories: "All categories",
      selectCity: "Enter location",
      selectCategory: "Select category",
      categorySearchPlaceholder: "Search categories",
      categoryNoResults: "No categories found",
      filterCity: "Filter location",
      filterCategory: "Filter category",
    },
    home: {
      heroAlt: "Canadian city street with restaurants and local businesses",
      badge: "Ukrainian-owned business discovery",
      intro:
        "A beautiful way to find Ukrainian-owned restaurants, advisors, trades, tutors, grocers, and services across Canada.",
      collageRestaurantAlt: "A welcoming Ukrainian-owned restaurant",
      collageRestaurantLabel: "Restaurants",
      collageRestaurantTitle: "Familiar food, beautifully close.",
      collageBeautyAlt: "A polished local beauty studio",
      collageBeautyLabel: "Beauty",
      collageGroceryAlt: "A local grocery shelf",
      collageGroceryLabel: "Groceries",
      categoryKicker: "Browse by need",
      categoryTitle: "Start with what you need",
      categoryText:
        "Choose a service, pick a city, and move quickly from curiosity to a business worth contacting.",
      featuredKicker: "Featured",
      featuredTitle: "A few places to begin",
      featuredCta: "Explore businesses",
      cityKicker: "City selector",
      cityTitle: "Start with the city you live in",
      cityText:
        "Start with the nearest Canadian hub city, then narrow by the kind of help you need.",
      cityExplore: "Explore city",
      cityAltSuffix: "city preview",
      ownerAlt: "People discussing a local business profile",
    },
    explore: {
      fallbackTitle: "Explore",
      badge: "Ukrainian-owned businesses",
      title: (category: string, city: string) => `${category} in ${city}`,
      description: (categoryDescription: string) =>
        `${categoryDescription} Find a place worth calling, visiting, or saving for later.`,
      places: (count: number) => `${count} place${count === 1 ? "" : "s"}`,
      languages: (count: number) =>
        `${count} language${count === 1 ? "" : "s"}`,
      localContacts: "Local contacts",
      noPlaces: "No places found",
      noPlacesText:
        "Try clearing the keyword filter or switching to another city or category.",
      mapPreview: "Map preview",
      mapNoAddresses: "These results do not have map-ready addresses yet.",
      mapShowing: "Showing",
      openInMaps: "Open in Google Maps",
      area: (city: string) => `${city} area`,
      metadataDescription: (category: string, city: string, province: string) =>
        `Find Ukrainian-owned ${category.toLowerCase()} in ${city}, ${province}.`,
      mapTitle: (category: string, city: string) =>
        `${category} in ${city} map`,
    },
    business: {
      metadataFallback: "Business profile",
      metadataTitle: (name: string, city: string) => `${name} in ${city}`,
      mainImage: (name: string) => `${name} main image`,
      galleryImage: (name: string, index: number) =>
        `${name} gallery image ${index}`,
      about: "About",
      languages: "Languages spoken",
      tags: "Popular tags",
      verified: "Verified",
      location: "Location",
      noAddress: "No address has been added yet.",
      mapTitle: (name: string) => `${name} map`,
      keepExploring: "Keep exploring",
      related: "Related businesses",
      exploreSimilar: "Explore similar",
      cardAlt: (name: string) => `${name} storefront or service preview`,
      openProfile: "Open profile",
    },
    claim: {
      claim: "Manage profile",
    },
    footer: {
      text:
        "Discover Ukrainian-owned restaurants, advisors, shops, trades, and local services across Canada.",
      cities: "Cities",
      categories: "Categories",
    },
    notFound: {
      kicker: "Not found",
      title: "This listing is not available yet.",
      text:
        "Try browsing the available Canadian cities and categories.",
      cta: "Go home",
    },
  },
} satisfies Record<Locale, Record<string, unknown>>;

export function getCopy(locale: Locale) {
  return copy[locale];
}

const categoryUk: Record<string, Pick<Category, "name" | "description">> = {
  restaurants: {
    name: "Ресторани",
    description: "Кафе, пекарні, кейтеринг і сучасні українські кухні.",
  },
  "grocery-stores": {
    name: "Їжа",
    description:
      "Готова їжа, спеціалізовані продукти, пекарні, кейтеринг і локальні виробники.",
  },
  shops: {
    name: "Магазин",
    description:
      "Роздрібні магазини, онлайн-крамниці, локальні товари, подарунки та спеціалізована продукція.",
  },
  lawyers: {
    name: "Юридичні послуги",
    description:
      "Правова підтримка з імміграції, сімейних справ, бізнесу, договорів і нерухомості.",
  },
  realtors: {
    name: "Рієлтори",
    description: "Купівля, продаж, оренда та переїзд у нове місто.",
  },
  "insurance-brokers": {
    name: "Страховий брокер",
    description:
      "Підбір страхування, порівняння полісів, допомога із заявками та покриттям для людей і бізнесів.",
  },
  beauty: {
    name: "Краса",
    description: "Волосся, нігті, догляд за шкірою, брови та макіяж.",
  },
  construction: {
    name: "Будівництво",
    description: "Ремонти, відновлення, добудови та професійні майстри.",
  },
  "repair-services": {
    name: "Ремонтні послуги",
    description:
      "Домашні ремонти, майстер на годину, ремонт меблів, техніки та обслуговування.",
  },
  "textile-decor": {
    name: "Текстиль та декор",
    description:
      "Домашній текстиль, подушки на замовлення, перетяжка меблів, штори, м'який декор та інтер'єрні вироби.",
  },
  cleaning: {
    name: "Клінінг",
    description:
      "Прибирання житла, офісів, після переїзду, генеральне прибирання та регулярний сервіс.",
  },
  "auto-repair": {
    name: "Автосервіс",
    description: "Діагностика, техобслуговування, шини, кузовні роботи та детейлінг.",
  },
  tutors: {
    name: "Репетитори",
    description:
      "Мови, математика, музика, програмування та підтримка для новоприбулих.",
  },
  "it-services": {
    name: "IT-послуги",
    description:
      "Сайти, технічна підтримка, кібербезпека, автоматизація та IT-консалтинг.",
  },
  flowers: {
    name: "Квіти",
    description:
      "Флористичні студії, букети, оформлення подій і сезонна доставка квітів.",
  },
  events: {
    name: "Івенти",
    description:
      "Організація подій, декор, фото, музика, підтримка кейтерингу та святкування.",
  },
  photographers: {
    name: "Фотограф",
    description:
      "Портрети, сімейні зйомки, події, контент для брендів і персональні фотосесії.",
  },
  "advertising-services": {
    name: "Рекламні послуги",
    description:
      "Брендинг, дизайн, друк, соцмережі, реклама, контент і локальне просування.",
  },
};

const cityUk: Record<string, Pick<City, "name" | "summary">> = {
  ottawa: {
    name: "Оттава",
    summary: "",
  },
  gatineau: {
    name: "Гатіно",
    summary: "",
  },
  toronto: {
    name: "Торонто",
    summary: "",
  },
  montreal: {
    name: "Монреаль",
    summary: "",
  },
  vancouver: {
    name: "Ванкувер",
    summary: "",
  },
  calgary: {
    name: "Калгарі",
    summary: "",
  },
  edmonton: {
    name: "Едмонтон",
    summary: "",
  },
  winnipeg: {
    name: "Вінніпег",
    summary: "",
  },
  halifax: {
    name: "Галіфакс",
    summary: "",
  },
  "quebec-city": {
    name: "Квебек",
    summary: "",
  },
};

type BusinessTranslation = Pick<
  Business,
  | "category"
  | "city"
  | "neighborhood"
  | "description"
  | "longDescription"
  | "languages"
  | "hours"
  | "tags"
>;

const businessUk: Record<string, BusinessTranslation> = {};

export function localizeCategory(category: Category, locale: Locale): Category {
  if (locale === "en") {
    return category;
  }

  return {
    ...category,
    ...categoryUk[category.slug],
  };
}

export function localizeCity(city: City, locale: Locale): City {
  if (locale === "en") {
    return {
      ...city,
      summary: "",
    };
  }

  return {
    ...city,
    ...cityUk[city.slug],
    summary: "",
  };
}

export function localizeBusiness(business: Business, locale: Locale): Business {
  if (locale === "en") {
    return business;
  }

  return {
    ...business,
    ...businessUk[business.slug],
  };
}

export function localizeCategories(categories: Category[], locale: Locale) {
  return categories.map((category) => localizeCategory(category, locale));
}

export function localizeCities(cities: City[], locale: Locale) {
  return cities.map((city) => localizeCity(city, locale));
}

export function localizeBusinesses(businesses: Business[], locale: Locale) {
  return businesses.map((business) => localizeBusiness(business, locale));
}
