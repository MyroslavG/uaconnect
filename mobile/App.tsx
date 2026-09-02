import {
  Component,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as AppleAuthentication from "expo-apple-authentication";
import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import * as Linking from "expo-linking";
import * as ImagePicker from "expo-image-picker";
import * as ExpoLocation from "expo-location";
import {
  Alert,
  Animated,
  Dimensions,
  Easing,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  PanResponder,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Share as NativeShare,
  StatusBar,
  type StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardEvent,
  type ViewStyle,
} from "react-native";
import {
  Bell,
  Bookmark,
  Calculator,
  CalendarDays,
  ArrowLeft,
  Camera,
  Car,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  ExternalLink,
  Flower2,
  GraduationCap,
  Hammer,
  HandCoins,
  Heart,
  HeartPulse,
  Home,
  Lock,
  MapPin,
  Megaphone,
  MessageCircle,
  Moon,
  MoreHorizontal,
  Pencil,
  Phone,
  Plane,
  Plus,
  Scale,
  Search,
  Send,
  Share2,
  Scissors,
  ShieldCheck,
  ShoppingBag,
  ShoppingBasket,
  SlidersHorizontal,
  Sparkles,
  Store,
  Sun,
  Sofa,
  Trash2,
  type LucideIcon,
  Truck,
  Upload,
  Utensils,
  UserRound,
  Wrench,
  X,
} from "lucide-react-native";
import Svg, { Path } from "react-native-svg";
import type { Session } from "@supabase/supabase-js";

import {
  businesses as initialBusinesses,
  categories,
  citySuggestions,
} from "./src/data";
import { rankBusinesses } from "./src/ranking";
import {
  completeAuthFromUrl,
  signInWithApple,
  signInWithEmailPassword,
  signUpWithEmailPassword,
  signInWithGoogle,
  signOut,
} from "./src/auth";
import {
  deleteCurrentAccount,
  fetchCurrentProfile,
  updateCurrentProfile,
  type ProfileAvatarInput,
  type ProfileUpdateInput,
  type UserProfile,
} from "./src/account";
import { trackMobileAnalyticsEvent } from "./src/analytics";
import {
  createMobileFeedComment,
  createMobileFeedPost,
  deleteMobileFeedComment,
  deleteMobileFeedPost,
  fetchMobileFeedPosts,
  toggleMobileFeedLike,
  updateMobileFeedComment,
  updateMobileFeedPost,
  type MobileFeedPost,
} from "./src/feed";
import {
  createBusinessContentItem,
  createBusinessRegistration,
  deleteBusinessContentItem,
  fetchOwnedBusinessContent,
  fetchOwnedBusiness,
  fetchPublishedBusinesses,
  saveBusiness,
  unsaveBusiness,
  updateBusinessContentItem,
  updateOwnedBusiness,
  type BusinessLogoInput,
  type BusinessRegistrationInput,
} from "./src/directory";
import { isSupabaseConfigured, supabase } from "./src/supabase";
import {
  fetchBusinessConversations,
  fetchBusinessMessages,
  isDraftConversationId,
  markMobileConversationRead,
  sendMobileBusinessMessage,
  type MobileConversation,
  type MobileMessage,
} from "./src/messages";
import {
  dismissAnnouncement as dismissRemoteAnnouncement,
  dismissAnnouncements as dismissRemoteAnnouncements,
  fetchVisibleAnnouncements,
  type AppAnnouncement,
} from "./src/notifications";
import {
  addPushNotificationTapListener,
  getInitialPushNotificationData,
  registerForPushNotifications,
  syncExistingPushNotificationPermission,
  unregisterStoredPushNotificationToken,
  type PushNotificationData,
  type PushNotificationStatus,
} from "./src/push-notifications";
import { getPublicBusinessContentItems } from "./src/contentVisibility";
import type {
  Business,
  BusinessContentImageInput,
  BusinessContentInput,
  BusinessContentItem,
  BusinessContentType,
  BusinessContentUpdateInput,
  Locale,
} from "./src/types";

type MainTab = "home" | "search" | "feed" | "events" | "profile";
type Tab = MainTab | "business" | "messages";
type ReturnTab = MainTab | "business";
type DashboardPanel = "profile" | "services" | "events" | "products";
type ProfilePanel = "account" | "addBusiness" | "businessInfo";
type ContentDetailEntry = {
  business: Business;
  item: BusinessContentItem;
};
type DiscoveryTile =
  {
    business: Business;
    imageUrl: string;
    item: BusinessContentItem;
    key: string;
    kind: "content";
    subtitle: string;
    title: string;
  };
type AppTourPhase = "focus" | "text";
type AppTourFocus =
  | "addBusinessForm"
  | "businessDashboard"
  | "eventsFeed"
  | "feedActions"
  | "homeDiscovery"
  | "profileControls"
  | "searchFilters";
type AppTourStep = {
  focus: AppTourFocus;
  Icon: LucideIcon;
  profilePanel?: ProfilePanel;
  tab: Tab;
  target: string;
  text: string;
  title: string;
};

const BUSINESS_SHEET_HEIGHT = Math.round(Dimensions.get("window").height * 0.76);
const DISCOVERY_GRID_GAP = 4;
const DISCOVERY_TILE_WIDTH = Math.floor(
  (Dimensions.get("window").width - DISCOVERY_GRID_GAP * 2) / 3,
);
const DISCOVERY_TILE_HEIGHT = Math.round(DISCOVERY_TILE_WIDTH * 1.16);
const DISCOVERY_TILE_BATCH_SIZE = 15;
const DISCOVERY_VIEWER_HEIGHT = Dimensions.get("window").height;
const DISCOVERY_VIEWER_IMAGE_HEIGHT = Math.round(DISCOVERY_VIEWER_HEIGHT * 0.53);
const CATEGORY_PICKER_SHEET_HEIGHT = Math.round(
  Dimensions.get("window").height * 0.62,
);
const LOCATION_PICKER_SHEET_HEIGHT = Math.round(
  Dimensions.get("window").height * 0.58,
);
const MESSAGE_THREAD_BASE_BOTTOM_INSET = 108;
const MESSAGE_THREAD_KEYBOARD_GAP = 12;
const PUBLIC_WEB_URL = (
  process.env.EXPO_PUBLIC_WEB_URL ?? "https://koloapp.ca"
).replace(/\/+$/, "");
const KOLO_SUMMER_PARTY_EVENTBRITE_URL =
  "https://www.ottawaucc.ca/events-1/ukraine-week-in-ottawa";
const KOLO_SUMMER_PARTY_LOCATION =
  "Lansdowne Park, Ottawa, ON";
const KOLO_SUMMER_PARTY_MAP_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  KOLO_SUMMER_PARTY_LOCATION,
)}`;
const KOLO_SUMMER_PARTY_END_AT = "2026-08-30T23:00:00.000Z";
const KOLO_SUMMER_PARTY_IMAGE = require("./assets/ukraine-week.jpg") as number;
const THEME_STORAGE_KEY = "kolo-theme";
const WALKTHROUGH_STORAGE_KEY = "kolo-walkthrough-seen";

function isKoloSummerPartyVisible(now = Date.now()) {
  return now < new Date(KOLO_SUMMER_PARTY_END_AT).getTime();
}

const copy = {
  uk: {
    addBusiness: "Додати",
    addContent: "Додати",
    addEvent: "Додати подію",
    addProduct: "Додати продукт",
    addService: "Додати послугу",
    address: "Адреса",
    all: "Усі",
    allCanada: "Уся Канада",
    about: "Про бізнес",
    available: "В наявності",
    businesses: "бізнесів",
    canadaWide: "Онлайн · вся Канада",
    category: "Категорія",
    chooseCategory: "Виберіть категорію",
    chooseLocation: "Виберіть локацію",
    city: "Місто або локація",
    cancel: "Скасувати",
    close: "Закрити",
    walkthroughTitle: "Ознайомлення з Kolo",
    walkthroughIntro:
      "Коротко покажемо нові вкладки: головну, пошук-контент, стрічку, події та профіль.",
    walkthroughHomeTitle: "Головна Kolo",
    walkthroughHomeText:
      "Зверху бізнеси показані як сторіс, нижче є горизонтальні добірки категорій, контенту й рекомендацій.",
    walkthroughHomeTarget: "Сторіс бізнесів і горизонтальні добірки",
    walkthroughSearchTitle: "Огляд і пошук",
    walkthroughSearchText:
      "Пошук починається з плитки фото. Натисніть поле зверху, щоб знайти бізнес за назвою, послугою, категорією чи ключовими словами.",
    walkthroughSearchTarget: "Поле пошуку і плитка контенту",
    walkthroughFeedTitle: "Стрічка і повідомлення",
    walkthroughFeedText:
      "У стрічці можна читати пости, лайкати, коментувати, поширювати й додавати свій пост через плюс. Іконка справа відкриває повідомлення.",
    walkthroughFeedTarget: "Плюс для поста та іконка повідомлень",
    walkthroughEventsTitle: "Події поруч",
    walkthroughEventsText:
      "Події показуються поруч із вашою локацією. Іконка налаштувань відкриває вибір міста та локальний режим.",
    walkthroughEventsTarget: "Кнопка налаштувань і картки подій",
    walkthroughProfileTitle: "Профіль",
    walkthroughProfileText:
      "У профілі зібрані акаунт, підписки, тема, додавання бізнесу й кабінет власника в одному місці.",
    walkthroughProfileTarget: "Перемикачі профілю та особисті дані",
    walkthroughAddBusinessTitle: "Додати бізнес",
    walkthroughAddBusinessText:
      "Відкрийте вкладку «Додати», щоб надіслати бізнес: контакти, логотип, категорія, опис і ключові слова.",
    walkthroughAddBusinessTarget: "Форма додавання бізнесу",
    walkthroughBusinessTitle: "Бізнес власника",
    walkthroughBusinessText:
      "У вкладці «Бізнес» власник бачить профіль як користувачі й редагує інформацію, послуги, продукти та події.",
    walkthroughBusinessTarget: "Профіль бізнесу і вкладки контенту",
    walkthroughAgain: "Показати ознайомлення",
    walkthroughShowOnPage: "Показати де це",
    walkthroughSkip: "Пропустити ознайомлення",
    walkthroughTargetLabel: "Тут можна взаємодіяти",
    contactEmail: "Робочий email",
    contacts: "Контакти",
    contactSignInText:
      "Телефон, сайт, Instagram та адресу видно лише після входу.",
    contactSignInTitle: "Увійдіть, щоб побачити контакти",
    comment: "Коментувати",
    commentPlaceholder: "Напишіть коментар...",
    comments: "Коментарі",
    noComments: "Коментарів поки немає.",
    contentDescription: "Опис",
    contentItems: "записів",
    keywords: "Ключові слова",
    keywordsHint: "Наприклад: нігті, манікюр, брови, ремонт iPhone, кейтеринг",
    contentLink: "Посилання",
    community: "Спільнота",
    contentPhoto: "Фото",
    contentPhotoHint: "PNG, JPG, WebP або GIF до 5 MB.",
    contentPhotoPermission:
      "Дозвольте доступ до фото, щоб вибрати зображення.",
    contentPhotoSelected: "Фото вибрано",
    contentPhotosSelected: "фото вибрано",
    contentPhotoUpload: "Додати фото",
    contentDeleted: "Видалено",
    contentSaved: "Додано",
    contentUpdated: "Оновлено",
    dashboard: "Кабінет",
    day: "День",
    delete: "Видалити",
    deleteAccount: "Видалити акаунт",
    deleteAccountConfirm: "Видалити назавжди",
    deleteAccountMessage:
      "Це видалить ваш акаунт Kolo, профіль користувача та дані, пов'язані з цим акаунтом. Цю дію неможливо скасувати.",
    deleteAccountTitle: "Видалити акаунт?",
    deleteContentMessage: "Цей запис буде видалено з профілю бізнесу.",
    deleteContentTitle: "Видалити запис?",
    deleteCommentMessage: "Цей коментар буде видалено зі стрічки.",
    deleteCommentTitle: "Видалити коментар?",
    deletePostMessage: "Цей пост і його коментарі буде видалено зі стрічки.",
    deletePostTitle: "Видалити пост?",
    description: "Опис",
    done: "Готово",
    edit: "Редагувати",
    editPersonalProfile: "Редагувати особистий профіль",
    editProfile: "Редагувати профіль",
    email: "Email",
    emailPasswordRequired: "Введіть email і пароль.",
    eventDate: "Дата і час",
    eventDatePlaceholder: "2026-07-20 18:00",
    eventLocation: "Місце або онлайн",
    eventTitle: "Назва події",
    events: "Події",
    eventsNearYou: "Події поруч",
    eventsIntro: "Дивіться події від українських бізнесів за містом або локацією поруч.",
    feed: "Стрічка",
    feedEmpty: "У стрічці ще тихо.",
    feedIntro: "Оновлення від користувачів і бізнесів Kolo.",
    feedPostAs: "Опублікувати як",
    feedPostAsBusiness: "Як бізнес",
    feedPostAsMe: "Як мій профіль",
    feedPostPlaceholder: "Напишіть коротке повідомлення...",
    feedPublish: "Опублікувати",
    officialEvent: "Подія",
    summerPartyTitle: "Ukraine Week in Ottawa",
    summerPartyHost: "",
    summerPartySummary:
      "Тиждень подій до 35-річчя Незалежності України: культура, спільнота, забіг, молитва, майстер-класи й фестивальна програма.",
    summerPartyDate: "23–30 серпня 2026",
    summerPartyLocation: "Ottawa, ON · різні локації",
    summerPartyEventbrite: "Деталі події",
    summerPartyMaps: "Google Maps",
    summerPartyOverviewTitle: "Ukraine Week in Ottawa",
    summerPartyOverview:
      "З 23 до 30 серпня Ottawa відзначатиме 35 років Незалежності України серією подій про спадщину, культуру та спільноту.",
    summerPartyOverviewMore:
      "У програмі: Solidarity Run, підняття прапора, молитва за Україну, майстер-класи, кіновечір і сімейна фестивальна програма з Capital Ukrainian Festival.",
    summerPartySafety:
      "23–30 серпня 2026 · Ottawa, ON. Частина програми 29–30 серпня відбудеться в Lansdowne Park.",
    summerPartyContest:
      "Деталі часу й окремих локацій оновлюються організаторами.",
    summerPartyHighlights:
      "Solidarity Run|Підняття прапора|Молитва за Україну|Майстер-класи|Кіновечір|Фестиваль у Lansdowne",
    find: "Знайти",
    free: "Безкоштовно",
    googleEmail: "Google email",
    hour: "Година",
    home: "Головна",
    homeIntro:
      "Знаходьте українські бізнеси, сервіси та спеціалістів у Канаді.",
    homeTitle: "Українські бізнеси поруч",
    latestUpdates: "Нові послуги, продукти та події",
    localOnly: "Лише локальні",
    loading: "Завантаження",
    loadingBusinesses: "Завантажуємо актуальні бізнеси...",
    detectingLocation: "Підбираємо бізнеси поруч...",
    locationUnavailable: "Не вдалося визначити локацію.",
    notifications: "Оновлення",
    notificationsEmpty: "Нових оновлень немає.",
    pushNotifications: "Push-сповіщення",
    pushNotificationsBusy: "Вмикаємо...",
    pushNotificationsDenied:
      "Сповіщення вимкнені в налаштуваннях пристрою.",
    pushNotificationsDisabled:
      "Отримуйте повідомлення про нові чати та важливі оновлення.",
    pushNotificationsEnabled: "Сповіщення увімкнені.",
    pushNotificationsOn: "Увімкнено",
    pushNotificationsUnavailable:
      "Сповіщення недоступні на цьому пристрої.",
    pushNotificationsUnsupported:
      "Для push-сповіщень потрібна встановлена збірка застосунку.",
    pushNotificationsTurnOn: "Увімкнути",
    dismiss: "Приховати",
    dismissAll: "Приховати всі",
    liveNearby: "Події та сервіси поруч",
    planToday: "Що хочете знайти сьогодні?",
    planFood: "Смачна зупинка",
    planFoodText: "Кухня, випічка, готова їжа та локальні продукти.",
    planCare: "Для себе",
    planCareText: "Краса, здоров'я, тренери, фото та сервісні спеціалісти.",
    planWeekend: "Плани на вихідні",
    planWeekendText: "Події, туризм, квіти, декор і корисні місця.",
    statBusinesses: "бізнесів",
    statCategories: "категорій",
    statCities: "міст",
    location: "Локація",
    like: "Лайк",
    liked: "Вподобано",
    manageProfile: "Керувати профілем",
    myLocation: "Моя локація",
    name: "Назва бізнесу",
    noContentItems: "Поки що нічого не додано.",
    noLogo: "Без лого",
    noResults: "Нічого не знайдено",
    next: "Наступне",
    owner: "Власник",
    phone: "Телефон",
    password: "Пароль",
    personalName: "Ім'я",
    previous: "Попереднє",
    profile: "Профіль",
    profilePhoto: "Фото профілю",
    profilePhotoHint: "PNG, JPG, WebP або GIF до 2 MB.",
    profilePhotoSelected: "Фото вибрано",
    profilePhotoUpload: "Завантажити фото",
    profileNameRequired: "Введіть ім'я.",
    profilePreview: "Так профіль бачать люди",
    profileIntro: "Особистий профіль, контактні дані та налаштування додатку.",
    popularCategories: "Популярні категорії",
    price: "Ціна",
    pricePlaceholder: "$100",
    productTitle: "Назва продукту",
    products: "Продукти",
    quickCities: "Міста поруч",
    recommended: "Рекомендації",
    rankingTitle: "Як працює позиція у пошуку",
    rankingIntro:
      "Вище частіше показуються профілі, які повні, актуальні й релевантні пошуку.",
    rankingProfile:
      "Додайте логотип, опис, адресу або онлайн-позначку та робочі контакти.",
    rankingContent:
      "Оновлюйте послуги, продукти й події, щоб профіль виглядав активним.",
    rankingEvents:
      "Майбутні події отримують додатковий пріоритет у релевантних результатах.",
    featuredBusinesses: "Бізнеси для вас",
    instagram: "Instagram",
    logo: "Логотип",
    logoHint: "PNG, JPG, WebP або GIF до 2 MB.",
    logoPermission: "Дозвольте доступ до фото, щоб вибрати логотип.",
    logoSelected: "Логотип вибрано",
    logoUpload: "Завантажити логотип",
    messageBusiness: "Написати",
    messagePlaceholder: "Напишіть повідомлення...",
    messages: "Повідомлення",
    messagesEmpty: "Розмов поки немає.",
    messagesIntro: "Пишіть бізнесам і відповідайте клієнтам напряму в Kolo.",
    messageStartHint: "Відкрийте бізнес і натисніть «Написати».",
    messageUnavailable: "Повідомлення для цього бізнесу поки недоступні.",
    messageRead: "Прочитано",
    messageUnread: "Непрочитано",
    missingBusinessFields:
      "Заповніть назву бізнесу, місто або локацію та опис.",
    missingContentFields: "Заповніть назву та опис.",
    online: "Онлайн",
    outOfStock: "Немає в наявності",
    registerIntro: "Подайте бізнес на перевірку або підготуйте профіль.",
    save: "Зберегти",
    saveChanges: "Зберегти зміни",
    saved: "Зміни збережено",
    saveBusiness: "Стежити",
    savedBusiness: "Ви стежите",
    savedBusinesses: "Підписки",
    followers: "підписників",
    followerOne: "підписник",
    user: "Користувач",
    shareBusiness: "Поділитися",
    shareFailed: "Не вдалося відкрити поширення.",
    profileSaved: "Профіль оновлено",
    removeSavedBusiness: "Прибрати",
    signInToSave: "Увійдіть, щоб стежити за бізнесом.",
    noSavedBusinesses: "Поки що немає бізнесів, за якими ви стежите.",
    settings: "Налаштування",
    seeAll: "Усі",
    search: "Пошук",
    discover: "Огляд",
    discoverIntro: "Пости, події, послуги й продукти від спільноти Kolo.",
    businessSearch: "Пошук бізнесів",
    searchBusinesses: "Знайти бізнес",
    searchStartHint: "Почніть вводити назву, послугу або виберіть категорію.",
    searchPlaceholder: "Назва, послуга або категорія",
    selected: "Вибрано",
    sendMessage: "Надіслати",
    serviceTitle: "Назва послуги",
    services: "Послуги",
    accountDeleted: "Акаунт видалено.",
    accountCreated:
      "Акаунт створено. Перевірте email, якщо підтвердження пошти увімкнено.",
    accountDeletionNote:
      "Видалення акаунта назавжди прибере ваш доступ і профіль користувача.",
    accountDeletionTitle: "Керування акаунтом",
    account: "Акаунт",
    businessInfo: "Бізнес",
    passwordTooShort: "Пароль має містити щонайменше 6 символів.",
    createAccountEmail: "Створити акаунт",
    signIn: "Увійти",
    signInAppleUnavailable:
      "Вхід через Apple недоступний на цьому пристрої.",
    signInAppleMissingToken:
      "Apple не повернув токен для входу. Спробуйте ще раз.",
    signInEmail: "Увійти з email",
    signedInAs: "Ви увійшли як",
    saving: "Зберігаємо...",
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
    addProduct: "Add product",
    addService: "Add service",
    address: "Address",
    all: "All",
    allCanada: "All Canada",
    about: "About",
    available: "Available",
    businesses: "businesses",
    canadaWide: "Online · Canada-wide",
    category: "Category",
    chooseCategory: "Choose category",
    chooseLocation: "Choose location",
    city: "City or location",
    cancel: "Cancel",
    close: "Close",
    walkthroughTitle: "Kolo introduction",
    walkthroughIntro:
      "A quick look at the new tabs: home, visual search, feed, events, and profile.",
    walkthroughHomeTitle: "Kolo home",
    walkthroughHomeText:
      "Business logos appear like stories at the top, followed by horizontal rows for categories, content, and recommendations.",
    walkthroughHomeTarget: "Business stories and horizontal rows",
    walkthroughSearchTitle: "Explore and search",
    walkthroughSearchText:
      "Search starts with a photo grid. Tap the field at the top to find a business by name, service, category, or keywords.",
    walkthroughSearchTarget: "Search field and content grid",
    walkthroughFeedTitle: "Feed and messages",
    walkthroughFeedText:
      "Read posts, like, comment, share, and add your own post with the plus button. The icon on the right opens messages.",
    walkthroughFeedTarget: "Post plus button and messages icon",
    walkthroughEventsTitle: "Events nearby",
    walkthroughEventsText:
      "Events are shown near your location. The settings icon opens city selection and local-only mode.",
    walkthroughEventsTarget: "Settings button and event cards",
    walkthroughProfileTitle: "Profile",
    walkthroughProfileText:
      "Profile now holds account settings, following, theme, business submission, and the owner dashboard in one place.",
    walkthroughProfileTarget: "Profile switches and personal details",
    walkthroughAddBusinessTitle: "Add business",
    walkthroughAddBusinessText:
      "Open Add to submit a business with contacts, logo, category, description, and keywords.",
    walkthroughAddBusinessTarget: "Business submission form",
    walkthroughBusinessTitle: "Owner business",
    walkthroughBusinessText:
      "In Business, owners see the public profile preview and edit info, services, products, and events.",
    walkthroughBusinessTarget: "Business profile and content tabs",
    walkthroughAgain: "Show introduction",
    walkthroughShowOnPage: "Show me where",
    walkthroughSkip: "Skip introduction",
    walkthroughTargetLabel: "You can interact here",
    contactEmail: "Work email",
    contacts: "Contacts",
    contactSignInText:
      "Phone, website, Instagram, and address are visible after sign-in.",
    contactSignInTitle: "Sign in to view contacts",
    comment: "Comment",
    commentPlaceholder: "Write a comment...",
    comments: "Comments",
    noComments: "No comments yet.",
    contentDescription: "Description",
    contentItems: "items",
    keywords: "Keywords",
    keywordsHint: "Example: nails, manicure, brows, iPhone repair, catering",
    contentLink: "Link",
    community: "Community",
    contentPhoto: "Photo",
    contentPhotoHint: "PNG, JPG, WebP, or GIF up to 5 MB.",
    contentPhotoPermission: "Allow photo access to choose an image.",
    contentPhotoSelected: "Photo selected",
    contentPhotosSelected: "photos selected",
    contentPhotoUpload: "Add photo",
    contentDeleted: "Deleted",
    contentSaved: "Added",
    contentUpdated: "Updated",
    dashboard: "Dashboard",
    day: "Day",
    delete: "Delete",
    deleteAccount: "Delete account",
    deleteAccountConfirm: "Delete permanently",
    deleteAccountMessage:
      "This deletes your Kolo account, user profile, and data connected to this account. This action cannot be undone.",
    deleteAccountTitle: "Delete account?",
    deleteContentMessage: "This item will be removed from the business profile.",
    deleteContentTitle: "Delete item?",
    deleteCommentMessage: "This comment will be removed from the feed.",
    deleteCommentTitle: "Delete comment?",
    deletePostMessage: "This post and its comments will be removed from the feed.",
    deletePostTitle: "Delete post?",
    description: "Description",
    done: "Done",
    edit: "Edit",
    editPersonalProfile: "Edit personal profile",
    editProfile: "Edit profile",
    email: "Email",
    emailPasswordRequired: "Enter email and password.",
    eventDate: "Date and time",
    eventDatePlaceholder: "2026-07-20 18:00",
    eventLocation: "Place or online",
    eventTitle: "Event title",
    events: "Events",
    eventsNearYou: "Events near you",
    eventsIntro: "Browse events from Ukrainian businesses by city or nearby location.",
    feed: "Feed",
    feedEmpty: "The feed is quiet for now.",
    feedIntro: "Updates from Kolo users and businesses.",
    feedPostAs: "Post as",
    feedPostAsBusiness: "As business",
    feedPostAsMe: "As my profile",
    feedPostPlaceholder: "Write a short message...",
    feedPublish: "Publish",
    officialEvent: "Event",
    summerPartyTitle: "Ukraine Week in Ottawa",
    summerPartyHost: "",
    summerPartySummary:
      "A week of events marking 35 years of Ukrainian Independence through culture, community, workshops, prayer, and festival programming.",
    summerPartyDate: "August 23–30, 2026",
    summerPartyLocation: "Ottawa, ON · various locations",
    summerPartyEventbrite: "Event details",
    summerPartyMaps: "Google Maps",
    summerPartyOverviewTitle: "Ukraine Week in Ottawa",
    summerPartyOverview:
      "From August 23 to 30, Ottawa marks 35 years of Ukrainian Independence with a week of heritage, culture, and community events.",
    summerPartyOverviewMore:
      "The program includes a Solidarity Run, flag raising, prayer for Ukraine, workshops, a movie night, and family programming with Capital Ukrainian Festival.",
    summerPartySafety:
      "August 23–30, 2026 · Ottawa, ON. Part of the August 29–30 programming takes place at Lansdowne Park.",
    summerPartyContest:
      "Times and individual locations are being updated by the organizers.",
    summerPartyHighlights:
      "Solidarity Run|Flag raising|Prayer for Ukraine|Workshops|Movie night|Lansdowne festival",
    find: "Search",
    free: "Free",
    googleEmail: "Google email",
    hour: "Hour",
    home: "Home",
    homeIntro:
      "Find Ukrainian-owned businesses, services, and specialists in Canada.",
    homeTitle: "Ukrainian businesses nearby",
    latestUpdates: "New services, products & events",
    localOnly: "Local only",
    loading: "Loading",
    loadingBusinesses: "Loading current businesses...",
    detectingLocation: "Finding businesses near you...",
    locationUnavailable: "Could not detect your location.",
    notifications: "Updates",
    notificationsEmpty: "No new updates.",
    pushNotifications: "Push notifications",
    pushNotificationsBusy: "Turning on...",
    pushNotificationsDenied:
      "Notifications are turned off in your device settings.",
    pushNotificationsDisabled:
      "Get notified about new chats and important updates.",
    pushNotificationsEnabled: "Notifications are on.",
    pushNotificationsOn: "On",
    pushNotificationsUnavailable:
      "Notifications are not available on this device.",
    pushNotificationsUnsupported:
      "Push notifications require an installed app build.",
    pushNotificationsTurnOn: "Turn on",
    dismiss: "Dismiss",
    dismissAll: "Dismiss all",
    liveNearby: "Live nearby",
    planToday: "What do you want to find today?",
    planFood: "Something tasty",
    planFoodText: "Food, bakeries, ready meals, and local products.",
    planCare: "For yourself",
    planCareText: "Beauty, wellness, trainers, photo, and service specialists.",
    planWeekend: "Weekend plans",
    planWeekendText: "Events, travel, flowers, decor, and useful places.",
    statBusinesses: "businesses",
    statCategories: "categories",
    statCities: "cities",
    location: "Location",
    like: "Like",
    liked: "Liked",
    manageProfile: "Manage profile",
    myLocation: "My location",
    name: "Business name",
    noContentItems: "Nothing added yet.",
    noLogo: "No logo",
    noResults: "No results found",
    next: "Next",
    owner: "Owner",
    phone: "Phone",
    password: "Password",
    personalName: "Name",
    previous: "Previous",
    profile: "Profile",
    profilePhoto: "Profile photo",
    profilePhotoHint: "PNG, JPG, WebP, or GIF up to 2 MB.",
    profilePhotoSelected: "Photo selected",
    profilePhotoUpload: "Upload photo",
    profileNameRequired: "Enter your name.",
    profilePreview: "This is how people see the profile",
    profileIntro: "Personal profile, contact details, and app settings.",
    popularCategories: "Popular categories",
    price: "Price",
    pricePlaceholder: "from $100 or free",
    productTitle: "Product name",
    products: "Products",
    quickCities: "Nearby cities",
    recommended: "Recommended",
    rankingTitle: "How search ranking works",
    rankingIntro:
      "Profiles are more likely to appear higher when they are complete, current, and relevant to the search.",
    rankingProfile:
      "Add a logo, description, address or online coverage, and working contacts.",
    rankingContent:
      "Keep services, products, and events updated so the profile looks active.",
    rankingEvents:
      "Upcoming events receive extra priority in relevant results.",
    featuredBusinesses: "Businesses for you",
    instagram: "Instagram",
    logo: "Logo",
    logoHint: "PNG, JPG, WebP, or GIF up to 2 MB.",
    logoPermission: "Allow photo access to choose a logo.",
    logoSelected: "Logo selected",
    logoUpload: "Upload logo",
    messageBusiness: "Message",
    messagePlaceholder: "Write a message...",
    messages: "Messages",
    messagesEmpty: "No conversations yet.",
    messagesIntro: "Message businesses and reply to customers directly in Kolo.",
    messageStartHint: "Open a business and tap “Message.”",
    messageUnavailable: "Messaging is not available for this business yet.",
    messageRead: "Read",
    messageUnread: "Unread",
    missingBusinessFields:
      "Fill in the business name, city or location, and description.",
    missingContentFields: "Fill in the title and description.",
    online: "Online",
    outOfStock: "Out of stock",
    registerIntro: "Submit a business for review or prepare a profile.",
    save: "Save",
    saveChanges: "Save changes",
    saved: "Changes saved",
    saveBusiness: "Follow",
    savedBusiness: "Following",
    savedBusinesses: "Following",
    followers: "followers",
    followerOne: "follower",
    user: "User",
    shareBusiness: "Share",
    shareFailed: "Could not open sharing.",
    profileSaved: "Profile updated",
    removeSavedBusiness: "Remove",
    signInToSave: "Sign in to follow this business.",
    noSavedBusinesses: "You are not following any businesses yet.",
    settings: "Settings",
    seeAll: "All",
    search: "Search",
    discover: "Explore",
    discoverIntro: "Posts, events, services, and products from the Kolo community.",
    businessSearch: "Business search",
    searchBusinesses: "Find a business",
    searchStartHint: "Start typing a name, service, or choose a category.",
    searchPlaceholder: "Name, service, or category",
    selected: "Selected",
    sendMessage: "Send",
    serviceTitle: "Service title",
    services: "Services",
    accountDeleted: "Account deleted.",
    accountCreated:
      "Account created. Check your email if email confirmation is enabled.",
    accountDeletionNote:
      "Account deletion permanently removes your access and user profile.",
    accountDeletionTitle: "Account management",
    account: "Account",
    businessInfo: "Business",
    passwordTooShort: "Password must be at least 6 characters.",
    createAccountEmail: "Create account",
    signIn: "Sign in",
    signInAppleUnavailable:
      "Sign in with Apple is not available on this device.",
    signInAppleMissingToken:
      "Apple did not return a sign-in token. Please try again.",
    signInEmail: "Sign in with email",
    signedInAs: "Signed in as",
    saving: "Saving...",
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
  saskatoon: ["saskatoon", "regina"],
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
  regina: ["regina"],
  saskatoon: ["saskatoon"],
  scarborough: ["scarborough", "скарборо"],
  stittsville: ["stittsville", "стітсвіл", "ститсвіл", "стітсвіль"],
  surrey: ["surrey", "суррей"],
  toronto: ["toronto", "торонто"],
  vancouver: ["vancouver", "ванкувер"],
  winnipeg: ["winnipeg", "вінніпег"],
};

function getBusinessShareUrl(business: Business) {
  const slug = business.slug?.trim() ?? "";

  if (slug) {
    return `${PUBLIC_WEB_URL}/business/${encodeURIComponent(slug)}`;
  }

  return `${PUBLIC_WEB_URL}/search?query=${encodeURIComponent(business.name)}`;
}

function getBusinessShareMessage(
  business: Business,
  locale: Locale,
  shareUrl: string,
) {
  const locationLabel = business.servesAllCanada
    ? locale === "uk"
      ? "вся Канада"
      : "Canada-wide"
    : business.city;

  if (locale === "uk") {
    return `Подивись ${business.name}${locationLabel ? ` (${locationLabel})` : ""} у Kolo: ${shareUrl}`;
  }

  return `Check out ${business.name}${locationLabel ? ` (${locationLabel})` : ""} on Kolo: ${shareUrl}`;
}

function getBusinessContentShareUrl(
  business: Business,
  item: BusinessContentItem,
) {
  const slug = business.slug?.trim() ?? "";

  if (slug) {
    return `${PUBLIC_WEB_URL}/business/${encodeURIComponent(
      slug,
    )}?content=${encodeURIComponent(item.id)}`;
  }

  return `${PUBLIC_WEB_URL}/search?query=${encodeURIComponent(
    `${business.name} ${item.title}`,
  )}`;
}

function getBusinessContentShareMessage(
  business: Business,
  item: BusinessContentItem,
  locale: Locale,
  shareUrl: string,
) {
  if (locale === "uk") {
    return `Подивись ${item.title} від ${business.name} у Kolo: ${shareUrl}`;
  }

  return `Check out ${item.title} by ${business.name} on Kolo: ${shareUrl}`;
}

function getBusinessSlugFromLink(url: string) {
  const pathOnly = url.split("#")[0]?.split("?")[0] ?? "";
  const match = pathOnly.match(/\/(?:--\/)?business\/([^/?#]+)/i);

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getPushNotificationString(
  data: PushNotificationData,
  key: string,
) {
  const value = data[key];

  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getInternalPushNotificationPath(url: string) {
  const trimmedUrl = url.trim();

  if (trimmedUrl.startsWith(PUBLIC_WEB_URL)) {
    return trimmedUrl.slice(PUBLIC_WEB_URL.length).split("#")[0] || "/";
  }

  if (trimmedUrl.startsWith("kolo://")) {
    return `/${trimmedUrl.replace(/^kolo:\/\//, "").split("#")[0]}`;
  }

  return trimmedUrl.split("#")[0] || "/";
}

function getUrlQueryValue(url: string, key: string) {
  const match = url.match(new RegExp(`[?&]${key}=([^&#]+)`));

  if (!match?.[1]) {
    return null;
  }

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getPushNotificationStatusText(
  status: PushNotificationStatus,
  labels: Record<string, string>,
) {
  if (status === "enabled") {
    return labels.pushNotificationsEnabled;
  }

  if (status === "denied") {
    return labels.pushNotificationsDenied;
  }

  if (status === "unsupported") {
    return labels.pushNotificationsUnsupported;
  }

  if (status === "unavailable") {
    return labels.pushNotificationsUnavailable;
  }

  return labels.pushNotificationsDisabled;
}

const defaultOwnedBusiness =
  initialBusinesses.find((business) => business.ownedByCurrentUser) ??
  initialBusinesses[0];

type MobileErrorBoundaryState = {
  error: Error | null;
};

class MobileErrorBoundary extends Component<
  { children: ReactNode },
  MobileErrorBoundaryState
> {
  state: MobileErrorBoundaryState = {
    error: null,
  };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[kolo:mobile-render-crash]", error, errorInfo.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.crashScreen}>
          <Text style={styles.crashTitle}>Kolo could not open</Text>
          <Text style={styles.crashText}>
            Please send this screen to support so we can fix it quickly.
          </Text>
          <Text style={styles.crashDetails} numberOfLines={5}>
            {this.state.error.message}
          </Text>
          <Pressable
            style={styles.crashButton}
            onPress={() => this.setState({ error: null })}
          >
            <Text style={styles.crashButtonText}>Try again</Text>
          </Pressable>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <MobileErrorBoundary>
      <KoloApp />
    </MobileErrorBoundary>
  );
}

function KoloApp() {
  const [locale, setLocale] = useState<Locale>("uk");
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [businessReturnTab, setBusinessReturnTab] = useState<MainTab>("home");
  const [messagesReturnTab, setMessagesReturnTab] = useState<ReturnTab>("feed");
  const [activeProfilePanel, setActiveProfilePanel] =
    useState<ProfilePanel>("account");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [hasLoadedTheme, setHasLoadedTheme] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const hasAppliedInitialLocation = useRef(false);
  const hasAppliedHomeLocation = useRef(false);
  const [hasResolvedInitialLocation, setHasResolvedInitialLocation] =
    useState(false);
  const [isResolvingCurrentLocation, setIsResolvingCurrentLocation] =
    useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [localOnly, setLocalOnly] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<Business | null>(null);
  const [selectedContentEntry, setSelectedContentEntry] =
    useState<ContentDetailEntry | null>(null);
  const [discoveryReturnPostKey, setDiscoveryReturnPostKey] = useState<
    string | null
  >(null);
  const [businessReturnFeedPostId, setBusinessReturnFeedPostId] = useState<
    string | null
  >(null);
  const [selectedFeedPostId, setSelectedFeedPostId] = useState<string | null>(null);
  const homeScrollOffset = useRef(0);
  const pageTransition = useRef(new Animated.Value(1)).current;
  const lastPageTransitionKey = useRef("");
  const hasTrackedAppOpen = useRef(false);
  const lastTrackedSearchKey = useRef("");
  const businessesRef = useRef<Business[]>([]);
  const [pendingBusinessSlug, setPendingBusinessSlug] = useState<string | null>(
    null,
  );
  const [directoryBusinesses, setDirectoryBusinesses] = useState<Business[]>(
    isSupabaseConfigured ? [] : initialBusinesses,
  );
  const [isDirectoryLoading, setIsDirectoryLoading] =
    useState(isSupabaseConfigured);
  const [ownedBusiness, setOwnedBusiness] = useState<Business | null>(
    isSupabaseConfigured ? null : defaultOwnedBusiness,
  );
  const [ownedContentItems, setOwnedContentItems] = useState<
    BusinessContentItem[]
  >([]);
  const [session, setSession] = useState<Session | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile | null>(null);
  const [authMessage, setAuthMessage] = useState("");
  const [dataMessage, setDataMessage] = useState("");
  const [isAuthBusy, setIsAuthBusy] = useState(false);
  const [isAppleSignInAvailable, setIsAppleSignInAvailable] = useState(false);
  const [visibleAnnouncements, setVisibleAnnouncements] = useState<
    AppAnnouncement[]
  >([]);
  const [pushNotificationStatus, setPushNotificationStatus] =
    useState<PushNotificationStatus>("idle");
  const [isPushNotificationBusy, setIsPushNotificationBusy] = useState(false);
  const [isWalkthroughVisible, setIsWalkthroughVisible] = useState(false);
  const [walkthroughPhase, setWalkthroughPhase] =
    useState<AppTourPhase>("text");
  const [walkthroughStepIndex, setWalkthroughStepIndex] = useState(0);
  const [savedBusyBusinessId, setSavedBusyBusinessId] = useState<string | null>(
    null,
  );
  const [conversations, setConversations] = useState<MobileConversation[]>([]);
  const [selectedConversationId, setSelectedConversationId] = useState<
    string | null
  >(null);
  const [isMessageThreadOpen, setIsMessageThreadOpen] = useState(false);
  const [conversationMessages, setConversationMessages] = useState<
    MobileMessage[]
  >([]);
  const [isMessagesLoading, setIsMessagesLoading] = useState(false);
  const [isMessageSending, setIsMessageSending] = useState(false);
  const [messageDraft, setMessageDraft] = useState("");
  const [messageRefreshKey, setMessageRefreshKey] = useState(0);
  const [feedPosts, setFeedPosts] = useState<MobileFeedPost[]>([]);
  const [feedDraft, setFeedDraft] = useState("");
  const [feedCommentDrafts, setFeedCommentDrafts] = useState<
    Record<string, string>
  >({});
  const [feedPostAsBusiness, setFeedPostAsBusiness] = useState(false);
  const [isFeedLoading, setIsFeedLoading] = useState(false);
  const [isFeedSubmitting, setIsFeedSubmitting] = useState(false);
  const [feedRefreshKey, setFeedRefreshKey] = useState(0);
  const labels = { ...copy[locale], ...connectionCopy[locale] };
  const walkthroughSteps = getWalkthroughSteps(labels);
  const activeWalkthroughStep =
    walkthroughSteps[walkthroughStepIndex] ?? walkthroughSteps[0];
  const activeWalkthroughTab = activeWalkthroughStep?.tab;
  const activeWalkthroughProfilePanel = activeWalkthroughStep?.profilePanel;

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(THEME_STORAGE_KEY)
      .then((savedTheme) => {
        if (isMounted && savedTheme) {
          setIsDarkMode(savedTheme === "dark");
        }
      })
      .catch((error) => {
        console.error("[kolo:mobile-theme-load]", error);
      })
      .finally(() => {
        if (isMounted) {
          setHasLoadedTheme(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedTheme) {
      return;
    }

    AsyncStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? "dark" : "light").catch(
      (error) => {
        console.error("[kolo:mobile-theme-save]", error);
      },
    );
  }, [hasLoadedTheme, isDarkMode]);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(WALKTHROUGH_STORAGE_KEY)
      .then((value) => {
        if (isMounted && value !== "seen") {
          setIsWalkthroughVisible(true);
        }
      })
      .catch((error) => {
        console.error("[kolo:mobile-walkthrough-load]", error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isWalkthroughVisible || !activeWalkthroughTab) {
      return;
    }

    setActiveTab(activeWalkthroughTab);

    if (activeWalkthroughProfilePanel) {
      setActiveProfilePanel(activeWalkthroughProfilePanel);
    }
  }, [
    activeWalkthroughProfilePanel,
    activeWalkthroughTab,
    isWalkthroughVisible,
  ]);

  function showWalkthrough() {
    setWalkthroughStepIndex(0);
    setWalkthroughPhase("text");
    setIsWalkthroughVisible(true);
  }

  function completeWalkthrough() {
    setIsWalkthroughVisible(false);
    setWalkthroughPhase("text");
    setWalkthroughStepIndex(0);
    AsyncStorage.setItem(WALKTHROUGH_STORAGE_KEY, "seen").catch((error) => {
      console.error("[kolo:mobile-walkthrough-save]", error);
    });
  }

  async function applyCurrentLocation(silent = false) {
    if (isResolvingCurrentLocation) {
      return undefined;
    }

    try {
      setIsResolvingCurrentLocation(true);
      const currentLocation = await getCurrentMobileLocationLabel();

      if (currentLocation) {
        setLocation(currentLocation);
        return currentLocation;
      }

      if (!silent) {
        Alert.alert(labels.location, labels.locationUnavailable);
      }
    } catch (error) {
      console.error("[kolo:mobile-location]", error);

      if (!silent) {
        Alert.alert(labels.location, labels.locationUnavailable);
      }
    } finally {
      setIsResolvingCurrentLocation(false);
    }

    return undefined;
  }

  useEffect(() => {
    if (hasAppliedInitialLocation.current) {
      return;
    }

    if (location.trim()) {
      setHasResolvedInitialLocation(true);
      return;
    }

    hasAppliedInitialLocation.current = true;
    void applyCurrentLocation(true).finally(() => {
      setHasResolvedInitialLocation(true);
    });
  }, []);

  useEffect(() => {
    if (
      activeTab !== "home" ||
      !hasResolvedInitialLocation ||
      hasAppliedHomeLocation.current ||
      isResolvingCurrentLocation ||
      location.trim()
    ) {
      return;
    }

    hasAppliedHomeLocation.current = true;
    void applyCurrentLocation(true);
  }, [
    activeTab,
    hasResolvedInitialLocation,
    isResolvingCurrentLocation,
    location,
  ]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user.id) {
      setCurrentProfile(null);
      return;
    }

    let isMounted = true;
    const userId = session.user.id;

    async function loadProfile() {
      try {
        const profile = await fetchCurrentProfile(userId);

        if (isMounted) {
          setCurrentProfile(profile);
        }
      } catch (error) {
        console.error("[kolo:mobile-profile]", error);

        if (isMounted) {
          setAuthMessage(getErrorMessage(error));
          setCurrentProfile(null);
        }
      }
    }

    void loadProfile();

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      setVisibleAnnouncements([]);
      return () => {
        isMounted = false;
      };
    }

    fetchVisibleAnnouncements(session.user.id)
      .then((announcements) => {
        if (isMounted) {
          setVisibleAnnouncements(announcements);
        }
      })
      .catch(() => {
        if (isMounted) {
          setVisibleAnnouncements([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [session?.user.id]);

  useEffect(() => {
    let isMounted = true;

    if (!session?.user.id) {
      setPushNotificationStatus("idle");
      return () => {
        isMounted = false;
      };
    }

    syncExistingPushNotificationPermission(locale)
      .then((result) => {
        if (isMounted && result.status === "enabled") {
          setPushNotificationStatus("enabled");
        }
      })
      .catch((error) => {
        console.error("[kolo:mobile-push-sync]", error);
      });

    return () => {
      isMounted = false;
    };
  }, [locale, session?.user.id]);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured || !session?.user.id) {
      setConversations([]);
      setConversationMessages([]);
      setSelectedConversationId(null);
      return () => {
        isMounted = false;
      };
    }

    const userId = session.user.id;

    async function loadConversations() {
      try {
        const nextConversations = await fetchBusinessConversations(userId);

        if (!isMounted) {
          return;
        }

        setConversations((currentConversations) =>
          mergeConversationsWithOptimisticDrafts(
            nextConversations,
            currentConversations,
          ),
        );
        setSelectedConversationId((currentId) =>
          currentId &&
          (isDraftConversationId(currentId) ||
            nextConversations.some((conversation) => conversation.id === currentId))
            ? currentId
            : nextConversations[0]?.id ?? currentId ?? null,
        );
      } catch (error) {
        console.error("[kolo:mobile-messages]", error);

        if (isMounted) {
          setConversations([]);
        }
      }
    }

    void loadConversations();

    return () => {
      isMounted = false;
    };
  }, [messageRefreshKey, session?.user.id]);

  useEffect(() => {
    if (!isSupabaseConfigured || !session?.user.id) {
      return;
    }

    const interval = setInterval(() => {
      setMessageRefreshKey((value) => value + 1);
    }, activeTab === "messages" ? 4500 : 8000);

    return () => clearInterval(interval);
  }, [activeTab, session?.user.id]);

  const selectedConversation = useMemo(
    () =>
      conversations.find((conversation) => conversation.id === selectedConversationId) ??
      null,
    [conversations, selectedConversationId],
  );
  const unreadMessageCount = useMemo(
    () =>
      conversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
      ),
    [conversations],
  );

  useEffect(() => {
    let isMounted = true;

    if (
      !isSupabaseConfigured ||
      !session?.user.id ||
      !selectedConversation ||
      !isMessageThreadOpen
    ) {
      setConversationMessages([]);
      return () => {
        isMounted = false;
      };
    }

    const userId = session.user.id;
    const activeConversation = selectedConversation;

    async function loadMessages() {
      try {
        setIsMessagesLoading(true);
        const nextMessages = await fetchBusinessMessages(
          activeConversation.id,
          userId,
          activeConversation,
        );

        if (!isMounted) {
          return;
        }

        if (activeConversation.isUnread) {
          const readAt = await markMobileConversationRead(
            activeConversation,
            userId,
          );
          setConversationMessages(
            nextMessages.map((message) =>
              message.senderId === userId
                ? message
                : {
                    ...message,
                    isUnread: false,
                  },
            ),
          );
          setConversations((currentConversations) =>
            currentConversations.map((conversation) =>
              conversation.id === activeConversation.id
                ? {
                    ...conversation,
                    customerLastReadAt:
                      conversation.businessOwnerId === userId
                        ? conversation.customerLastReadAt
                        : readAt,
                    isUnread: false,
                    ownerLastReadAt:
                      conversation.businessOwnerId === userId
                        ? readAt
                        : conversation.ownerLastReadAt,
                    unreadCount: 0,
                  }
                : conversation,
            ),
          );
        } else {
          setConversationMessages(nextMessages);
        }
      } catch (error) {
        console.error("[kolo:mobile-message-thread]", error);

        if (isMounted) {
          setConversationMessages([]);
        }
      } finally {
        if (isMounted) {
          setIsMessagesLoading(false);
        }
      }
    }

    void loadMessages();

    return () => {
      isMounted = false;
    };
  }, [
    isMessageThreadOpen,
    selectedConversation?.id,
    selectedConversation?.lastMessageAt,
    session?.user.id,
  ]);

  useEffect(() => {
    let isMounted = true;

    if (!isSupabaseConfigured) {
      setFeedPosts([]);
      return () => {
        isMounted = false;
      };
    }

    async function loadFeed() {
      try {
        setIsFeedLoading(true);
        const posts = await fetchMobileFeedPosts();

        if (isMounted) {
          setFeedPosts(posts);
        }
      } catch (error) {
        console.error("[kolo:mobile-feed]", error);

        if (isMounted) {
          setFeedPosts([]);
        }
      } finally {
        if (isMounted) {
          setIsFeedLoading(false);
        }
      }
    }

    void loadFeed();

    return () => {
      isMounted = false;
    };
  }, [feedRefreshKey, session?.user.id]);

  useEffect(() => {
    let isMounted = true;

    AppleAuthentication.isAvailableAsync()
      .then((isAvailable) => {
        if (isMounted) {
          setIsAppleSignInAvailable(isAvailable);
        }
      })
      .catch(() => {
        if (isMounted) {
          setIsAppleSignInAvailable(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
    let isMounted = true;

    async function handleIncomingUrl(url: string | null) {
      if (!url) {
        return;
      }

      if (isSupabaseConfigured) {
        try {
          const completed = await completeAuthFromUrl(url);

          if (completed && isMounted) {
            setAuthMessage("");
            return;
          }
        } catch (error) {
          console.error("[kolo:mobile-auth-callback]", error);

          if (isMounted) {
            setAuthMessage(getErrorMessage(error));
          }
        }
      }

      const businessSlug = getBusinessSlugFromLink(url);

      if (businessSlug && isMounted) {
        setPendingBusinessSlug(businessSlug);
      }
    }

    Linking.getInitialURL().then((url) => {
      void handleIncomingUrl(url);
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      void handleIncomingUrl(url);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    const initialData = getInitialPushNotificationData();

    if (initialData) {
      handlePushNotificationData(initialData);
    }

    return addPushNotificationTapListener(handlePushNotificationData);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setDirectoryBusinesses(initialBusinesses);
      setIsDirectoryLoading(false);
      return;
    }

    let isMounted = true;

    async function loadDirectory() {
      try {
        setIsDirectoryLoading(true);
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
          setDirectoryBusinesses([]);
        }
      } finally {
        if (isMounted) {
          setIsDirectoryLoading(false);
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
                  ownerAvatarUrl: getProfileAvatarUrl(
                    currentProfile,
                    activeSession,
                  ),
                  ownerName: getProfileDisplayName(
                    currentProfile,
                    activeSession,
                  ),
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
  }, [currentProfile, session]);

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
                contentItems: getPublicBusinessContentItems(ownedContentItems),
                followerCount: business.followerCount,
              }
            : business,
        ),
      ),
    [directoryBusinesses, ownedBusiness, ownedContentItems],
  );

  useEffect(() => {
    businessesRef.current = businesses;
  }, [businesses]);

  const totalBusinessesCount = useMemo(
    () => businesses.length,
    [businesses],
  );
  const savedBusinesses = useMemo(
    () => businesses.filter((business) => business.isSaved),
    [businesses],
  );
  const feedPostingBusiness = useMemo(
    () =>
      businesses.find(
        (business) =>
          business.ownedByCurrentUser &&
          Boolean(session?.user.id) &&
          business.ownerId === session?.user.id,
      ) ?? null,
    [businesses, session?.user.id],
  );
  const selectedFeedPost = useMemo(
    () =>
      selectedFeedPostId
        ? feedPosts.find((post) => post.id === selectedFeedPostId) ?? null
        : null,
    [feedPosts, selectedFeedPostId],
  );
  const pageTransitionKey = [
    activeTab,
    selectedBusiness?.id ?? "",
    selectedFeedPostId ?? "",
    isMessageThreadOpen ? selectedConversationId ?? "thread" : "",
  ].join(":");
  const pageTransitionStyle = {
    opacity: pageTransition.interpolate({
      inputRange: [0, 1],
      outputRange: [0.74, 1],
    }),
    transform: [
      {
        scale: pageTransition.interpolate({
          inputRange: [0, 1],
          outputRange: [0.965, 1],
        }),
      },
    ],
  };

  const results = useMemo(
    () => {
      const searchQuery = getEffectiveSearchQuery(query);
      const filteredBusinesses = businesses.filter((business) => {
        const category = getCategoryName(business.categorySlug, locale);
        const aliases = getSearchAliases(business.categorySlug);
        const locationAliases = getLocationAliases(business.city);
        const contentText = (business.contentItems ?? [])
          .map((item) => `${item.title} ${item.description} ${item.location ?? ""}`)
          .join(" ");
        const haystack = normalize(
          `${business.name} ${business.description} ${business.keywords ?? ""} ${business.city} ${locationAliases} ${category} ${aliases} ${contentText}`,
        );
        const matchesQuery =
          !searchQuery || haystack.includes(normalize(searchQuery));
        const matchesCategory =
          selectedCategory === "all" || business.categorySlug === selectedCategory;
        const matchesLocation =
          !location.trim() ||
          (!localOnly && business.servesAllCanada) ||
          isNearLocation(business.city, location);
        const matchesOnline = !localOnly || !business.servesAllCanada;

        return matchesQuery && matchesCategory && matchesLocation && matchesOnline;
      });

      return rankBusinesses(filteredBusinesses, {
        categorySlug: selectedCategory === "all" ? undefined : selectedCategory,
        location,
        query: searchQuery,
      });
    },
    [businesses, localOnly, locale, location, query, selectedCategory],
  );

  const profileName = getProfileDisplayName(currentProfile, session);

  useEffect(() => {
    if (lastPageTransitionKey.current === pageTransitionKey) {
      return;
    }

    lastPageTransitionKey.current = pageTransitionKey;
    pageTransition.setValue(0);
    Animated.timing(pageTransition, {
      duration: 210,
      easing: Easing.out(Easing.cubic),
      toValue: 1,
      useNativeDriver: true,
    }).start();
  }, [pageTransition, pageTransitionKey]);

  useEffect(() => {
    if (hasTrackedAppOpen.current) {
      return;
    }

    hasTrackedAppOpen.current = true;
    void trackMobileAnalyticsEvent({
      eventType: "app_open",
      metadata: {
        source: "mobile",
      },
      userId: session?.user.id,
    });
  }, [session?.user.id]);

  useEffect(() => {
    if (
      activeTab !== "search" ||
      isDirectoryLoading ||
      !hasResolvedInitialLocation
    ) {
      return;
    }

    const searchQuery = getEffectiveSearchQuery(query);
    const searchKey = JSON.stringify({
      category: selectedCategory,
      localOnly,
      location,
      query: searchQuery,
      resultCount: results.length,
    });

    if (lastTrackedSearchKey.current === searchKey) {
      return;
    }

    const timeout = setTimeout(() => {
      lastTrackedSearchKey.current = searchKey;
      void trackMobileAnalyticsEvent({
        categorySlug:
          selectedCategory === "all" ? undefined : selectedCategory,
        city: location.trim() || undefined,
        eventType: "search",
        metadata: {
          localOnly,
          resultCount: results.length,
        },
        searchQuery: searchQuery || undefined,
        userId: session?.user.id,
      });
    }, 700);

    return () => clearTimeout(timeout);
  }, [
    activeTab,
    hasResolvedInitialLocation,
    isDirectoryLoading,
    localOnly,
    location,
    query,
    results.length,
    selectedCategory,
    session?.user.id,
  ]);

  useEffect(() => {
    if (!selectedBusiness) {
      return;
    }

    void trackMobileAnalyticsEvent({
      business: selectedBusiness,
      eventType: "business_profile_view",
      userId: session?.user.id,
    });
  }, [selectedBusiness?.id, session?.user.id]);

  useEffect(() => {
    if (!selectedContentEntry) {
      return;
    }

    void trackMobileAnalyticsEvent({
      business: selectedContentEntry.business,
      contentItem: selectedContentEntry.item,
      eventType: "content_view",
      metadata: {
        title: selectedContentEntry.item.title,
      },
      userId: session?.user.id,
    });
  }, [selectedContentEntry?.item.id, session?.user.id]);

  useEffect(() => {
    if (!pendingBusinessSlug || isDirectoryLoading) {
      return;
    }

    const linkedBusiness = businesses.find(
      (business) => business.slug === pendingBusinessSlug,
    );

    if (linkedBusiness) {
      setSelectedBusiness(linkedBusiness);
      setBusinessReturnTab("home");
      setActiveTab("business");
      setPendingBusinessSlug(null);
    }
  }, [businesses, isDirectoryLoading, pendingBusinessSlug]);

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

  async function handleAppleSignIn() {
    if (!isAppleSignInAvailable) {
      setAuthMessage(labels.signInAppleUnavailable);
      return;
    }

    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        throw new Error(labels.signInAppleMissingToken);
      }

      const nextSession = await signInWithApple(credential.identityToken);
      setSession(nextSession);

      if (!nextSession) {
        setAuthMessage("Signed in, but no mobile session was saved. Please try again.");
      }
    } catch (error) {
      const errorCode =
        typeof error === "object" && error && "code" in error
          ? String(error.code)
          : "";

      if (errorCode === "ERR_REQUEST_CANCELED") {
        setAuthMessage("");
      } else {
        console.error("[kolo:mobile-apple-auth]", error);
        setAuthMessage(getErrorMessage(error));
      }
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleEmailSignIn(email: string, password: string) {
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

  async function handleEmailSignUp(email: string, password: string) {
    if (!email.trim() || !password.trim()) {
      setAuthMessage(labels.emailPasswordRequired);
      return;
    }

    if (password.length < 6) {
      setAuthMessage(labels.passwordTooShort);
      return;
    }

    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      const nextSession = await signUpWithEmailPassword(email, password);

      if (nextSession) {
        setSession(nextSession);
      } else {
        setAuthMessage(labels.accountCreated);
      }
    } catch (error) {
      console.error("[kolo:mobile-email-signup]", error);
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleEnablePushNotifications() {
    if (!session?.user.id) {
      setAuthMessage(labels.signInRequired);
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    try {
      setAuthMessage("");
      setIsPushNotificationBusy(true);
      const result = await registerForPushNotifications({
        locale,
        requestPermission: true,
      });

      setPushNotificationStatus(result.status);

      if (result.status !== "enabled") {
        setAuthMessage(getPushNotificationStatusText(result.status, labels));
      }
    } catch (error) {
      console.error("[kolo:mobile-push-enable]", error);
      setPushNotificationStatus("unavailable");
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsPushNotificationBusy(false);
    }
  }

  async function handleDeleteAccount() {
    if (!isSupabaseConfigured || !session?.user.id) {
      setAuthMessage(labels.signInRequired);
      return;
    }

    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      await unregisterStoredPushNotificationToken();
      await deleteCurrentAccount();
      setSession(null);
      setOwnedBusiness(null);
      setOwnedContentItems([]);
      setSelectedBusiness(null);
      setActiveProfilePanel("account");
      setActiveTab("profile");
      setAuthMessage(labels.accountDeleted);
    } catch (error) {
      console.error("[kolo:mobile-account-delete]", error);
      setAuthMessage(getErrorMessage(error));
    } finally {
      setIsAuthBusy(false);
    }
  }

  async function handleSignOut() {
    try {
      setAuthMessage("");
      setIsAuthBusy(true);
      await unregisterStoredPushNotificationToken();
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

  async function handleToggleSavedBusiness(business: Business) {
    if (!isSupabaseConfigured || !session?.user.id) {
      setAuthMessage(labels.signInToSave);
      setSelectedBusiness(null);
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    const nextIsSaved = !business.isSaved;
    const applySavedState = (currentBusinesses: Business[]) =>
      currentBusinesses.map((currentBusiness) =>
        isSameBusinessReference(currentBusiness, business)
          ? {
              ...currentBusiness,
              followerCount: getNextFollowerCount(
                currentBusiness.followerCount,
                nextIsSaved,
              ),
              isSaved: nextIsSaved,
            }
          : currentBusiness,
      );

    try {
      setAuthMessage("");
      setSavedBusyBusinessId(business.id);
      setDirectoryBusinesses(applySavedState);
      setSelectedBusiness((currentBusiness) =>
        currentBusiness && isSameBusinessReference(currentBusiness, business)
          ? {
              ...currentBusiness,
              followerCount: getNextFollowerCount(
                currentBusiness.followerCount,
                nextIsSaved,
              ),
              isSaved: nextIsSaved,
            }
          : currentBusiness,
      );

      if (nextIsSaved) {
        await saveBusiness(business.id, session.user.id);
      } else {
        await unsaveBusiness(business.id, session.user.id);
      }
    } catch (error) {
      console.error("[kolo:mobile-saved-business]", error);
      setAuthMessage(getErrorMessage(error));
      setDirectoryBusinesses((currentBusinesses) =>
        currentBusinesses.map((currentBusiness) =>
          isSameBusinessReference(currentBusiness, business)
            ? {
                ...currentBusiness,
                followerCount: business.followerCount,
                isSaved: Boolean(business.isSaved),
              }
            : currentBusiness,
        ),
      );
      setSelectedBusiness((currentBusiness) =>
        currentBusiness && isSameBusinessReference(currentBusiness, business)
          ? {
              ...currentBusiness,
              followerCount: business.followerCount,
              isSaved: Boolean(business.isSaved),
            }
          : currentBusiness,
      );
    } finally {
      setSavedBusyBusinessId(null);
    }
  }

  async function handleMessageBusiness(business: Business) {
    if (!business.ownerId) {
      Alert.alert(labels.messages, labels.messageUnavailable);
      return;
    }

    if (!isSupabaseConfigured || !session?.user.id) {
      setSelectedBusiness(null);
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    try {
      const existingConversation = conversations.find(
        (conversation) =>
          conversation.businessId === business.id &&
          conversation.customerId === session.user.id &&
          hasConversationMessages(conversation),
      );
      const conversationId =
        existingConversation?.id ??
        createDraftConversationId(business.id, session.user.id);
      const optimisticConversation =
        existingConversation ??
        createOptimisticConversationFromBusiness({
          business,
          conversationId,
          customerEmail: session.user.email,
          customerId: session.user.id,
          customerName: getProfileDisplayName(currentProfile, session),
        });

      if (activeTab !== "business") {
        setSelectedBusiness(null);
      }
      setConversationMessages([]);
      setConversations((currentConversations) => {
        if (
          currentConversations.some(
            (conversation) => conversation.id === conversationId,
          )
        ) {
          return currentConversations;
        }

        return [optimisticConversation, ...currentConversations];
      });
      setSelectedConversationId(conversationId);
      setIsMessageThreadOpen(true);
      setMessagesReturnTab(
        activeTab === "messages"
          ? messagesReturnTab
          : activeTab === "business"
            ? "business"
            : activeTab,
      );
      setActiveTab("messages");
    } catch (error) {
      console.error("[kolo:mobile-message-start]", error);
      Alert.alert(labels.messages, getErrorMessage(error));
    }
  }

  async function handleSendConversationMessage() {
    if (!session?.user.id || !selectedConversation || isMessageSending) {
      return;
    }

    const trimmedDraft = messageDraft.trim();

    if (!trimmedDraft) {
      return;
    }

    try {
      setIsMessageSending(true);
      const sentMessage = await sendMobileBusinessMessage({
        body: trimmedDraft,
        conversation: selectedConversation,
        customerEmail: session.user.email,
        customerName: getProfileDisplayName(currentProfile, session),
      });
      const sentAt = new Date().toISOString();
      const nextConversationId = sentMessage.conversationId;
      setMessageDraft("");
      setSelectedConversationId(nextConversationId);
      setConversations((currentConversations) =>
        currentConversations.map((conversation) =>
          conversation.id === selectedConversation.id
            ? {
                ...conversation,
                customerLastReadAt:
                  conversation.businessOwnerId === session.user.id
                    ? conversation.customerLastReadAt
                    : sentAt,
                lastMessageAt: sentAt,
                lastMessagePreview: trimmedDraft.slice(0, 180),
                lastSenderId: session.user.id,
                id: nextConversationId,
                ownerLastReadAt:
                  conversation.businessOwnerId === session.user.id
                    ? sentAt
                    : conversation.ownerLastReadAt,
              }
            : conversation,
        ),
      );
      const nextMessages = await fetchBusinessMessages(
        nextConversationId,
        session.user.id,
        {
          ...selectedConversation,
          customerLastReadAt:
            selectedConversation.businessOwnerId === session.user.id
              ? selectedConversation.customerLastReadAt
              : sentAt,
          id: nextConversationId,
          lastMessageAt: sentAt,
          lastMessagePreview: trimmedDraft.slice(0, 180),
          lastSenderId: session.user.id,
          ownerLastReadAt:
            selectedConversation.businessOwnerId === session.user.id
              ? sentAt
              : selectedConversation.ownerLastReadAt,
        },
      );
      setConversationMessages(nextMessages);
      setMessageRefreshKey((value) => value + 1);
    } catch (error) {
      console.error("[kolo:mobile-message-send]", error);
      Alert.alert(labels.messages, getErrorMessage(error));
    } finally {
      setIsMessageSending(false);
    }
  }

  async function handleCreateFeedPost() {
    if (!session?.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return false;
    }

    const body = feedDraft.trim();

    if (!body || isFeedSubmitting) {
      return false;
    }

    try {
      setIsFeedSubmitting(true);
      await createMobileFeedPost({
        authorId: session.user.id,
        body,
        businessId:
          feedPostAsBusiness && feedPostingBusiness
            ? feedPostingBusiness.id
            : null,
      });
      setFeedDraft("");
      setFeedRefreshKey((value) => value + 1);
      return true;
    } catch (error) {
      console.error("[kolo:mobile-feed-create]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
      return false;
    } finally {
      setIsFeedSubmitting(false);
    }
  }

  async function handleUpdateFeedPost(post: MobileFeedPost, body: string) {
    if (!session?.user.id || post.author_id !== session.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody || trimmedBody === post.body) {
      return;
    }

    const updatedAt = new Date().toISOString();

    setFeedPosts((currentPosts) =>
      currentPosts.map((feedPost) =>
        feedPost.id === post.id
          ? { ...feedPost, body: trimmedBody, updated_at: updatedAt }
          : feedPost,
      ),
    );

    try {
      await updateMobileFeedPost({
        authorId: session.user.id,
        body: trimmedBody,
        postId: post.id,
      });
    } catch (error) {
      setFeedPosts((currentPosts) =>
        currentPosts.map((feedPost) =>
          feedPost.id === post.id ? post : feedPost,
        ),
      );
      console.error("[kolo:mobile-feed-post-update]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
    }
  }

  function handleDeleteFeedPost(post: MobileFeedPost) {
    if (!session?.user.id || post.author_id !== session.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    Alert.alert(labels.deletePostTitle, labels.deletePostMessage, [
      {
        style: "cancel",
        text: labels.cancel,
      },
      {
        onPress: () => {
          void deleteFeedPost(post);
        },
        style: "destructive",
        text: labels.delete,
      },
    ]);
  }

  async function deleteFeedPost(post: MobileFeedPost) {
    if (!session?.user.id || post.author_id !== session.user.id) {
      return;
    }

    if (selectedFeedPostId === post.id) {
      setSelectedFeedPostId(null);
    }

    setFeedPosts((currentPosts) =>
      currentPosts.filter((feedPost) => feedPost.id !== post.id),
    );

    try {
      await deleteMobileFeedPost({
        authorId: session.user.id,
        postId: post.id,
      });
    } catch (error) {
      setFeedPosts((currentPosts) =>
        [...currentPosts, post].sort(
          (firstPost, secondPost) =>
            new Date(secondPost.created_at).getTime() -
            new Date(firstPost.created_at).getTime(),
        ),
      );
      console.error("[kolo:mobile-feed-post-delete]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
    }
  }

  async function handleToggleFeedLike(post: MobileFeedPost) {
    if (!session?.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    const nextLikedState = !post.likedByCurrentUser;
    const likeDelta = nextLikedState ? 1 : -1;

    setFeedPosts((currentPosts) =>
      currentPosts.map((feedPost) =>
        feedPost.id === post.id
          ? {
              ...feedPost,
              likedByCurrentUser: nextLikedState,
              likeCount: Math.max(0, feedPost.likeCount + likeDelta),
            }
          : feedPost,
      ),
    );

    try {
      await toggleMobileFeedLike({
        isLiked: post.likedByCurrentUser,
        postId: post.id,
        userId: session.user.id,
      });
    } catch (error) {
      setFeedPosts((currentPosts) =>
        currentPosts.map((feedPost) =>
          feedPost.id === post.id
            ? {
                ...feedPost,
                likedByCurrentUser: post.likedByCurrentUser,
                likeCount: post.likeCount,
              }
            : feedPost,
        ),
      );
      console.error("[kolo:mobile-feed-like]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
    }
  }

  async function handleCreateFeedComment(post: MobileFeedPost) {
    if (!session?.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    const body = (feedCommentDrafts[post.id] ?? "").trim();

    if (!body) {
      return;
    }

    const temporaryCommentId = `local-comment-${Date.now()}`;
    const createdAt = new Date().toISOString();
    const optimisticComment: MobileFeedPost["comments"][number] = {
      author: {
        author_avatar_url: getProfileAvatarUrl(currentProfile, session) || null,
        author_id: session.user.id,
        author_name: profileName || session.user.email || null,
      },
      author_id: session.user.id,
      body,
      created_at: createdAt,
      id: temporaryCommentId,
      post_id: post.id,
      updated_at: createdAt,
    };

    setFeedCommentDrafts((currentDrafts) => ({
      ...currentDrafts,
      [post.id]: "",
    }));
    setFeedPosts((currentPosts) =>
      currentPosts.map((feedPost) =>
        feedPost.id === post.id
          ? {
              ...feedPost,
              commentCount: feedPost.commentCount + 1,
              comments: [...feedPost.comments, optimisticComment],
            }
          : feedPost,
      ),
    );

    try {
      const savedCommentId = await createMobileFeedComment({
        authorId: session.user.id,
        body,
        postId: post.id,
      });

      if (savedCommentId) {
        setFeedPosts((currentPosts) =>
          currentPosts.map((feedPost) =>
            feedPost.id === post.id
              ? {
                  ...feedPost,
                  comments: feedPost.comments.map((comment) =>
                    comment.id === temporaryCommentId
                      ? { ...comment, id: savedCommentId }
                      : comment,
                  ),
                }
              : feedPost,
          ),
        );
      }
    } catch (error) {
      setFeedPosts((currentPosts) =>
        currentPosts.map((feedPost) => {
          if (feedPost.id !== post.id) {
            return feedPost;
          }

          return {
            ...feedPost,
            commentCount: Math.max(0, feedPost.commentCount - 1),
            comments: feedPost.comments.filter(
              (comment) => comment.id !== temporaryCommentId,
            ),
          };
        }),
      );
      setFeedCommentDrafts((currentDrafts) => ({
        ...currentDrafts,
        [post.id]: body,
      }));
      console.error("[kolo:mobile-feed-comment]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
    }
  }

  async function handleUpdateFeedComment(
    comment: MobileFeedPost["comments"][number],
    body: string,
  ) {
    if (!session?.user.id || comment.author_id !== session.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    const trimmedBody = body.trim();

    if (!trimmedBody) {
      return;
    }

    setFeedPosts((currentPosts) =>
      currentPosts.map((post) => ({
        ...post,
        comments: post.comments.map((postComment) =>
          postComment.id === comment.id
            ? { ...postComment, body: trimmedBody }
            : postComment,
        ),
      })),
    );

    try {
      await updateMobileFeedComment({
        authorId: session.user.id,
        body: trimmedBody,
        commentId: comment.id,
      });
    } catch (error) {
      setFeedPosts((currentPosts) =>
        currentPosts.map((post) => ({
          ...post,
          comments: post.comments.map((postComment) =>
            postComment.id === comment.id ? comment : postComment,
          ),
        })),
      );
      console.error("[kolo:mobile-feed-comment-update]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
    }
  }

  function handleDeleteFeedComment(
    comment: MobileFeedPost["comments"][number],
  ) {
    if (!session?.user.id || comment.author_id !== session.user.id) {
      setActiveProfilePanel("account");
      setActiveTab("profile");
      return;
    }

    Alert.alert(labels.deleteCommentTitle, labels.deleteCommentMessage, [
      {
        style: "cancel",
        text: labels.cancel,
      },
      {
        onPress: () => {
          void deleteFeedComment(comment);
        },
        style: "destructive",
        text: labels.delete,
      },
    ]);
  }

  async function deleteFeedComment(
    comment: MobileFeedPost["comments"][number],
  ) {
    if (!session?.user.id || comment.author_id !== session.user.id) {
      return;
    }

    setFeedPosts((currentPosts) =>
      currentPosts.map((post) => {
        const hasComment = post.comments.some(
          (postComment) => postComment.id === comment.id,
        );

        if (!hasComment) {
          return post;
        }

        return {
          ...post,
          commentCount: Math.max(0, post.commentCount - 1),
          comments: post.comments.filter(
            (postComment) => postComment.id !== comment.id,
          ),
        };
      }),
    );

    try {
      await deleteMobileFeedComment({
        authorId: session.user.id,
        commentId: comment.id,
      });
    } catch (error) {
      setFeedPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === comment.post_id
            ? {
                ...post,
                commentCount: post.commentCount + 1,
                comments: [...post.comments, comment].sort(
                  (firstComment, secondComment) =>
                    new Date(firstComment.created_at).getTime() -
                    new Date(secondComment.created_at).getTime(),
                ),
              }
            : post,
        ),
      );
      console.error("[kolo:mobile-feed-comment-delete]", error);
      Alert.alert(labels.feed, getErrorMessage(error));
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
      ownerAvatarUrl: getProfileAvatarUrl(currentProfile, session),
      ownerName: profileName,
    });
    setActiveProfilePanel("businessInfo");
    setActiveTab("profile");
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
      ownerAvatarUrl: getProfileAvatarUrl(currentProfile, session),
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

  function applyProfileToOwnedBusiness(
    profile: UserProfile,
    activeSession: Session | null,
  ) {
    const ownerId = activeSession?.user.id;

    if (!ownerId) {
      return;
    }

    const ownerName = getProfileDisplayName(profile, activeSession);
    const ownerAvatarUrl = getProfileAvatarUrl(profile, activeSession);
    const applyOwnerProfile = (business: Business) =>
      business.ownerId === ownerId || business.ownedByCurrentUser
        ? {
            ...business,
            ownerAvatarUrl,
            ownerName,
          }
        : business;

    setOwnedBusiness((currentBusiness) =>
      currentBusiness ? applyOwnerProfile(currentBusiness) : currentBusiness,
    );
    setDirectoryBusinesses((currentBusinesses) =>
      currentBusinesses.map(applyOwnerProfile),
    );
    setSelectedBusiness((currentBusiness) =>
      currentBusiness ? applyOwnerProfile(currentBusiness) : currentBusiness,
    );
  }

  async function handleProfileSave(input: ProfileUpdateInput) {
    if (!isSupabaseConfigured || !session?.user.id) {
      throw new Error(labels.signInRequired);
    }

    const updatedProfile = await updateCurrentProfile(
      input,
      session.user.id,
      session.user.email ?? undefined,
    );
    const { data } = await supabase.auth.getSession();

    setCurrentProfile(updatedProfile);
    setSession(data.session);
    applyProfileToOwnedBusiness(updatedProfile, data.session ?? session);

    return updatedProfile;
  }

  async function handleBusinessContentCreate(input: BusinessContentInput) {
    if (!isSupabaseConfigured || !session?.user.id) {
      const imageUrls = getInputImageUris(input);
      const localContentItem: BusinessContentItem = {
        ...input,
        createdAt: new Date().toISOString(),
        id: `local-${Date.now()}`,
        imageUrl: imageUrls[0],
        imageUrls,
        isAvailable: input.isAvailable ?? true,
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
      const nextImageUrls = getInputImageUris(input);
      setOwnedContentItems((currentItems) =>
        currentItems.map((item) =>
          item.id === input.id
            ? {
                ...item,
                ...input,
                imageUrl: nextImageUrls[0] ?? item.imageUrl,
                imageUrls: nextImageUrls.length > 0 ? nextImageUrls : item.imageUrls,
                isAvailable: input.isAvailable ?? item.isAvailable,
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

  function handleDismissAnnouncement(announcementId: string) {
    setVisibleAnnouncements((currentAnnouncements) =>
      currentAnnouncements.filter(
        (announcement) => announcement.id !== announcementId,
      ),
    );

    if (session?.user.id) {
      void dismissRemoteAnnouncement(announcementId, session.user.id);
    }
  }

  function handleDismissAllAnnouncements() {
    const announcementIds = visibleAnnouncements.map(
      (announcement) => announcement.id,
    );

    setVisibleAnnouncements([]);

    if (session?.user.id) {
      void dismissRemoteAnnouncements(announcementIds, session.user.id);
    }
  }

  function handleStandaloneContentPress(entry: ContentDetailEntry) {
    setSelectedContentEntry(entry);
  }

  function handleBusinessModalContentPress(entry: ContentDetailEntry) {
    setSelectedContentEntry(entry);
  }

  function handleContentModalClose() {
    setSelectedContentEntry(null);
  }

  async function handleShareBusiness(business: Business) {
    const shareUrl = getBusinessShareUrl(business);

    try {
      await NativeShare.share({
        message: getBusinessShareMessage(business, locale, shareUrl),
        title: business.name,
        url: shareUrl,
      });
      void trackMobileAnalyticsEvent({
        business,
        eventType: "share",
        metadata: {
          shareTarget: "business",
        },
        userId: session?.user.id,
      });
    } catch (error) {
      console.error("[kolo:mobile-share]", error);
      Alert.alert(labels.shareBusiness, labels.shareFailed);
    }
  }

  async function handleShareContent(entry: ContentDetailEntry) {
    const shareUrl = getBusinessContentShareUrl(entry.business, entry.item);

    try {
      await NativeShare.share({
        message: getBusinessContentShareMessage(
          entry.business,
          entry.item,
          locale,
          shareUrl,
        ),
        title: entry.item.title,
        url: shareUrl,
      });
      void trackMobileAnalyticsEvent({
        business: entry.business,
        contentItem: entry.item,
        eventType: "share",
        metadata: {
          shareTarget: entry.item.type,
        },
        userId: session?.user.id,
      });
    } catch (error) {
      console.error("[kolo:mobile-content-share]", error);
      Alert.alert(labels.shareBusiness, labels.shareFailed);
    }
  }

  function handleBusinessContactPress(contact: ContactItem) {
    void trackMobileAnalyticsEvent({
      businessId: contact.businessId,
      businessName: contact.businessName,
      businessSlug: contact.businessSlug,
      contactType: contact.contactType,
      eventType: "contact_click",
      userId: session?.user.id,
    });
  }

  function handleContentContactPress(
    entry: ContentDetailEntry,
    contactType: ContactItem["contactType"],
  ) {
    void trackMobileAnalyticsEvent({
      business: entry.business,
      contactType,
      contentItem: entry.item,
      eventType: "contact_click",
      userId: session?.user.id,
    });
  }

  function handlePushNotificationData(data: PushNotificationData) {
    const notificationType = getPushNotificationString(data, "type");
    const conversationId =
      getPushNotificationString(data, "conversationId") ??
      getPushNotificationString(data, "conversation_id");
    const businessId =
      getPushNotificationString(data, "businessId") ??
      getPushNotificationString(data, "business_id");
    const businessSlug =
      getPushNotificationString(data, "businessSlug") ??
      getPushNotificationString(data, "business_slug");
    const url = getPushNotificationString(data, "url");

    if (notificationType === "message" || conversationId) {
      setMessagesReturnTab("feed");
      setSelectedBusiness(null);
      setSelectedConversationId(conversationId ?? null);
      setIsMessageThreadOpen(Boolean(conversationId));
      setActiveTab("messages");
      setMessageRefreshKey((value) => value + 1);
      return;
    }

    if (notificationType === "business" || businessId || businessSlug) {
      openBusinessFromPushNotification(businessId, businessSlug);
      return;
    }

    if (url) {
      openPushNotificationUrl(url);
    }
  }

  function openPushNotificationUrl(url: string) {
    const businessSlug = getBusinessSlugFromLink(url);

    if (businessSlug) {
      openBusinessFromPushNotification(null, businessSlug);
      return;
    }

    const path = getInternalPushNotificationPath(url);
    const conversationId = getUrlQueryValue(url, "conversation");

    if (path.startsWith("/messages")) {
      setMessagesReturnTab("feed");
      setSelectedBusiness(null);
      setSelectedConversationId(conversationId);
      setIsMessageThreadOpen(Boolean(conversationId));
      setActiveTab("messages");
      setMessageRefreshKey((value) => value + 1);
      return;
    }

    if (path.startsWith("/search")) {
      openMainTab("search");
      return;
    }

    if (path.startsWith("/events")) {
      openMainTab("events");
      return;
    }

    if (path.startsWith("/profile") || path.startsWith("/dashboard")) {
      setActiveProfilePanel("account");
      openMainTab("profile");
      return;
    }

    if (path.startsWith("/feed")) {
      openMainTab("feed");
    }
  }

  function openBusinessFromPushNotification(
    businessId: string | null | undefined,
    businessSlug: string | null | undefined,
  ) {
    const nextBusiness =
      businessesRef.current.find(
        (business) =>
          business.id === businessId ||
          Boolean(businessSlug && business.slug === businessSlug),
      ) ?? null;

    if (nextBusiness) {
      setBusinessReturnFeedPostId(null);
      setBusinessReturnTab("home");
      setSelectedContentEntry(null);
      setSelectedFeedPostId(null);
      setSelectedBusiness(nextBusiness);
      setIsMessageThreadOpen(false);
      setActiveTab("business");
      return;
    }

    if (businessSlug) {
      setPendingBusinessSlug(businessSlug);
    }
  }

  function getActiveMainTab() {
    if (activeTab === "business") {
      return businessReturnTab;
    }

    if (activeTab === "messages") {
      return messagesReturnTab === "business" ? businessReturnTab : messagesReturnTab;
    }

    return activeTab;
  }

  function openBusinessScreen(business: Business, returnTab = getActiveMainTab()) {
    if (returnTab !== "feed") {
      setBusinessReturnFeedPostId(null);
    }

    setBusinessReturnTab(returnTab);
    setSelectedBusiness(business);
    setActiveTab("business");
  }

  function openBusinessFromDiscoveryPost(business: Business, tileKey: string) {
    setDiscoveryReturnPostKey(tileKey);
    openBusinessScreen(business, "search");
  }

  function getBusinessForFeedPost(post: MobileFeedPost) {
    if (!post.business_id && !post.business?.slug) {
      return null;
    }

    return (
      businesses.find(
        (business) =>
          business.id === post.business_id ||
          Boolean(post.business?.slug && business.slug === post.business.slug),
      ) ?? null
    );
  }

  function openBusinessFromFeedPost(post: MobileFeedPost) {
    const business = getBusinessForFeedPost(post);

    if (!business) {
      return;
    }

    setBusinessReturnFeedPostId(post.id);
    setSelectedFeedPostId(null);
    openBusinessScreen(business, "feed");
  }

  function closeBusinessScreen() {
    if (businessReturnFeedPostId) {
      const postId = businessReturnFeedPostId;

      setBusinessReturnFeedPostId(null);
      setSelectedBusiness(null);
      setActiveTab("feed");
      setSelectedFeedPostId(postId);
      return;
    }

    setSelectedBusiness(null);
    setActiveTab(businessReturnTab);
  }

  function openMessagesInbox(returnTab: ReturnTab = "feed") {
    setIsMessageThreadOpen(false);
    setMessageDraft("");
    setMessagesReturnTab(returnTab);
    setActiveTab("messages");
  }

  function openMessageThread(conversationId: string) {
    setSelectedConversationId(conversationId);
    setIsMessageThreadOpen(true);
  }

  function handleMessagesBack() {
    if (isMessageThreadOpen) {
      setIsMessageThreadOpen(false);
      setMessageDraft("");

      if (messagesReturnTab === "business") {
        setActiveTab("business");
      }

      return;
    }

    setMessageDraft("");
    setActiveTab(messagesReturnTab === "business" ? "business" : messagesReturnTab);
  }

  function openMainTab(tab: MainTab) {
    setDiscoveryReturnPostKey(null);
    setBusinessReturnFeedPostId(null);
    setSelectedFeedPostId(null);
    setSelectedBusiness(null);
    setIsMessageThreadOpen(false);
    setMessageDraft("");
    setActiveTab(tab);
  }

  const canViewContacts = Boolean(session);
  const activeMainTab = getActiveMainTab();

  return (
    <View style={[styles.safeArea, isDarkMode ? styles.darkSafeArea : null]}>
      <StatusBar
        backgroundColor="transparent"
        barStyle={isDarkMode ? "light-content" : "dark-content"}
        translucent
      />
      <View style={styles.appShell}>
        <AnnouncementCenter
          announcements={visibleAnnouncements}
          isDarkMode={isDarkMode}
          labels={labels}
          locale={locale}
          onDismiss={handleDismissAnnouncement}
          onDismissAll={handleDismissAllAnnouncements}
        />
        <Animated.View style={[styles.contentArea, pageTransitionStyle]}>
          {activeTab === "home" ? (
            <HomeScreen
              businesses={businesses}
              feedPosts={feedPosts}
              isDataReady={!isDirectoryLoading && hasResolvedInitialLocation}
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              location={location}
              onBusinessPress={openBusinessScreen}
              onContentPress={handleStandaloneContentPress}
              onFeedPostPress={(post) => setSelectedFeedPostId(post.id)}
              onOpenSearch={() => setActiveTab("search")}
              initialScrollOffset={homeScrollOffset.current}
              onCategoryPress={(categorySlug) => {
                setSelectedCategory(categorySlug);
                setQuery("");
                setActiveTab("search");
              }}
              onScrollOffsetChange={(offset) => {
                homeScrollOffset.current = offset;
              }}
              onShareContent={handleShareContent}
              profile={currentProfile}
              query={query}
              selectedCategory={selectedCategory}
              session={session}
            />
          ) : null}

          {activeTab === "search" ? (
            <SearchScreen
              businesses={businesses}
              canViewContacts={canViewContacts}
              dataMessage={dataMessage}
              isDataReady={!isDirectoryLoading && hasResolvedInitialLocation}
              isDarkMode={isDarkMode}
              isResolvingCurrentLocation={isResolvingCurrentLocation}
              labels={labels}
              locale={locale}
              location={location}
              onClearFilters={() => {
                setQuery("");
                setLocation("");
                setSelectedCategory("all");
                setLocalOnly(false);
              }}
              onUseCurrentLocation={applyCurrentLocation}
              onOpenBusinessFromDiscovery={openBusinessFromDiscoveryPost}
              localOnly={localOnly}
              query={query}
              restoreDiscoveryTileKey={discoveryReturnPostKey}
              results={results}
              selectedCategory={selectedCategory}
              setLocation={setLocation}
              setLocalOnly={setLocalOnly}
              setQuery={setQuery}
              setSelectedBusiness={openBusinessScreen}
              setSelectedCategory={setSelectedCategory}
              onShareContent={handleShareContent}
              onShareBusiness={handleShareBusiness}
              onToggleSavedBusiness={handleToggleSavedBusiness}
              savedBusyBusinessId={savedBusyBusinessId}
              totalCount={totalBusinessesCount}
              onRestoreDiscoveryTile={() => setDiscoveryReturnPostKey(null)}
            />
          ) : null}

          {activeTab === "feed" ? (
            <FeedScreen
              commentDrafts={feedCommentDrafts}
              draft={feedDraft}
              unreadMessageCount={unreadMessageCount}
              isDarkMode={isDarkMode}
              isLoading={isFeedLoading}
              isSubmitting={isFeedSubmitting}
              labels={labels}
              profile={currentProfile}
              onCommentDraftChange={(postId, value) =>
                setFeedCommentDrafts((currentDrafts) => ({
                  ...currentDrafts,
                  [postId]: value,
                }))
              }
              onCreateComment={handleCreateFeedComment}
              onDeleteComment={handleDeleteFeedComment}
              onDeletePost={handleDeleteFeedPost}
              onCreatePost={handleCreateFeedPost}
              onOpenPost={(post) => setSelectedFeedPostId(post.id)}
              onOpenPostBusiness={openBusinessFromFeedPost}
              onOpenMessages={() => {
                openMessagesInbox("feed");
              }}
              onPostAsBusinessChange={setFeedPostAsBusiness}
              onRequireSignIn={() => {
                setActiveProfilePanel("account");
                setActiveTab("profile");
              }}
              onToggleLike={handleToggleFeedLike}
              onUpdateComment={handleUpdateFeedComment}
              onUpdatePost={handleUpdateFeedPost}
              ownedBusiness={feedPostingBusiness}
              postAsBusiness={feedPostAsBusiness}
              posts={feedPosts}
              session={session}
              setDraft={setFeedDraft}
            />
          ) : null}

          {activeTab === "events" ? (
            <EventsScreen
              businesses={businesses}
              canViewContacts={canViewContacts}
              isDataReady={!isDirectoryLoading && hasResolvedInitialLocation}
              isDarkMode={isDarkMode}
              isResolvingCurrentLocation={isResolvingCurrentLocation}
              labels={labels}
              location={location}
              onContentPress={handleStandaloneContentPress}
              onShareContent={handleShareContent}
              onUseCurrentLocation={applyCurrentLocation}
              setLocation={setLocation}
            />
          ) : null}

          {activeTab === "messages" ? (
            <MessagesScreen
              conversations={conversations}
              isDarkMode={isDarkMode}
              isLoading={isMessagesLoading}
              isSending={isMessageSending}
              labels={labels}
              messageDraft={messageDraft}
              messages={conversationMessages}
              isThreadOpen={isMessageThreadOpen}
              onRequireSignIn={() => {
                setActiveProfilePanel("account");
                setActiveTab("profile");
              }}
              onBack={handleMessagesBack}
              onSelectConversation={openMessageThread}
              onSendMessage={handleSendConversationMessage}
              selectedConversation={selectedConversation}
              session={session}
              setMessageDraft={setMessageDraft}
            />
          ) : null}

          {activeTab === "business" && selectedBusiness ? (
            <BusinessScreen
              business={selectedBusiness}
              canViewContacts={canViewContacts}
              isDarkMode={isDarkMode}
              labels={labels}
              locale={locale}
              onBack={closeBusinessScreen}
              onContactPress={handleBusinessContactPress}
              onRequireSignIn={() => {
                setSelectedBusiness(null);
                setActiveProfilePanel("account");
                setActiveTab("profile");
              }}
              onContentPress={handleBusinessModalContentPress}
              onMessageBusiness={handleMessageBusiness}
              onShareBusiness={handleShareBusiness}
              onShareContent={handleShareContent}
              onToggleSavedBusiness={handleToggleSavedBusiness}
              saveBusyBusinessId={savedBusyBusinessId}
              onManage={() => {
                setSelectedBusiness(null);
                setActiveProfilePanel("businessInfo");
                setActiveTab("profile");
              }}
            />
          ) : null}

          {activeTab === "profile" ? (
            <ProfileScreen
              activeProfilePanel={activeProfilePanel}
              authMessage={authMessage}
              business={ownedBusiness}
              contentItems={ownedContentItems}
              isDarkMode={isDarkMode}
              isAppleSignInAvailable={isAppleSignInAvailable}
              isAuthBusy={isAuthBusy}
              isPushNotificationBusy={isPushNotificationBusy}
              isSupabaseConfigured={isSupabaseConfigured}
              labels={labels}
              locale={locale}
              onAppleSignIn={handleAppleSignIn}
              onCreateContent={handleBusinessContentCreate}
              onDeleteAccount={handleDeleteAccount}
              onDeleteContent={handleBusinessContentDelete}
              onEmailSignIn={handleEmailSignIn}
              onEmailSignUp={handleEmailSignUp}
              onBusinessPress={openBusinessScreen}
              onBusinessSave={handleBusinessSave}
              onBusinessSubmit={handleBusinessRegistration}
              onProfileSave={handleProfileSave}
              onShareBusiness={handleShareBusiness}
              onEnablePushNotifications={handleEnablePushNotifications}
              onShowWalkthrough={showWalkthrough}
              onProfilePanelChange={setActiveProfilePanel}
              onToggleSavedBusiness={handleToggleSavedBusiness}
              onUpdateContent={handleBusinessContentUpdate}
              profile={currentProfile}
              pushNotificationStatus={pushNotificationStatus}
              savedBusinesses={savedBusinesses}
              savedBusyBusinessId={savedBusyBusinessId}
              onSignIn={handleGoogleSignIn}
              onSignOut={handleSignOut}
              session={session}
              setIsDarkMode={setIsDarkMode}
            />
          ) : null}
        </Animated.View>

        <View style={[styles.tabBar, isDarkMode ? styles.darkTabBar : null]}>
          <TabButton
            active={activeMainTab === "home"}
            Icon={Home}
            isDarkMode={isDarkMode}
            label={labels.home}
            onPress={() => openMainTab("home")}
          />
          <TabButton
            active={activeMainTab === "search"}
            Icon={Search}
            isDarkMode={isDarkMode}
            label={labels.search}
            onPress={() => openMainTab("search")}
          />
          <TabButton
            active={activeMainTab === "feed"}
            badgeCount={unreadMessageCount}
            Icon={MessageCircle}
            isDarkMode={isDarkMode}
            label={labels.feed}
            onPress={() => openMainTab("feed")}
          />
          <TabButton
            active={activeMainTab === "events"}
            Icon={CalendarDays}
            isDarkMode={isDarkMode}
            label={labels.events}
            onPress={() => openMainTab("events")}
          />
          <TabButton
            active={activeMainTab === "profile"}
            Icon={UserRound}
            isDarkMode={isDarkMode}
            label={labels.profile}
            onPress={() => {
              setActiveProfilePanel("account");
              openMainTab("profile");
            }}
          />
        </View>
      </View>

      <GuidedIntroductionOverlay
        activeStepIndex={walkthroughStepIndex}
        isDarkMode={isDarkMode}
        labels={labels}
        phase={walkthroughPhase}
        onBack={() => {
          if (walkthroughPhase === "focus") {
            setWalkthroughPhase("text");
            return;
          }

          setWalkthroughStepIndex((index) => Math.max(0, index - 1));
        }}
        onClose={completeWalkthrough}
        onNext={() => {
          if (walkthroughPhase === "text") {
            setWalkthroughPhase("focus");
            return;
          }

          if (walkthroughStepIndex >= walkthroughSteps.length - 1) {
            completeWalkthrough();
            return;
          }

          setWalkthroughPhase("text");
          setWalkthroughStepIndex((index) =>
            Math.min(walkthroughSteps.length - 1, index + 1),
          );
        }}
        steps={walkthroughSteps}
        visible={isWalkthroughVisible}
      />
      <FeedPostModal
        commentDraft={
          selectedFeedPost ? feedCommentDrafts[selectedFeedPost.id] ?? "" : ""
        }
        isDarkMode={isDarkMode}
        labels={labels}
        onClose={() => setSelectedFeedPostId(null)}
        onCommentDraftChange={(value) => {
          if (!selectedFeedPost) {
            return;
          }

          setFeedCommentDrafts((currentDrafts) => ({
            ...currentDrafts,
            [selectedFeedPost.id]: value,
          }));
        }}
        onCreateComment={() => {
          if (selectedFeedPost) {
            void handleCreateFeedComment(selectedFeedPost);
          }
        }}
        onDeleteComment={handleDeleteFeedComment}
        onOpenPostBusiness={
          selectedFeedPost?.business_id || selectedFeedPost?.business
            ? () => {
                if (!selectedFeedPost) {
                  return;
                }

            openBusinessFromFeedPost(selectedFeedPost);
              }
            : undefined
        }
        onRequireSignIn={() => {
          setSelectedFeedPostId(null);
          setActiveProfilePanel("account");
          setActiveTab("profile");
        }}
        onUpdateComment={handleUpdateFeedComment}
        post={selectedFeedPost}
        profile={currentProfile}
        session={session}
      />
      <BusinessContentModal
        canViewContacts={canViewContacts}
        entry={selectedContentEntry}
        isDarkMode={isDarkMode}
        labels={labels}
        onContactPress={handleBusinessContactPress}
        onContentContactPress={handleContentContactPress}
        onShareContent={handleShareContent}
        onBusinessPress={(business) => {
          setSelectedContentEntry(null);
          openBusinessScreen(business);
        }}
        onClose={handleContentModalClose}
        onRequireSignIn={() => {
          setSelectedContentEntry(null);
          setSelectedBusiness(null);
          setActiveProfilePanel("account");
          setActiveTab("profile");
        }}
      />
    </View>
  );
}

function KeyboardAwareScreen({
  children,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
}) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      style={styles.flex}
    >
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[
          styles.screenContent,
          styles.keyboardAwareContent,
          contentContainerStyle,
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
  businesses,
  canViewContacts,
  dataMessage,
  isDataReady,
  isDarkMode,
  isResolvingCurrentLocation,
  labels,
  locale,
  location,
  localOnly,
  onClearFilters,
  onOpenBusinessFromDiscovery,
  onRestoreDiscoveryTile,
  onShareBusiness,
  onShareContent,
  onToggleSavedBusiness,
  onUseCurrentLocation,
  query,
  restoreDiscoveryTileKey,
  results,
  savedBusyBusinessId,
  selectedCategory,
  setLocation,
  setLocalOnly,
  setQuery,
  setSelectedBusiness,
  setSelectedCategory,
  totalCount,
}: {
  businesses: Business[];
  canViewContacts: boolean;
  dataMessage: string;
  isDataReady: boolean;
  isDarkMode: boolean;
  isResolvingCurrentLocation: boolean;
  labels: Record<string, string>;
  locale: Locale;
  location: string;
  localOnly: boolean;
  onClearFilters: () => void;
  onOpenBusinessFromDiscovery: (business: Business, tileKey: string) => void;
  onRestoreDiscoveryTile: () => void;
  onShareBusiness: (business: Business) => Promise<void>;
  onShareContent: (entry: ContentDetailEntry) => Promise<void>;
  onToggleSavedBusiness: (business: Business) => void;
  onUseCurrentLocation: (silent?: boolean) => Promise<string | undefined>;
  query: string;
  restoreDiscoveryTileKey: string | null;
  results: Business[];
  savedBusyBusinessId: string | null;
  selectedCategory: string;
  setLocation: (value: string) => void;
  setLocalOnly: (value: boolean) => void;
  setQuery: (value: string) => void;
  setSelectedBusiness: (value: Business) => void;
  setSelectedCategory: (value: string) => void;
  totalCount: number;
}) {
  const [isBusinessSearchOpen, setIsBusinessSearchOpen] = useState(false);
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);
  const [selectedDiscoveryTileIndex, setSelectedDiscoveryTileIndex] =
    useState<number | null>(null);
  const [visibleDiscoveryTileCount, setVisibleDiscoveryTileCount] = useState(
    DISCOVERY_TILE_BATCH_SIZE,
  );
  const [discoveryShuffleSeed, setDiscoveryShuffleSeed] = useState(() =>
    Date.now(),
  );
  const searchInputRef = useRef<TextInput>(null);
  const shouldFocusSearchInput = useRef(false);
  const hasActiveFilters = hasSearchFilters(
    query,
    location,
    selectedCategory,
    localOnly,
  );
  const hasBusinessSearchIntent =
    Boolean(query.trim()) || selectedCategory !== "all" || localOnly;
  const hasSecondaryFilters =
    Boolean(location.trim()) || selectedCategory !== "all" || localOnly;
  const showBusinessSearch = isBusinessSearchOpen || hasBusinessSearchIntent;
  const discoveryTiles = useMemo(
    () => shuffleDiscoveryTiles(getDiscoveryTiles(businesses, labels), discoveryShuffleSeed),
    [businesses, discoveryShuffleSeed, labels],
  );
  const visibleDiscoveryTiles = discoveryTiles.slice(0, visibleDiscoveryTileCount);
  const resultCountLabel =
    !isDataReady
      ? labels.loading
      : hasActiveFilters && totalCount > 0
      ? `${results.length}/${totalCount}`
      : `${results.length}`;
  const loadingText = isResolvingCurrentLocation
    ? labels.detectingLocation
    : labels.loadingBusinesses;

  useEffect(() => {
    if (hasBusinessSearchIntent) {
      setIsBusinessSearchOpen(true);
    }
  }, [hasBusinessSearchIntent]);

  useEffect(() => {
    if (!showBusinessSearch || !shouldFocusSearchInput.current) {
      return;
    }

    const timeout = setTimeout(() => {
      searchInputRef.current?.focus();
      shouldFocusSearchInput.current = false;
    }, 80);

    return () => clearTimeout(timeout);
  }, [showBusinessSearch]);

  useEffect(() => {
    setVisibleDiscoveryTileCount(DISCOVERY_TILE_BATCH_SIZE);
    setSelectedDiscoveryTileIndex(null);
  }, [discoveryTiles.length]);

  useEffect(() => {
    if (!restoreDiscoveryTileKey || !discoveryTiles.length) {
      return;
    }

    const restoredIndex = discoveryTiles.findIndex(
      (tile) => tile.key === restoreDiscoveryTileKey,
    );

    if (restoredIndex < 0) {
      return;
    }

    const nextVisibleCount = Math.min(
      discoveryTiles.length,
      Math.max(
        DISCOVERY_TILE_BATCH_SIZE,
        Math.ceil((restoredIndex + 1) / DISCOVERY_TILE_BATCH_SIZE) *
          DISCOVERY_TILE_BATCH_SIZE,
      ),
    );

    setVisibleDiscoveryTileCount(nextVisibleCount);
    setSelectedDiscoveryTileIndex(restoredIndex);
    onRestoreDiscoveryTile();
  }, [discoveryTiles, onRestoreDiscoveryTile, restoreDiscoveryTileKey]);

  function clearBusinessSearch() {
    onClearFilters();
    setIsBusinessSearchOpen(false);
    setIsFilterPanelOpen(false);
  }

  function loadMoreDiscoveryTiles() {
    setVisibleDiscoveryTileCount((currentCount) =>
      Math.min(discoveryTiles.length, currentCount + DISCOVERY_TILE_BATCH_SIZE),
    );
  }

  function handleDiscoveryScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - (contentOffset.y + layoutMeasurement.height);

    if (distanceFromBottom < 700) {
      loadMoreDiscoveryTiles();
    }
  }

  if (!showBusinessSearch) {
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        style={styles.flex}
      >
        <View
          style={[
            styles.discoveryStickyHeader,
            isDarkMode ? styles.darkSafeArea : null,
          ]}
        >
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              shouldFocusSearchInput.current = true;
              setIsBusinessSearchOpen(true);
            }}
            style={[
              styles.discoverySearchButton,
              isDarkMode ? styles.darkCard : null,
            ]}
          >
            <Search
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={20}
              strokeWidth={2.7}
            />
            <View style={styles.flex}>
              <Text
                numberOfLines={1}
                style={[
                  styles.discoverySearchTitle,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                {labels.searchPlaceholder}
              </Text>
            </View>
          </Pressable>
        </View>

        <ScrollView
          automaticallyAdjustKeyboardInsets
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={[
            styles.screenContent,
            styles.discoveryScrollContent,
          ]}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          onScroll={handleDiscoveryScroll}
          refreshControl={
            <RefreshControl
              onRefresh={() => {
                setDiscoveryShuffleSeed(Date.now());
                setVisibleDiscoveryTileCount(DISCOVERY_TILE_BATCH_SIZE);
                setSelectedDiscoveryTileIndex(null);
              }}
              refreshing={false}
              tintColor={isDarkMode ? "#E5E5EA" : "#111111"}
            />
          }
          scrollEventThrottle={120}
          style={styles.screen}
          showsVerticalScrollIndicator={false}
        >
          {dataMessage ? (
            <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
              {dataMessage}
            </Text>
          ) : null}

          {!isDataReady ? (
            <View style={[styles.loadingCard, isDarkMode ? styles.darkSettingRow : null]}>
              <Text style={[styles.loadingTitle, isDarkMode ? styles.darkText : null]}>
                {loadingText}
              </Text>
              <Text style={[styles.loadingLine, isDarkMode ? styles.darkLoadingLine : null]} />
              <Text style={[styles.loadingLineShort, isDarkMode ? styles.darkLoadingLine : null]} />
            </View>
          ) : visibleDiscoveryTiles.length ? (
            <View style={styles.discoveryGrid}>
              {visibleDiscoveryTiles.map((tile, index) => (
                <DiscoveryTileCard
                  isDarkMode={isDarkMode}
                  key={tile.key}
                  onPress={() => {
                    setSelectedDiscoveryTileIndex(index);
                  }}
                  tile={tile}
                />
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
              {labels.feedEmpty}
            </Text>
          )}
        </ScrollView>
        <DiscoveryPostViewer
          initialIndex={selectedDiscoveryTileIndex ?? 0}
          isDarkMode={isDarkMode}
          labels={labels}
          onBusinessPress={onOpenBusinessFromDiscovery}
          onClose={() => setSelectedDiscoveryTileIndex(null)}
          onEndReached={loadMoreDiscoveryTiles}
          onShareContent={onShareContent}
          tiles={visibleDiscoveryTiles}
          visible={selectedDiscoveryTileIndex !== null}
        />
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={[
        styles.screenContent,
        styles.searchScreenContent,
      ]}
      keyboardDismissMode="interactive"
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.searchModeHeader}>
        <Text style={[styles.searchModeTitle, isDarkMode ? styles.darkText : null]}>
          {labels.businessSearch}
        </Text>
        <Pressable
          accessibilityLabel={labels.close}
          accessibilityRole="button"
          onPress={clearBusinessSearch}
          style={[
            styles.modalCloseButton,
            isDarkMode ? styles.darkSettingRow : null,
          ]}
        >
          <X
            color={isDarkMode ? "#E5E5EA" : "#111111"}
            size={19}
            strokeWidth={2.7}
          />
        </Pressable>
      </View>

      <View style={styles.searchCompactPanel}>
        <View style={[styles.searchKeywordRow, isDarkMode ? styles.darkInput : null]}>
          <Search
            color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
            size={19}
            strokeWidth={2.7}
          />
          <TextInput
            autoCapitalize="none"
            onChangeText={setQuery}
            placeholder={labels.searchPlaceholder}
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            ref={searchInputRef}
            style={[
              styles.searchKeywordInput,
              isDarkMode ? styles.darkText : null,
            ]}
            value={query}
          />
          {query.trim() ? (
            <Pressable
              accessibilityLabel={labels.close}
              accessibilityRole="button"
              onPress={() => setQuery("")}
              style={styles.searchInlineIconButton}
            >
              <X
                color={isDarkMode ? "#A1A1A6" : "#6E6E73"}
                size={17}
                strokeWidth={2.7}
              />
            </Pressable>
          ) : null}
          <Pressable
            accessibilityLabel={labels.settings}
            accessibilityRole="button"
            onPress={() => setIsFilterPanelOpen((current) => !current)}
            style={[
              styles.searchFilterIconButton,
              isDarkMode ? styles.darkIconBox : null,
              hasSecondaryFilters ? styles.searchFilterIconButtonActive : null,
              hasSecondaryFilters && isDarkMode
                ? styles.darkSearchFilterIconButtonActive
                : null,
            ]}
          >
            <SlidersHorizontal
              color={
                hasSecondaryFilters
                  ? isDarkMode
                    ? "#111111"
                    : "#FFFFFF"
                  : isDarkMode
                    ? "#E5E5EA"
                    : "#111111"
              }
              size={18}
              strokeWidth={2.8}
            />
          </Pressable>
        </View>

        {isFilterPanelOpen ? (
          <View style={[styles.searchFilterPanel, isDarkMode ? styles.darkCard : null]}>
            <Field isDarkMode={isDarkMode} label={labels.location}>
              <LocationPicker
                allowAll
                isDarkMode={isDarkMode}
                isResolvingCurrentLocation={isResolvingCurrentLocation}
                labels={labels}
                onChange={setLocation}
                onUseCurrentLocation={onUseCurrentLocation}
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
            <View style={[styles.localOnlyRow, isDarkMode ? styles.darkSettingRow : null]}>
              <Text style={[styles.localOnlyTitle, isDarkMode ? styles.darkText : null]}>
                {labels.localOnly}
              </Text>
              <Switch
                onValueChange={setLocalOnly}
                thumbColor={localOnly ? "#FFFFFF" : "#111111"}
                trackColor={{ false: "#E5E5EA", true: "#111111" }}
                value={localOnly}
              />
            </View>
          </View>
        ) : null}
      </View>

      {hasBusinessSearchIntent ? (
        <View style={styles.resultsHeader}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.find}
          </Text>
          <View style={styles.resultsHeaderActions}>
            <Pressable
              accessibilityRole="button"
              onPress={clearBusinessSearch}
              style={[
                styles.clearFiltersButton,
                isDarkMode ? styles.darkSettingRow : null,
              ]}
            >
              <X
                color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                size={15}
                strokeWidth={2.7}
              />
              <Text
                style={[
                  styles.clearFiltersButtonText,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                {labels.discover}
              </Text>
            </Pressable>
            <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
              {resultCountLabel}
            </Text>
          </View>
        </View>
      ) : null}

      {dataMessage ? (
        <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
          {dataMessage}
        </Text>
      ) : null}

      {!hasBusinessSearchIntent ? (
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Search
            color={isDarkMode ? "#E5E5EA" : "#111111"}
            size={26}
            strokeWidth={2.7}
          />
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.searchBusinesses}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.searchStartHint}
          </Text>
        </View>
      ) : !isDataReady ? (
        <View style={[styles.loadingCard, isDarkMode ? styles.darkSettingRow : null]}>
          <Text style={[styles.loadingTitle, isDarkMode ? styles.darkText : null]}>
            {loadingText}
          </Text>
          <Text style={[styles.loadingLine, isDarkMode ? styles.darkLoadingLine : null]} />
          <Text style={[styles.loadingLineShort, isDarkMode ? styles.darkLoadingLine : null]} />
        </View>
      ) : results.length > 0 ? (
        results.map((business) => (
          <BusinessCard
            business={business}
            canViewContacts={canViewContacts}
            isDarkMode={isDarkMode}
            key={business.id}
            labels={labels}
            locale={locale}
            onPress={() => setSelectedBusiness(business)}
            onShare={() => {
              void onShareBusiness(business);
            }}
            onToggleSaved={() => onToggleSavedBusiness(business)}
            saveBusy={savedBusyBusinessId === business.id}
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

function DiscoveryTileCard({
  isDarkMode,
  onPress,
  tile,
}: {
  isDarkMode: boolean;
  onPress: () => void;
  tile: DiscoveryTile;
}) {
  const hasImage = Boolean(tile.imageUrl);

  return (
    <Pressable
      accessibilityLabel={tile.title}
      accessibilityRole="button"
      onPress={onPress}
      style={[
        styles.discoveryTile,
        isDarkMode ? styles.darkCard : null,
      ]}
    >
      {hasImage ? (
        <Image
          resizeMode="cover"
          source={{ uri: tile.imageUrl }}
          style={styles.discoveryTileImage}
        />
      ) : null}
    </Pressable>
  );
}

function DiscoveryPostViewer({
  initialIndex,
  isDarkMode,
  labels,
  onBusinessPress,
  onClose,
  onEndReached,
  onShareContent,
  tiles,
  visible,
}: {
  initialIndex: number;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onBusinessPress: (business: Business, tileKey: string) => void;
  onClose: () => void;
  onEndReached: () => void;
  onShareContent: (entry: ContentDetailEntry) => Promise<void>;
  tiles: DiscoveryTile[];
  visible: boolean;
}) {
  const [isCaptionScrollActive, setIsCaptionScrollActive] = useState(false);
  const [scrollHintIndex, setScrollHintIndex] = useState<number | null>(null);
  const wasVisibleRef = useRef(false);
  const safeInitialIndex = Math.max(0, Math.min(initialIndex, tiles.length - 1));
  const horizontalCloseResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gestureState) =>
          Math.abs(gestureState.dx) > 26 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.35,
        onPanResponderRelease: (_, gestureState) => {
          if (
            Math.abs(gestureState.dx) > 82 &&
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.2
          ) {
            onClose();
          }
        },
      }),
    [onClose],
  );

  useEffect(() => {
    if (!visible) {
      setIsCaptionScrollActive(false);
    }
  }, [visible]);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setScrollHintIndex(safeInitialIndex < tiles.length - 1 ? safeInitialIndex : null);
    }

    if (!visible) {
      setScrollHintIndex(null);
    }

    wasVisibleRef.current = visible;
  }, [safeInitialIndex, tiles.length, visible]);

  if (!visible || !tiles.length) {
    return null;
  }

  return (
    <View
      {...horizontalCloseResponder.panHandlers}
      style={[
        styles.discoveryViewerShell,
        isDarkMode ? styles.darkSafeArea : null,
      ]}
    >
      <FlatList
        data={tiles}
        decelerationRate="fast"
        getItemLayout={(_, index) => ({
          index,
          length: DISCOVERY_VIEWER_HEIGHT,
          offset: DISCOVERY_VIEWER_HEIGHT * index,
        })}
        initialScrollIndex={safeInitialIndex}
        keyExtractor={(tile) => tile.key}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.65}
        onScrollBeginDrag={() => {
          setScrollHintIndex(null);
        }}
        pagingEnabled
        renderItem={({ index, item }) => (
          <DiscoveryViewerPost
            isDarkMode={isDarkMode}
            labels={labels}
            onBusinessPress={() => onBusinessPress(item.business, item.key)}
            onClose={onClose}
            onCaptionScrollActiveChange={setIsCaptionScrollActive}
            onShare={() => {
              void onShareContent({
                business: item.business,
                item: item.item,
              });
            }}
            showScrollHint={index === scrollHintIndex}
            tile={item}
          />
        )}
        scrollEnabled={!isCaptionScrollActive}
        showsVerticalScrollIndicator={false}
        snapToAlignment="start"
      />
    </View>
  );
}

function DiscoveryViewerPost({
  isDarkMode,
  labels,
  onBusinessPress,
  onCaptionScrollActiveChange,
  onClose,
  onShare,
  showScrollHint,
  tile,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
  onBusinessPress: () => void;
  onCaptionScrollActiveChange: (isActive: boolean) => void;
  onClose: () => void;
  onShare: () => void;
  showScrollHint: boolean;
  tile: DiscoveryTile;
}) {
  const [hasLogoError, setHasLogoError] = useState(false);
  const [isCaptionExpanded, setIsCaptionExpanded] = useState(false);
  const [descriptionLineCount, setDescriptionLineCount] = useState(0);
  const scrollHintAnimation = useRef(new Animated.Value(0)).current;
  const logoUrl = getRenderableImageUrl(
    tile.business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const shouldShowLogo = Boolean(logoUrl) && !hasLogoError;
  const description = tile.item.description.trim();
  const viewerImageUrl =
    getContentImageUrls(tile.item, imageOptimizationPresets.detail)[0] ||
    tile.imageUrl;
  const metaItems = [
    tile.item.type === "product"
      ? tile.item.isAvailable
        ? labels.available
        : labels.outOfStock
      : undefined,
    tile.item.isFree ? labels.free : formatPriceWithCurrency(tile.item.price),
    tile.item.isOnline ? labels.online : undefined,
    tile.item.startsAt ? formatContentDate(tile.item.startsAt) : undefined,
    tile.item.location,
  ].filter((value): value is string => Boolean(value));
  const contentLinkUrl = tile.item.linkUrl
    ? getWebsiteUrl(tile.item.linkUrl)
    : null;
  const locationUrl = getAddressUrl(tile.item.location, tile.business.city);
  const likelyLongDescription = description.length > 140;
  const hasLongDescription = likelyLongDescription || descriptionLineCount > 2;
  const hasExtraDetails =
    metaItems.length > 2 || Boolean(tile.item.linkUrl && contentLinkUrl && metaItems.length >= 2);
  const canExpandCaption = hasLongDescription || hasExtraDetails;
  const isCaptionOpen = isCaptionExpanded && canExpandCaption;
  const visibleMetaItems = isCaptionOpen
    ? metaItems
    : canExpandCaption
      ? metaItems.slice(0, 2)
      : metaItems;
  const hiddenMetaCount =
    canExpandCaption && !isCaptionOpen
      ? metaItems.length - visibleMetaItems.length
      : 0;
  const shouldShowLink =
    Boolean(tile.item.linkUrl && contentLinkUrl) &&
    (isCaptionOpen || visibleMetaItems.length < 2 || !canExpandCaption);

  useEffect(() => {
    if (!showScrollHint || isCaptionOpen) {
      scrollHintAnimation.stopAnimation();
      scrollHintAnimation.setValue(0);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(scrollHintAnimation, {
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.timing(scrollHintAnimation, {
          duration: 620,
          easing: Easing.inOut(Easing.cubic),
          toValue: 0,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();

    return () => {
      animation.stop();
      scrollHintAnimation.setValue(0);
    };
  }, [isCaptionOpen, scrollHintAnimation, showScrollHint]);

  function toggleCaption() {
    if (!canExpandCaption) {
      return;
    }

    setIsCaptionExpanded((current) => {
      const next = !current;

      if (!next) {
        onCaptionScrollActiveChange(false);
      }

      return next;
    });
  }

  function setCaptionTextScrollActive(isActive: boolean) {
    if (isCaptionOpen) {
      onCaptionScrollActiveChange(isActive);
    }
  }

  function renderCaptionDetails(isCompact = false) {
    return (
      <>
        {description ? (
          <Text
            numberOfLines={
              hasLongDescription && !isCaptionOpen ? 2 : undefined
            }
            onTextLayout={(event) => {
              const nextLineCount = event.nativeEvent.lines.length;
              setDescriptionLineCount((currentLineCount) =>
                Math.max(currentLineCount, nextLineCount),
              );
            }}
            style={[
              styles.discoveryViewerText,
              isDarkMode ? styles.darkMutedText : null,
            ]}
          >
            {description}
          </Text>
        ) : null}
        {showScrollHint && isCompact ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.discoveryViewerScrollHint,
              {
                opacity: scrollHintAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.62, 1],
                }),
                transform: [
                  {
                    translateY: scrollHintAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, 7],
                    }),
                  },
                ],
              },
            ]}
          >
            <ChevronDown
              color={isDarkMode ? "#F5F5F7" : "#111111"}
              size={20}
              strokeWidth={3}
            />
          </Animated.View>
        ) : null}
        {!isCompact && metaItems.length ? (
          <View style={styles.discoveryViewerMetaRow}>
            {visibleMetaItems.map((meta, index) => {
              const isLocation = meta === tile.item.location && locationUrl;

              if (isLocation) {
                return (
                  <Pressable
                    accessibilityRole="link"
                    key={`${meta}-${index}`}
                    onPress={() => {
                      void openContactUrl(isLocation);
                    }}
                    style={[
                      styles.discoveryViewerMetaChip,
                      isDarkMode ? styles.darkBadge : null,
                    ]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.discoveryViewerMetaText,
                        isDarkMode ? styles.darkText : null,
                      ]}
                    >
                      {meta}
                    </Text>
                  </Pressable>
                );
              }

              return (
                <Text
                  key={`${meta}-${index}`}
                  numberOfLines={1}
                  style={[
                    styles.discoveryViewerMetaChip,
                    styles.discoveryViewerMetaText,
                    isDarkMode ? styles.darkBadge : null,
                    isDarkMode ? styles.darkText : null,
                  ]}
                >
                  {meta}
                </Text>
              );
            })}
            {hiddenMetaCount > 0 ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.discoveryViewerMetaChip,
                  styles.discoveryViewerMetaText,
                  isDarkMode ? styles.darkBadge : null,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                +{hiddenMetaCount}
              </Text>
            ) : null}
          </View>
        ) : null}
        {!isCompact && shouldShowLink && contentLinkUrl ? (
          <Pressable
            accessibilityRole="link"
            onPress={(event) => {
              event.stopPropagation();
              void openContactUrl(contentLinkUrl);
            }}
            style={[
              styles.discoveryViewerLink,
              isDarkMode ? styles.darkIconBox : null,
            ]}
          >
            <ExternalLink
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={15}
              strokeWidth={2.6}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.discoveryViewerLinkText,
                isDarkMode ? styles.darkText : null,
              ]}
            >
              {tile.item.linkUrl}
            </Text>
          </Pressable>
        ) : null}
      </>
    );
  }

  return (
    <View style={styles.discoveryViewerPage}>
      <View style={styles.discoveryViewerHeader}>
        <Pressable
          accessibilityLabel={tile.business.name}
          accessibilityRole="button"
          onPress={onBusinessPress}
          style={styles.discoveryViewerBusinessButton}
        >
          {shouldShowLogo ? (
            <Image
              onError={() => setHasLogoError(true)}
              resizeMode="cover"
              source={{ uri: logoUrl as string }}
              style={[
                styles.discoveryViewerLogo,
                isDarkMode ? styles.darkContentImageSurface : null,
              ]}
            />
          ) : null}
          <View style={styles.discoveryViewerBusinessNameBox}>
            <Text
              numberOfLines={1}
              style={[
                styles.discoveryViewerBusinessName,
                isDarkMode ? styles.darkText : null,
              ]}
            >
              {tile.business.name}
            </Text>
          </View>
          <Text style={[styles.discoveryViewerKindPill, isDarkMode ? styles.darkBadge : null]}>
            {tile.subtitle}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel={labels.shareBusiness}
          accessibilityRole="button"
          onPress={onShare}
          style={[
            styles.discoveryViewerCloseButton,
            isDarkMode ? styles.darkFloatingControl : null,
          ]}
        >
          <Share2
            color={isDarkMode ? "#F5F5F7" : "#111111"}
            size={18}
            strokeWidth={2.7}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={labels.close}
          accessibilityRole="button"
          onPress={onClose}
          style={[
            styles.discoveryViewerCloseButton,
            isDarkMode ? styles.darkFloatingControl : null,
          ]}
        >
          <X
            color={isDarkMode ? "#F5F5F7" : "#111111"}
            size={19}
            strokeWidth={2.8}
          />
        </Pressable>
      </View>

      <View style={styles.discoveryViewerImageFrame}>
        <Image
          resizeMode="cover"
          source={{ uri: viewerImageUrl }}
          style={styles.discoveryViewerImage}
        />
      </View>

      <View
        style={[
          styles.discoveryViewerCaption,
          showScrollHint && !isCaptionOpen
            ? styles.discoveryViewerCaptionWithHint
            : null,
          isCaptionOpen ? styles.discoveryViewerCaptionExpanded : null,
          isCaptionOpen && isDarkMode
            ? styles.darkDiscoveryViewerCaptionExpanded
            : null,
        ]}
      >
        <Pressable
          accessibilityLabel={tile.title}
          accessibilityRole={canExpandCaption ? "button" : undefined}
          onPress={canExpandCaption ? toggleCaption : undefined}
          style={styles.discoveryViewerTitleRow}
        >
          <Text
            numberOfLines={isCaptionOpen ? 3 : 1}
            style={[
              styles.discoveryViewerTitle,
              isDarkMode ? styles.darkText : null,
            ]}
          >
            {tile.title}
          </Text>
          {canExpandCaption ? (
            <View
              style={[
                styles.discoveryViewerCaptionToggle,
                isDarkMode ? styles.darkIconBox : null,
              ]}
            >
              {isCaptionOpen ? (
                <ChevronUp
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={15}
                  strokeWidth={3}
                />
              ) : (
                <ChevronDown
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={15}
                  strokeWidth={3}
                />
              )}
            </View>
          ) : null}
        </Pressable>

        {isCaptionOpen ? (
          <ScrollView
            contentContainerStyle={styles.discoveryViewerCaptionScrollContent}
            nestedScrollEnabled
            onMomentumScrollEnd={() => setCaptionTextScrollActive(false)}
            onScrollBeginDrag={() => setCaptionTextScrollActive(true)}
            onScrollEndDrag={() => setCaptionTextScrollActive(false)}
            onTouchCancel={() => setCaptionTextScrollActive(false)}
            onTouchEnd={() => setCaptionTextScrollActive(false)}
            onTouchStart={() => setCaptionTextScrollActive(true)}
            scrollEnabled
            showsVerticalScrollIndicator
            style={styles.discoveryViewerCaptionScroll}
          >
            {renderCaptionDetails(false)}
          </ScrollView>
        ) : (
          <Pressable
            accessibilityRole={canExpandCaption ? "button" : undefined}
            onPress={canExpandCaption ? toggleCaption : undefined}
            style={styles.discoveryViewerCaptionScrollContent}
          >
            {renderCaptionDetails(true)}
          </Pressable>
        )}
      </View>
    </View>
  );
}

function OfficialKoloEventCard({
  isDarkMode,
  labels,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const highlights = labels.summerPartyHighlights
    .split("|")
    .filter(Boolean);

  if (!isKoloSummerPartyVisible()) {
    return null;
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={() => setIsOpen(true)}
        style={[
          styles.contentItemCard,
          styles.eventContentCard,
          styles.officialEventCard,
          isDarkMode ? styles.darkSettingRow : null,
          isDarkMode ? styles.darkEventContentCard : null,
        ]}
      >
        <View
          style={[
            styles.contentItemImage,
            styles.eventContentImage,
            styles.officialEventImageFrame,
          ]}
        >
          <Image
            accessibilityLabel={labels.summerPartyTitle}
            resizeMode="cover"
            source={KOLO_SUMMER_PARTY_IMAGE}
            style={styles.officialEventImage}
          />
        </View>
        <View
          style={[
            styles.contentItemBody,
            styles.eventContentBody,
            styles.officialEventBody,
            isDarkMode ? styles.darkContentItemBody : null,
          ]}
        >
          <View style={styles.officialEventHeader}>
            <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
              {labels.officialEvent}
            </Text>
            {labels.summerPartyHost ? (
              <Text
                numberOfLines={1}
                style={[styles.officialEventHost, isDarkMode ? styles.darkMutedText : null]}
              >
                {labels.summerPartyHost}
              </Text>
            ) : null}
          </View>
          <Text style={[styles.officialEventTitle, isDarkMode ? styles.darkText : null]}>
            {labels.summerPartyTitle}
          </Text>
          <Text style={[styles.officialEventSummary, isDarkMode ? styles.darkMutedText : null]}>
            {labels.summerPartySummary}
          </Text>
          <View style={styles.officialEventMetaList}>
            <View style={styles.officialEventMetaRow}>
              <CalendarDays
                color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                size={16}
                strokeWidth={2.5}
              />
              <Text style={[styles.officialEventMetaText, isDarkMode ? styles.darkText : null]}>
                {labels.summerPartyDate}
              </Text>
            </View>
            <View style={styles.officialEventMetaRow}>
              <MapPin
                color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                size={16}
                strokeWidth={2.5}
              />
              <Text style={[styles.officialEventMetaText, isDarkMode ? styles.darkText : null]}>
                {labels.summerPartyLocation}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        presentationStyle="overFullScreen"
        statusBarTranslucent
        transparent
        visible={isOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.modalDismissLayer}
          />
          <View style={[styles.modalSheet, isDarkMode ? styles.darkModalSheet : null]}>
            <ScrollView
              bounces
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <View style={styles.modalHeader}>
                <View style={styles.flex}>
                  <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                    {labels.summerPartyTitle}
                  </Text>
                  {labels.summerPartyHost ? (
                    <Text style={[styles.officialEventHost, isDarkMode ? styles.darkMutedText : null]}>
                      {labels.summerPartyHost}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  accessibilityLabel={labels.close}
                  accessibilityRole="button"
                  onPress={() => setIsOpen(false)}
                  style={[styles.modalCloseButton, isDarkMode ? styles.darkSettingRow : null]}
                >
                  <X
                    color={isDarkMode ? "#E5E5EA" : "#111111"}
                    size={19}
                    strokeWidth={2.7}
                  />
                </Pressable>
              </View>

              <View style={styles.officialEventDetailImageFrame}>
                <Image
                  accessibilityLabel={labels.summerPartyTitle}
                  resizeMode="cover"
                  source={KOLO_SUMMER_PARTY_IMAGE}
                  style={styles.officialEventDetailImage}
                />
              </View>

              <View style={styles.contentDetailPillRow}>
                <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
                  {labels.officialEvent}
                </Text>
                <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
                  {labels.summerPartyDate}
                </Text>
              </View>

              <View style={styles.officialEventMetaList}>
                <View style={styles.officialEventMetaRow}>
                  <CalendarDays
                    color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                    size={17}
                    strokeWidth={2.5}
                  />
                  <Text style={[styles.officialEventMetaText, isDarkMode ? styles.darkText : null]}>
                    {labels.summerPartyDate}
                  </Text>
                </View>
                <View style={styles.officialEventMetaRow}>
                  <MapPin
                    color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                    size={17}
                    strokeWidth={2.5}
                  />
                  <Text style={[styles.officialEventMetaText, isDarkMode ? styles.darkText : null]}>
                    {labels.summerPartyLocation}
                  </Text>
                </View>
              </View>

              <View style={styles.officialEventModalSection}>
                <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
                  {labels.summerPartyOverviewTitle}
                </Text>
                <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                  {labels.summerPartyOverview}
                </Text>
                <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                  {labels.summerPartyOverviewMore}
                </Text>
              </View>

              <View style={styles.officialEventHighlightGrid}>
                {highlights.map((highlight) => (
                  <View
                    key={highlight}
                    style={[
                      styles.officialEventHighlightPill,
                      isDarkMode ? styles.darkSettingRow : null,
                    ]}
                  >
                    <Sparkles
                      color={isDarkMode ? "#E5E5EA" : "#111111"}
                      size={15}
                      strokeWidth={2.6}
                    />
                    <Text
                      style={[
                        styles.officialEventHighlightText,
                        isDarkMode ? styles.darkText : null,
                      ]}
                    >
                      {highlight}
                    </Text>
                  </View>
                ))}
              </View>

              <View style={[styles.contactCard, isDarkMode ? styles.darkSettingRow : null]}>
                <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                  {labels.summerPartySafety}
                </Text>
                <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                  {labels.summerPartyContest}
                </Text>
              </View>

              <View style={styles.officialEventActions}>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openContactUrl(KOLO_SUMMER_PARTY_EVENTBRITE_URL);
                  }}
                  style={styles.officialEventPrimaryButton}
                >
                  <CalendarDays color="#FFFFFF" size={16} strokeWidth={2.7} />
                  <Text style={styles.officialEventPrimaryButtonText}>
                    {labels.summerPartyEventbrite}
                  </Text>
                </Pressable>
                <Pressable
                  accessibilityRole="link"
                  onPress={() => {
                    void openContactUrl(KOLO_SUMMER_PARTY_MAP_URL);
                  }}
                  style={[
                    styles.officialEventSecondaryButton,
                    isDarkMode ? styles.darkSecondaryButton : null,
                  ]}
                >
                  <MapPin
                    color={isDarkMode ? "#F5F5F7" : "#111111"}
                    size={16}
                    strokeWidth={2.7}
                  />
                  <Text
                    style={[
                      styles.officialEventSecondaryButtonText,
                      isDarkMode ? styles.darkSecondaryButtonText : null,
                    ]}
                  >
                    {labels.summerPartyMaps}
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

function EventsScreen({
  businesses,
  canViewContacts,
  isDataReady,
  isDarkMode,
  isResolvingCurrentLocation,
  labels,
  location,
  onContentPress,
  onShareContent,
  onUseCurrentLocation,
  setLocation,
}: {
  businesses: Business[];
  canViewContacts: boolean;
  isDataReady: boolean;
  isDarkMode: boolean;
  isResolvingCurrentLocation: boolean;
  labels: Record<string, string>;
  location: string;
  onContentPress: (entry: ContentDetailEntry) => void;
  onShareContent: (entry: ContentDetailEntry) => Promise<void>;
  onUseCurrentLocation: (silent?: boolean) => Promise<string | undefined>;
  setLocation: (value: string) => void;
}) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [eventLocalOnly, setEventLocalOnly] = useState(true);
  const selectedLocation = location.trim();

  if (!isDataReady) {
    return (
      <KeyboardAwareScreen>
        <View style={styles.eventsHeader}>
          <Text style={[styles.searchModeTitle, isDarkMode ? styles.darkText : null]}>
            {labels.eventsNearYou}
          </Text>
        </View>
        <View style={[styles.loadingCard, isDarkMode ? styles.darkSettingRow : null]}>
          <Text style={[styles.loadingTitle, isDarkMode ? styles.darkText : null]}>
            {isResolvingCurrentLocation
              ? labels.detectingLocation
              : labels.loadingBusinesses}
          </Text>
          <Text style={[styles.loadingLine, isDarkMode ? styles.darkLoadingLine : null]} />
          <Text style={[styles.loadingLineShort, isDarkMode ? styles.darkLoadingLine : null]} />
        </View>
      </KeyboardAwareScreen>
    );
  }

  const eventEntries = getUniqueBusinessesById(businesses)
    .flatMap((business) =>
      (business.contentItems ?? [])
        .filter((item) => item.type === "event")
        .map((item) => ({ business, item })),
    )
    .filter(
      ({ item }, index, allItems) =>
        allItems.findIndex(({ item: otherItem }) => otherItem.id === item.id) ===
        index,
    )
    .filter(({ business, item }) => {
      const matchesOnline =
        !eventLocalOnly || (!item.isOnline && !business.servesAllCanada);

      if (!matchesOnline) {
        return false;
      }

      if (!selectedLocation) {
        return true;
      }

      const eventLocation = item.location ?? "";

      return (
        (!eventLocalOnly && (item.isOnline || business.servesAllCanada)) ||
        isNearLocation(business.city, selectedLocation) ||
        (eventLocation ? isNearLocation(eventLocation, selectedLocation) : false) ||
        (eventLocation
          ? normalize(eventLocation).includes(normalize(selectedLocation))
          : false)
      );
    })
    .sort(
      (first, second) =>
        getContentTimestamp(second.item) - getContentTimestamp(first.item),
    );
  const officialEventCount = isKoloSummerPartyVisible() ? 1 : 0;

  return (
    <KeyboardAwareScreen>
      <View style={styles.eventsHeader}>
        <Text style={[styles.searchModeTitle, isDarkMode ? styles.darkText : null]}>
          {labels.eventsNearYou}
        </Text>
        <Pressable
          accessibilityLabel={labels.settings}
          accessibilityRole="button"
          onPress={() => setIsSettingsOpen(true)}
          style={[styles.eventsSettingsButton, isDarkMode ? styles.darkIconBox : null]}
        >
          <SlidersHorizontal
            color={isDarkMode ? "#E5E5EA" : "#111111"}
            size={18}
            strokeWidth={2.8}
          />
        </Pressable>
      </View>

      <OfficialKoloEventCard isDarkMode={isDarkMode} labels={labels} />

      <View style={styles.resultsHeader}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {selectedLocation || labels.allCanada}
        </Text>
        <Text style={[styles.resultCount, isDarkMode ? styles.darkBadge : null]}>
          {eventEntries.length + officialEventCount}
        </Text>
      </View>

      {eventEntries.length ? (
        eventEntries.map(({ business, item }) => (
          <PublicContentCard
            business={business}
            canViewContacts={canViewContacts}
            isDarkMode={isDarkMode}
            item={item}
            key={item.id}
            labels={labels}
            onPress={() => onContentPress({ business, item })}
            onShare={() => {
              void onShareContent({ business, item });
            }}
            presentation="event"
            showBusinessName
          />
        ))
      ) : officialEventCount === 0 ? (
        <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
          {labels.noContentItems}
        </Text>
      ) : null}
      <Modal
        animationType="slide"
        onRequestClose={() => setIsSettingsOpen(false)}
        transparent
        visible={isSettingsOpen}
      >
        <Pressable
          accessibilityRole="button"
          onPress={() => setIsSettingsOpen(false)}
          style={styles.pickerBackdrop}
        >
          <Pressable
            onPress={(event) => event.stopPropagation()}
            style={[styles.eventSettingsSheet, isDarkMode ? styles.darkPickerSheet : null]}
          >
            <View style={styles.eventSettingsHeader}>
              <Text style={[styles.pickerTitle, isDarkMode ? styles.darkText : null]}>
                {labels.settings}
              </Text>
              <Pressable
                accessibilityLabel={labels.close}
                accessibilityRole="button"
                onPress={() => setIsSettingsOpen(false)}
                style={[styles.modalCloseButton, isDarkMode ? styles.darkSettingRow : null]}
              >
                <X
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={19}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>
            <View style={styles.eventSettingsBody}>
              <Field isDarkMode={isDarkMode} label={labels.location}>
                <LocationPicker
                  allowAll
                  isDarkMode={isDarkMode}
                  isResolvingCurrentLocation={isResolvingCurrentLocation}
                  labels={labels}
                  onChange={setLocation}
                  onUseCurrentLocation={onUseCurrentLocation}
                  placeholder={labels.city}
                  showMyLocation
                  value={location}
                />
              </Field>
              <View style={[styles.localOnlyRow, isDarkMode ? styles.darkSettingRow : null]}>
                <Text style={[styles.localOnlyTitle, isDarkMode ? styles.darkText : null]}>
                  {labels.localOnly}
                </Text>
                <Switch
                  onValueChange={setEventLocalOnly}
                  thumbColor={eventLocalOnly ? "#FFFFFF" : "#111111"}
                  trackColor={{ false: "#E5E5EA", true: "#111111" }}
                  value={eventLocalOnly}
                />
              </View>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </KeyboardAwareScreen>
  );
}

function HomeScreen({
  businesses,
  feedPosts,
  initialScrollOffset,
  isDataReady,
  isDarkMode,
  labels,
  locale,
  location,
  onBusinessPress,
  onContentPress,
  onFeedPostPress,
  onOpenSearch,
  onCategoryPress,
  onScrollOffsetChange,
  onShareContent,
  profile,
  query,
  selectedCategory,
  session,
}: {
  businesses: Business[];
  feedPosts: MobileFeedPost[];
  initialScrollOffset: number;
  isDataReady: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  location: string;
  onBusinessPress: (business: Business) => void;
  onContentPress: (entry: ContentDetailEntry) => void;
  onFeedPostPress: (post: MobileFeedPost) => void;
  onOpenSearch: () => void;
  onCategoryPress: (categorySlug: string) => void;
  onScrollOffsetChange: (offset: number) => void;
  onShareContent: (entry: ContentDetailEntry) => Promise<void>;
  profile: UserProfile | null;
  query: string;
  selectedCategory: string;
  session: Session | null;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const homeCopy = getHomeCopy(locale);

  useEffect(() => {
    if (initialScrollOffset <= 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ animated: false, y: initialScrollOffset });
    });

    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset]);

  if (!isDataReady) {
    return (
      <HomeLoadingScreen
        isDarkMode={isDarkMode}
        labels={labels}
        locale={locale}
      />
    );
  }

  const uniqueBusinesses = getUniqueBusinessesById(businesses);
  const effectiveQuery = getEffectiveSearchQuery(query);
  const selectedCategorySlug =
    selectedCategory === "all" ? "" : normalizeCategorySlug(selectedCategory);
  const categoryCards = getHomeCategoryCards({
    businesses: uniqueBusinesses,
    followedBusinesses: uniqueBusinesses.filter((business) => business.isSaved),
    locale,
    location,
    query: effectiveQuery,
    selectedCategorySlug,
  }).slice(0, 12);
  const preferredCategorySlugs = categoryCards.map(({ category }) => category.slug);
  const locationTrimmed = location.trim();
  const locationAwareBusinesses = uniqueBusinesses.filter(
    (business) =>
      !locationTrimmed ||
      business.servesAllCanada ||
      isNearLocation(business.city, locationTrimmed),
  );
  const newNearbyBusinesses = sortHomeBusinessesByFreshness(
    rankBusinesses(
      locationAwareBusinesses.length ? locationAwareBusinesses : uniqueBusinesses,
      {
        categorySlug: selectedCategorySlug || undefined,
        location,
        query: effectiveQuery,
      },
    ),
  ).slice(0, 10);
  const newNearbyKeys = new Set(
    newNearbyBusinesses.map((business) => getBusinessDedupeKey(business)),
  );
  const followedBusinesses = uniqueBusinesses.filter((business) => business.isSaved);
  const followedBusinessKeys = new Set(
    followedBusinesses.map((business) => getBusinessDedupeKey(business)),
  );
  const followedContentItems = getHomeContentEntries(followedBusinesses).slice(0, 10);
  const interestContentItems = getHomeContentEntries(
    uniqueBusinesses.filter(
      (business) =>
        preferredCategorySlugs.includes(business.categorySlug) ||
        isHomeBusinessPreferenceMatch(business, effectiveQuery),
    ),
  )
    .filter(({ business }) => !followedBusinessKeys.has(getBusinessDedupeKey(business)))
    .slice(0, 10);
  const freshContentItems = getHomeContentEntries(uniqueBusinesses).slice(0, 10);
  const primaryContentItems = followedContentItems.length
    ? followedContentItems
    : interestContentItems.length
      ? interestContentItems
      : freshContentItems;
  const recommendedBusinesses = rankBusinesses(
    uniqueBusinesses.filter(
      (business) =>
        !newNearbyKeys.has(getBusinessDedupeKey(business)) &&
        (preferredCategorySlugs.includes(business.categorySlug) ||
          isHomeBusinessPreferenceMatch(business, effectiveQuery) ||
          followedBusinessKeys.has(getBusinessDedupeKey(business))),
    ),
    {
      categorySlug: selectedCategorySlug || undefined,
      location,
      query: effectiveQuery,
    },
  ).slice(0, 10);
  const storyBusinesses = getUniqueBusinesses([
    ...recommendedBusinesses,
    ...newNearbyBusinesses,
    ...rankBusinesses(uniqueBusinesses, {
      categorySlug: selectedCategorySlug || undefined,
      location,
      query: effectiveQuery,
    }),
  ])
    .filter((business) =>
      Boolean(getRenderableImageUrl(business.logoUrl, imageOptimizationPresets.logo)),
    )
    .slice(0, 14);
  const feedPreviewPosts = feedPosts.slice(0, 8);
  const contentTitle = followedContentItems.length
    ? homeCopy.followingContentTitle
    : homeCopy.freshContentTitle;
  const contentSubtitle = followedContentItems.length
    ? homeCopy.followingContentSubtitle
    : homeCopy.freshContentSubtitle;
  const nearbySubtitle = locationTrimmed
    ? `${homeCopy.nearbySubtitle} ${locationTrimmed}`
    : homeCopy.nearbyFallbackSubtitle;

  return (
    <ScrollView
      contentContainerStyle={[styles.screenContent, styles.homeScreenContent]}
      keyboardShouldPersistTaps="handled"
      onScroll={(event) => {
        onScrollOffsetChange(event.nativeEvent.contentOffset.y);
      }}
      ref={scrollRef}
      scrollEventThrottle={120}
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.homeBrand, isDarkMode ? styles.darkText : null]}>
        Kolo
      </Text>

      {storyBusinesses.length ? (
        <ScrollView
          contentContainerStyle={styles.homeStoriesRail}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {storyBusinesses.map((business) => (
            <HomeStoryBusiness
              business={business}
              isDarkMode={isDarkMode}
              key={getBusinessDedupeKey(business)}
              labels={labels}
              onPress={() => onBusinessPress(business)}
            />
          ))}
          <Pressable
            accessibilityLabel={locale === "uk" ? "Ще" : "More"}
            accessibilityRole="button"
            onPress={onOpenSearch}
            style={styles.homeStoryItem}
          >
            <View
              style={[
                styles.homeStoryLogoRing,
                styles.homeStoryMoreRing,
                isDarkMode ? styles.darkStoryLogoRing : null,
              ]}
            >
              <MoreHorizontal
                color={isDarkMode ? "#E5E5EA" : "#111111"}
                size={24}
                strokeWidth={2.8}
              />
            </View>
            <Text style={[styles.homeStoryName, isDarkMode ? styles.darkMutedText : null]}>
              {locale === "uk" ? "Ще" : "More"}
            </Text>
          </Pressable>
        </ScrollView>
      ) : null}

      <HomeRail
        isDarkMode={isDarkMode}
        subtitle={homeCopy.categorySubtitle}
        title={homeCopy.categoryTitle}
      >
        {categoryCards.length ? (
          categoryCards.map(({ category, count }) => (
            <HomeCategoryRailCard
              categorySlug={category.slug}
              count={count}
              isDarkMode={isDarkMode}
              key={category.slug}
              name={category.name[locale]}
              onPress={() => onCategoryPress(category.slug)}
              supportingText={labels.businesses}
            />
          ))
        ) : (
          <HomeEmptyRailCard
            isDarkMode={isDarkMode}
            text={homeCopy.emptyContentText}
          />
        )}
      </HomeRail>

      <HomeRail
        isDarkMode={isDarkMode}
        subtitle={contentSubtitle}
        title={contentTitle}
      >
        {primaryContentItems.length ? (
          primaryContentItems.map(({ business, item }) => (
            <HomeContentRailCard
              business={business}
              isDarkMode={isDarkMode}
              item={item}
              key={item.id}
              labels={labels}
              onPress={() => onContentPress({ business, item })}
              onShare={() => {
                void onShareContent({ business, item });
              }}
            />
          ))
        ) : (
          <HomeEmptyRailCard
            isDarkMode={isDarkMode}
            text={homeCopy.emptyContentText}
          />
        )}
      </HomeRail>

      <HomeRail
        isDarkMode={isDarkMode}
        subtitle={nearbySubtitle}
        title={homeCopy.nearbyTitle}
      >
        {newNearbyBusinesses.length ? (
          newNearbyBusinesses.map((business) => (
            <HomeBusinessFeatureCard
              business={business}
              isDarkMode={isDarkMode}
              key={business.id}
              labels={labels}
              locale={locale}
              onPress={() => onBusinessPress(business)}
            />
          ))
        ) : (
          <HomeEmptyRailCard
            isDarkMode={isDarkMode}
            text={homeCopy.emptyContentText}
          />
        )}
      </HomeRail>

      {recommendedBusinesses.length ? (
        <HomeRail
          isDarkMode={isDarkMode}
          subtitle={homeCopy.recommendedSubtitle}
          title={homeCopy.recommendedTitle}
        >
          {recommendedBusinesses.map((business) => (
            <HomeBusinessFeatureCard
              business={business}
              isDarkMode={isDarkMode}
              key={business.id}
              labels={labels}
              locale={locale}
              onPress={() => onBusinessPress(business)}
            />
          ))}
        </HomeRail>
      ) : null}

      {feedPreviewPosts.length ? (
        <HomeRail
          isDarkMode={isDarkMode}
          subtitle={homeCopy.communitySubtitle}
          title={homeCopy.communityTitle}
        >
          {feedPreviewPosts.map((post) => (
            <HomeFeedPostRailCard
              isDarkMode={isDarkMode}
              key={post.id}
              labels={labels}
              onPress={() => onFeedPostPress(post)}
              post={post}
              profile={profile}
              session={session}
            />
          ))}
        </HomeRail>
      ) : null}
    </ScrollView>
  );
}

function HomeLoadingScreen({
  isDarkMode,
  labels,
  locale,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
}) {
  const homeCopy = getHomeCopy(locale);
  const skeletonStyle = isDarkMode ? styles.darkLoadingLine : null;

  return (
    <ScrollView
      contentContainerStyle={[styles.screenContent, styles.homeScreenContent]}
      keyboardShouldPersistTaps="handled"
      style={styles.screen}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.homeBrand, isDarkMode ? styles.darkText : null]}>
        Kolo
      </Text>

      <View style={[styles.homeLoadingHero, isDarkMode ? styles.darkCard : null]}>
        <View style={styles.homeLoadingHeroTopRow}>
          <View style={[styles.homeLoadingIcon, isDarkMode ? styles.darkIconBox : null]}>
            <Sparkles
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={20}
              strokeWidth={2.7}
            />
          </View>
          <Text style={[styles.homeLoadingBadge, isDarkMode ? styles.darkBadge : null]}>
            {labels.loading}
          </Text>
        </View>
        <Text style={[styles.homeLoadingTitle, isDarkMode ? styles.darkText : null]}>
          {labels.loadingBusinesses}
        </Text>
        <View style={[styles.homeLoadingSearchCard, isDarkMode ? styles.darkIconBox : null]}>
          <Search
            color={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            size={18}
            strokeWidth={2.7}
          />
          <View style={styles.flex}>
            <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineWide, skeletonStyle]} />
            <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineShort, skeletonStyle]} />
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.homeLoadingStoriesRail}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {Array.from({ length: 7 }, (_, index) => (
          <View key={`loading-story-${index}`} style={styles.homeLoadingStoryItem}>
            <View style={[styles.homeSkeletonCircle, skeletonStyle]} />
            <View style={[styles.homeSkeletonTinyLine, skeletonStyle]} />
          </View>
        ))}
      </ScrollView>

      <HomeLoadingRail
        isDarkMode={isDarkMode}
        skeletonStyle={skeletonStyle}
        title={homeCopy.categoryTitle}
        variant="category"
      />
      <HomeLoadingRail
        isDarkMode={isDarkMode}
        skeletonStyle={skeletonStyle}
        title={homeCopy.freshContentTitle}
        variant="content"
      />
      <HomeLoadingRail
        isDarkMode={isDarkMode}
        skeletonStyle={skeletonStyle}
        title={homeCopy.nearbyTitle}
        variant="business"
      />
    </ScrollView>
  );
}

function HomeLoadingRail({
  isDarkMode,
  skeletonStyle,
  title,
  variant,
}: {
  isDarkMode: boolean;
  skeletonStyle: StyleProp<ViewStyle>;
  title: string;
  variant: "business" | "category" | "content";
}) {
  const cardCount = variant === "category" ? 4 : 3;

  return (
    <View style={styles.homeRail}>
      <View style={styles.homeSectionHeader}>
        <View style={styles.flex}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {title}
          </Text>
          <View style={[styles.homeSkeletonLine, styles.homeSkeletonRailSubtitle, skeletonStyle]} />
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.homeRailContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {Array.from({ length: cardCount }, (_, index) => (
          <HomeLoadingRailCard
            isDarkMode={isDarkMode}
            key={`${variant}-${index}`}
            skeletonStyle={skeletonStyle}
            variant={variant}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function HomeLoadingRailCard({
  isDarkMode,
  skeletonStyle,
  variant,
}: {
  isDarkMode: boolean;
  skeletonStyle: StyleProp<ViewStyle>;
  variant: "business" | "category" | "content";
}) {
  if (variant === "category") {
    return (
      <View style={[styles.homeLoadingCategoryCard, isDarkMode ? styles.darkCard : null]}>
        <View style={[styles.homeSkeletonIcon, skeletonStyle]} />
        <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineMedium, skeletonStyle]} />
        <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineShort, skeletonStyle]} />
      </View>
    );
  }

  return (
    <View
      style={[
        variant === "content"
          ? styles.homeLoadingContentCard
          : styles.homeLoadingBusinessCard,
        isDarkMode ? styles.darkBusinessCard : null,
      ]}
    >
      {variant === "content" ? (
        <View style={[styles.homeSkeletonImage, skeletonStyle]} />
      ) : (
        <View style={styles.homeLoadingBusinessTopRow}>
          <View style={[styles.homeSkeletonLogo, skeletonStyle]} />
          <View style={[styles.homeSkeletonPill, skeletonStyle]} />
        </View>
      )}
      <View style={styles.homeLoadingCardBody}>
        <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineWide, skeletonStyle]} />
        <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineMedium, skeletonStyle]} />
        <View style={[styles.homeSkeletonLine, styles.homeSkeletonLineShort, skeletonStyle]} />
      </View>
    </View>
  );
}

function HomeRail({
  children,
  isDarkMode,
  subtitle,
  title,
}: {
  children: ReactNode;
  isDarkMode: boolean;
  subtitle?: string;
  title: string;
}) {
  return (
    <View style={styles.homeRail}>
      <View style={styles.homeSectionHeader}>
        <View style={styles.flex}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {title}
          </Text>
          {subtitle ? (
            <Text style={[styles.homeRailSubtitle, isDarkMode ? styles.darkMutedText : null]}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={styles.homeRailContent}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {children}
      </ScrollView>
    </View>
  );
}

function HomeStoryBusiness({
  business,
  isDarkMode,
  labels,
  onPress,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onPress: () => void;
}) {
  const logoUrl = getRenderableImageUrl(
    business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const [hasLogoImageError, setHasLogoImageError] = useState(false);

  useEffect(() => {
    setHasLogoImageError(false);
  }, [logoUrl]);

  if (!logoUrl || hasLogoImageError) {
    return null;
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={styles.homeStoryItem}
    >
      <View style={[styles.homeStoryLogoRing, isDarkMode ? styles.darkStoryLogoRing : null]}>
        <Image
          onError={() => setHasLogoImageError(true)}
          resizeMode="contain"
          source={{ uri: logoUrl }}
          style={[
            styles.homeStoryLogo,
            isDarkMode ? styles.darkContentImageSurface : null,
          ]}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[styles.homeStoryName, isDarkMode ? styles.darkMutedText : null]}
      >
        {business.name}
      </Text>
      {hasBusinessFollowers(business) ? (
        <Text
          numberOfLines={1}
          style={[styles.homeStoryFollowers, isDarkMode ? styles.darkMutedText : null]}
        >
          {getFollowerLabel(business, labels)}
        </Text>
      ) : null}
    </Pressable>
  );
}

function HomeContentRailCard({
  business,
  isDarkMode,
  item,
  labels,
  onPress,
  onShare,
}: {
  business: Business;
  isDarkMode: boolean;
  item: BusinessContentItem;
  labels: Record<string, string>;
  onPress: () => void;
  onShare: () => void;
}) {
  const coverImageUrl = getContentImageUrls(
    item,
    imageOptimizationPresets.thumbnail,
  )[0];
  const metaItems = [
    item.isFree ? labels.free : formatPriceWithCurrency(item.price),
    item.type === "product" && !item.isAvailable ? labels.outOfStock : undefined,
    item.isOnline ? labels.online : undefined,
    item.startsAt ? formatContentDate(item.startsAt) : undefined,
    business.servesAllCanada ? labels.canadaWide : business.city,
  ].filter((value): value is string => Boolean(value));

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.homeContentRailCard, isDarkMode ? styles.darkBusinessCard : null]}
    >
      {coverImageUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: coverImageUrl }}
          style={[
            styles.homeContentRailImage,
            isDarkMode ? styles.darkContentImageSurface : null,
          ]}
        />
      ) : (
        <View
          style={[
            styles.homeContentRailImage,
            styles.homeContentRailImageFallback,
            isDarkMode ? styles.darkIconBox : null,
          ]}
        >
          <Sparkles color={isDarkMode ? "#E5E5EA" : "#111111"} size={24} strokeWidth={2.6} />
        </View>
      )}
      <View style={styles.homeContentRailBody}>
        <View style={styles.homeContentRailTopRow}>
          <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
            {getContentTypeLabel(item, labels)}
          </Text>
          <Pressable
            accessibilityLabel={labels.shareBusiness}
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onShare();
            }}
            style={[styles.contentItemActionButton, isDarkMode ? styles.darkIconBox : null]}
          >
            <Share2
              color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
              size={15}
              strokeWidth={2.6}
            />
          </Pressable>
        </View>
        <Text
          numberOfLines={2}
          style={[styles.homeContentRailTitle, isDarkMode ? styles.darkText : null]}
        >
          {item.title}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.homeContentRailBusiness, isDarkMode ? styles.darkMutedText : null]}
        >
          {business.name}
        </Text>
        <Text
          numberOfLines={2}
          style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}
        >
          {item.description}
        </Text>
        {metaItems.length ? (
          <Text
            numberOfLines={2}
            style={[styles.contentItemMeta, isDarkMode ? styles.darkMutedText : null]}
          >
            {metaItems.join(" | ")}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

function getHomeCategoryIcon(categorySlug: string): LucideIcon {
  const icons: Record<string, LucideIcon> = {
    "advertising-services": Megaphone,
    "auto-repair": Car,
    beauty: Scissors,
    bookkeepers: Calculator,
    cleaning: Sparkles,
    construction: Hammer,
    events: CalendarDays,
    flowers: Flower2,
    "grocery-stores": ShoppingBasket,
    "insurance-brokers": ShieldCheck,
    "it-services": Code2,
    lawyers: Scale,
    "mortgage-brokers": HandCoins,
    moving: Truck,
    photographers: Camera,
    realtors: Home,
    "repair-services": Wrench,
    restaurants: Utensils,
    shops: ShoppingBag,
    "textile-decor": Sofa,
    "travel-tours": Plane,
    tutors: GraduationCap,
    "wellness-care": HeartPulse,
  };

  return icons[categorySlug] ?? Store;
}

function HomeCategoryRailCard({
  categorySlug,
  count,
  isDarkMode,
  name,
  onPress,
  supportingText,
}: {
  categorySlug: string;
  count: number;
  isDarkMode: boolean;
  name: string;
  onPress: () => void;
  supportingText: string;
}) {
  const Icon = getHomeCategoryIcon(categorySlug);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.homeCategoryRailCard, isDarkMode ? styles.darkCard : null]}
    >
      <View style={[styles.discoveryIcon, isDarkMode ? styles.darkIconBox : null]}>
        <Icon color={isDarkMode ? "#E5E5EA" : "#111111"} size={19} strokeWidth={2.7} />
      </View>
      <Text
        numberOfLines={2}
        style={[styles.homeCategoryRailName, isDarkMode ? styles.darkText : null]}
      >
        {name}
      </Text>
      <Text style={[styles.categoryPreviewMeta, isDarkMode ? styles.darkMutedText : null]}>
        {count} {supportingText}
      </Text>
    </Pressable>
  );
}

function HomeFeedPostRailCard({
  isDarkMode,
  labels,
  onPress,
  post,
  profile,
  session,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
  onPress: () => void;
  post: MobileFeedPost;
  profile: UserProfile | null;
  session: Session | null;
}) {
  const authorName = getFeedPostAuthorName(post, labels, session, profile);
  const avatarUrl = getFeedPostAvatarUrl(post, session, profile);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.homePostRailCard, isDarkMode ? styles.darkBusinessCard : null]}
    >
      <View style={styles.feedAuthorRow}>
        {avatarUrl ? (
          <Image
            resizeMode="contain"
            source={{ uri: avatarUrl }}
            style={[
              styles.feedAvatar,
              isDarkMode ? styles.darkContentImageSurface : null,
            ]}
          />
        ) : (
          <View style={[styles.feedAvatar, isDarkMode ? styles.darkIconBox : null]}>
            {post.business_id ? (
              <Store color={isDarkMode ? "#E5E5EA" : "#111111"} size={18} />
            ) : (
              <UserRound color={isDarkMode ? "#E5E5EA" : "#111111"} size={18} />
            )}
          </View>
        )}
        <View style={styles.flex}>
          <Text
            numberOfLines={1}
            style={[styles.feedAuthorName, isDarkMode ? styles.darkText : null]}
          >
            {authorName}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {formatMobileMessageDate(post.created_at)}
          </Text>
        </View>
      </View>
      <Text
        numberOfLines={5}
        style={[styles.homePostBody, isDarkMode ? styles.darkText : null]}
      >
        {post.body}
      </Text>
      <View style={styles.homePostMetaRow}>
        <View style={styles.feedMetricRow}>
          <Heart
            color={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            size={15}
            strokeWidth={2.5}
          />
          <Text style={[styles.feedActionText, isDarkMode ? styles.darkMutedText : null]}>
            {post.likeCount}
          </Text>
        </View>
        <View style={styles.feedMetricRow}>
          <MessageCircle
            color={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            size={15}
            strokeWidth={2.5}
          />
          <Text style={[styles.feedActionText, isDarkMode ? styles.darkMutedText : null]}>
            {post.commentCount}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

function HomeEmptyRailCard({
  isDarkMode,
  text,
}: {
  isDarkMode: boolean;
  text: string;
}) {
  return (
    <View style={[styles.homeEmptyRailCard, isDarkMode ? styles.darkCard : null]}>
      <Sparkles color={isDarkMode ? "#E5E5EA" : "#6E6E73"} size={22} strokeWidth={2.7} />
      <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
        {text}
      </Text>
    </View>
  );
}

function RegisterScreen({
  activeProfilePanel,
  isDarkMode,
  isSignedIn,
  labels,
  locale,
  onProfilePanelChange,
  onSubmit,
}: {
  activeProfilePanel?: ProfilePanel;
  isDarkMode: boolean;
  isSignedIn: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onProfilePanelChange?: (panel: ProfilePanel) => void;
  onSubmit: (input: BusinessRegistrationInput) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [city, setCity] = useState("Ottawa");
  const [address, setAddress] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("travel-tours");
  const [instagram, setInstagram] = useState("");
  const [keywords, setKeywords] = useState("");
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
      quality: 0.72,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      return;
    }

    const normalizedLogo = await normalizePickedUploadImage(asset, {
      fileNamePrefix: "business-logo",
      maxEdge: 900,
      quality: 0.78,
    });

    setLogo(normalizedLogo);
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
        keywords,
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
      {activeProfilePanel && onProfilePanelChange ? (
        <ProfilePanelTabs
          activePanel={activeProfilePanel}
          isDarkMode={isDarkMode}
          labels={labels}
          onChange={onProfilePanelChange}
        />
      ) : null}
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
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
            thumbColor={servesAllCanada ? "#FFFFFF" : "#111111"}
            trackColor={{ false: "#E5E5EA", true: "#6E6E73" }}
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
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            style={[
              styles.input,
              styles.textArea,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={description}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.keywords}>
          <TextInput
            multiline
            onChangeText={(value) => {
              setKeywords(value);
              setSubmitError("");
            }}
            placeholder={labels.keywordsHint}
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            style={[
              styles.input,
              styles.textAreaSmall,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={keywords}
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
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={website}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.instagram}>
          <TextInput
            autoCapitalize="none"
            onChangeText={setInstagram}
            placeholder={labels.instagram}
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
            style={[styles.input, isDarkMode ? styles.darkInput : null]}
            value={instagram}
          />
        </Field>
        <Field isDarkMode={isDarkMode} label={labels.address}>
          <TextInput
            onChangeText={setAddress}
            placeholder={labels.address}
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
                  color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
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
        {submitError ? (
          <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
            {submitError}
          </Text>
        ) : null}
        {submitted ? (
          <Text style={[styles.successText, isDarkMode ? styles.darkAlertText : null]}>
            {labels.submitted}
          </Text>
        ) : null}
      </View>
    </KeyboardAwareScreen>
  );
}

function DashboardScreen({
  activeProfilePanel,
  business,
  contentItems,
  isDarkMode,
  labels,
  locale,
  onCreateContent,
  onDeleteContent,
  onProfilePanelChange,
  onSave,
  onUpdateContent,
}: {
  activeProfilePanel?: ProfilePanel;
  business: Business | null;
  contentItems: BusinessContentItem[];
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onCreateContent: (input: BusinessContentInput) => Promise<void> | void;
  onDeleteContent: (contentItemId: string) => Promise<void> | void;
  onProfilePanelChange?: (panel: ProfilePanel) => void;
  onSave: (business: Business) => Promise<void> | void;
  onUpdateContent: (input: BusinessContentUpdateInput) => Promise<void> | void;
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
        {activeProfilePanel && onProfilePanelChange ? (
          <ProfilePanelTabs
            activePanel={activeProfilePanel}
            isDarkMode={isDarkMode}
            labels={labels}
            onChange={onProfilePanelChange}
          />
        ) : null}
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
  const productItems = contentItems.filter((item) => item.type === "product");

  return (
    <KeyboardAwareScreen>
      {activeProfilePanel && onProfilePanelChange ? (
        <ProfilePanelTabs
          activePanel={activeProfilePanel}
          isDarkMode={isDarkMode}
          labels={labels}
          onChange={onProfilePanelChange}
        />
      ) : null}
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
        <DashboardPanelButton
          active={activePanel === "products"}
          isDarkMode={isDarkMode}
          label={labels.products}
          onPress={() => setActivePanel("products")}
        />
      </View>

      {activePanel === "profile" && !isEditingProfile ? (
        <>
          <DashboardProfilePreview
            business={business}
            isDarkMode={isDarkMode}
            labels={labels}
            locale={locale}
            onEdit={() => setIsEditingProfile(true)}
          />
          <RankingExplanationCard isDarkMode={isDarkMode} labels={labels} />
        </>
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
                color={isDarkMode ? "#E5E5EA" : "#111111"}
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
              thumbColor={draft.servesAllCanada ? "#FFFFFF" : "#111111"}
              trackColor={{ false: "#E5E5EA", true: "#6E6E73" }}
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
          <Field isDarkMode={isDarkMode} label={labels.keywords}>
            <TextInput
              multiline
              onChangeText={(value) => {
                setDraft({ ...draft, keywords: value });
                setSaved(false);
              }}
              placeholder={labels.keywordsHint}
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
              style={[
                styles.input,
                styles.textAreaSmall,
                isDarkMode ? styles.darkInput : null,
              ]}
              value={draft.keywords ?? ""}
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
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
          {saveError ? (
            <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
              {saveError}
            </Text>
          ) : null}
          {saved ? (
            <Text style={[styles.successText, isDarkMode ? styles.darkAlertText : null]}>
              {labels.saved}
            </Text>
          ) : null}
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

      {activePanel === "products" ? (
        <BusinessContentSection
          business={business}
          contentType="product"
          isDarkMode={isDarkMode}
          items={productItems}
          labels={labels}
          onCreate={onCreateContent}
          onDelete={onDeleteContent}
          onUpdate={onUpdateContent}
        />
      ) : null}
    </KeyboardAwareScreen>
  );
}

function RankingExplanationCard({
  isDarkMode,
  labels,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
}) {
  return (
    <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
      <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
        {labels.rankingTitle}
      </Text>
      <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
        {labels.rankingIntro}
      </Text>
      {[labels.rankingProfile, labels.rankingContent, labels.rankingEvents].map(
        (item) => (
          <View
            key={item}
            style={[styles.rankingInfoRow, isDarkMode ? styles.darkSettingRow : null]}
          >
            <Sparkles
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={16}
              strokeWidth={2.6}
            />
            <Text
              style={[
                styles.rankingInfoText,
                isDarkMode ? styles.darkMutedText : null,
              ]}
            >
              {item}
            </Text>
          </View>
        ),
      )}
    </View>
  );
}

function DashboardPanelButton({
  active,
  compact = false,
  isDarkMode,
  label,
  onPress,
}: {
  active: boolean;
  compact?: boolean;
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
        compact ? styles.compactDashboardTabButton : null,
        active ? styles.activeDashboardTabButton : null,
        isDarkMode && !active ? styles.darkIconBox : null,
      ]}
    >
      <Text
        numberOfLines={compact ? 1 : 2}
        style={[
          styles.dashboardTabButtonText,
          compact ? styles.compactDashboardTabButtonText : null,
          active ? styles.activeDashboardTabButtonText : null,
          isDarkMode && !active ? styles.darkText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function ProfilePanelTabs({
  activePanel,
  isDarkMode,
  labels,
  onChange,
}: {
  activePanel: ProfilePanel;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onChange: (panel: ProfilePanel) => void;
}) {
  const panels: { label: string; value: ProfilePanel }[] = [
    { label: labels.account, value: "account" },
    { label: labels.addBusiness, value: "addBusiness" },
    { label: labels.businessInfo, value: "businessInfo" },
  ];

  return (
    <View style={[styles.profilePanelTabs, isDarkMode ? styles.darkSettingRow : null]}>
      {panels.map((panel) => (
        <DashboardPanelButton
          active={activePanel === panel.value}
          compact
          isDarkMode={isDarkMode}
          key={panel.value}
          label={panel.label}
          onPress={() => onChange(panel.value)}
        />
      ))}
    </View>
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
  const logoUrl = getRenderableImageUrl(
    business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const [hasLogoImageError, setHasLogoImageError] = useState(false);

  useEffect(() => {
    setHasLogoImageError(false);
  }, [logoUrl]);

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
            color={isDarkMode ? "#E5E5EA" : "#111111"}
            size={19}
            strokeWidth={2.7}
          />
        </Pressable>
      </View>

      <View style={styles.dashboardPreviewHero}>
        {logoUrl && !hasLogoImageError ? (
          <View style={[styles.dashboardPreviewLogo, isDarkMode ? styles.darkIconBox : null]}>
            <Image
              onError={() => setHasLogoImageError(true)}
              resizeMode="contain"
              source={{ uri: logoUrl }}
              style={styles.logoPreviewImage}
            />
          </View>
        ) : null}
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
                    color={isDarkMode ? "#E5E5EA" : "#111111"}
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
                  textColor={isDarkMode ? "#FFFFFF" : "#111111"}
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
  const isProduct = contentType === "product";
  const [description, setDescription] = useState("");
  const [editingItem, setEditingItem] = useState<BusinessContentItem | null>(null);
  const [isAvailable, setIsAvailable] = useState(true);
  const [images, setImages] = useState<BusinessContentImageInput[]>([]);
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
      allowsMultipleSelection: true,
      mediaTypes: ["images"],
      orderedSelection: true,
      quality: 0.72,
      selectionLimit: 8,
    });

    if (result.canceled) {
      return;
    }

    const selectedImages = await Promise.all(
      result.assets
        .filter((asset) => asset.uri)
        .map((asset, index) =>
          normalizePickedUploadImage(asset, {
            fileNamePrefix: `content-${index + 1}`,
            maxEdge: 1800,
            quality: 0.76,
          }),
        ),
    );

    setImages(selectedImages);
    setSuccessMessage("");
  }

  function resetComposer() {
    setDescription("");
    setEditingItem(null);
    setImages([]);
    setIsAvailable(true);
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
    setImages([]);
    setIsAvailable(item.isAvailable);
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
        images,
        isAvailable: isProduct ? isAvailable : true,
        isFree: isProduct ? false : isFree,
        isOnline: isEvent && isOnline,
        linkUrl: isEvent || isProduct ? linkUrl : undefined,
        location: isEvent ? location : undefined,
        price: !isProduct && isFree ? "" : price,
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

  const existingImageUrls = getContentImageUrls(
    editingItem,
    imageOptimizationPresets.thumbnail,
  );
  const imagePreviewUris =
    images.length > 0 ? images.map((selectedImage) => selectedImage.uri) : existingImageUrls;
  const imageUploadHint =
    images.length > 0
      ? `${images.length} ${labels.contentPhotosSelected}`
      : existingImageUrls.length > 1
        ? `${existingImageUrls.length} ${labels.contentPhotosSelected}`
        : existingImageUrls.length === 1
          ? labels.contentPhotoSelected
          : labels.contentPhotoHint;

  return (
    <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
      <View style={styles.contentSectionHeader}>
        <View>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {isProduct ? labels.products : isEvent ? labels.events : labels.services}
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
            color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
            size={18}
            strokeWidth={2.7}
          />
          <Text style={[styles.contentAddButtonText, isDarkMode ? styles.darkText : null]}>
            {labels.addContent}
          </Text>
        </Pressable>
      </View>

      {successMessage ? (
        <Text style={[styles.successText, isDarkMode ? styles.darkAlertText : null]}>
          {successMessage}
        </Text>
      ) : null}
      {errorMessage && !isComposerOpen ? (
        <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
          {errorMessage}
        </Text>
      ) : null}

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
                      color={isDarkMode ? "#E5E5EA" : "#111111"}
                      size={19}
                      strokeWidth={2.7}
                    />
                  </Pressable>
                </View>

        <Field
          isDarkMode={isDarkMode}
          label={
            isProduct
              ? labels.productTitle
              : isEvent
                ? labels.eventTitle
                : labels.serviceTitle
          }
        >
          <TextInput
            onChangeText={(value) => {
              setTitle(value);
              setErrorMessage("");
              setSuccessMessage("");
            }}
            placeholder={
              isProduct
                ? labels.productTitle
                : isEvent
                  ? labels.eventTitle
                  : labels.serviceTitle
            }
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
            placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
              style={[
                styles.input,
                styles.inlinePickerInput,
                isFree ? styles.disabledInput : null,
                isDarkMode ? styles.darkInput : null,
              ]}
              value={isFree ? "" : price}
            />
            {isProduct ? (
              <SelectableChip
                isDarkMode={isDarkMode}
                label={isAvailable ? labels.available : labels.outOfStock}
                onPress={() => {
                  setIsAvailable((value) => !value);
                  setSuccessMessage("");
                }}
                selected={isAvailable}
              />
            ) : (
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
            )}
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
            <View style={[styles.contentUploadPreview, isDarkMode ? styles.darkIconBox : null]}>
              {imagePreviewUris.length > 0 ? (
                <View style={styles.contentUploadThumbGrid}>
                  {imagePreviewUris.slice(0, 4).map((uri, index) => (
                    <Image
                      key={`${uri}-${index}`}
                      source={{ uri }}
                      style={styles.contentUploadThumb}
                    />
                  ))}
                </View>
              ) : (
                <Upload
                  color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                  size={24}
                  strokeWidth={2.5}
                />
              )}
            </View>
            <View style={styles.flex}>
              <Text style={[styles.logoUploadTitle, isDarkMode ? styles.darkText : null]}>
                {imagePreviewUris.length > 0
                  ? labels.contentPhotoSelected
                  : labels.contentPhotoUpload}
              </Text>
              <Text style={[styles.logoUploadHint, isDarkMode ? styles.darkMutedText : null]}>
                {imageUploadHint}
              </Text>
            </View>
          </Pressable>
        </Field>

        {isEvent || isProduct ? (
          <>
            {isEvent ? (
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
            ) : null}
            {isEvent ? (
              <Field isDarkMode={isDarkMode} label={labels.eventLocation}>
              <View style={styles.inlinePickerRow}>
                <TextInput
                  onChangeText={(value) => {
                    setLocation(value);
                    setSuccessMessage("");
                  }}
                  placeholder={labels.eventLocation}
                  placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
            ) : null}
            <Field isDarkMode={isDarkMode} label={labels.contentLink}>
              <TextInput
                autoCapitalize="none"
                keyboardType="url"
                onChangeText={(value) => {
                  setLinkUrl(value);
                  setSuccessMessage("");
                }}
                placeholder="https://"
                placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
                : isProduct
                  ? labels.addProduct
                  : labels.addService
          }
          onPress={() => {
            void handleSubmit();
          }}
        />
                {errorMessage ? (
                  <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
                    {errorMessage}
                  </Text>
                ) : null}
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
  const coverImageUrl = getContentImageUrls(
    item,
    imageOptimizationPresets.thumbnail,
  )[0];
  const metaItems = [
    item.type === "product"
      ? item.isAvailable
        ? labels.available
        : labels.outOfStock
      : undefined,
    item.isFree ? labels.free : formatPriceWithCurrency(item.price),
    item.isOnline ? labels.online : undefined,
    item.startsAt ? formatContentDate(item.startsAt) : undefined,
    item.location,
  ].filter((value): value is string => Boolean(value));
  const contentLinkUrl = item.linkUrl ? getWebsiteUrl(item.linkUrl) : null;

  return (
    <View style={[styles.contentItemCard, isDarkMode ? styles.darkSettingRow : null]}>
      {coverImageUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: coverImageUrl }}
          style={[
            styles.contentItemImage,
            isDarkMode ? styles.darkContentImageSurface : null,
          ]}
        />
      ) : null}
      <View style={styles.contentItemBody}>
        <View style={styles.contentItemHeader}>
          <Text style={[styles.contentItemTitle, isDarkMode ? styles.darkText : null]}>
            {item.title}
          </Text>
          <View style={styles.contentItemActions}>
            <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
              {getContentTypeLabel(item, labels)}
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
                color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
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
                color={isDarkMode ? "#FFFFFF" : "#6E6E73"}
                size={16}
                strokeWidth={2.6}
              />
            </Pressable>
          </View>
        </View>
        <Text
          numberOfLines={2}
          style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}
        >
          {item.description}
        </Text>
        {metaItems.length ? (
          <View style={styles.contentMetaChipRow}>
            {metaItems.map((meta, index) => (
              <Text
                key={`${meta}-${index}`}
                numberOfLines={1}
                style={[styles.contentMetaChip, isDarkMode ? styles.darkBadge : null]}
              >
                {meta}
              </Text>
            ))}
          </View>
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
    </View>
  );
}

function getContentTypeLabel(
  item: BusinessContentItem,
  labels: Record<string, string>,
) {
  if (item.type === "event") {
    return labels.events;
  }

  if (item.type === "product") {
    return labels.products;
  }

  return labels.services;
}

function FeedScreen({
  commentDrafts,
  draft,
  isDarkMode,
  isLoading,
  isSubmitting,
  labels,
  profile,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
  onDeletePost,
  onCreatePost,
  onOpenPost,
  onOpenPostBusiness,
  onOpenMessages,
  onPostAsBusinessChange,
  onRequireSignIn,
  onToggleLike,
  onUpdateComment,
  onUpdatePost,
  ownedBusiness,
  postAsBusiness,
  posts,
  session,
  setDraft,
  unreadMessageCount,
}: {
  commentDrafts: Record<string, string>;
  draft: string;
  isDarkMode: boolean;
  isLoading: boolean;
  isSubmitting: boolean;
  labels: Record<string, string>;
  profile: UserProfile | null;
  onCommentDraftChange: (postId: string, value: string) => void;
  onCreateComment: (post: MobileFeedPost) => Promise<void> | void;
  onDeleteComment: (comment: MobileFeedPost["comments"][number]) => void;
  onDeletePost: (post: MobileFeedPost) => void;
  onCreatePost: () => Promise<boolean> | boolean;
  onOpenPost: (post: MobileFeedPost) => void;
  onOpenPostBusiness: (post: MobileFeedPost) => void;
  onOpenMessages: () => void;
  onPostAsBusinessChange: (value: boolean) => void;
  onRequireSignIn: () => void;
  onToggleLike: (post: MobileFeedPost) => Promise<void> | void;
  onUpdateComment: (
    comment: MobileFeedPost["comments"][number],
    body: string,
  ) => Promise<void> | void;
  onUpdatePost: (post: MobileFeedPost, body: string) => Promise<void> | void;
  ownedBusiness: Business | null;
  postAsBusiness: boolean;
  posts: MobileFeedPost[];
  session: Session | null;
  setDraft: (value: string) => void;
  unreadMessageCount: number;
}) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  function openComposer() {
    if (!session) {
      onRequireSignIn();
      return;
    }

    setIsComposerOpen(true);
  }

  async function submitFeedPost() {
    const didCreate = await onCreatePost();

    if (didCreate) {
      setIsComposerOpen(false);
    }
  }

  return (
    <View style={styles.feedScreenShell}>
      <KeyboardAwareScreen>
        <View style={styles.feedHeaderRow}>
          <View style={styles.flex}>
            <Text style={[styles.screenTitle, isDarkMode ? styles.darkText : null]}>
              {labels.feed}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={labels.messages}
            accessibilityRole="button"
            onPress={onOpenMessages}
            style={[
              styles.feedHeaderIconButton,
              isDarkMode ? styles.darkSettingRow : null,
            ]}
          >
            <MessageCircle
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={21}
              strokeWidth={2.7}
            />
            {unreadMessageCount > 0 ? (
              <View style={styles.feedHeaderUnreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {formatUnreadCount(unreadMessageCount)}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {isLoading ? (
          <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
            {labels.loading}
          </Text>
        ) : posts.length ? (
          <View style={styles.contentList}>
            {posts.map((post) => (
              <FeedPostCard
                commentDraft={commentDrafts[post.id] ?? ""}
                isDarkMode={isDarkMode}
                key={post.id}
                labels={labels}
                onCommentDraftChange={(value) => onCommentDraftChange(post.id, value)}
                onCreateComment={() => onCreateComment(post)}
                onDeleteComment={onDeleteComment}
                onDeletePost={() => onDeletePost(post)}
                onOpenBusiness={
                  post.business_id || post.business
                    ? () => onOpenPostBusiness(post)
                    : undefined
                }
                onOpenComments={() => onOpenPost(post)}
                onRequireSignIn={onRequireSignIn}
                onToggleLike={() => onToggleLike(post)}
                onUpdateComment={onUpdateComment}
                onUpdatePost={(body) => onUpdatePost(post, body)}
                post={post}
                profile={profile}
                session={session}
              />
            ))}
          </View>
        ) : (
          <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
            <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
              {labels.feedEmpty}
            </Text>
            <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
              {labels.feedIntro}
            </Text>
          </View>
        )}
        <View style={styles.feedFloatingSpacer} />
      </KeyboardAwareScreen>

      <Pressable
        accessibilityLabel={labels.feedPublish}
        accessibilityRole="button"
        onPress={openComposer}
        style={styles.feedFloatingButton}
      >
        <Plus color="#FFFFFF" size={28} strokeWidth={2.8} />
      </Pressable>

      <FeedComposerModal
        draft={draft}
        isDarkMode={isDarkMode}
        isOpen={isComposerOpen}
        isSubmitting={isSubmitting}
        labels={labels}
        onClose={() => setIsComposerOpen(false)}
        onCreatePost={submitFeedPost}
        onPostAsBusinessChange={onPostAsBusinessChange}
        ownedBusiness={ownedBusiness}
        postAsBusiness={postAsBusiness}
        setDraft={setDraft}
      />
    </View>
  );
}

function FeedComposerModal({
  draft,
  isDarkMode,
  isOpen,
  isSubmitting,
  labels,
  onClose,
  onCreatePost,
  onPostAsBusinessChange,
  ownedBusiness,
  postAsBusiness,
  setDraft,
}: {
  draft: string;
  isDarkMode: boolean;
  isOpen: boolean;
  isSubmitting: boolean;
  labels: Record<string, string>;
  onClose: () => void;
  onCreatePost: () => Promise<void> | void;
  onPostAsBusinessChange: (value: boolean) => void;
  ownedBusiness: Business | null;
  postAsBusiness: boolean;
  setDraft: (value: string) => void;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={isOpen}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalDismissLayer}
        />
        <View style={[styles.modalSheet, isDarkMode ? styles.darkModalSheet : null]}>
          <ScrollView
            bounces
            contentContainerStyle={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={styles.modalScroll}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                {labels.feedPublish}
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
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={19}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>
            <TextInput
              autoFocus
              multiline
              maxLength={2000}
              onChangeText={setDraft}
              placeholder={labels.feedPostPlaceholder}
              placeholderTextColor={isDarkMode ? "#8E8E93" : "#6E6E73"}
              style={[
                styles.input,
                styles.textArea,
                isDarkMode ? styles.darkInput : null,
              ]}
              value={draft}
            />
            {ownedBusiness ? (
              <View style={[styles.settingsRow, isDarkMode ? styles.darkSettingRow : null]}>
                <View>
                  <Text style={[styles.switchLabel, isDarkMode ? styles.darkText : null]}>
                    {labels.feedPostAs}
                  </Text>
                  <Text style={[styles.settingMeta, isDarkMode ? styles.darkMutedText : null]}>
                    {postAsBusiness ? labels.feedPostAsBusiness : labels.feedPostAsMe}
                  </Text>
                </View>
                <Switch
                  onValueChange={onPostAsBusinessChange}
                  thumbColor={postAsBusiness ? "#FFFFFF" : "#111111"}
                  trackColor={{ false: "#E5E5EA", true: "#6E6E73" }}
                  value={postAsBusiness}
                />
              </View>
            ) : null}
            <PrimaryButton
              disabled={isSubmitting || !draft.trim()}
              label={isSubmitting ? labels.saving : labels.feedPublish}
              onPress={onCreatePost}
            />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function FeedPostCard({
  commentDraft,
  isDarkMode,
  labels,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
  onDeletePost,
  onOpenBusiness,
  onOpenComments,
  onRequireSignIn,
  onToggleLike,
  onUpdateComment,
  onUpdatePost,
  post,
  presentation = "compact",
  profile,
  session,
}: {
  commentDraft: string;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onCommentDraftChange: (value: string) => void;
  onCreateComment: () => Promise<void> | void;
  onDeleteComment: (comment: MobileFeedPost["comments"][number]) => void;
  onDeletePost: () => void;
  onOpenBusiness?: () => void;
  onOpenComments?: () => void;
  onRequireSignIn: () => void;
  onToggleLike: () => Promise<void> | void;
  onUpdateComment: (
    comment: MobileFeedPost["comments"][number],
    body: string,
  ) => Promise<void> | void;
  onUpdatePost: (body: string) => Promise<void> | void;
  post: MobileFeedPost;
  presentation?: "compact" | "detail";
  profile: UserProfile | null;
  session: Session | null;
}) {
  const authorName = getFeedPostAuthorName(post, labels, session, profile);
  const avatarUrl = getFeedPostAvatarUrl(post, session, profile);
  const showDetail = presentation === "detail";
  const isOwnPost = session?.user.id === post.author_id;
  const [isEditingPost, setIsEditingPost] = useState(false);
  const [editingPostDraft, setEditingPostDraft] = useState(post.body);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");

  useEffect(() => {
    setIsEditingPost(false);
    setEditingPostDraft(post.body);
    setEditingCommentId(null);
    setEditingCommentDraft("");
  }, [post.id]);

  useEffect(() => {
    if (!isEditingPost) {
      setEditingPostDraft(post.body);
    }
  }, [isEditingPost, post.body]);

  async function savePostEdit() {
    const body = editingPostDraft.trim();

    if (!body) {
      return;
    }

    await onUpdatePost(body);
    setIsEditingPost(false);
  }

  async function saveCommentEdit(comment: MobileFeedPost["comments"][number]) {
    const body = editingCommentDraft.trim();

    if (!body) {
      return;
    }

    await onUpdateComment(comment, body);
    setEditingCommentId(null);
    setEditingCommentDraft("");
  }

  return (
    <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
      <View style={styles.feedAuthorRow}>
        <Pressable
          accessibilityLabel={authorName}
          accessibilityRole={onOpenBusiness ? "button" : undefined}
          disabled={!onOpenBusiness}
          onPress={onOpenBusiness}
          style={styles.feedAuthorIdentity}
        >
          {avatarUrl ? (
            <Image
              resizeMode="contain"
              source={{ uri: avatarUrl }}
              style={[
                styles.feedAvatar,
                isDarkMode ? styles.darkContentImageSurface : null,
              ]}
            />
          ) : (
            <View style={[styles.feedAvatar, isDarkMode ? styles.darkIconBox : null]}>
              {post.business_id ? (
                <Store color={isDarkMode ? "#E5E5EA" : "#111111"} size={18} />
              ) : (
                <UserRound color={isDarkMode ? "#E5E5EA" : "#111111"} size={18} />
              )}
            </View>
          )}
          <View style={styles.flex}>
            <Text
              numberOfLines={1}
              style={[styles.feedAuthorName, isDarkMode ? styles.darkText : null]}
            >
              {authorName}
            </Text>
            <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
              {formatMobileMessageDate(post.created_at)}
            </Text>
          </View>
        </Pressable>
        {isOwnPost ? (
          <View style={styles.feedCommentActionRow}>
            <Pressable
              accessibilityLabel={labels.edit}
              accessibilityRole="button"
              onPress={() => {
                setIsEditingPost(true);
                setEditingPostDraft(post.body);
              }}
              style={[
                styles.feedCommentIconButton,
                isDarkMode ? styles.darkIconBox : null,
              ]}
            >
              <Pencil
                color={isDarkMode ? "#E5E5EA" : "#111111"}
                size={14}
                strokeWidth={2.7}
              />
            </Pressable>
            <Pressable
              accessibilityLabel={labels.delete}
              accessibilityRole="button"
              onPress={onDeletePost}
              style={[
                styles.feedCommentIconButton,
                isDarkMode ? styles.darkIconBox : null,
              ]}
            >
              <Trash2
                color={isDarkMode ? "#E5E5EA" : "#111111"}
                size={14}
                strokeWidth={2.7}
              />
            </Pressable>
          </View>
        ) : null}
      </View>

      {isEditingPost ? (
        <View style={styles.feedCommentEditBox}>
          <TextInput
            maxLength={2000}
            multiline
            onChangeText={setEditingPostDraft}
            placeholder={labels.feedPostPlaceholder}
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#6E6E73"}
            style={[
              styles.input,
              styles.textArea,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={editingPostDraft}
          />
          <View style={styles.feedCommentEditActions}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                setIsEditingPost(false);
                setEditingPostDraft(post.body);
              }}
              style={[
                styles.feedCommentTextButton,
                isDarkMode ? styles.darkSettingRow : null,
              ]}
            >
              <Text
                style={[
                  styles.feedCommentTextButtonLabel,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                {labels.cancel}
              </Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={!editingPostDraft.trim()}
              onPress={() => {
                void savePostEdit();
              }}
              style={[
                styles.feedCommentTextButton,
                styles.feedCommentSaveButton,
                !editingPostDraft.trim() ? styles.disabledButton : null,
              ]}
            >
              <Text
                style={[
                  styles.feedCommentTextButtonLabel,
                  styles.feedCommentSaveButtonLabel,
                ]}
              >
                {labels.save}
              </Text>
            </Pressable>
          </View>
        </View>
      ) : (
        <Text style={[styles.feedBody, isDarkMode ? styles.darkText : null]}>
          {post.body}
        </Text>
      )}

      <View style={styles.feedActions}>
        <Pressable
          accessibilityRole="button"
          onPress={session ? onToggleLike : onRequireSignIn}
          style={[
            styles.feedActionButton,
            isDarkMode ? styles.darkSettingRow : null,
            post.likedByCurrentUser ? styles.activeFeedActionButton : null,
          ]}
        >
          <Heart
            color={post.likedByCurrentUser ? "#FFFFFF" : isDarkMode ? "#E5E5EA" : "#111111"}
            fill={post.likedByCurrentUser ? "#FFFFFF" : "transparent"}
            size={16}
            strokeWidth={2.6}
          />
          <Text
            style={[
              styles.feedActionText,
              isDarkMode ? styles.darkText : null,
              post.likedByCurrentUser ? styles.activeFeedActionText : null,
            ]}
          >
            {post.likeCount}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenComments}
          style={[styles.feedActionButton, isDarkMode ? styles.darkSettingRow : null]}
        >
          <MessageCircle color={isDarkMode ? "#E5E5EA" : "#111111"} size={16} />
          <Text style={[styles.feedActionText, isDarkMode ? styles.darkText : null]}>
            {post.commentCount}
          </Text>
        </Pressable>
      </View>

      {showDetail && post.comments.length ? (
        <View style={styles.feedComments}>
          {post.comments.map((comment) => {
            const commentAvatarUrl = getFeedCommentAvatarUrl(
              comment,
              session,
              profile,
            );
            const isOwnComment = session?.user.id === comment.author_id;
            const isEditingComment = editingCommentId === comment.id;

            return (
              <View
                key={comment.id}
                style={[
                  styles.feedComment,
                  isDarkMode ? styles.darkSettingRow : null,
                ]}
              >
                {commentAvatarUrl ? (
                  <Image
                    resizeMode="cover"
                    source={{ uri: commentAvatarUrl }}
                    style={styles.feedCommentAvatar}
                  />
                ) : (
                  <View
                    style={[
                      styles.feedCommentAvatarFallback,
                      isDarkMode ? styles.darkBadge : null,
                    ]}
                  >
                    <UserRound
                      color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                      size={16}
                      strokeWidth={2.6}
                    />
                  </View>
                )}
                <View style={styles.flex}>
                  <View style={styles.feedCommentHeader}>
                    <Text
                      style={[
                        styles.feedCommentAuthor,
                        isDarkMode ? styles.darkText : null,
                      ]}
                    >
                      {getFeedCommentAuthorName(comment, labels, session, profile)}
                    </Text>
                    {isOwnComment ? (
                      <View style={styles.feedCommentActionRow}>
                        <Pressable
                          accessibilityLabel={labels.edit}
                          accessibilityRole="button"
                          onPress={() => {
                            setEditingCommentId(comment.id);
                            setEditingCommentDraft(comment.body);
                          }}
                          style={[
                            styles.feedCommentIconButton,
                            isDarkMode ? styles.darkIconBox : null,
                          ]}
                        >
                          <Pencil
                            color={isDarkMode ? "#E5E5EA" : "#111111"}
                            size={14}
                            strokeWidth={2.7}
                          />
                        </Pressable>
                        <Pressable
                          accessibilityLabel={labels.delete}
                          accessibilityRole="button"
                          onPress={() => {
                            if (isEditingComment) {
                              setEditingCommentId(null);
                              setEditingCommentDraft("");
                            }

                            onDeleteComment(comment);
                          }}
                          style={[
                            styles.feedCommentIconButton,
                            isDarkMode ? styles.darkIconBox : null,
                          ]}
                        >
                          <Trash2
                            color={isDarkMode ? "#E5E5EA" : "#111111"}
                            size={14}
                            strokeWidth={2.7}
                          />
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  {isEditingComment ? (
                    <View style={styles.feedCommentEditBox}>
                      <TextInput
                        maxLength={1000}
                        multiline
                        onChangeText={setEditingCommentDraft}
                        placeholder={labels.commentPlaceholder}
                        placeholderTextColor={isDarkMode ? "#8E8E93" : "#6E6E73"}
                        style={[
                          styles.input,
                          styles.feedCommentEditInput,
                          isDarkMode ? styles.darkInput : null,
                        ]}
                        value={editingCommentDraft}
                      />
                      <View style={styles.feedCommentEditActions}>
                        <Pressable
                          accessibilityRole="button"
                          onPress={() => {
                            setEditingCommentId(null);
                            setEditingCommentDraft("");
                          }}
                          style={[
                            styles.feedCommentTextButton,
                            isDarkMode ? styles.darkSettingRow : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.feedCommentTextButtonLabel,
                              isDarkMode ? styles.darkText : null,
                            ]}
                          >
                            {labels.cancel}
                          </Text>
                        </Pressable>
                        <Pressable
                          accessibilityRole="button"
                          disabled={!editingCommentDraft.trim()}
                          onPress={() => {
                            void saveCommentEdit(comment);
                          }}
                          style={[
                            styles.feedCommentTextButton,
                            styles.feedCommentSaveButton,
                            !editingCommentDraft.trim()
                              ? styles.disabledButton
                              : null,
                          ]}
                        >
                          <Text
                            style={[
                              styles.feedCommentTextButtonLabel,
                              styles.feedCommentSaveButtonLabel,
                            ]}
                          >
                            {labels.save}
                          </Text>
                        </Pressable>
                      </View>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.feedCommentBody,
                        isDarkMode ? styles.darkMutedText : null,
                      ]}
                    >
                      {comment.body}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {showDetail && session ? (
        <View style={styles.feedCommentComposer}>
          <TextInput
            maxLength={1000}
            onChangeText={onCommentDraftChange}
            placeholder={labels.commentPlaceholder}
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#6E6E73"}
            style={[styles.input, styles.feedCommentInput, isDarkMode ? styles.darkInput : null]}
            value={commentDraft}
          />
          <SecondaryButton
            disabled={!commentDraft.trim()}
            isDarkMode={isDarkMode}
            label={labels.comment}
            onPress={onCreateComment}
          />
        </View>
      ) : null}
    </View>
  );
}

function FeedPostModal({
  commentDraft,
  isDarkMode,
  labels,
  onClose,
  onCommentDraftChange,
  onCreateComment,
  onDeleteComment,
  onOpenPostBusiness,
  onRequireSignIn,
  onUpdateComment,
  post,
  profile,
  session,
}: {
  commentDraft: string;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onClose: () => void;
  onCommentDraftChange: (value: string) => void;
  onCreateComment: () => Promise<void> | void;
  onDeleteComment: (comment: MobileFeedPost["comments"][number]) => void;
  onOpenPostBusiness?: () => void;
  onRequireSignIn: () => void;
  onUpdateComment: (
    comment: MobileFeedPost["comments"][number],
    body: string,
  ) => Promise<void> | void;
  post: MobileFeedPost | null;
  profile: UserProfile | null;
  session: Session | null;
}) {
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editingCommentDraft, setEditingCommentDraft] = useState("");

  useEffect(() => {
    setEditingCommentId(null);
    setEditingCommentDraft("");
  }, [post?.id]);

  async function saveCommentEdit(comment: MobileFeedPost["comments"][number]) {
    const body = editingCommentDraft.trim();

    if (!body) {
      return;
    }

    await onUpdateComment(comment, body);
    setEditingCommentId(null);
    setEditingCommentDraft("");
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={Boolean(post)}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalDismissLayer}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 14 : 0}
          pointerEvents="box-none"
          style={styles.modalKeyboardAvoider}
        >
          <View style={[styles.modalSheet, isDarkMode ? styles.darkModalSheet : null]}>
            {post ? (
              <>
                <View
                  style={[
                    styles.commentsModalHeader,
                    isDarkMode ? styles.darkCommentsModalHeader : null,
                  ]}
                >
                  <View style={styles.flex}>
                    <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                      {labels.comments}
                    </Text>
                    <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                      {post.commentCount}
                    </Text>
                  </View>
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
                      color={isDarkMode ? "#E5E5EA" : "#111111"}
                      size={19}
                      strokeWidth={2.7}
                    />
                  </Pressable>
                </View>
                <ScrollView
                  automaticallyAdjustKeyboardInsets
                  bounces
                  contentContainerStyle={styles.commentsModalList}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  style={styles.modalScroll}
                >
                  <View
                    style={[
                      styles.commentsPostPreview,
                      isDarkMode ? styles.darkSettingRow : null,
                    ]}
                  >
                    <Pressable
                      accessibilityLabel={getFeedPostAuthorName(
                        post,
                        labels,
                        session,
                        profile,
                      )}
                      accessibilityRole={onOpenPostBusiness ? "button" : undefined}
                      disabled={!onOpenPostBusiness}
                      onPress={onOpenPostBusiness}
                      style={styles.feedAuthorIdentity}
                    >
                      {getFeedPostAvatarUrl(post, session, profile) ? (
                        <Image
                          resizeMode="contain"
                          source={{
                            uri: getFeedPostAvatarUrl(post, session, profile) as string,
                          }}
                          style={[
                            styles.feedAvatar,
                            isDarkMode ? styles.darkContentImageSurface : null,
                          ]}
                        />
                      ) : (
                        <View
                          style={[
                            styles.feedAvatar,
                            isDarkMode ? styles.darkIconBox : null,
                          ]}
                        >
                          {post.business_id ? (
                            <Store
                              color={isDarkMode ? "#E5E5EA" : "#111111"}
                              size={18}
                            />
                          ) : (
                            <UserRound
                              color={isDarkMode ? "#E5E5EA" : "#111111"}
                              size={18}
                            />
                          )}
                        </View>
                      )}
                      <View style={styles.flex}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.feedAuthorName,
                            isDarkMode ? styles.darkText : null,
                          ]}
                        >
                          {getFeedPostAuthorName(post, labels, session, profile)}
                        </Text>
                        <Text
                          style={[
                            styles.mutedText,
                            isDarkMode ? styles.darkMutedText : null,
                          ]}
                        >
                          {formatMobileMessageDate(post.created_at)}
                        </Text>
                      </View>
                    </Pressable>
                    <Text style={[styles.feedBody, isDarkMode ? styles.darkText : null]}>
                      {post.body}
                    </Text>
                    <View style={styles.feedActions}>
                      <View
                        style={[
                          styles.feedActionButton,
                          isDarkMode ? styles.darkSettingRow : null,
                        ]}
                      >
                        <Heart
                          color={isDarkMode ? "#E5E5EA" : "#111111"}
                          fill="transparent"
                          size={16}
                          strokeWidth={2.6}
                        />
                        <Text
                          style={[
                            styles.feedActionText,
                            isDarkMode ? styles.darkText : null,
                          ]}
                        >
                          {post.likeCount}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.feedActionButton,
                          isDarkMode ? styles.darkSettingRow : null,
                        ]}
                      >
                        <MessageCircle
                          color={isDarkMode ? "#E5E5EA" : "#111111"}
                          size={16}
                          strokeWidth={2.6}
                        />
                        <Text
                          style={[
                            styles.feedActionText,
                            isDarkMode ? styles.darkText : null,
                          ]}
                        >
                          {post.commentCount}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {post.comments.length ? (
                    <View style={styles.feedComments}>
                      {post.comments.map((comment) => {
                        const commentAvatarUrl = getFeedCommentAvatarUrl(
                          comment,
                          session,
                          profile,
                        );
                        const isOwnComment = session?.user.id === comment.author_id;
                        const isEditingComment = editingCommentId === comment.id;

                        return (
                          <View
                            key={comment.id}
                            style={[
                              styles.feedComment,
                              styles.commentsModalItem,
                              isDarkMode ? styles.darkSettingRow : null,
                            ]}
                          >
                            {commentAvatarUrl ? (
                              <Image
                                resizeMode="cover"
                                source={{ uri: commentAvatarUrl }}
                                style={styles.feedCommentAvatar}
                              />
                            ) : (
                              <View
                                style={[
                                  styles.feedCommentAvatarFallback,
                                  isDarkMode ? styles.darkBadge : null,
                                ]}
                              >
                                <UserRound
                                  color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                                  size={16}
                                  strokeWidth={2.6}
                                />
                              </View>
                            )}
                            <View style={styles.flex}>
                              <View style={styles.feedCommentHeader}>
                                <Text
                                  style={[
                                    styles.feedCommentAuthor,
                                    isDarkMode ? styles.darkText : null,
                                  ]}
                                >
                                  {getFeedCommentAuthorName(
                                    comment,
                                    labels,
                                    session,
                                    profile,
                                  )}
                                </Text>
                                {isOwnComment ? (
                                  <View style={styles.feedCommentActionRow}>
                                    <Pressable
                                      accessibilityLabel={labels.edit}
                                      accessibilityRole="button"
                                      onPress={() => {
                                        setEditingCommentId(comment.id);
                                        setEditingCommentDraft(comment.body);
                                      }}
                                      style={[
                                        styles.feedCommentIconButton,
                                        isDarkMode ? styles.darkIconBox : null,
                                      ]}
                                    >
                                      <Pencil
                                        color={isDarkMode ? "#E5E5EA" : "#111111"}
                                        size={14}
                                        strokeWidth={2.7}
                                      />
                                    </Pressable>
                                    <Pressable
                                      accessibilityLabel={labels.delete}
                                      accessibilityRole="button"
                                      onPress={() => {
                                        if (isEditingComment) {
                                          setEditingCommentId(null);
                                          setEditingCommentDraft("");
                                        }

                                        onDeleteComment(comment);
                                      }}
                                      style={[
                                        styles.feedCommentIconButton,
                                        isDarkMode ? styles.darkIconBox : null,
                                      ]}
                                    >
                                      <Trash2
                                        color={isDarkMode ? "#E5E5EA" : "#111111"}
                                        size={14}
                                        strokeWidth={2.7}
                                      />
                                    </Pressable>
                                  </View>
                                ) : null}
                              </View>
                              {isEditingComment ? (
                                <View style={styles.feedCommentEditBox}>
                                  <TextInput
                                    maxLength={1000}
                                    multiline
                                    onChangeText={setEditingCommentDraft}
                                    placeholder={labels.commentPlaceholder}
                                    placeholderTextColor={
                                      isDarkMode ? "#8E8E93" : "#6E6E73"
                                    }
                                    style={[
                                      styles.input,
                                      styles.feedCommentEditInput,
                                      isDarkMode ? styles.darkInput : null,
                                    ]}
                                    value={editingCommentDraft}
                                  />
                                  <View style={styles.feedCommentEditActions}>
                                    <Pressable
                                      accessibilityRole="button"
                                      onPress={() => {
                                        setEditingCommentId(null);
                                        setEditingCommentDraft("");
                                      }}
                                      style={[
                                        styles.feedCommentTextButton,
                                        isDarkMode ? styles.darkSettingRow : null,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.feedCommentTextButtonLabel,
                                          isDarkMode ? styles.darkText : null,
                                        ]}
                                      >
                                        {labels.cancel}
                                      </Text>
                                    </Pressable>
                                    <Pressable
                                      accessibilityRole="button"
                                      disabled={!editingCommentDraft.trim()}
                                      onPress={() => {
                                        void saveCommentEdit(comment);
                                      }}
                                      style={[
                                        styles.feedCommentTextButton,
                                        styles.feedCommentSaveButton,
                                        !editingCommentDraft.trim()
                                          ? styles.disabledButton
                                          : null,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.feedCommentTextButtonLabel,
                                          styles.feedCommentSaveButtonLabel,
                                        ]}
                                      >
                                        {labels.save}
                                      </Text>
                                    </Pressable>
                                  </View>
                                </View>
                              ) : (
                                <Text
                                  style={[
                                    styles.feedCommentBody,
                                    isDarkMode ? styles.darkMutedText : null,
                                  ]}
                                >
                                  {comment.body}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  ) : (
                    <View style={styles.commentsModalEmpty}>
                      <MessageCircle
                        color={isDarkMode ? "#E5E5EA" : "#111111"}
                        size={28}
                        strokeWidth={2.6}
                      />
                      <Text
                        style={[
                          styles.emptyState,
                          isDarkMode ? styles.darkEmptyState : null,
                        ]}
                      >
                        {labels.noComments}
                      </Text>
                    </View>
                  )}
                </ScrollView>
                <View
                  style={[
                    styles.commentsComposerBar,
                    isDarkMode ? styles.darkCommentsComposerBar : null,
                  ]}
                >
                  {session ? (
                    <>
                      <TextInput
                        maxLength={1000}
                        onChangeText={onCommentDraftChange}
                        placeholder={labels.commentPlaceholder}
                        placeholderTextColor={isDarkMode ? "#8E8E93" : "#6E6E73"}
                        style={[
                          styles.input,
                          styles.commentsComposerInput,
                          isDarkMode ? styles.darkInput : null,
                        ]}
                        value={commentDraft}
                      />
                      <Pressable
                        accessibilityLabel={labels.comment}
                        accessibilityRole="button"
                        disabled={!commentDraft.trim()}
                        onPress={onCreateComment}
                        style={[
                          styles.commentsComposerButton,
                          !commentDraft.trim() ? styles.disabledButton : null,
                        ]}
                      >
                        <MessageCircle
                          color="#FFFFFF"
                          size={18}
                          strokeWidth={2.7}
                        />
                      </Pressable>
                    </>
                  ) : (
                    <PrimaryButton
                      label={labels.signIn}
                      onPress={() => {
                        onClose();
                        onRequireSignIn();
                      }}
                    />
                  )}
                </View>
              </>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function getFeedPostAuthorName(
  post: MobileFeedPost,
  labels: Record<string, string>,
  session: Session | null,
  profile: UserProfile | null,
) {
  if (post.business?.name) {
    return post.business.name;
  }

  if (session?.user.id === post.author_id) {
    return getProfileDisplayName(profile, session);
  }

  return post.author?.author_name || labels.user || labels.profile;
}

function getFeedPostAvatarUrl(
  post: MobileFeedPost,
  session: Session | null,
  profile: UserProfile | null,
) {
  if (post.business?.logo_url) {
    return getRenderableImageUrl(
      post.business.logo_url,
      imageOptimizationPresets.logo,
    );
  }

  const currentUserAvatar =
    session?.user.id === post.author_id
      ? getProfileAvatarUrl(profile, session)
      : "";

  return getRenderableImageUrl(
    currentUserAvatar || post.author?.author_avatar_url,
    imageOptimizationPresets.avatar,
  );
}

function getFeedCommentAuthorName(
  comment: MobileFeedPost["comments"][number],
  labels: Record<string, string>,
  session: Session | null,
  profile: UserProfile | null,
) {
  if (session?.user.id === comment.author_id) {
    return getProfileDisplayName(profile, session);
  }

  return comment.author?.author_name || labels.user || labels.profile;
}

function getFeedCommentAvatarUrl(
  comment: MobileFeedPost["comments"][number],
  session: Session | null,
  profile: UserProfile | null,
) {
  const currentUserAvatar =
    session?.user.id === comment.author_id
      ? getProfileAvatarUrl(profile, session)
      : "";

  return getRenderableImageUrl(
    currentUserAvatar || comment.author?.author_avatar_url,
    imageOptimizationPresets.avatar,
  );
}

function formatUnreadCount(count: number) {
  return count > 99 ? "99+" : String(count);
}

function useMessageThreadKeyboardInset(enabled: boolean) {
  const inset = useRef(
    new Animated.Value(MESSAGE_THREAD_BASE_BOTTOM_INSET),
  ).current;

  useEffect(() => {
    if (!enabled) {
      inset.stopAnimation();
      inset.setValue(MESSAGE_THREAD_BASE_BOTTOM_INSET);
      return;
    }

    function animateTo(value: number, event?: KeyboardEvent) {
      Animated.timing(inset, {
        duration: getKeyboardAnimationDuration(event),
        easing: Easing.bezier(0.2, 0, 0, 1),
        toValue: value,
        useNativeDriver: false,
      }).start();
    }

    const showSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        const keyboardHeight = Math.max(0, event.endCoordinates?.height ?? 0);
        animateTo(keyboardHeight + MESSAGE_THREAD_KEYBOARD_GAP, event);
      },
    );
    const hideSubscription = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      (event) => {
        animateTo(MESSAGE_THREAD_BASE_BOTTOM_INSET, event);
      },
    );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [enabled, inset]);

  return inset;
}

function getKeyboardAnimationDuration(event?: KeyboardEvent) {
  return Math.max(180, event?.duration ?? (Platform.OS === "ios" ? 260 : 220));
}

function hasConversationMessages(conversation: MobileConversation) {
  return Boolean(conversation.lastMessageAt || conversation.lastMessagePreview.trim());
}

function MessagesPageHeader({
  isDarkMode,
  labels,
  onBack,
  subtitle,
  title,
}: {
  isDarkMode: boolean;
  labels: Record<string, string>;
  onBack: () => void;
  subtitle?: string;
  title?: string;
}) {
  return (
    <View style={styles.messagesPageHeader}>
      <Pressable
        accessibilityLabel={labels.previous}
        accessibilityRole="button"
        onPress={onBack}
        style={[styles.messageBackButton, isDarkMode ? styles.darkSettingRow : null]}
      >
        <ArrowLeft
          color={isDarkMode ? "#E5E5EA" : "#111111"}
          size={21}
          strokeWidth={2.7}
        />
      </Pressable>
      <View style={styles.flex}>
        <Text
          ellipsizeMode="tail"
          numberOfLines={1}
          style={[styles.screenTitle, isDarkMode ? styles.darkText : null]}
        >
          {title ?? labels.messages}
        </Text>
        {subtitle ? (
          <Text
            numberOfLines={1}
            style={[styles.messageHeaderSubtitle, isDarkMode ? styles.darkMutedText : null]}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

function MessagesScreen({
  conversations,
  isDarkMode,
  isLoading,
  isSending,
  isThreadOpen,
  labels,
  messageDraft,
  messages,
  onBack,
  onRequireSignIn,
  onSelectConversation,
  onSendMessage,
  selectedConversation,
  session,
  setMessageDraft,
}: {
  conversations: MobileConversation[];
  isDarkMode: boolean;
  isLoading: boolean;
  isSending: boolean;
  isThreadOpen: boolean;
  labels: Record<string, string>;
  messageDraft: string;
  messages: MobileMessage[];
  onBack: () => void;
  onRequireSignIn: () => void;
  onSelectConversation: (conversationId: string) => void;
  onSendMessage: () => Promise<void> | void;
  selectedConversation: MobileConversation | null;
  session: Session | null;
  setMessageDraft: (value: string) => void;
}) {
  const inboxConversations = conversations.filter(hasConversationMessages);
  const keyboardBottomInset = useMessageThreadKeyboardInset(
    isThreadOpen && Boolean(selectedConversation),
  );

  if (!session) {
    return (
      <KeyboardAwareScreen>
        <MessagesPageHeader
          isDarkMode={isDarkMode}
          labels={labels}
          onBack={onBack}
        />
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <MessageCircle
            color={isDarkMode ? "#E5E5EA" : "#111111"}
            size={28}
            strokeWidth={2.6}
          />
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.messages}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.messagesIntro}
          </Text>
          <PrimaryButton label={labels.signIn} onPress={onRequireSignIn} />
        </View>
      </KeyboardAwareScreen>
    );
  }

  if (isThreadOpen && selectedConversation) {
    const title = getMobileConversationTitle(selectedConversation, session.user.id);
    const subtitle = getMobileConversationSubtitle(
      selectedConversation,
      session.user.id,
    );

    return (
      <View style={styles.flex}>
        <Animated.View
          style={[
            styles.messageThreadShell,
            { paddingBottom: keyboardBottomInset },
          ]}
        >
        <MessagesPageHeader
          isDarkMode={isDarkMode}
          labels={labels}
          onBack={onBack}
          subtitle={subtitle}
          title={title}
        />

        <ScrollView
          contentContainerStyle={styles.messageThreadScrollContent}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.messageThreadScroll}
        >
          <View style={styles.messageList}>
            {isLoading ? (
              <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
                {labels.loading}
              </Text>
            ) : messages.length ? (
              messages.map((message, messageIndex) => {
                const isMine = message.senderId === session.user.id;
                const isUnreadIncoming = !isMine && Boolean(message.isUnread);
                const shouldShowReadStatus =
                  isMine && messageIndex === messages.length - 1;
                const statusLabel = shouldShowReadStatus
                  ? getMobileMessageReadStatusLabel(
                      message,
                      selectedConversation,
                      session.user.id,
                      labels,
                    )
                  : "";

                return (
                  <View
                    key={message.id}
                    style={[
                      styles.messageBubbleRow,
                      isMine ? styles.messageBubbleRowMine : null,
                    ]}
                  >
                    <View
                      style={[
                        styles.messageBubble,
                        isMine
                          ? styles.messageBubbleMine
                          : isDarkMode
                            ? styles.darkSettingRow
                            : null,
                        isUnreadIncoming ? styles.unreadMessageBubble : null,
                        isUnreadIncoming && isDarkMode
                          ? styles.darkUnreadMessageBubble
                          : null,
                      ]}
                    >
                      {isUnreadIncoming ? (
                        <View style={styles.messageUnreadIndicator} />
                      ) : null}
                      <Text
                        style={[
                          styles.messageBody,
                          isMine || isDarkMode ? styles.darkText : null,
                        ]}
                      >
                        {message.body}
                      </Text>
                      <View
                        style={[
                          styles.messageMetaRow,
                          isMine ? styles.messageMetaRowMine : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.messageTime,
                            isMine ? styles.messageTimeMine : null,
                          ]}
                        >
                          {formatMobileMessageDate(message.createdAt)}
                        </Text>
                        {shouldShowReadStatus ? (
                          <Text
                            style={[
                              styles.messageReadStatus,
                              isMine ? styles.messageReadStatusMine : null,
                              !isMine && isDarkMode ? styles.darkMutedText : null,
                            ]}
                          >
                            {statusLabel}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  </View>
                );
              })
            ) : null}
          </View>
        </ScrollView>

        <View style={styles.messageComposer}>
          <TextInput
            multiline
            onChangeText={setMessageDraft}
            placeholder={labels.messagePlaceholder}
            placeholderTextColor={isDarkMode ? "#8E8E93" : "#6E6E73"}
            style={[
              styles.messageComposerInput,
              isDarkMode ? styles.darkInput : null,
            ]}
            value={messageDraft}
          />
          <Pressable
            accessibilityLabel={labels.sendMessage}
            accessibilityRole="button"
            disabled={isSending || !messageDraft.trim()}
            onPress={onSendMessage}
            style={[
              styles.messageSendButton,
              isSending || !messageDraft.trim() ? styles.disabledButton : null,
            ]}
          >
            <Send color="#FFFFFF" size={17} strokeWidth={2.8} />
          </Pressable>
        </View>
        </Animated.View>
      </View>
    );
  }

  return (
    <KeyboardAwareScreen>
      <MessagesPageHeader
        isDarkMode={isDarkMode}
        labels={labels}
        onBack={onBack}
      />

      {inboxConversations.length ? (
        <View style={styles.messageInboxList}>
          {inboxConversations.map((conversation) => (
            <Pressable
              accessibilityRole="button"
              key={conversation.id}
              onPress={() => onSelectConversation(conversation.id)}
              style={[styles.conversationRow, isDarkMode ? styles.darkSettingRow : null]}
            >
              <View style={styles.conversationRowText}>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.conversationTitle,
                    isDarkMode ? styles.darkText : null,
                  ]}
                >
                  {getMobileConversationTitle(conversation, session.user.id)}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[
                    styles.conversationPreview,
                    isDarkMode ? styles.darkMutedText : null,
                  ]}
                >
                  {conversation.lastMessagePreview || "..."}
                </Text>
              </View>
              <View style={styles.conversationRowMeta}>
                {conversation.unreadCount > 0 ? (
                  <View style={styles.conversationUnreadBadge}>
                    <Text style={styles.unreadBadgeText}>
                      {formatUnreadCount(conversation.unreadCount)}
                    </Text>
                  </View>
                ) : null}
                {conversation.lastMessageAt ? (
                  <Text style={[styles.conversationTime, isDarkMode ? styles.darkMutedText : null]}>
                    {formatMobileMessageDate(conversation.lastMessageAt)}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.messagesEmpty}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.messageStartHint}
          </Text>
        </View>
      )}
    </KeyboardAwareScreen>
  );
}

function ProfileScreen({
  activeProfilePanel,
  authMessage,
  business,
  contentItems,
  isDarkMode,
  isAppleSignInAvailable,
  isAuthBusy,
  isPushNotificationBusy,
  isSupabaseConfigured,
  labels,
  locale,
  onAppleSignIn,
  onBusinessPress,
  onBusinessSave,
  onBusinessSubmit,
  onCreateContent,
  onDeleteAccount,
  onDeleteContent,
  onEmailSignIn,
  onEmailSignUp,
  onProfileSave,
  onProfilePanelChange,
  onShareBusiness,
  onEnablePushNotifications,
  onShowWalkthrough,
  onSignIn,
  onSignOut,
  onToggleSavedBusiness,
  onUpdateContent,
  profile,
  pushNotificationStatus,
  savedBusinesses,
  savedBusyBusinessId,
  session,
  setIsDarkMode,
}: {
  activeProfilePanel: ProfilePanel;
  authMessage: string;
  business: Business | null;
  contentItems: BusinessContentItem[];
  isDarkMode: boolean;
  isAppleSignInAvailable: boolean;
  isAuthBusy: boolean;
  isPushNotificationBusy: boolean;
  isSupabaseConfigured: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onAppleSignIn: () => Promise<void>;
  onBusinessPress: (business: Business) => void;
  onBusinessSave: (business: Business) => Promise<void> | void;
  onBusinessSubmit: (input: BusinessRegistrationInput) => Promise<void>;
  onCreateContent: (input: BusinessContentInput) => Promise<void> | void;
  onDeleteAccount: () => Promise<void>;
  onDeleteContent: (contentItemId: string) => Promise<void> | void;
  onEmailSignIn: (email: string, password: string) => Promise<void>;
  onEmailSignUp: (email: string, password: string) => Promise<void>;
  onProfileSave: (input: ProfileUpdateInput) => Promise<UserProfile>;
  onProfilePanelChange: (panel: ProfilePanel) => void;
  onShareBusiness: (business: Business) => Promise<void>;
  onEnablePushNotifications: () => Promise<void>;
  onShowWalkthrough: () => void;
  onSignIn: () => Promise<void>;
  onSignOut: () => Promise<void>;
  onToggleSavedBusiness: (business: Business) => void;
  onUpdateContent: (input: BusinessContentUpdateInput) => Promise<void> | void;
  profile: UserProfile | null;
  pushNotificationStatus: PushNotificationStatus;
  savedBusinesses: Business[];
  savedBusyBusinessId: string | null;
  session: Session | null;
  setIsDarkMode: (value: boolean) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const profileName = getProfileDisplayName(profile, session);
  const signInEmail = session?.user.email ?? profile?.email ?? "";
  const contactEmail = getProfileContactEmail(profile, session);
  const profileAvatarUrl = getProfileAvatarUrl(profile, session);
  const [isEditingPersonalProfile, setIsEditingPersonalProfile] =
    useState(false);
  const [profileDraftName, setProfileDraftName] = useState(profileName);
  const [profileDraftContactEmail, setProfileDraftContactEmail] =
    useState(contactEmail);
  const [profileDraftAvatar, setProfileDraftAvatar] =
    useState<ProfileAvatarInput | null>(null);
  const [profileSaveError, setProfileSaveError] = useState("");
  const [profileSaveMessage, setProfileSaveMessage] = useState("");
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  useEffect(() => {
    if (!isEditingPersonalProfile) {
      setProfileDraftName(profileName);
      setProfileDraftContactEmail(contactEmail);
      setProfileDraftAvatar(null);
    }
  }, [contactEmail, isEditingPersonalProfile, profileName]);

  async function handleEmailSubmit() {
    await onEmailSignIn(email, password);
    setPassword("");
  }

  async function handleEmailCreate() {
    await onEmailSignUp(email, password);
    setPassword("");
  }

  async function handleProfileAvatarPick() {
    setProfileSaveError("");
    setProfileSaveMessage("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      setProfileSaveError(labels.logoPermission);
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      quality: 0.72,
    });

    if (result.canceled) {
      return;
    }

    const asset = result.assets[0];

    if (!asset?.uri) {
      return;
    }

    const normalizedAvatar = await normalizePickedUploadImage(asset, {
      fileNamePrefix: "profile-avatar",
      maxEdge: 900,
      quality: 0.78,
    });

    setProfileDraftAvatar(normalizedAvatar);
  }

  async function handleProfileSave() {
    setProfileSaveError("");
    setProfileSaveMessage("");

    if (!profileDraftName.trim()) {
      setProfileSaveError(labels.profileNameRequired);
      return;
    }

    try {
      setIsProfileSaving(true);
      await onProfileSave({
        avatar: profileDraftAvatar,
        contactEmail: profileDraftContactEmail,
        fullName: profileDraftName,
      });
      setProfileSaveMessage(labels.profileSaved);
      setProfileDraftAvatar(null);
      setIsEditingPersonalProfile(false);
    } catch (error) {
      console.error("[kolo:mobile-profile-save]", error);
      setProfileSaveError(getErrorMessage(error));
    } finally {
      setIsProfileSaving(false);
    }
  }

  function handleDeleteAccountPress() {
    Alert.alert(labels.deleteAccountTitle, labels.deleteAccountMessage, [
      {
        style: "cancel",
        text: labels.cancel,
      },
      {
        onPress: () => {
          void onDeleteAccount();
        },
        style: "destructive",
        text: labels.deleteAccountConfirm,
      },
    ]);
  }

  if (activeProfilePanel === "addBusiness") {
    return (
      <RegisterScreen
        activeProfilePanel={activeProfilePanel}
        isDarkMode={isDarkMode}
        isSignedIn={Boolean(session)}
        labels={labels}
        locale={locale}
        onProfilePanelChange={onProfilePanelChange}
        onSubmit={onBusinessSubmit}
      />
    );
  }

  if (activeProfilePanel === "businessInfo") {
    return (
      <DashboardScreen
        activeProfilePanel={activeProfilePanel}
        business={business}
        contentItems={contentItems}
        isDarkMode={isDarkMode}
        labels={labels}
        locale={locale}
        onCreateContent={onCreateContent}
        onDeleteContent={onDeleteContent}
        onProfilePanelChange={onProfilePanelChange}
        onSave={onBusinessSave}
        onUpdateContent={onUpdateContent}
      />
    );
  }

  return (
    <KeyboardAwareScreen>
      <ProfilePanelTabs
        activePanel={activeProfilePanel}
        isDarkMode={isDarkMode}
        labels={labels}
        onChange={onProfilePanelChange}
      />
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
              {contactEmail || signInEmail}
            </Text>
            {signInEmail && signInEmail !== contactEmail ? (
              <Text
                style={[
                  styles.settingMeta,
                  isDarkMode ? styles.darkMutedText : null,
                ]}
              >
                {labels.googleEmail}: {signInEmail}
              </Text>
            ) : null}
          </View>
          <Pressable
            accessibilityLabel={labels.editPersonalProfile}
            accessibilityRole="button"
            onPress={() => {
              setProfileSaveError("");
              setProfileSaveMessage("");
              setIsEditingPersonalProfile(true);
            }}
            style={[styles.iconActionButton, isDarkMode ? styles.darkIconBox : null]}
          >
            <Pencil
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={18}
              strokeWidth={2.7}
            />
          </Pressable>
        </View>
      ) : null}

      {session && profileSaveMessage ? (
        <Text style={[styles.successText, isDarkMode ? styles.darkAlertText : null]}>
          {profileSaveMessage}
        </Text>
      ) : null}

      {session && isEditingPersonalProfile ? (
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <View style={styles.dashboardEditHeader}>
            <View style={styles.flex}>
              <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
                {labels.editPersonalProfile}
              </Text>
              <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                {labels.googleEmail}: {signInEmail}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={labels.close}
              accessibilityRole="button"
              onPress={() => {
                setIsEditingPersonalProfile(false);
                setProfileSaveError("");
                setProfileSaveMessage("");
                setProfileDraftName(profileName);
                setProfileDraftContactEmail(contactEmail);
                setProfileDraftAvatar(null);
              }}
              style={[styles.iconActionButton, isDarkMode ? styles.darkIconBox : null]}
            >
              <X
                color={isDarkMode ? "#E5E5EA" : "#111111"}
                size={19}
                strokeWidth={2.7}
              />
            </Pressable>
          </View>

          <Field isDarkMode={isDarkMode} label={labels.personalName}>
            <TextInput
              onChangeText={(value) => {
                setProfileDraftName(value);
                setProfileSaveError("");
                setProfileSaveMessage("");
              }}
              placeholder={labels.personalName}
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              value={profileDraftName}
            />
          </Field>

          <Field isDarkMode={isDarkMode} label={labels.contactEmail}>
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              onChangeText={(value) => {
                setProfileDraftContactEmail(value);
                setProfileSaveError("");
                setProfileSaveMessage("");
              }}
              placeholder="email@example.com"
              placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
              style={[styles.input, isDarkMode ? styles.darkInput : null]}
              textContentType="emailAddress"
              value={profileDraftContactEmail}
            />
          </Field>

          <Field isDarkMode={isDarkMode} label={labels.profilePhoto}>
            <Pressable
              accessibilityRole="button"
              onPress={() => {
                void handleProfileAvatarPick();
              }}
              style={[
                styles.logoUploadButton,
                isDarkMode ? styles.darkSettingRow : null,
              ]}
            >
              <View style={[styles.logoUploadPreview, isDarkMode ? styles.darkIconBox : null]}>
                {profileDraftAvatar?.uri || profileAvatarUrl ? (
                  <Image
                    source={{ uri: profileDraftAvatar?.uri ?? profileAvatarUrl ?? "" }}
                    style={styles.logoPreviewImage}
                  />
                ) : (
                  <Upload
                    color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                    size={24}
                    strokeWidth={2.5}
                  />
                )}
              </View>
              <View style={styles.flex}>
                <Text style={[styles.logoUploadTitle, isDarkMode ? styles.darkText : null]}>
                  {profileDraftAvatar
                    ? labels.profilePhotoSelected
                    : labels.profilePhotoUpload}
                </Text>
                <Text style={[styles.logoUploadHint, isDarkMode ? styles.darkMutedText : null]}>
                  {profileDraftAvatar?.fileName ?? labels.profilePhotoHint}
                </Text>
              </View>
            </Pressable>
          </Field>

          <PrimaryButton
            disabled={isProfileSaving || !isSupabaseConfigured}
            label={isProfileSaving ? labels.saving : labels.saveChanges}
            onPress={() => {
              void handleProfileSave();
            }}
          />
          <SecondaryButton
            disabled={isProfileSaving}
            label={labels.cancel}
            onPress={() => {
              setIsEditingPersonalProfile(false);
              setProfileSaveError("");
              setProfileDraftName(profileName);
              setProfileDraftContactEmail(contactEmail);
              setProfileDraftAvatar(null);
            }}
          />
          {profileSaveError ? (
            <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
              {profileSaveError}
            </Text>
          ) : null}
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
            {isAppleSignInAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonStyle={
                  isDarkMode
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                buttonType={
                  AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN
                }
                cornerRadius={14}
                onPress={() => {
                  void onAppleSignIn();
                }}
                style={styles.appleSignInButton}
              />
            ) : null}
            <PrimaryButton
              disabled={isAuthBusy || !isSupabaseConfigured}
              label={labels.signInGoogle}
              onPress={() => {
                void onSignIn();
              }}
            />

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
                  placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
                  placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
              <SecondaryButton
                disabled={isAuthBusy || !isSupabaseConfigured}
                label={labels.createAccountEmail}
                onPress={() => {
                  void handleEmailCreate();
                }}
              />
            </View>
          </>
        )}
        {!isSupabaseConfigured ? (
          <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
            {labels.notConfigured}
          </Text>
        ) : null}
        {authMessage ? (
          <Text style={[styles.errorText, isDarkMode ? styles.darkAlertText : null]}>
            {authMessage}
          </Text>
        ) : null}
      </View>

      {session ? (
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.savedBusinesses}
          </Text>
          {savedBusinesses.length > 0 ? (
            <View style={styles.savedBusinessList}>
              {savedBusinesses.map((business) => (
                <SavedBusinessCard
                  business={business}
                  isDarkMode={isDarkMode}
                  key={business.id}
                  labels={labels}
                  onPress={() => onBusinessPress(business)}
                  onRemove={() => onToggleSavedBusiness(business)}
                  saveBusy={savedBusyBusinessId === business.id}
                />
              ))}
            </View>
          ) : (
            <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
              {labels.noSavedBusinesses}
            </Text>
          )}
        </View>
      ) : null}

      {session ? (
        <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
            {labels.accountDeletionTitle}
          </Text>
          <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
            {labels.accountDeletionNote}
          </Text>
          <DangerButton
            disabled={isAuthBusy || !isSupabaseConfigured}
            label={labels.deleteAccount}
            onPress={handleDeleteAccountPress}
          />
        </View>
      ) : null}

      <View style={[styles.card, isDarkMode ? styles.darkCard : null]}>
        <Text style={[styles.sectionTitle, isDarkMode ? styles.darkText : null]}>
          {labels.settings}
        </Text>

        <View style={[styles.settingsRow, isDarkMode ? styles.darkSettingRow : null]}>
          <View style={styles.settingLabelRow}>
            {isDarkMode ? (
              <Moon color="#E5E5EA" size={20} strokeWidth={2.4} />
            ) : (
              <Sun color="#6E6E73" size={20} strokeWidth={2.4} />
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
            thumbColor={isDarkMode ? "#FFFFFF" : "#111111"}
            trackColor={{ false: "#E5E5EA", true: "#6E6E73" }}
            value={isDarkMode}
          />
        </View>

        {session ? (
          <View style={[styles.settingsRow, isDarkMode ? styles.darkSettingRow : null]}>
            <View style={[styles.settingLabelRow, styles.flex]}>
              <Bell
                color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                size={20}
                strokeWidth={2.4}
              />
              <View style={styles.flex}>
                <Text
                  style={[
                    styles.switchLabel,
                    isDarkMode ? styles.darkText : null,
                  ]}
                >
                  {labels.pushNotifications}
                </Text>
                <Text
                  style={[
                    styles.settingMeta,
                    isDarkMode ? styles.darkMutedText : null,
                  ]}
                >
                  {getPushNotificationStatusText(pushNotificationStatus, labels)}
                </Text>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              disabled={
                isPushNotificationBusy ||
                !isSupabaseConfigured ||
                pushNotificationStatus === "enabled"
              }
              onPress={() => {
                void onEnablePushNotifications();
              }}
              style={[
                styles.settingsActionButton,
                pushNotificationStatus === "enabled"
                  ? styles.settingsActionButtonEnabled
                  : null,
                isPushNotificationBusy || !isSupabaseConfigured
                  ? styles.settingsActionButtonDisabled
                  : null,
              ]}
            >
              <Text style={styles.settingsActionButtonText}>
                {isPushNotificationBusy
                  ? labels.pushNotificationsBusy
                  : pushNotificationStatus === "enabled"
                    ? labels.pushNotificationsOn
                    : labels.pushNotificationsTurnOn}
              </Text>
            </Pressable>
          </View>
        ) : null}

        <SecondaryButton
          isDarkMode={isDarkMode}
          label={labels.walkthroughAgain}
          onPress={onShowWalkthrough}
        />
      </View>
    </KeyboardAwareScreen>
  );
}

function HomeBusinessFeatureCard({
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
  const contentCount = business.contentItems?.length ?? 0;
  const logoUrl = getRenderableImageUrl(
    business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const [hasLogoImageError, setHasLogoImageError] = useState(false);

  useEffect(() => {
    setHasLogoImageError(false);
  }, [logoUrl]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.homeFeatureCard, isDarkMode ? styles.darkBusinessCard : null]}
    >
      <View style={styles.homeFeatureTopRow}>
        {logoUrl && !hasLogoImageError ? (
          <Image
            onError={() => setHasLogoImageError(true)}
            resizeMode="contain"
            source={{ uri: logoUrl }}
            style={styles.homeFeatureLogo}
          />
        ) : null}
        <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
          {getCategoryName(business.categorySlug, locale)}
        </Text>
      </View>
      <Text
        numberOfLines={2}
        style={[styles.homeFeatureName, isDarkMode ? styles.darkText : null]}
      >
        {business.name}
      </Text>
      <Text style={[styles.homeFeatureMeta, isDarkMode ? styles.darkMutedText : null]}>
        {business.servesAllCanada ? labels.canadaWide : business.city}
      </Text>
      {hasBusinessFollowers(business) ? (
        <Text style={[styles.followerBadge, isDarkMode ? styles.darkBadge : null]}>
          {getFollowerLabel(business, labels)}
        </Text>
      ) : null}
      <Text
        numberOfLines={2}
        style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}
      >
        {business.description}
      </Text>
      {contentCount > 0 ? (
        <Text style={[styles.homeFeatureSignal, isDarkMode ? styles.darkBadge : null]}>
          {contentCount} {labels.contentItems}
        </Text>
      ) : null}
    </Pressable>
  );
}

function SavedBusinessCard({
  business,
  isDarkMode,
  labels,
  onPress,
  onRemove,
  saveBusy,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onPress: () => void;
  onRemove: () => void;
  saveBusy: boolean;
}) {
  const logoUrl = getRenderableImageUrl(
    business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const [hasLogoImageError, setHasLogoImageError] = useState(false);

  useEffect(() => {
    setHasLogoImageError(false);
  }, [logoUrl]);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.savedBusinessCard, isDarkMode ? styles.darkSavedBusinessCard : null]}
    >
      {logoUrl && !hasLogoImageError ? (
        <Image
          onError={() => setHasLogoImageError(true)}
          resizeMode="contain"
          source={{ uri: logoUrl }}
          style={[styles.savedBusinessLogo, isDarkMode ? styles.darkContentImageSurface : null]}
        />
      ) : null}
      <View style={styles.flex}>
        <Text
          numberOfLines={1}
          style={[styles.savedBusinessName, isDarkMode ? styles.darkText : null]}
        >
          {business.name}
        </Text>
        <Text
          numberOfLines={1}
          style={[styles.savedBusinessMeta, isDarkMode ? styles.darkMutedText : null]}
        >
          {business.servesAllCanada ? labels.canadaWide : business.city}
        </Text>
      </View>
      <Pressable
        accessibilityLabel={labels.removeSavedBusiness}
        accessibilityRole="button"
        disabled={saveBusy}
        onPress={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        style={[styles.savedBusinessRemoveButton, isDarkMode ? styles.darkIconBox : null]}
      >
        <X color={isDarkMode ? "#E5E5EA" : "#6E6E73"} size={16} strokeWidth={2.7} />
      </Pressable>
    </Pressable>
  );
}

function BusinessCard({
  business,
  canViewContacts,
  isDarkMode,
  labels,
  locale,
  onPress,
  onShare,
  onToggleSaved,
  saveBusy,
}: {
  business: Business;
  canViewContacts: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onPress: () => void;
  onShare: () => void;
  onToggleSaved: () => void;
  saveBusy: boolean;
}) {
  const hasContacts = hasBusinessContacts(business);
  const saveLabel = business.isSaved ? labels.savedBusiness : labels.saveBusiness;
  const followerLabel = hasBusinessFollowers(business)
    ? getFollowerLabel(business, labels)
    : "";

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
        <View style={styles.cardHeaderActions}>
          <BusinessCardLogo
            business={business}
            isDarkMode={isDarkMode}
            labels={labels}
          />
          <Pressable
            accessibilityLabel={labels.shareBusiness}
            accessibilityRole="button"
            onPress={(event) => {
              event.stopPropagation();
              onShare();
            }}
            style={[
              styles.saveIconButton,
              isDarkMode ? styles.darkIconBox : null,
            ]}
          >
            <Share2
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={17}
              strokeWidth={2.7}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={saveLabel}
            accessibilityRole="button"
            disabled={saveBusy}
            onPress={(event) => {
              event.stopPropagation();
              onToggleSaved();
            }}
            style={[
              styles.saveIconButton,
              isDarkMode ? styles.darkIconBox : null,
              business.isSaved ? styles.activeSaveIconButton : null,
            ]}
          >
            <Bookmark
              color={business.isSaved ? "#FFFFFF" : isDarkMode ? "#E5E5EA" : "#111111"}
              fill={business.isSaved ? "#FFFFFF" : "transparent"}
              size={17}
              strokeWidth={2.7}
            />
          </Pressable>
        </View>
      </View>
      <Text style={[styles.businessName, isDarkMode ? styles.darkText : null]}>
        {business.name}
      </Text>
      <View style={styles.metaRow}>
        {followerLabel ? (
          <Text style={[styles.followerBadge, isDarkMode ? styles.darkBadge : null]}>
            {followerLabel}
          </Text>
        ) : null}
        {business.servesAllCanada ? (
          <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
            {labels.canadaWide}
          </Text>
        ) : null}
        <Text style={[styles.cityText, isDarkMode ? styles.darkMutedText : null]}>
          {business.city}
        </Text>
      </View>
      <Text
        ellipsizeMode="tail"
        numberOfLines={2}
        style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}
      >
        {business.description}
      </Text>
      {hasContacts && !canViewContacts ? (
        <View style={[styles.lockedContactNote, isDarkMode ? styles.darkSettingRow : null]}>
          <Lock
            color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
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

function BusinessCardLogo({
  business,
  isDarkMode,
  labels,
}: {
  business: Business;
  isDarkMode: boolean;
  labels: Record<string, string>;
}) {
  const logoUrl = getRenderableImageUrl(
    business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const [hasImageError, setHasImageError] = useState(false);

  useEffect(() => {
    setHasImageError(false);
  }, [logoUrl]);

  if (logoUrl && !hasImageError) {
    return (
      <Image
        accessibilityLabel={`${business.name} ${labels.logo}`}
        onError={() => setHasImageError(true)}
        resizeMode="contain"
        source={{ uri: logoUrl }}
        style={[
          styles.cardBusinessLogo,
          isDarkMode ? styles.darkContentImageSurface : null,
        ]}
      />
    );
  }

  return null;
}

function PublicContentCard({
  business,
  canViewContacts,
  isDarkMode,
  item,
  labels,
  onPress,
  onShare,
  presentation = "default",
  showBusinessName,
}: {
  business: Business;
  canViewContacts: boolean;
  isDarkMode: boolean;
  item: BusinessContentItem;
  labels: Record<string, string>;
  onPress?: () => void;
  onShare?: () => void;
  presentation?: "default" | "event";
  showBusinessName?: boolean;
}) {
  const coverImageUrl = getContentImageUrls(
    item,
    imageOptimizationPresets.thumbnail,
  )[0];
  const metaItems = [
    item.type === "product"
      ? item.isAvailable
        ? labels.available
        : labels.outOfStock
      : undefined,
    item.isFree ? labels.free : formatPriceWithCurrency(item.price),
    item.isOnline ? labels.online : undefined,
    item.startsAt ? formatContentDate(item.startsAt) : undefined,
    canViewContacts ? item.location : undefined,
  ].filter((value): value is string => Boolean(value));
  const contentLinkUrl =
    canViewContacts && item.linkUrl ? getWebsiteUrl(item.linkUrl) : null;
  const hasLockedContacts =
    !canViewContacts && Boolean(item.location || item.linkUrl);

  return (
    <Pressable
      accessibilityRole={onPress ? "button" : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.contentItemCard,
        presentation === "event" ? styles.eventContentCard : null,
        isDarkMode ? styles.darkSettingRow : null,
        presentation === "event" && isDarkMode ? styles.darkEventContentCard : null,
      ]}
    >
      {coverImageUrl ? (
        <Image
          resizeMode="cover"
          source={{ uri: coverImageUrl }}
          style={[
            styles.contentItemImage,
            presentation === "event" ? styles.eventContentImage : null,
            isDarkMode ? styles.darkContentImageSurface : null,
          ]}
        />
      ) : null}
      <View
        style={[
          styles.contentItemBody,
          presentation === "event" ? styles.eventContentBody : null,
          isDarkMode ? styles.darkContentItemBody : null,
        ]}
      >
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
          <View style={styles.contentItemActions}>
            <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
              {getContentTypeLabel(item, labels)}
            </Text>
            {onShare ? (
              <Pressable
                accessibilityLabel={labels.shareBusiness}
                accessibilityRole="button"
                onPress={(event) => {
                  event.stopPropagation();
                  onShare();
                }}
                style={[
                  styles.contentItemActionButton,
                  isDarkMode ? styles.darkIconBox : null,
                ]}
              >
                <Share2
                  color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                  size={16}
                  strokeWidth={2.6}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
        <Text
          numberOfLines={2}
          style={[styles.descriptionText, isDarkMode ? styles.darkMutedText : null]}
        >
          {item.description}
        </Text>
        {metaItems.length ? (
          <Text style={[styles.contentItemMeta, isDarkMode ? styles.darkMutedText : null]}>
            {metaItems.join(" | ")}
          </Text>
        ) : null}
        {item.linkUrl && contentLinkUrl ? (
          <Pressable
            accessibilityLabel={`${labels.contentLink}: ${item.linkUrl}`}
            accessibilityRole="link"
            onPress={(event) => {
              event.stopPropagation();
              void openContactUrl(contentLinkUrl);
            }}
            style={[
              styles.contentItemLinkButton,
              isDarkMode ? styles.darkIconBox : null,
            ]}
          >
            <ExternalLink
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={15}
              strokeWidth={2.7}
            />
            <Text
              numberOfLines={1}
              style={[
                styles.contentItemLinkText,
                isDarkMode ? styles.darkText : null,
              ]}
            >
              {item.linkUrl}
            </Text>
          </Pressable>
        ) : null}
        {hasLockedContacts ? (
          <View style={[styles.lockedContactNote, isDarkMode ? styles.darkSettingRow : null]}>
            <Lock
              color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
              size={16}
              strokeWidth={2.6}
            />
            <Text style={[styles.lockedContactTitle, isDarkMode ? styles.darkText : null]}>
              {labels.contactSignInTitle}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function AnnouncementCenter({
  announcements,
  isDarkMode,
  labels,
  locale,
  onDismiss,
  onDismissAll,
}: {
  announcements: AppAnnouncement[];
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onDismiss: (announcementId: string) => void;
  onDismissAll: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const latestAnnouncement = announcements[0];

  useEffect(() => {
    if (announcements.length === 0) {
      setIsOpen(false);
    }
  }, [announcements.length]);

  if (!latestAnnouncement) {
    return null;
  }

  return (
    <>
      <View style={styles.announcementBannerSlot}>
        <Pressable
          accessibilityLabel={labels.notifications}
          accessibilityRole="button"
          onPress={() => setIsOpen(true)}
          style={[styles.announcementBanner, isDarkMode ? styles.darkCard : null]}
        >
          <View style={[styles.announcementIconBox, isDarkMode ? styles.darkIconBox : null]}>
            <Bell
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={17}
              strokeWidth={2.7}
            />
          </View>
          <View style={styles.flex}>
            <Text style={[styles.announcementBadge, isDarkMode ? styles.darkMutedText : null]}>
              {latestAnnouncement.badge[locale]}
            </Text>
            <Text style={[styles.announcementTitle, isDarkMode ? styles.darkText : null]}>
              {latestAnnouncement.title[locale]}
            </Text>
          </View>
          <Text style={[styles.announcementCount, isDarkMode ? styles.darkBadge : null]}>
            {announcements.length}
          </Text>
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        onRequestClose={() => setIsOpen(false)}
        presentationStyle="overFullScreen"
        transparent
        visible={isOpen}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setIsOpen(false)}
            style={styles.modalDismissLayer}
          />
          <View
            style={[
              styles.announcementSheet,
              isDarkMode ? styles.darkModalSheet : null,
            ]}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                  {labels.notifications}
                </Text>
                <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                  {announcements.length} {labels.notifications.toLowerCase()}
                </Text>
              </View>
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
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={19}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.announcementList}
              showsVerticalScrollIndicator={false}
            >
              {announcements.map((announcement) => (
                <View
                  key={announcement.id}
                  style={[
                    styles.announcementCard,
                    isDarkMode ? styles.darkSettingRow : null,
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <Text
                      style={[
                        styles.announcementBadge,
                        isDarkMode ? styles.darkMutedText : null,
                      ]}
                    >
                      {announcement.badge[locale]}
                    </Text>
                    <Pressable
                      accessibilityLabel={labels.dismiss}
                      accessibilityRole="button"
                      onPress={() => onDismiss(announcement.id)}
                      style={[
                        styles.contentItemActionButton,
                        isDarkMode ? styles.darkIconBox : null,
                      ]}
                    >
                      <X
                        color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                        size={16}
                        strokeWidth={2.6}
                      />
                    </Pressable>
                  </View>
                  <Text
                    style={[
                      styles.announcementCardTitle,
                      isDarkMode ? styles.darkText : null,
                    ]}
                  >
                    {announcement.title[locale]}
                  </Text>
                  <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                    {announcement.body[locale]}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {announcements.length > 1 ? (
              <SecondaryButton
                label={labels.dismissAll}
                onPress={() => {
                  onDismissAll();
                  setIsOpen(false);
                }}
              />
            ) : null}
          </View>
        </View>
      </Modal>
    </>
  );
}

function getWalkthroughSteps(labels: Record<string, string>): AppTourStep[] {
  return [
    {
      focus: "homeDiscovery",
      Icon: Home,
      tab: "home",
      target: labels.walkthroughHomeTarget,
      title: labels.walkthroughHomeTitle,
      text: labels.walkthroughHomeText,
    },
    {
      focus: "searchFilters",
      Icon: Search,
      tab: "search",
      target: labels.walkthroughSearchTarget,
      title: labels.walkthroughSearchTitle,
      text: labels.walkthroughSearchText,
    },
    {
      focus: "feedActions",
      Icon: MessageCircle,
      tab: "feed",
      target: labels.walkthroughFeedTarget,
      title: labels.walkthroughFeedTitle,
      text: labels.walkthroughFeedText,
    },
    {
      focus: "eventsFeed",
      Icon: CalendarDays,
      tab: "events",
      target: labels.walkthroughEventsTarget,
      title: labels.walkthroughEventsTitle,
      text: labels.walkthroughEventsText,
    },
    {
      focus: "profileControls",
      Icon: UserRound,
      profilePanel: "account",
      tab: "profile",
      target: labels.walkthroughProfileTarget,
      title: labels.walkthroughProfileTitle,
      text: labels.walkthroughProfileText,
    },
    {
      focus: "addBusinessForm",
      Icon: Plus,
      profilePanel: "addBusiness",
      tab: "profile",
      target: labels.walkthroughAddBusinessTarget,
      title: labels.walkthroughAddBusinessTitle,
      text: labels.walkthroughAddBusinessText,
    },
    {
      focus: "businessDashboard",
      Icon: Store,
      profilePanel: "businessInfo",
      tab: "profile",
      target: labels.walkthroughBusinessTarget,
      title: labels.walkthroughBusinessTitle,
      text: labels.walkthroughBusinessText,
    },
  ];
}

function getIntroductionFocusStyle(focus: AppTourFocus) {
  const screenHeight = Dimensions.get("window").height;
  const highTop = Platform.OS === "android" ? 82 : 92;
  const bottomTabSafeZone = 156;

  switch (focus) {
    case "homeDiscovery":
      return {
        height: Math.min(260, Math.round(screenHeight * 0.32)),
        left: 10,
        right: 10,
        top: Platform.OS === "android" ? 72 : 82,
      };
    case "searchFilters":
      return {
        height: Math.min(330, Math.round(screenHeight * 0.42)),
        left: 8,
        right: 8,
        top: Platform.OS === "android" ? 76 : 86,
      };
    case "feedActions":
      return {
        height: Math.max(260, screenHeight - highTop - bottomTabSafeZone),
        left: 10,
        right: 10,
        top: highTop,
      };
    case "eventsFeed":
      return {
        height: Math.min(330, Math.round(screenHeight * 0.42)),
        left: 10,
        right: 10,
        top: highTop,
      };
    case "profileControls":
      return {
        height: 210,
        left: 10,
        right: 10,
        top: Platform.OS === "android" ? 82 : 92,
      };
    case "addBusinessForm":
      return {
        height: Math.min(330, Math.round(screenHeight * 0.42)),
        left: 10,
        right: 10,
        top: Platform.OS === "android" ? 82 : 92,
      };
    case "businessDashboard":
      return {
        height: Math.min(340, Math.round(screenHeight * 0.44)),
        left: 10,
        right: 10,
        top: Platform.OS === "android" ? 82 : 92,
      };
    default:
      return {
        height: 180,
        left: 14,
        right: 14,
        top: highTop,
      };
  }
}

function GuidedIntroductionOverlay({
  activeStepIndex,
  isDarkMode,
  labels,
  onBack,
  onClose,
  onNext,
  phase,
  steps,
  visible,
}: {
  activeStepIndex: number;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onBack: () => void;
  onClose: () => void;
  onNext: () => void;
  phase: AppTourPhase;
  steps: AppTourStep[];
  visible: boolean;
}) {
  const activeStep = steps[activeStepIndex] ?? steps[0];
  const ActiveStepIcon = activeStep?.Icon;
  const isLastStep = activeStepIndex === steps.length - 1;
  const isFocusPhase = phase === "focus";
  const focusStyle = getIntroductionFocusStyle(
    activeStep?.focus ?? "homeDiscovery",
  );

  if (!activeStep || !ActiveStepIcon) {
    return null;
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View
        style={[
          styles.introductionOverlay,
          isDarkMode ? styles.darkIntroductionOverlay : null,
          isFocusPhase ? styles.focusIntroductionOverlay : null,
          isDarkMode && isFocusPhase ? styles.darkFocusIntroductionOverlay : null,
        ]}
      >
        {isFocusPhase ? (
          <View
            pointerEvents="none"
            style={[
              styles.introductionFocusBox,
              focusStyle,
              styles.activeIntroductionFocusBox,
              isDarkMode ? styles.darkIntroductionFocusBox : null,
              isDarkMode ? styles.darkActiveIntroductionFocusBox : null,
            ]}
          >
            <View
              style={[
                styles.introductionFocusGlow,
                isDarkMode ? styles.darkIntroductionFocusGlow : null,
              ]}
            />
            <View
              style={[
                styles.introductionTargetPill,
                isDarkMode ? styles.darkIntroductionTargetPill : null,
              ]}
            >
              <Text
                style={[
                  styles.introductionTargetLabel,
                  isDarkMode ? styles.darkIntroductionTargetLabel : null,
                ]}
              >
                {labels.walkthroughTargetLabel}
              </Text>
              <Text
                style={[
                  styles.introductionTargetText,
                  isDarkMode ? styles.darkIntroductionTargetText : null,
                ]}
              >
                {activeStep.target}
              </Text>
            </View>
          </View>
        ) : null}
        {isFocusPhase ? (
          <View
            style={[
              styles.introductionFocusControls,
              isDarkMode ? styles.darkIntroductionFocusControls : null,
            ]}
          >
            <View style={styles.flex}>
              <Text
                style={[
                  styles.introductionTargetLabel,
                  isDarkMode ? styles.darkIntroductionTargetLabel : null,
                ]}
              >
                {activeStepIndex + 1}/{steps.length}
              </Text>
              <Text
                style={[
                  styles.introductionFocusTitle,
                  isDarkMode ? styles.darkText : null,
                ]}
              >
                {activeStep.target}
              </Text>
            </View>
            <Pressable
              accessibilityLabel={labels.close}
              accessibilityRole="button"
              onPress={onClose}
              style={[
                styles.introductionIconAction,
                isDarkMode ? styles.darkIntroductionSecondaryAction : null,
              ]}
            >
              <X
                color={isDarkMode ? "#F5F5F7" : "#111111"}
                size={18}
                strokeWidth={2.7}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={onNext}
              style={[
                styles.introductionFocusNextAction,
                isDarkMode ? styles.darkIntroductionPrimaryAction : null,
              ]}
            >
              <Text
                style={[
                  styles.introductionPrimaryActionText,
                  isDarkMode ? styles.darkIntroductionPrimaryActionText : null,
                ]}
              >
                {isLastStep ? labels.done : labels.next}
              </Text>
            </Pressable>
          </View>
        ) : (
          <View
            style={[
              styles.introductionCallout,
              isDarkMode ? styles.darkIntroductionCallout : null,
            ]}
          >
            <View style={styles.walkthroughHeader}>
              <View style={styles.flex}>
                <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                  {labels.walkthroughTitle}
                </Text>
                <Text style={[styles.mutedText, isDarkMode ? styles.darkMutedText : null]}>
                  {labels.walkthroughIntro}
                </Text>
              </View>
              <Pressable
                accessibilityLabel={labels.close}
                accessibilityRole="button"
                onPress={onClose}
                style={[styles.modalCloseButton, isDarkMode ? styles.darkSettingRow : null]}
              >
                <X
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={19}
                  strokeWidth={2.7}
                />
              </Pressable>
            </View>

            <View style={styles.introductionStepMeta}>
              <Text
                style={[
                  styles.introductionStepCount,
                  isDarkMode ? styles.darkIntroductionStepCount : null,
                ]}
              >
                {activeStepIndex + 1}/{steps.length}
              </Text>
            </View>

            <View
              style={[
                styles.walkthroughStepCard,
                isDarkMode ? styles.darkIntroductionStepCard : null,
              ]}
            >
              <View
                style={[
                  styles.walkthroughIcon,
                  isDarkMode ? styles.darkIntroductionIcon : null,
                ]}
              >
                <ActiveStepIcon
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={28}
                  strokeWidth={2.7}
                />
              </View>
              <Text style={[styles.walkthroughStepTitle, isDarkMode ? styles.darkText : null]}>
                {activeStep.title}
              </Text>
              <Text style={[styles.walkthroughStepText, isDarkMode ? styles.darkMutedText : null]}>
                {activeStep.text}
              </Text>
            </View>

            <View style={styles.walkthroughDots}>
              {steps.map((step, index) => (
                <View
                  key={step.title}
                  style={[
                    styles.walkthroughDot,
                    index === activeStepIndex ? styles.activeWalkthroughDot : null,
                    isDarkMode && index === activeStepIndex
                      ? styles.darkActiveWalkthroughDot
                      : null,
                    isDarkMode && index !== activeStepIndex
                      ? styles.darkWalkthroughDot
                      : null,
                  ]}
                />
              ))}
            </View>

            <View style={styles.walkthroughActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  if (activeStepIndex === 0) {
                    onClose();
                    return;
                  }

                  onBack();
                }}
                style={[
                  styles.introductionSecondaryAction,
                  isDarkMode ? styles.darkIntroductionSecondaryAction : null,
                ]}
              >
                <Text
                  style={[
                    styles.introductionSecondaryActionText,
                    isDarkMode ? styles.darkIntroductionSecondaryActionText : null,
                  ]}
                >
                  {activeStepIndex === 0
                    ? labels.walkthroughSkip
                    : labels.previous}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={onNext}
                style={[
                  styles.introductionPrimaryAction,
                  isDarkMode ? styles.darkIntroductionPrimaryAction : null,
                ]}
              >
                <Text
                  style={[
                    styles.introductionPrimaryActionText,
                    isDarkMode ? styles.darkIntroductionPrimaryActionText : null,
                  ]}
                >
                  {labels.walkthroughShowOnPage}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

function BusinessContentModal({
  canViewContacts,
  entry,
  isDarkMode,
  labels,
  onBusinessPress,
  onClose,
  onContactPress,
  onContentContactPress,
  onRequireSignIn,
  onShareContent,
}: {
  canViewContacts: boolean;
  entry: ContentDetailEntry | null;
  isDarkMode: boolean;
  labels: Record<string, string>;
  onBusinessPress: (business: Business) => void;
  onClose: () => void;
  onContactPress: (contact: ContactItem) => void;
  onContentContactPress: (
    entry: ContentDetailEntry,
    contactType: ContactItem["contactType"],
  ) => void;
  onRequireSignIn: () => void;
  onShareContent: (entry: ContentDetailEntry) => Promise<void>;
}) {
  const item = entry?.item;
  const imageUrls = getContentImageUrls(item);
  const contentLinkUrl =
    canViewContacts && item?.linkUrl ? getWebsiteUrl(item.linkUrl) : null;
  const businessContacts = entry ? getBusinessContacts(entry.business, labels) : [];
  const locationUrl =
    canViewContacts && item?.location && !item.isOnline
      ? getAddressUrl(item.location, entry?.business.city)
      : null;
  const hasLockedContacts =
    !canViewContacts &&
    Boolean(item?.location || item?.linkUrl || businessContacts.length);
  const hasMeta = Boolean(
    item?.startsAt ||
      (canViewContacts && item?.location) ||
      contentLinkUrl ||
      hasLockedContacts,
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="overFullScreen"
      statusBarTranslucent
      transparent
      visible={Boolean(entry)}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          accessibilityRole="button"
          onPress={onClose}
          style={styles.modalDismissLayer}
        />
        <View style={[styles.modalSheet, isDarkMode ? styles.darkModalSheet : null]}>
          {entry && item ? (
            <ScrollView
              bounces
              contentInsetAdjustmentBehavior="automatic"
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              style={styles.modalScroll}
            >
              <View style={styles.modalHeader}>
                <View style={styles.flex}>
                  <Text style={[styles.modalTitle, isDarkMode ? styles.darkText : null]}>
                    {item.title}
                  </Text>
                </View>
                <View style={styles.cardHeaderActions}>
                  <Pressable
                    accessibilityLabel={labels.shareBusiness}
                    accessibilityRole="button"
                    onPress={() => {
                      void onShareContent(entry);
                    }}
                    style={[
                      styles.modalCloseButton,
                      isDarkMode ? styles.darkSettingRow : null,
                    ]}
                  >
                    <Share2
                      color={isDarkMode ? "#E5E5EA" : "#111111"}
                      size={18}
                      strokeWidth={2.7}
                    />
                  </Pressable>
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
                      color={isDarkMode ? "#E5E5EA" : "#111111"}
                      size={19}
                      strokeWidth={2.7}
                    />
                  </Pressable>
                </View>
              </View>

              <Pressable
                accessibilityRole="button"
                onPress={() => onBusinessPress(entry.business)}
                style={[
                  styles.contentBusinessButton,
                  isDarkMode ? styles.darkSettingRow : null,
                ]}
              >
                <Store
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
                  size={17}
                  strokeWidth={2.7}
                />
                <Text
                  numberOfLines={1}
                  style={[
                    styles.contentBusinessButtonText,
                    isDarkMode ? styles.darkText : null,
                  ]}
                >
                  {entry.business.name}
                </Text>
                <ExternalLink
                  color={isDarkMode ? "#A1A1A6" : "#6E6E73"}
                  size={15}
                  strokeWidth={2.6}
                />
              </Pressable>

              <ContentImageCarousel
                imageUrls={imageUrls}
                isDarkMode={isDarkMode}
                labels={labels}
              />

              <View style={styles.contentDetailPillRow}>
                <Text style={[styles.statusPill, isDarkMode ? styles.darkBadge : null]}>
                  {getContentTypeLabel(item, labels)}
                </Text>
                {item.type === "product" ? (
                  <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
                    {item.isAvailable ? labels.available : labels.outOfStock}
                  </Text>
                ) : null}
                {item.isFree ? (
                  <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
                    {labels.free}
                  </Text>
                ) : item.price ? (
                  <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
                    {formatPriceWithCurrency(item.price)}
                  </Text>
                ) : null}
                {item.isOnline ? (
                  <Text style={[styles.onlineBadge, isDarkMode ? styles.darkOnlineBadge : null]}>
                    {labels.online}
                  </Text>
                ) : null}
              </View>

              <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
                {item.description}
              </Text>

              {hasMeta ? (
                <View style={[styles.contactCard, isDarkMode ? styles.darkSettingRow : null]}>
                  {item.startsAt ? (
                    <View
                      style={[
                        styles.contentDetailMetaRow,
                        styles.contentDetailMetaCard,
                        isDarkMode ? styles.darkIconBox : null,
                      ]}
                    >
                      <CalendarDays
                        color={isDarkMode ? "#E5E5EA" : "#111111"}
                        size={17}
                        strokeWidth={2.6}
                      />
                      <Text style={[styles.contactLine, isDarkMode ? styles.darkMutedText : null]}>
                        {formatContentDate(item.startsAt)}
                      </Text>
                    </View>
                  ) : null}
                  {canViewContacts && item.location ? (
                    <Pressable
                      accessibilityRole={locationUrl ? "link" : undefined}
                      disabled={!locationUrl}
                      onPress={() => {
                        if (locationUrl) {
                          onContentContactPress(entry, "address");
                          void openContactUrl(locationUrl);
                        }
                      }}
                      style={[
                        styles.contentDetailMetaRow,
                        styles.contentDetailMetaCard,
                        isDarkMode ? styles.darkIconBox : null,
                      ]}
                    >
                      <MapPin
                        color={isDarkMode ? "#E5E5EA" : "#111111"}
                        size={17}
                        strokeWidth={2.6}
                      />
                      <Text style={[styles.contactLine, isDarkMode ? styles.darkMutedText : null]}>
                        {item.location}
                      </Text>
                    </Pressable>
                  ) : null}
                  {item.linkUrl && contentLinkUrl ? (
                    <Pressable
                      accessibilityLabel={`${labels.contentLink}: ${item.linkUrl}`}
                      accessibilityRole="link"
                      onPress={() => {
                        onContentContactPress(entry, "link");
                        void openContactUrl(contentLinkUrl);
                      }}
                      style={[
                        styles.contentDetailMetaRow,
                        styles.contentDetailMetaCard,
                        isDarkMode ? styles.darkIconBox : null,
                      ]}
                    >
                      <ExternalLink
                        color={isDarkMode ? "#E5E5EA" : "#111111"}
                        size={17}
                        strokeWidth={2.6}
                      />
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.contentItemLinkText,
                          isDarkMode ? styles.darkText : null,
                        ]}
                      >
                        {item.linkUrl}
                      </Text>
                    </Pressable>
                  ) : null}
                  {hasLockedContacts ? (
                    <ContactSignInPrompt
                      isDarkMode={isDarkMode}
                      labels={labels}
                      onPress={onRequireSignIn}
                    />
                  ) : null}
                </View>
              ) : null}
              {canViewContacts && businessContacts.length ? (
                <View style={[styles.contactCard, isDarkMode ? styles.darkSettingRow : null]}>
                  <Text
                    style={[
                      styles.contactSectionTitle,
                      isDarkMode ? styles.darkText : null,
                    ]}
                  >
                    {labels.contacts}
                  </Text>
                  {businessContacts.map((contact) => (
                    <ContactRow
                      contact={contact}
                      isDarkMode={isDarkMode}
                      key={contact.key}
                      onContactPress={onContactPress}
                    />
                  ))}
                </View>
              ) : null}
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function ContentImageCarousel({
  imageUrls,
  isDarkMode,
  labels,
}: {
  imageUrls: string[];
  isDarkMode: boolean;
  labels: Record<string, string>;
}) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const hasMultipleImages = imageUrls.length > 1;
  const activeImageUrl = imageUrls[activeImageIndex];

  useEffect(() => {
    setActiveImageIndex(0);
  }, [imageUrls.join("|")]);

  if (!activeImageUrl) {
    return null;
  }

  function showPreviousImage() {
    setActiveImageIndex((currentIndex) =>
      currentIndex === 0 ? imageUrls.length - 1 : currentIndex - 1,
    );
  }

  function showNextImage() {
    setActiveImageIndex((currentIndex) =>
      currentIndex === imageUrls.length - 1 ? 0 : currentIndex + 1,
    );
  }

  return (
    <View
      style={[
        styles.contentDetailImageFrame,
        isDarkMode ? styles.darkContentImageSurface : null,
      ]}
    >
      <Image
        resizeMode="contain"
        source={{ uri: activeImageUrl }}
        style={styles.contentDetailImage}
      />
      {hasMultipleImages ? (
        <>
          <Pressable
            accessibilityLabel={labels.previous}
            accessibilityRole="button"
            onPress={showPreviousImage}
            style={[
              styles.contentImageArrow,
              styles.contentImageArrowLeft,
              isDarkMode ? styles.darkFloatingControl : null,
            ]}
          >
            <ChevronLeft
              color={isDarkMode ? "#FFFFFF" : "#111111"}
              size={21}
              strokeWidth={3}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={labels.next}
            accessibilityRole="button"
            onPress={showNextImage}
            style={[
              styles.contentImageArrow,
              styles.contentImageArrowRight,
              isDarkMode ? styles.darkFloatingControl : null,
            ]}
          >
            <ChevronRight
              color={isDarkMode ? "#FFFFFF" : "#111111"}
              size={21}
              strokeWidth={3}
            />
          </Pressable>
          <Text style={styles.contentImageCounter}>
            {activeImageIndex + 1}/{imageUrls.length}
          </Text>
        </>
      ) : null}
    </View>
  );
}

function BusinessScreen({
  business,
  canViewContacts,
  isDarkMode,
  labels,
  locale,
  onBack,
  onContactPress,
  onContentPress,
  onManage,
  onMessageBusiness,
  onRequireSignIn,
  onShareBusiness,
  onShareContent,
  onToggleSavedBusiness,
  saveBusyBusinessId,
}: {
  business: Business;
  canViewContacts: boolean;
  isDarkMode: boolean;
  labels: Record<string, string>;
  locale: Locale;
  onBack: () => void;
  onContactPress: (contact: ContactItem) => void;
  onContentPress: (entry: ContentDetailEntry) => void;
  onManage: () => void;
  onMessageBusiness: (business: Business) => Promise<void> | void;
  onRequireSignIn: () => void;
  onShareBusiness: (business: Business) => Promise<void>;
  onShareContent: (entry: ContentDetailEntry) => Promise<void>;
  onToggleSavedBusiness: (business: Business) => void;
  saveBusyBusinessId: string | null;
}) {
  const contacts = getBusinessContacts(business, labels);
  const [activeModalTab, setActiveModalTab] = useState<
    "about" | "services" | "events" | "products"
  >("about");
  const contentItems = business.contentItems ?? [];
  const serviceItems = contentItems.filter((item) => item.type === "service");
  const eventItems = contentItems.filter((item) => item.type === "event");
  const productItems = contentItems.filter((item) => item.type === "product");
  const modalLogoUrl = getRenderableImageUrl(
    business.logoUrl,
    imageOptimizationPresets.logo,
  );
  const [hasModalLogoImageError, setHasModalLogoImageError] = useState(false);

  useEffect(() => {
    setActiveModalTab("about");
  }, [business.id]);

  useEffect(() => {
    setHasModalLogoImageError(false);
  }, [modalLogoUrl]);

  const categoryName = getCategoryName(business.categorySlug, locale);
  const locationLabel = business.servesAllCanada ? labels.canadaWide : business.city;
  const tabItems = [
    { key: "about", label: labels.about },
    {
      key: "services",
      label: serviceItems.length ? `${labels.services} ${serviceItems.length}` : labels.services,
    },
    {
      key: "events",
      label: eventItems.length ? `${labels.events} ${eventItems.length}` : labels.events,
    },
    {
      key: "products",
      label: productItems.length ? `${labels.products} ${productItems.length}` : labels.products,
    },
  ] as const;

  function renderContentItems(items: BusinessContentItem[]) {
    if (!items.length) {
      return (
        <Text style={[styles.emptyState, isDarkMode ? styles.darkEmptyState : null]}>
          {labels.noContentItems}
        </Text>
      );
    }

    return items.map((item) => (
      <PublicContentCard
        business={business}
        canViewContacts={canViewContacts}
        isDarkMode={isDarkMode}
        item={item}
        key={item.id}
        labels={labels}
        onPress={() => onContentPress({ business, item })}
        onShare={() => {
          void onShareContent({ business, item });
        }}
      />
    ));
  }

  return (
    <KeyboardAwareScreen contentContainerStyle={styles.businessScreenContent}>
      <View style={styles.businessTopBar}>
        <Pressable
          accessibilityLabel={labels.previous}
          accessibilityRole="button"
          onPress={onBack}
          style={[styles.messageBackButton, isDarkMode ? styles.darkSettingRow : null]}
        >
          <ArrowLeft
            color={isDarkMode ? "#E5E5EA" : "#111111"}
            size={21}
            strokeWidth={2.7}
          />
        </Pressable>
        <View style={styles.cardHeaderActions}>
          <Pressable
            accessibilityLabel={labels.shareBusiness}
            accessibilityRole="button"
            onPress={() => {
              void onShareBusiness(business);
            }}
            style={[styles.saveIconButton, isDarkMode ? styles.darkIconBox : null]}
          >
            <Share2
              color={isDarkMode ? "#E5E5EA" : "#111111"}
              size={17}
              strokeWidth={2.7}
            />
          </Pressable>
          <Pressable
            accessibilityLabel={business.isSaved ? labels.savedBusiness : labels.saveBusiness}
            accessibilityRole="button"
            disabled={saveBusyBusinessId === business.id}
            onPress={() => onToggleSavedBusiness(business)}
            style={[
              styles.saveIconButton,
              isDarkMode ? styles.darkIconBox : null,
              business.isSaved ? styles.activeSaveIconButton : null,
            ]}
          >
            <Bookmark
              color={business.isSaved ? "#FFFFFF" : isDarkMode ? "#E5E5EA" : "#111111"}
              fill={business.isSaved ? "#FFFFFF" : "transparent"}
              size={17}
              strokeWidth={2.7}
            />
          </Pressable>
        </View>
      </View>

      <View style={[styles.businessHeroCard, isDarkMode ? styles.darkCard : null]}>
        <View style={styles.businessHeroHeader}>
          {modalLogoUrl && !hasModalLogoImageError ? (
            <View
              accessibilityLabel={`${business.name} ${labels.logo}`}
              style={[styles.businessHeroLogo, isDarkMode ? styles.darkIconBox : null]}
            >
              <Image
                onError={() => setHasModalLogoImageError(true)}
                resizeMode="contain"
                source={{ uri: modalLogoUrl }}
                style={styles.businessHeroLogoImage}
              />
            </View>
          ) : null}
          <View style={styles.flex}>
            <Text style={[styles.businessHeroCategory, isDarkMode ? styles.darkMutedText : null]}>
              {categoryName}
            </Text>
            <Text style={[styles.businessHeroName, isDarkMode ? styles.darkText : null]}>
              {business.name}
            </Text>
          </View>
        </View>
        <View style={styles.businessHeroMetaRow}>
          <View style={[styles.infoPill, isDarkMode ? styles.darkIconBox : null]}>
            <MapPin
              color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
              size={15}
              strokeWidth={2.6}
            />
            <Text
              numberOfLines={1}
              style={[styles.infoPillText, isDarkMode ? styles.darkMutedText : null]}
            >
              {locationLabel}
            </Text>
          </View>
          {hasBusinessFollowers(business) ? (
            <View style={[styles.infoPill, isDarkMode ? styles.darkIconBox : null]}>
              <Heart
                color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
                size={15}
                strokeWidth={2.6}
              />
              <Text
                numberOfLines={1}
                style={[styles.infoPillText, isDarkMode ? styles.darkMutedText : null]}
              >
                {getFollowerLabel(business, labels)}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.businessProfileTabBar}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.businessProfileTabScroller}
      >
        {tabItems.map((tab) => (
          <BusinessProfileTabButton
            active={activeModalTab === tab.key}
            isDarkMode={isDarkMode}
            key={tab.key}
            label={tab.label}
            onPress={() => setActiveModalTab(tab.key)}
          />
        ))}
      </ScrollView>

      {activeModalTab === "about" ? (
        <View style={[styles.businessSectionCard, isDarkMode ? styles.darkCard : null]}>
          <Text style={[styles.modalBody, isDarkMode ? styles.darkMutedText : null]}>
            {business.description}
          </Text>
          {business.ownerId && !business.ownedByCurrentUser ? (
            <PrimaryButton
              label={labels.messageBusiness}
              onPress={() => {
                void onMessageBusiness(business);
              }}
            />
          ) : null}
          {contacts.length ? (
            <View style={styles.businessContactStack}>
              <Text style={[styles.contactSectionTitle, isDarkMode ? styles.darkText : null]}>
                {labels.contacts}
              </Text>
              {canViewContacts ? (
                contacts.map((contact) => (
                  <ContactRow
                    contact={contact}
                    isDarkMode={isDarkMode}
                    key={contact.key}
                    onContactPress={onContactPress}
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
        </View>
      ) : null}

      {activeModalTab === "services" ? (
        <View style={styles.businessContentList}>{renderContentItems(serviceItems)}</View>
      ) : null}

      {activeModalTab === "events" ? (
        <View style={styles.businessContentList}>{renderContentItems(eventItems)}</View>
      ) : null}

      {activeModalTab === "products" ? (
        <View style={styles.businessContentList}>{renderContentItems(productItems)}</View>
      ) : null}

      {business.ownedByCurrentUser ? (
        <View style={styles.businessActionFooter}>
          <PrimaryButton label={labels.manageProfile} onPress={onManage} />
        </View>
      ) : null}
    </KeyboardAwareScreen>
  );
}

function BusinessProfileTabButton({
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
        styles.businessProfileTabButton,
        isDarkMode ? styles.darkIconBox : null,
        active ? styles.activeBusinessProfileTabButton : null,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.businessProfileTabText,
          isDarkMode ? styles.darkText : null,
          active ? styles.activeBusinessProfileTabText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type ContactItem = {
  Icon: LucideIcon;
  businessId?: string;
  businessName?: string;
  businessSlug?: string;
  contactType: "address" | "instagram" | "link" | "phone" | "route" | "website";
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
        <Lock color={isDarkMode ? "#E5E5EA" : "#6E6E73"} size={18} strokeWidth={2.5} />
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
          <Text style={styles.contactSignInButtonText}>{labels.signIn}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function ContactRow({
  contact,
  isDarkMode,
  onContactPress,
}: {
  contact: ContactItem;
  isDarkMode: boolean;
  onContactPress?: (contact: ContactItem) => void;
}) {
  const Icon = contact.Icon;

  return (
    <Pressable
      accessibilityRole="link"
      onPress={() => {
        onContactPress?.(contact);
        void openContactUrl(contact.url);
      }}
      style={[styles.contactRow, isDarkMode ? styles.darkSettingRow : null]}
    >
      <View style={[styles.contactIcon, isDarkMode ? styles.darkIconBox : null]}>
        <Icon color={isDarkMode ? "#E5E5EA" : "#6E6E73"} size={18} strokeWidth={2.5} />
      </View>
      <View style={styles.flex}>
        <Text style={[styles.contactLabel, isDarkMode ? styles.darkMutedText : null]}>
          {contact.label}
        </Text>
        <Text style={[styles.contactLine, isDarkMode ? styles.darkMutedText : null]}>
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
  badgeCount = 0,
  hasBadge,
  Icon,
  isDarkMode,
  label,
  onPress,
}: {
  active: boolean;
  badgeCount?: number;
  hasBadge?: boolean;
  Icon: LucideIcon;
  isDarkMode: boolean;
  label: string;
  onPress: () => void;
}) {
  const shouldShowBadge = badgeCount > 0 || Boolean(hasBadge);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.tabButton, active ? styles.activeTabButton : null]}
    >
      <Icon
        color={active ? "#FFFFFF" : isDarkMode ? "#E5E5EA" : "#6E6E73"}
        size={21}
        strokeWidth={2.6}
      />
      {shouldShowBadge ? (
        <View style={styles.tabUnreadDot}>
          {badgeCount > 0 ? (
            <Text style={styles.tabUnreadText}>{formatUnreadCount(badgeCount)}</Text>
          ) : null}
        </View>
      ) : null}
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
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
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
  isResolvingCurrentLocation = false,
  labels,
  onChange,
  onUseCurrentLocation,
  placeholder,
  showMyLocation,
  value,
}: {
  allowAll?: boolean;
  isDarkMode: boolean;
  isResolvingCurrentLocation?: boolean;
  labels: Record<string, string>;
  onChange: (value: string) => void;
  onUseCurrentLocation?: (silent?: boolean) => Promise<string | undefined>;
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

  async function handleSelect(nextLocation: string) {
    if (nextLocation === labels.allCanada) {
      onChange("");
      setIsOpen(false);
      return;
    }

    if (nextLocation === labels.myLocation) {
      const currentLocation = await onUseCurrentLocation?.();

      if (currentLocation) {
        setIsOpen(false);
      }

      return;
    } else {
      onChange(nextLocation);
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
          placeholderTextColor={isDarkMode ? "#A1A1A6" : "#6E6E73"}
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
          <MapPin color={isDarkMode ? "#E5E5EA" : "#6E6E73"} size={20} strokeWidth={2.5} />
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
                  color={isDarkMode ? "#E5E5EA" : "#111111"}
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
                const isCurrentLocationOption = location === labels.myLocation;
                const selectedValue =
                  location === labels.allCanada
                    ? ""
                    : location;
                const isSelected =
                  !isCurrentLocationOption &&
                  normalize(value) === normalize(selectedValue);
                const optionLabel =
                  isCurrentLocationOption && isResolvingCurrentLocation
                    ? labels.loading
                    : location;

                return (
                  <Pressable
                    accessibilityRole="button"
                    disabled={
                      isCurrentLocationOption && isResolvingCurrentLocation
                    }
                    key={location}
                    onPress={() => {
                      void handleSelect(location);
                    }}
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
                        color={isDarkMode ? "#E5E5EA" : "#6E6E73"}
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
                      {optionLabel}
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

function SecondaryButton({
  disabled,
  isDarkMode = false,
  label,
  onPress,
}: {
  disabled?: boolean;
  isDarkMode?: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.secondaryButton,
        isDarkMode ? styles.darkSecondaryButton : null,
        disabled ? styles.disabledButton : null,
      ]}
    >
      <Text
        style={[
          styles.secondaryButtonText,
          isDarkMode ? styles.darkSecondaryButtonText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function DangerButton({
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
      style={[styles.dangerButton, disabled ? styles.disabledButton : null]}
    >
      <Text style={styles.dangerButtonText}>{label}</Text>
    </Pressable>
  );
}

async function getCurrentMobileLocationLabel() {
  const permissions = await ExpoLocation.requestForegroundPermissionsAsync();

  if (permissions.status !== ExpoLocation.PermissionStatus.GRANTED) {
    return "";
  }

  const position = await ExpoLocation.getCurrentPositionAsync({
    accuracy: ExpoLocation.Accuracy.Balanced,
  });
  const [address] = await ExpoLocation.reverseGeocodeAsync({
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  });

  return getMobileLocationLabel(address);
}

function getMobileLocationLabel(
  address: ExpoLocation.LocationGeocodedAddress | undefined,
) {
  if (!address) {
    return "";
  }

  const primaryLocation =
    address.district?.trim() ||
    address.city?.trim() ||
    address.subregion?.trim() ||
    address.region?.trim() ||
    "";
  const city = address.city?.trim() ?? "";
  const region = address.region?.trim() ?? "";
  const secondaryLocation =
    city && normalize(city) !== normalize(primaryLocation)
      ? city
      : region && normalize(region) !== normalize(primaryLocation)
        ? region
        : "";

  return [primaryLocation, secondaryLocation].filter(Boolean).join(", ");
}

function getDiscoveryTiles(
  businesses: Business[],
  labels: Record<string, string>,
) {
  const contentTiles = businesses.flatMap((business) =>
    (business.contentItems ?? []).flatMap((item) => {
      const imageUrl = getContentImageUrls(
        item,
        imageOptimizationPresets.thumbnail,
      )[0];

      if (!imageUrl) {
        return [];
      }

      return {
        business,
        imageUrl,
        item,
        key: `content-${business.id}-${item.id}`,
        kind: "content" as const,
        subtitle: getContentTypeLabel(item, labels),
        title: item.title,
      };
    }),
  );
  return contentTiles
    .sort((firstTile, secondTile) =>
      getDiscoveryTileTime(secondTile) - getDiscoveryTileTime(firstTile),
    );
}

function shuffleDiscoveryTiles(tiles: DiscoveryTile[], seed: number) {
  return [...tiles]
    .map((tile, index) => ({
      sortKey: getDeterministicShuffleScore(`${tile.key}:${index}`, seed),
      tile,
    }))
    .sort((firstTile, secondTile) => firstTile.sortKey - secondTile.sortKey)
    .map(({ tile }) => tile);
}

function getDeterministicShuffleScore(value: string, seed: number) {
  let hash = seed % 2147483647;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) % 2147483647;
  }

  return hash;
}

function getDiscoveryTileTime(tile: DiscoveryTile) {
  const value = tile.item.updatedAt || tile.item.createdAt;
  const time = value ? new Date(value).getTime() : 0;

  return Number.isFinite(time) ? time : 0;
}

function getCategoryName(slug: string, locale: Locale) {
  const normalizedSlug = normalizeCategorySlug(slug);
  const categoryName = categories.find(
    (category) => category.slug === normalizedSlug,
  )?.name[locale];

  if (categoryName) {
    return categoryName;
  }

  if (normalizedSlug === "other") {
    return locale === "uk" ? "Інше" : "Other";
  }

  return titleizeSlug(normalizedSlug);
}

function normalizeCategorySlug(slug: string | undefined | null) {
  const normalizedSlug = slug?.trim().toLowerCase();

  if (!normalizedSlug || normalizedSlug === "others") {
    return "other";
  }

  return normalizedSlug;
}

function titleizeSlug(slug: string) {
  return slug
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      contactType: "phone",
      key: "phone",
      label: labels.phone,
      url: phoneUrl,
      value: business.phone,
    });
  }

  if (business.website && websiteUrl) {
    contacts.push({
      Icon: ExternalLink,
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      contactType: "website",
      key: "website",
      label: labels.website,
      url: websiteUrl,
      value: business.website,
    });
  }

  if (business.instagram && instagramUrl) {
    contacts.push({
      Icon: ExternalLink,
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      contactType: "instagram",
      key: "instagram",
      label: labels.instagram,
      url: instagramUrl,
      value: formatInstagramValue(business.instagram),
    });
  }

  if (business.address && addressUrl) {
    contacts.push({
      Icon: MapPin,
      businessId: business.id,
      businessName: business.name,
      businessSlug: business.slug,
      contactType: "route",
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

function formatPriceWithCurrency(value?: string) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return undefined;
  }

  if (trimmedValue.includes("$")) {
    return trimmedValue;
  }

  return trimmedValue.replace(/\d/, (digit) => `$${digit}`);
}

function getContentTimestamp(item: BusinessContentItem) {
  const value = item.startsAt ?? item.createdAt ?? "";
  const parsedDate = new Date(value);

  return Number.isNaN(parsedDate.getTime()) ? 0 : parsedDate.getTime();
}

function getHomeCopy(locale: Locale) {
  if (locale === "uk") {
    return {
      categorySubtitle: "На основі підписок, локації та останнього пошуку.",
      categoryTitle: "Категорії для вас",
      communitySubtitle: "Короткі оновлення від людей і бізнесів у Kolo.",
      communityTitle: "Пости спільноти",
      emptyContentText: "Поки немає нових оновлень у цих категоріях.",
      followingContentSubtitle: "Сервіси, продукти й події від бізнесів, за якими ви стежите.",
      followingContentTitle: "Від ваших підписок",
      freshContentSubtitle: "Свіжі пропозиції, продукти й події, які можна відкрити свайпом.",
      freshContentTitle: "Нові послуги, продукти та події",
      heroIntro: "Персональні добірки бізнесів, послуг, продуктів, подій і постів у кілька свайпів.",
      nearbyFallbackSubtitle: "Підбірка по Канаді, доки локація не вибрана.",
      nearbySubtitle: "Поруч із",
      nearbyTitle: "Нові бізнеси поруч",
      recommendedSubtitle: "Підібрано за вашими підписками, пошуком і категоріями.",
      recommendedTitle: "Може зацікавити",
    };
  }

  return {
    categorySubtitle: "Based on following, location, and your latest search.",
    categoryTitle: "Categories for you",
    communitySubtitle: "Short updates from people and businesses in Kolo.",
    communityTitle: "Community posts",
    emptyContentText: "No new updates in these categories yet.",
    followingContentSubtitle: "Services, products, and events from businesses you follow.",
    followingContentTitle: "From your following",
    freshContentSubtitle: "Fresh offers, products, and events you can swipe through.",
    freshContentTitle: "New services, products & events",
    heroIntro: "Personal picks of businesses, services, products, events, and posts in a few swipes.",
    nearbyFallbackSubtitle: "Canada-wide picks until a location is selected.",
    nearbySubtitle: "Near",
    nearbyTitle: "New businesses nearby",
    recommendedSubtitle: "Picked from your following, search, and categories.",
    recommendedTitle: "You may like",
  };
}

function getHomeContentEntries(businesses: Business[]) {
  const seenItemIds = new Set<string>();

  return businesses
    .flatMap((business) =>
      getPublicBusinessContentItems(business.contentItems).map((item) => ({
        business,
        item,
      })),
    )
    .filter(({ item }) => {
      if (seenItemIds.has(item.id)) {
        return false;
      }

      seenItemIds.add(item.id);
      return true;
    })
    .sort(
      (first, second) =>
        getHomeContentSortTimestamp(second.item) -
        getHomeContentSortTimestamp(first.item),
    );
}

function getHomeContentSortTimestamp(item: BusinessContentItem) {
  const timestamps = [item.updatedAt, item.createdAt, item.startsAt]
    .map(getDateTimestamp)
    .filter((timestamp) => timestamp > 0);

  return Math.max(0, ...timestamps);
}

function getHomeCategoryCards({
  businesses,
  followedBusinesses,
  locale,
  location,
  query,
  selectedCategorySlug,
}: {
  businesses: Business[];
  followedBusinesses: Business[];
  locale: Locale;
  location: string;
  query: string;
  selectedCategorySlug: string;
}) {
  const counts = new Map<string, number>();
  const weights = new Map<string, number>();
  const normalizedQuery = normalize(query);
  const locationTrimmed = location.trim();
  const bumpWeight = (slug: string, weight: number) => {
    weights.set(slug, (weights.get(slug) ?? 0) + weight);
  };

  for (const business of businesses) {
    counts.set(business.categorySlug, (counts.get(business.categorySlug) ?? 0) + 1);

    if (locationTrimmed && isNearLocation(business.city, locationTrimmed)) {
      bumpWeight(business.categorySlug, 2);
    }

    if (isHomeBusinessPreferenceMatch(business, query)) {
      bumpWeight(business.categorySlug, 3);
    }
  }

  for (const business of followedBusinesses) {
    bumpWeight(business.categorySlug, 8);
  }

  if (selectedCategorySlug) {
    bumpWeight(selectedCategorySlug, 10);
  }

  if (normalizedQuery) {
    for (const category of categories) {
      const categoryText = normalize(
        `${category.slug} ${category.name.en} ${category.name.uk}`,
      );

      if (categoryText.includes(normalizedQuery)) {
        bumpWeight(category.slug, 6);
      }
    }
  }

  return categories
    .map((category) => {
      const count = counts.get(category.slug) ?? 0;
      const weight = (weights.get(category.slug) ?? 0) + count * 0.35;

      return {
        category,
        count,
        weight,
      };
    })
    .filter(({ count, weight }) => count > 0 || weight > 0)
    .sort((first, second) => {
      if (second.weight !== first.weight) {
        return second.weight - first.weight;
      }

      if (second.count !== first.count) {
        return second.count - first.count;
      }

      return first.category.name[locale].localeCompare(second.category.name[locale]);
    });
}

function sortHomeBusinessesByFreshness(businesses: Business[]) {
  return [...businesses].sort(
    (first, second) =>
      getBusinessFreshnessTimestamp(second) - getBusinessFreshnessTimestamp(first),
  );
}

function getBusinessFreshnessTimestamp(business: Business) {
  const contentTimestamps =
    business.contentItems?.map(getHomeContentSortTimestamp) ?? [];
  const timestamps = [
    getDateTimestamp(business.createdAt),
    getDateTimestamp(business.updatedAt),
    ...contentTimestamps,
  ].filter((timestamp) => timestamp > 0);

  return Math.max(0, ...timestamps);
}

function isHomeBusinessPreferenceMatch(business: Business, query: string) {
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return false;
  }

  const category = getCategoryName(business.categorySlug, "en");
  const contentText = (business.contentItems ?? [])
    .map((item) => `${item.title} ${item.description} ${item.location ?? ""}`)
    .join(" ");
  const haystack = normalize(
    `${business.name} ${business.description} ${business.keywords ?? ""} ${business.city} ${category} ${business.categorySlug} ${contentText}`,
  );

  return haystack.includes(normalizedQuery);
}

function getDateTimestamp(value: string | undefined) {
  if (!value) {
    return 0;
  }

  const timestamp = new Date(value).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
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

function isSameBusinessReference(firstBusiness: Business, secondBusiness: Business) {
  return getBusinessDedupeKey(firstBusiness) === getBusinessDedupeKey(secondBusiness);
}

function getNextFollowerCount(
  currentCount: number | undefined,
  nextIsFollowing: boolean,
) {
  return Math.max(0, (currentCount ?? 0) + (nextIsFollowing ? 1 : -1));
}

function getFollowerLabel(business: Business, labels: Record<string, string>) {
  const followerCount = Math.max(0, business.followerCount ?? 0);
  const label = followerCount === 1 ? labels.followerOne : labels.followers;

  return `${followerCount} ${label}`;
}

function hasBusinessFollowers(business: Business) {
  return Math.max(0, business.followerCount ?? 0) > 0;
}

function createOptimisticConversationFromBusiness({
  business,
  conversationId,
  customerEmail,
  customerId,
  customerName,
}: {
  business: Business;
  conversationId: string;
  customerEmail?: string | null;
  customerId: string;
  customerName?: string | null;
}): MobileConversation {
  return {
    business: {
      category_slug: business.categorySlug,
      city: business.city,
      id: business.id,
      logo_url: business.logoUrl ?? null,
      name: business.name,
      slug: business.slug ?? null,
    },
    businessId: business.id,
    businessOwnerId: business.ownerId ?? "",
    customerEmail: customerEmail ?? undefined,
    customerId,
    customerName: customerName ?? customerEmail ?? undefined,
    id: conversationId,
    isUnread: false,
    lastMessagePreview: "",
    unreadCount: 0,
  };
}

function createDraftConversationId(businessId: string, customerId: string) {
  return `draft:${businessId}:${customerId}`;
}

function mergeConversationsWithOptimisticDrafts(
  serverConversations: MobileConversation[],
  currentConversations: MobileConversation[],
) {
  const serverKeys = new Set(
    serverConversations.map(
      (conversation) => `${conversation.businessId}:${conversation.customerId}`,
    ),
  );
  const optimisticDrafts = currentConversations.filter(
    (conversation) =>
      isDraftConversationId(conversation.id) &&
      !serverKeys.has(`${conversation.businessId}:${conversation.customerId}`) &&
      !conversation.lastMessageAt &&
      !conversation.lastMessagePreview,
  );

  return [...optimisticDrafts, ...serverConversations];
}

function getMobileConversationTitle(
  conversation: MobileConversation,
  userId: string,
) {
  if (conversation.businessOwnerId === userId) {
    return (
      conversation.customerName ||
      conversation.customerEmail ||
      conversation.business?.name ||
      "Customer"
    );
  }

  return conversation.business?.name ?? "Business";
}

function getMobileConversationSubtitle(
  conversation: MobileConversation,
  userId: string,
) {
  if (conversation.businessOwnerId === userId) {
    return conversation.customerEmail ?? conversation.business?.name ?? "";
  }

  return conversation.business?.city ?? "";
}

function formatMobileMessageDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function getMobileMessageReadStatusLabel(
  message: MobileMessage,
  conversation: MobileConversation,
  userId: string,
  labels: Record<string, string>,
) {
  if (message.senderId !== userId) {
    return message.isUnread ? labels.messageUnread : labels.messageRead;
  }

  const recipientReadAt =
    conversation.businessOwnerId === userId
      ? conversation.customerLastReadAt
      : conversation.ownerLastReadAt;

  if (!recipientReadAt) {
    return labels.messageUnread;
  }

  return new Date(recipientReadAt) >= new Date(message.createdAt)
    ? labels.messageRead
    : labels.messageUnread;
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

function hasSearchFilters(
  query: string,
  location: string,
  selectedCategory: string,
  localOnly: boolean,
) {
  return Boolean(
    getEffectiveSearchQuery(query) ||
      location.trim() ||
      selectedCategory !== "all" ||
      localOnly,
  );
}

function getPickerDate(value: string) {
  const parsedDate = value ? new Date(value) : null;

  if (parsedDate && !Number.isNaN(parsedDate.getTime())) {
    return parsedDate;
  }

  return new Date();
}

type ImageOptimizationOptions = {
  height?: number;
  quality?: number;
  resize?: "cover" | "contain" | "fill";
  width?: number;
};

type PickedUploadImage = {
  base64?: string | null;
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
};

async function normalizePickedUploadImage(
  asset: ImagePicker.ImagePickerAsset,
  {
    fileNamePrefix,
    maxEdge,
    quality,
  }: {
    fileNamePrefix: string;
    maxEdge: number;
    quality: number;
  },
): Promise<PickedUploadImage> {
  const width = asset.width ?? 0;
  const height = asset.height ?? 0;
  const longestSide = Math.max(width, height);
  const resize =
    longestSide > maxEdge && width > 0 && height > 0
      ? width >= height
        ? { width: maxEdge }
        : { height: maxEdge }
      : undefined;

  try {
    const result = await manipulateAsync(
      asset.uri,
      resize ? [{ resize }] : [],
      {
        base64: true,
        compress: quality,
        format: SaveFormat.JPEG,
      },
    );

    return {
      base64: result.base64,
      fileName: `${fileNamePrefix}-${Date.now()}.jpg`,
      mimeType: "image/jpeg",
      uri: result.uri,
    };
  } catch (error) {
    console.warn("[kolo:mobile-image-normalize]", error);

    return {
      base64: asset.base64,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      uri: asset.uri,
    };
  }
}

const imageOptimizationPresets = {
  avatar: { height: 160, quality: 70, resize: "cover", width: 160 },
  detail: { quality: 72, resize: "contain", width: 1200 },
  logo: { height: 220, quality: 72, resize: "contain", width: 220 },
  thumbnail: { height: 520, quality: 62, resize: "cover", width: 520 },
} satisfies Record<string, ImageOptimizationOptions>;

function getRenderableImageUrl(
  value?: string | null,
  options: ImageOptimizationOptions = imageOptimizationPresets.detail,
) {
  void options;

  const trimmedValue = value?.trim() ?? "";
  const normalizedValue = trimmedValue.toLowerCase();

  if (
    !trimmedValue ||
    normalizedValue === "null" ||
    normalizedValue === "undefined"
  ) {
    return "";
  }

  if (/^(https?:|file:|content:|data:image\/)/i.test(trimmedValue)) {
    return getOriginalSupabaseImageUrl(trimmedValue);
  }

  return "";
}

function getOriginalSupabaseImageUrl(value: string) {
  if (/^(file:|content:|data:image\/)/i.test(value)) {
    return value;
  }

  try {
    const url = new URL(value) as unknown as {
      pathname: string;
      searchParams: {
        delete: (name: string) => void;
      };
      toString: () => string;
    };

    url.pathname = url.pathname.replace(
      "/storage/v1/render/image/public/",
      "/storage/v1/object/public/",
    );
    url.searchParams.delete("height");
    url.searchParams.delete("quality");
    url.searchParams.delete("resize");
    url.searchParams.delete("width");

    return url.toString();
  } catch {
    return value.replace(
      "/storage/v1/render/image/public/",
      "/storage/v1/object/public/",
    );
  }
}

function getContentImageUrls(
  item?: BusinessContentItem | null,
  options: ImageOptimizationOptions = imageOptimizationPresets.detail,
) {
  if (!item) {
    return [];
  }

  const imageUrls =
    item.imageUrls
      ?.map((url) => getRenderableImageUrl(url, options))
      .filter((url): url is string => Boolean(url)) ?? [];
  const coverImageUrl = getRenderableImageUrl(item.imageUrl, options);

  if (coverImageUrl && !imageUrls.includes(coverImageUrl)) {
    return [coverImageUrl, ...imageUrls];
  }

  return imageUrls;
}

function getInputImageUris(input: BusinessContentInput) {
  const imageUris =
    input.images
      ?.map((image) => image.uri)
      .filter((uri): uri is string => Boolean(uri)) ?? [];

  if (imageUris.length > 0) {
    return imageUris;
  }

  return input.image?.uri ? [input.image.uri] : [];
}

function getProfileDisplayName(
  profile: UserProfile | null | undefined,
  session: Session | null,
) {
  const profileName = profile?.fullName?.trim();

  return profileName || getSessionName(session);
}

function getProfileContactEmail(
  profile: UserProfile | null | undefined,
  session: Session | null,
) {
  return (
    profile?.contactEmail?.trim() ||
    profile?.email?.trim() ||
    session?.user.email ||
    ""
  );
}

function getProfileAvatarUrl(
  profile: UserProfile | null | undefined,
  session: Session | null,
) {
  return profile?.avatarUrl?.trim() || getSessionAvatarUrl(session);
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
      "beauty hair nails manicure pedicure makeup brows salon краса волосся нігті манікюр педикюр макіяж брови салон ногти маникюр педикюр",
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
    "mortgage-brokers":
      "mortgage broker financing refinance renewal pre approval home loan іпотека іпотечний брокер кредит фінансування рефінансування житло",
    moving:
      "moving movers relocation packing delivery furniture transport переїзд перевезення доставка пакування меблі",
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
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  activeCategoryOptionText: {
    color: "#FFFFFF",
  },
  activeLocationOption: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  activeLocationOptionText: {
    color: "#FFFFFF",
  },
  activeDashboardTabButton: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  activeDashboardTabButtonText: {
    color: "#FFFFFF",
  },
  activeBusinessProfileTabButton: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  activeBusinessProfileTabText: {
    color: "#FFFFFF",
  },
  activeTabButton: {
    backgroundColor: "#111111",
  },
  activeSaveIconButton: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  crashButton: {
    alignItems: "center",
    alignSelf: "stretch",
    backgroundColor: "#111111",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 18,
  },
  crashButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },
  crashDetails: {
    alignSelf: "stretch",
    color: "#6E6E73",
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  crashScreen: {
    alignItems: "center",
    backgroundColor: "#F7F7F8",
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 28,
  },
  crashText: {
    color: "#3A3A3C",
    fontSize: 15,
    lineHeight: 21,
    textAlign: "center",
  },
  crashTitle: {
    color: "#111111",
    fontSize: 22,
    fontWeight: "900",
    textAlign: "center",
  },
  announcementBadge: {
    color: "#6E6E73",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  announcementBanner: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#BDEFFF",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
    shadowColor: "#111111",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 14,
  },
  announcementBannerSlot: {
    paddingBottom: 4,
    paddingHorizontal: 12,
    paddingTop: Platform.OS === "android" ? 54 : 64,
  },
  announcementCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#FFFFFF",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  announcementCardTitle: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 23,
  },
  announcementCount: {
    backgroundColor: "#111111",
    borderRadius: 999,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    minWidth: 26,
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
    textAlign: "center",
  },
  announcementIconBox: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  announcementList: {
    gap: 10,
    paddingBottom: 14,
  },
  announcementSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    marginBottom: 10,
    marginHorizontal: 10,
    maxHeight: "76%",
    padding: 18,
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  announcementTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  appShell: {
    flex: 1,
    position: "relative",
  },
  appleSignInButton: {
    height: 52,
    width: "100%",
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 18,
    height: 54,
    justifyContent: "center",
    width: 54,
  },
  avatarLarge: {
    alignItems: "center",
    backgroundColor: "#F2F2F7",
    borderRadius: 22,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  avatarText: {
    color: "#111111",
    fontSize: 17,
    fontWeight: "900",
  },
  businessCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 24,
    gap: 12,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  businessName: {
    color: "#111111",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 28,
  },
  card: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 24,
    gap: 16,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  rankingInfoRow: {
    alignItems: "flex-start",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  rankingInfoText: {
    color: "#6E6E73",
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  clearFiltersButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 32,
    paddingHorizontal: 10,
  },
  clearFiltersButtonText: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  businessPageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  businessActionFooter: {
    paddingHorizontal: 4,
    paddingTop: 2,
  },
  businessContactStack: {
    gap: 10,
    marginTop: 4,
  },
  businessContentList: {
    gap: 12,
    paddingTop: 2,
  },
  businessHeroCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 18,
    shadowColor: "#2B2118",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
  },
  businessHeroCategory: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    marginBottom: 5,
    textTransform: "uppercase",
  },
  businessHeroHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  businessHeroLogo: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 22,
    borderWidth: 1,
    height: 78,
    justifyContent: "center",
    overflow: "hidden",
    width: 78,
  },
  businessHeroLogoImage: {
    height: "100%",
    width: "100%",
  },
  businessHeroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  businessHeroName: {
    color: "#111111",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  businessProfileTabBar: {
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  businessProfileTabButton: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    flexGrow: 0,
    flexShrink: 0,
    height: 40,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  businessProfileTabScroller: {
    flexGrow: 0,
    flexShrink: 0,
    height: 44,
    maxHeight: 44,
  },
  businessProfileTabText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
  },
  businessScreenContent: {
    gap: 12,
    paddingHorizontal: 12,
  },
  businessSectionCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  businessTopBar: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F3EEE6",
    borderColor: "#DED5C8",
    borderRadius: 8,
    borderWidth: 1,
    color: "#111111",
    fontSize: 12,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  categoryOption: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
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
    backgroundColor: "#E5E5EA",
    borderRadius: 999,
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  categoryOptionText: {
    color: "#111111",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  categoryPickerButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  categoryPickerChevron: {
    color: "#6E6E73",
    fontSize: 15,
    fontWeight: "900",
  },
  categoryPickerList: {
    gap: 10,
    padding: 18,
    paddingBottom: 34,
  },
  categoryPickerSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: CATEGORY_PICKER_SHEET_HEIGHT,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  categoryPickerText: {
    color: "#111111",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  cityText: {
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "700",
  },
  followerBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 8,
    borderWidth: 1,
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  feedActionButton: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 12,
  },
  activeFeedActionButton: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  activeFeedActionText: {
    color: "#FFFFFF",
  },
  feedActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  feedActionText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
  },
  feedAuthorName: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "900",
  },
  feedAuthorIdentity: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 12,
    minWidth: 0,
  },
  feedAuthorRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  feedAvatar: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  feedBody: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 24,
  },
  feedFloatingButton: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#111111",
    borderColor: "rgba(255,255,255,0.72)",
    borderRadius: 999,
    borderWidth: 2,
    bottom: 106,
    elevation: 10,
    height: 60,
    justifyContent: "center",
    position: "absolute",
    shadowColor: "#111111",
    shadowOffset: { height: 9, width: 0 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    width: 60,
  },
  feedFloatingSpacer: {
    height: 162,
  },
  feedHeaderIconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    position: "relative",
    shadowColor: "#111111",
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    width: 46,
  },
  feedHeaderRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  feedHeaderUnreadBadge: {
    alignItems: "center",
    backgroundColor: "#FF453A",
    borderColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
    position: "absolute",
    right: 4,
    top: 4,
  },
  feedScreenShell: {
    flex: 1,
  },
  commentsComposerBar: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 10,
    paddingBottom: 18,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  commentsComposerButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderColor: "#111111",
    borderRadius: 999,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  commentsComposerInput: {
    flex: 1,
    minHeight: 46,
  },
  commentsModalEmpty: {
    alignItems: "center",
    gap: 10,
    justifyContent: "center",
    minHeight: 220,
    paddingHorizontal: 24,
  },
  commentsModalHeader: {
    alignItems: "center",
    borderBottomColor: "#E5E5EA",
    borderBottomWidth: 1,
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 22,
  },
  commentsModalItem: {
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderRadius: 0,
  },
  commentsModalList: {
    gap: 10,
    paddingBottom: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  commentsPostPreview: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  feedComment: {
    alignItems: "flex-start",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 12,
  },
  feedCommentAvatar: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    width: 34,
  },
  feedCommentAvatarFallback: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  feedCommentAuthor: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
  },
  feedCommentBody: {
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 4,
  },
  feedCommentActionRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  feedCommentComposer: {
    gap: 10,
  },
  feedCommentEditActions: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  feedCommentEditBox: {
    gap: 8,
    marginTop: 8,
  },
  feedCommentEditInput: {
    minHeight: 72,
    paddingTop: 12,
  },
  feedCommentHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  feedCommentIconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  feedCommentInput: {
    minHeight: 44,
  },
  feedCommentSaveButton: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  feedCommentSaveButtonLabel: {
    color: "#FFFFFF",
  },
  feedCommentTextButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  feedCommentTextButtonLabel: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  feedComments: {
    gap: 8,
  },
  feedPostModalContent: {
    paddingBottom: 118,
  },
  darkCommentsComposerBar: {
    backgroundColor: "#111111",
    borderColor: "#2C2C2E",
  },
  darkCommentsModalHeader: {
    borderBottomColor: "#2C2C2E",
  },
  feedMetricRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 5,
  },
  communitySwitch: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    padding: 5,
  },
  communitySwitchButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    minHeight: 38,
  },
  activeCommunitySwitchButton: {
    backgroundColor: "#111111",
  },
  communitySwitchText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
  },
  activeCommunitySwitchText: {
    color: "#FFFFFF",
  },
  communityUnreadDot: {
    backgroundColor: "#FF453A",
    borderRadius: 4,
    height: 8,
    width: 8,
  },
  discoveryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: DISCOVERY_GRID_GAP,
    justifyContent: "flex-start",
  },
  discoverySearchButton: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 999,
    flexDirection: "row",
    gap: 10,
    marginBottom: 10,
    marginHorizontal: 16,
    minHeight: 44,
    paddingHorizontal: 16,
    shadowColor: "#2B2118",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
  },
  discoveryScrollContent: {
    paddingTop: 0,
  },
  discoveryStickyHeader: {
    backgroundColor: "#F7F3EC",
    paddingBottom: 10,
    paddingTop: 62,
    zIndex: 10,
  },
  discoverySearchHint: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  discoverySearchTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
  },
  discoveryTextTile: {
    backgroundColor: "#EFEAE2",
  },
  discoveryTextTileBody: {
    flex: 1,
    justifyContent: "center",
    padding: 9,
  },
  discoveryTextTileTitle: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  discoveryTile: {
    backgroundColor: "#EFEAE2",
    borderColor: "#E4DDD2",
    borderRadius: 8,
    borderWidth: 1,
    height: DISCOVERY_TILE_HEIGHT,
    overflow: "hidden",
    position: "relative",
    width: DISCOVERY_TILE_WIDTH,
  },
  discoveryTileImage: {
    height: "100%",
    width: "100%",
  },
  discoveryTileOverlay: {
    backgroundColor: "rgba(17, 17, 17, 0.62)",
    bottom: 0,
    gap: 3,
    left: 0,
    padding: 8,
    position: "absolute",
    right: 0,
  },
  discoveryTileSubtitle: {
    color: "rgba(255,255,255,0.78)",
    fontSize: 9,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  discoveryTileTitle: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
  },
  discoveryViewerBusinessButton: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: 9,
    minWidth: 0,
  },
  discoveryViewerBusinessNameBox: {
    flex: 1,
    height: 34,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 0,
    paddingTop: Platform.OS === "android" ? 3 : 2,
  },
  discoveryViewerBusinessName: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
    includeFontPadding: false,
    lineHeight: 18,
    textAlignVertical: "center",
  },
  discoveryViewerCaption: {
    gap: 8,
    maxHeight: 152,
    overflow: "hidden",
    paddingBottom: 6,
    paddingHorizontal: 16,
    paddingTop: 18,
  },
  discoveryViewerCaptionWithHint: {
    maxHeight: 176,
    paddingBottom: 16,
  },
  discoveryViewerCaptionExpanded: {
    backgroundColor: "rgba(247, 243, 236, 0.96)",
    borderColor: "#E4DDD2",
    borderTopWidth: 1,
    marginTop: -122,
    maxHeight: 286,
    paddingBottom: 16,
    paddingTop: 16,
  },
  discoveryViewerCaptionScroll: {
    maxHeight: 190,
  },
  discoveryViewerCaptionScrollContent: {
    gap: 8,
    paddingBottom: 4,
  },
  discoveryViewerCaptionToggle: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    height: 26,
    justifyContent: "center",
    width: 26,
  },
  discoveryViewerCloseButton: {
    alignItems: "center",
    backgroundColor: "rgba(255, 254, 251, 0.92)",
    borderColor: "rgba(17, 17, 17, 0.1)",
    borderRadius: 999,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  discoveryViewerHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    paddingTop: 66,
  },
  discoveryViewerImage: {
    height: "100%",
    width: "100%",
  },
  discoveryViewerImageFrame: {
    alignSelf: "center",
    backgroundColor: "#EFEAE2",
    height: DISCOVERY_VIEWER_IMAGE_HEIGHT,
    marginTop: 10,
    overflow: "hidden",
    width: "100%",
  },
  discoveryViewerKindPill: {
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    color: "#111111",
    flexShrink: 0,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  discoveryViewerLink: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    maxWidth: "100%",
    minHeight: 36,
    paddingHorizontal: 11,
  },
  discoveryViewerLinkText: {
    color: "#111111",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  discoveryViewerLogo: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 12,
    borderWidth: 1,
    height: 34,
    width: 34,
  },
  discoveryViewerMetaChip: {
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
    minHeight: 32,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  discoveryViewerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  discoveryViewerMetaText: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 16,
  },
  discoveryViewerPage: {
    height: DISCOVERY_VIEWER_HEIGHT,
    paddingBottom: 146,
  },
  discoveryViewerScrollHint: {
    alignItems: "center",
    alignSelf: "center",
    height: 28,
    justifyContent: "center",
    marginTop: 16,
    width: 42,
  },
  discoveryViewerShell: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F7F3EC",
    zIndex: 20,
  },
  discoveryViewerText: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
  },
  discoveryViewerTitle: {
    color: "#111111",
    flex: 1,
    fontSize: 19,
    fontWeight: "900",
    lineHeight: 24,
  },
  discoveryViewerTitleRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  contactCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 20,
    borderWidth: 1,
    gap: 10,
    padding: 12,
  },
  contactIcon: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  conversationChip: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 0,
    marginRight: 10,
    minHeight: 82,
    padding: 12,
    position: "relative",
    width: 210,
  },
  activeConversationChip: {
    borderColor: "#111111",
  },
  conversationRow: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 74,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  conversationRowMeta: {
    alignItems: "flex-end",
    gap: 7,
    minWidth: 46,
  },
  conversationRowText: {
    flex: 1,
    minWidth: 0,
  },
  conversationTime: {
    color: "#8A8177",
    fontSize: 10,
    fontWeight: "800",
  },
  conversationPreview: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },
  messageInboxList: {
    gap: 10,
    paddingHorizontal: 16,
  },
  conversationScroller: {
    marginHorizontal: -2,
  },
  conversationTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
    paddingRight: 14,
  },
  conversationUnreadBadge: {
    alignItems: "center",
    backgroundColor: "#FF453A",
    borderColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    height: 20,
    justifyContent: "center",
    minWidth: 20,
    paddingHorizontal: 6,
  },
  unreadBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
    lineHeight: 12,
  },
  contactLabel: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  contactLine: {
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  contactRow: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  contactSectionTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  contactSignInButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#111111",
    borderRadius: 12,
    justifyContent: "center",
    marginTop: 12,
    minHeight: 42,
    paddingHorizontal: 14,
  },
  contactSignInButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  contactSignInPrompt: {
    alignItems: "flex-start",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  contactSignInText: {
    color: "#6E6E73",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    minHeight: 40,
    paddingHorizontal: 12,
  },
  contentAddButtonText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
  },
  contentBusinessName: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.3,
    marginBottom: 3,
    textTransform: "uppercase",
  },
  contentBusinessButton: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  contentBusinessButtonText: {
    color: "#111111",
    flex: 1,
    fontSize: 14,
    fontWeight: "900",
  },
  contentComposer: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 18,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  contentComposerSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 16,
    maxHeight: Math.round(Dimensions.get("window").height * 0.84),
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  contentItemCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 22,
    gap: 0,
    overflow: "hidden",
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  contentItemBody: {
    backgroundColor: "#FFFEFB",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  contentItemActionButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
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
    aspectRatio: 1.33,
    backgroundColor: "#EFEAE2",
    width: "100%",
  },
  eventContentCard: {
    borderLeftWidth: 1,
    borderRadius: 18,
    borderRightWidth: 1,
    marginHorizontal: 12,
    shadowColor: "#291C0E",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
  },
  eventContentBody: {
    paddingHorizontal: 14,
    paddingVertical: 15,
  },
  eventContentImage: {
    aspectRatio: 1.22,
  },
  eventSettingsBody: {
    gap: 14,
    padding: 16,
    paddingBottom: 24,
  },
  eventSettingsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingTop: 16,
  },
  eventSettingsSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 16,
    marginHorizontal: 0,
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  eventsHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  eventsSettingsButton: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#D8CFC2",
    borderRadius: 999,
    borderWidth: 1,
    height: 40,
    justifyContent: "center",
    width: 40,
  },
  contentDetailImageFrame: {
    alignSelf: "center",
    backgroundColor: "#111111",
    height: Math.round(Dimensions.get("window").height * 0.48),
    marginHorizontal: -22,
    overflow: "hidden",
    width: Dimensions.get("window").width,
  },
  contentDetailImage: {
    height: "100%",
    width: "100%",
  },
  contentDetailMetaCard: {
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  contentImageArrow: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderColor: "rgba(17, 17, 17, 0.08)",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    position: "absolute",
    top: "46%",
    width: 42,
  },
  contentImageArrowLeft: {
    left: 14,
  },
  contentImageArrowRight: {
    right: 14,
  },
  contentImageCounter: {
    alignSelf: "center",
    backgroundColor: "rgba(17, 17, 17, 0.72)",
    borderRadius: 999,
    bottom: 14,
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    position: "absolute",
  },
  contentDetailMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    minHeight: 28,
  },
  contentDetailPillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  contentUploadPreview: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 15,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    overflow: "hidden",
    width: 68,
  },
  contentUploadThumb: {
    borderRadius: 8,
    height: 29,
    width: 29,
  },
  contentUploadThumbGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
    padding: 4,
  },
  contentItemLinkButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 8,
    maxWidth: "100%",
    minHeight: 38,
    paddingHorizontal: 12,
  },
  contentItemLinkText: {
    color: "#111111",
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 18,
  },
  contentItemMeta: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 18,
  },
  contentMetaChip: {
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    color: "#6E6E73",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
    maxWidth: "100%",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  contentMetaChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  contentItemTitle: {
    color: "#111111",
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
    color: "#6E6E73",
  },
  dateTimeTrigger: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 14,
  },
  dateTimeTriggerText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "800",
  },
  descriptionText: {
    color: "#6E6E73",
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
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
  },
  darkAccentText: {
    color: "#0A84FF",
  },
  darkActiveOption: {
    backgroundColor: "#0A84FF",
    borderColor: "#0A84FF",
  },
  darkActiveOptionText: {
    color: "#FFFFFF",
  },
  darkBadge: {
    backgroundColor: "#2C2C2E",
    borderColor: "#3A3A3C",
    color: "#F5F5F7",
  },
  darkAlertText: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
    color: "#F5F5F7",
  },
  darkBusinessCard: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
    shadowColor: "#000000",
    shadowOpacity: 0.18,
  },
  darkContentImageSurface: {
    backgroundColor: "#111111",
    borderColor: "#2C2C2E",
  },
  darkContentItemBody: {
    backgroundColor: "#1C1C1E",
  },
  darkDiscoveryViewerCaptionExpanded: {
    backgroundColor: "rgba(0, 0, 0, 0.94)",
    borderColor: "#2C2C2E",
  },
  darkEventContentCard: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
    shadowColor: "#000000",
    shadowOpacity: 0.14,
  },
  darkSavedBusinessCard: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
  },
  darkStoryLogoRing: {
    backgroundColor: "#1C1C1E",
    borderColor: "#3A3A3C",
    shadowColor: "#000000",
    shadowOpacity: 0.22,
  },
  darkEmptyState: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
    color: "#A1A1A6",
  },
  darkIconBox: {
    backgroundColor: "#2C2C2E",
    borderColor: "#3A3A3C",
  },
  darkActiveWalkthroughDot: {
    backgroundColor: "#F5F5F7",
  },
  darkIntroductionCallout: {
    backgroundColor: "#1C1C1E",
    borderColor: "#3A3A3C",
    shadowColor: "#000000",
  },
  darkIntroductionFocusBox: {
    backgroundColor: "rgba(44, 44, 46, 0.72)",
    borderColor: "rgba(245, 245, 247, 0.92)",
  },
  darkActiveIntroductionFocusBox: {
    backgroundColor: "rgba(245, 245, 247, 0.1)",
    borderColor: "#F5F5F7",
  },
  darkIntroductionFocusControls: {
    backgroundColor: "rgba(28, 28, 30, 0.96)",
    borderColor: "#3A3A3C",
    shadowColor: "#000000",
  },
  darkFocusIntroductionOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.28)",
  },
  darkIntroductionFocusGlow: {
    backgroundColor: "rgba(245, 245, 247, 0.12)",
    borderColor: "rgba(245, 245, 247, 0.24)",
  },
  darkIntroductionIcon: {
    backgroundColor: "#111111",
    borderColor: "#48484A",
  },
  darkIntroductionOverlay: {
    backgroundColor: "rgba(0, 0, 0, 0.58)",
  },
  darkIntroductionPrimaryAction: {
    backgroundColor: "#F5F5F7",
  },
  darkIntroductionPrimaryActionText: {
    color: "#111111",
  },
  darkIntroductionSecondaryAction: {
    backgroundColor: "#2C2C2E",
    borderColor: "#48484A",
  },
  darkIntroductionSecondaryActionText: {
    color: "#F5F5F7",
  },
  darkIntroductionStepCard: {
    backgroundColor: "#2C2C2E",
    borderColor: "#48484A",
  },
  darkIntroductionStepCount: {
    color: "#C7C7CC",
  },
  darkIntroductionTargetLabel: {
    color: "#C7C7CC",
  },
  darkIntroductionTargetPill: {
    backgroundColor: "rgba(17, 17, 17, 0.86)",
    borderColor: "rgba(245, 245, 247, 0.18)",
  },
  darkIntroductionTargetText: {
    color: "#F5F5F7",
  },
  darkSecondaryButton: {
    backgroundColor: "#1C1C1E",
    borderColor: "#3A3A3C",
  },
  darkSecondaryButtonText: {
    color: "#F5F5F7",
  },
  darkFloatingControl: {
    backgroundColor: "rgba(28, 28, 30, 0.86)",
    borderColor: "rgba(255, 255, 255, 0.12)",
  },
  darkInput: {
    backgroundColor: "#1C1C1E",
    borderColor: "#3A3A3C",
    color: "#F5F5F7",
  },
  darkLoadingLine: {
    backgroundColor: "#3A3A3C",
  },
  darkModalSheet: {
    backgroundColor: "#111111",
    borderColor: "#2C2C2E",
    shadowColor: "#000000",
  },
  darkMutedText: {
    color: "#A1A1A6",
  },
  darkOnlineBadge: {
    backgroundColor: "#2C2C2E",
    borderColor: "#3A3A3C",
    color: "#F5F5F7",
  },
  darkPickerHeader: {
    borderBottomColor: "#2C2C2E",
  },
  darkPickerOption: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
  },
  darkPickerSheet: {
    backgroundColor: "#111111",
    borderColor: "#2C2C2E",
    shadowColor: "#000000",
  },
  darkSafeArea: {
    backgroundColor: "#000000",
  },
  darkSettingRow: {
    backgroundColor: "#1C1C1E",
    borderColor: "#2C2C2E",
  },
  darkTabBar: {
    backgroundColor: "#1C1C1E",
    borderColor: "#F5F5F7",
    shadowColor: "#FFFFFF",
    shadowOpacity: 0.24,
    shadowRadius: 22,
  },
  darkText: {
    color: "#F5F5F7",
  },
  dangerButton: {
    alignItems: "center",
    backgroundColor: "#D92D20",
    borderRadius: 14,
    justifyContent: "center",
    minHeight: 52,
    paddingHorizontal: 18,
  },
  dangerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
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
    backgroundColor: "#F2F2F7",
    borderColor: "#E5E5EA",
    borderRadius: 20,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    overflow: "hidden",
    width: 68,
  },
  dashboardTabButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    flexBasis: "47%",
    flexGrow: 1,
    flexShrink: 0,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compactDashboardTabButton: {
    flexBasis: 0,
    flexShrink: 1,
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dashboardTabButtonText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 16,
    textAlign: "center",
  },
  compactDashboardTabButtonText: {
    fontSize: 12,
    lineHeight: 15,
  },
  dashboardTabs: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginHorizontal: 12,
    padding: 6,
  },
  profilePanelTabs: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    marginHorizontal: 12,
    padding: 6,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 16,
    color: "#6E6E73",
    fontSize: 16,
    fontWeight: "700",
    marginHorizontal: 12,
    padding: 18,
    textAlign: "center",
  },
  errorText: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 12,
    borderWidth: 1,
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 20,
    marginHorizontal: 12,
    padding: 12,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  flex: {
    flex: 1,
  },
  localOnlyRow: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 58,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  localOnlyTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  googleLogoLarge: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 22,
    borderWidth: 1,
    height: 68,
    justifyContent: "center",
    width: 68,
  },
  categoryPreviewCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 18,
    borderWidth: 1,
    flexBasis: "48%",
    flexGrow: 1,
    gap: 8,
    minHeight: 94,
    padding: 14,
    shadowColor: "#111111",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
  },
  categoryPreviewGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryPreviewMeta: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "700",
  },
  categoryPreviewName: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "900",
    lineHeight: 21,
  },
  cityPill: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
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
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
  },
  discoveryCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    minHeight: 176,
    padding: 16,
    width: 228,
  },
  discoveryCardDark: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  discoveryIcon: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  discoveryIconDark: {
    backgroundColor: "#2C2C2E",
  },
  discoveryRail: {
    gap: 12,
    paddingRight: 20,
  },
  discoveryText: {
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  discoveryTextLight: {
    color: "#D1D1D6",
  },
  discoveryTitle: {
    color: "#111111",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 26,
  },
  discoveryTitleLight: {
    color: "#FFFFFF",
  },
  featuredBusinessRail: {
    gap: 12,
    paddingRight: 20,
  },
  officialEventActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  officialEventBody: {
    gap: 12,
    padding: 16,
  },
  officialEventCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderLeftWidth: 1,
    borderRadius: 18,
    borderRightWidth: 1,
    marginHorizontal: 12,
    overflow: "hidden",
  },
  officialEventHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  officialEventHost: {
    color: "#6E6E73",
    flex: 1,
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.2,
    textTransform: "uppercase",
  },
  officialEventImageFrame: {
    aspectRatio: 1.5,
    backgroundColor: "transparent",
    overflow: "hidden",
    width: "100%",
  },
  officialEventImage: {
    height: "100%",
    width: "100%",
  },
  officialEventDetailImageFrame: {
    alignSelf: "center",
    aspectRatio: 1.5,
    backgroundColor: "transparent",
    marginHorizontal: -22,
    overflow: "hidden",
    width: Dimensions.get("window").width,
  },
  officialEventDetailImage: {
    height: "100%",
    width: "100%",
  },
  officialEventMetaList: {
    gap: 8,
  },
  officialEventMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  officialEventMetaText: {
    color: "#111111",
    flex: 1,
    fontSize: 14,
    fontWeight: "800",
    lineHeight: 19,
  },
  officialEventHighlightGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  officialEventHighlightPill: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  officialEventHighlightText: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
  },
  officialEventModalSection: {
    gap: 10,
  },
  officialEventPrimaryButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 14,
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  officialEventPrimaryButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "900",
  },
  officialEventSecondaryButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    flexGrow: 1,
    gap: 8,
    justifyContent: "center",
    minHeight: 48,
    paddingHorizontal: 14,
  },
  officialEventSecondaryButtonText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
  },
  officialEventSummary: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
  },
  officialEventTitle: {
    color: "#111111",
    fontSize: 25,
    fontWeight: "900",
    lineHeight: 30,
  },
  homeHero: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRadius: 0,
    borderRightWidth: 0,
    gap: 13,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  homeIntro: {
    color: "#6E6E73",
    fontSize: 16,
    lineHeight: 23,
  },
  homeBrand: {
    alignSelf: "center",
    color: "#111111",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0.4,
    lineHeight: 36,
    marginBottom: -2,
    marginTop: 10,
  },
  homeLoadingBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  homeLoadingBusinessCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    minHeight: 210,
    padding: 16,
    shadowColor: "#2B2118",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    width: 250,
  },
  homeLoadingBusinessTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeLoadingCardBody: {
    gap: 10,
  },
  homeLoadingCategoryCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    minHeight: 148,
    padding: 15,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    width: 164,
  },
  homeLoadingContentCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 24,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#2B2118",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    width: 280,
  },
  homeLoadingHero: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    marginHorizontal: 16,
    padding: 18,
    shadowColor: "#2B2118",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
  },
  homeLoadingHeroTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homeLoadingIcon: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 16,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  homeLoadingSearchCard: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 66,
    paddingHorizontal: 14,
  },
  homeLoadingStoriesRail: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  homeLoadingStoryItem: {
    alignItems: "center",
    gap: 8,
    width: 72,
  },
  homeLoadingTitle: {
    color: "#111111",
    fontSize: 24,
    fontWeight: "900",
    lineHeight: 30,
  },
  homeSearchButton: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#DED5C8",
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 62,
    paddingHorizontal: 14,
  },
  homeSearchText: {
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "700",
  },
  homeSearchTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  homeRail: {
    gap: 10,
  },
  homeRailContent: {
    gap: 12,
    paddingHorizontal: 16,
  },
  homeRailSubtitle: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 4,
  },
  homeStoriesRail: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 2,
  },
  homeStoryItem: {
    alignItems: "center",
    gap: 7,
    width: 72,
  },
  homeStoryLogo: {
    backgroundColor: "#FFFEFB",
    borderRadius: 999,
    height: 58,
    width: 58,
  },
  homeStoryLogoRing: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#D8CFC2",
    borderRadius: 999,
    borderWidth: 1,
    height: 64,
    justifyContent: "center",
    shadowColor: "#2B2118",
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    width: 64,
  },
  homeStoryMoreRing: {
    borderStyle: "dashed",
  },
  homeStoryName: {
    color: "#6E6E73",
    fontSize: 11,
    fontWeight: "900",
    lineHeight: 14,
    maxWidth: 70,
    textAlign: "center",
  },
  homeStoryFollowers: {
    color: "#8A8177",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 11,
    maxWidth: 70,
    textAlign: "center",
  },
  homeCategoryRailCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 22,
    gap: 12,
    minHeight: 148,
    padding: 15,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    width: 164,
  },
  homeCategoryRailName: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "900",
    lineHeight: 22,
  },
  homeContentRailCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#2B2118",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    width: 280,
  },
  homeContentRailBody: {
    gap: 9,
    padding: 14,
  },
  homeContentRailBusiness: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "800",
  },
  homeContentRailImage: {
    aspectRatio: 1.45,
    backgroundColor: "#EFEAE2",
    width: "100%",
  },
  homeContentRailImageFallback: {
    alignItems: "center",
    justifyContent: "center",
  },
  homeContentRailTitle: {
    color: "#111111",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  homeContentRailTopRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "space-between",
  },
  homeFeatureCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 24,
    gap: 10,
    minHeight: 230,
    padding: 16,
    shadowColor: "#2B2118",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    width: 250,
  },
  homeFeatureLogo: {
    borderRadius: 16,
    height: 48,
    overflow: "hidden",
    width: 48,
  },
  homeFeatureMeta: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "800",
  },
  homeFeatureName: {
    color: "#111111",
    fontSize: 20,
    fontWeight: "900",
    lineHeight: 24,
  },
  homeFeatureSignal: {
    alignSelf: "flex-start",
    backgroundColor: "#F3EEE6",
    borderColor: "#DED5C8",
    borderRadius: 999,
    borderWidth: 1,
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  infoPill: {
    alignItems: "center",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    maxWidth: "100%",
    minHeight: 34,
    paddingHorizontal: 11,
  },
  infoPillText: {
    color: "#6E6E73",
    flexShrink: 1,
    fontSize: 12,
    fontWeight: "900",
  },
  homeFeatureTopRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  homePostBody: {
    color: "#111111",
    fontSize: 17,
    fontWeight: "800",
    lineHeight: 24,
  },
  homePostMetaRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: "auto",
  },
  homePostRailCard: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 24,
    gap: 14,
    minHeight: 220,
    padding: 16,
    shadowColor: "#2B2118",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
    width: 280,
  },
  homeEmptyRailCard: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 24,
    gap: 10,
    justifyContent: "center",
    minHeight: 148,
    padding: 18,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
    width: 250,
  },
  homeSectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
    paddingHorizontal: 16,
  },
  homeSkeletonCircle: {
    backgroundColor: "#E9E1D6",
    borderRadius: 999,
    height: 64,
    width: 64,
  },
  homeSkeletonIcon: {
    backgroundColor: "#E9E1D6",
    borderRadius: 16,
    height: 44,
    width: 44,
  },
  homeSkeletonImage: {
    aspectRatio: 1.45,
    backgroundColor: "#E9E1D6",
    width: "100%",
  },
  homeSkeletonLine: {
    backgroundColor: "#E9E1D6",
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
  },
  homeSkeletonLineMedium: {
    width: "66%",
  },
  homeSkeletonLineShort: {
    width: "42%",
  },
  homeSkeletonLineWide: {
    width: "88%",
  },
  homeSkeletonLogo: {
    backgroundColor: "#E9E1D6",
    borderRadius: 16,
    height: 52,
    width: 52,
  },
  homeSkeletonPill: {
    backgroundColor: "#E9E1D6",
    borderRadius: 999,
    height: 28,
    width: 76,
  },
  homeSkeletonRailSubtitle: {
    marginTop: 8,
    width: "54%",
  },
  homeSkeletonTinyLine: {
    backgroundColor: "#E9E1D6",
    borderRadius: 999,
    height: 8,
    width: 46,
  },
  homeStatsRow: {
    flexDirection: "row",
    gap: 8,
  },
  homeStatLabel: {
    color: "#6E6E73",
    fontSize: 11,
    fontWeight: "900",
    textTransform: "uppercase",
  },
  homeStatPill: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 16,
    borderWidth: 1,
    flex: 1,
    gap: 3,
    paddingHorizontal: 11,
    paddingVertical: 10,
  },
  homeStatValue: {
    color: "#111111",
    fontSize: 19,
    fontWeight: "900",
  },
  homeTitle: {
    color: "#111111",
    fontSize: 31,
    fontWeight: "900",
    lineHeight: 36,
  },
  homeScreenContent: {
    paddingTop: 44,
  },
  input: {
    backgroundColor: "#FFFEFB",
    borderColor: "#DED5C8",
    borderRadius: 14,
    borderWidth: 1,
    color: "#111111",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
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
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  locationOptionText: {
    color: "#111111",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
  },
  locationPickerButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
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
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: LOCATION_PICKER_SHEET_HEIGHT,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  lockedContactNote: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  lockedContactTitle: {
    color: "#111111",
    fontSize: 12,
    fontWeight: "900",
  },
  loadingCard: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 18,
    borderWidth: 1,
    gap: 10,
    marginHorizontal: 12,
    marginTop: 4,
    padding: 14,
  },
  loadingLine: {
    backgroundColor: "#E5E5EA",
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
    width: "82%",
  },
  loadingLineShort: {
    backgroundColor: "#E5E5EA",
    borderRadius: 999,
    height: 12,
    overflow: "hidden",
    width: "58%",
  },
  loadingTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  logoPreviewImage: {
    borderRadius: 13,
    height: "100%",
    width: "100%",
  },
  logoUploadButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    minHeight: 82,
    padding: 12,
  },
  logoUploadHint: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  logoUploadPreview: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 15,
    borderWidth: 1,
    height: 54,
    justifyContent: "center",
    overflow: "hidden",
    width: 54,
  },
  logoUploadTitle: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
  },
  cardBusinessLogo: {
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    overflow: "hidden",
    width: 44,
  },
  saveIconButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  savedBusinessCard: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  savedBusinessList: {
    gap: 8,
  },
  savedBusinessLogo: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E5E5EA",
    borderRadius: 12,
    borderWidth: 1,
    height: 38,
    width: 38,
  },
  savedBusinessMeta: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "800",
    lineHeight: 16,
  },
  savedBusinessName: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 19,
  },
  savedBusinessRemoveButton: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    height: 34,
    justifyContent: "center",
    width: 34,
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
    color: "#6E6E73",
    fontSize: 16,
    lineHeight: 24,
  },
  modalCloseButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    height: 38,
    justifyContent: "center",
    width: 38,
  },
  modalDismissLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  modalKeyboardAvoider: {
    flex: 1,
    justifyContent: "flex-end",
    width: "100%",
  },
  modalHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalBusinessHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  modalBusinessLogo: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
    height: 76,
    justifyContent: "center",
    overflow: "hidden",
    width: 76,
  },
  modalBusinessLogoImage: {
    height: "100%",
    width: "100%",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    borderWidth: 1,
    elevation: 16,
    height: BUSINESS_SHEET_HEIGHT,
    overflow: "hidden",
    shadowColor: "#111111",
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
    color: "#111111",
    fontSize: 30,
    fontWeight: "900",
    lineHeight: 34,
  },
  introductionCallout: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    gap: 16,
    padding: 18,
    paddingBottom: 24,
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  activeIntroductionFocusBox: {
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    borderColor: "#111111",
  },
  introductionFocusBox: {
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.76)",
    borderColor: "rgba(17, 17, 17, 0.9)",
    borderRadius: 26,
    borderWidth: 2,
    justifyContent: "flex-start",
    padding: 10,
    position: "absolute",
    shadowColor: "#111111",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
  },
  introductionFocusControls: {
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    borderColor: "#E5E5EA",
    borderRadius: 24,
    borderWidth: 1,
    elevation: 14,
    flexDirection: "row",
    gap: 10,
    margin: 10,
    padding: 12,
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.14,
    shadowRadius: 22,
  },
  introductionFocusGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.18)",
    borderColor: "rgba(17, 17, 17, 0.12)",
    borderRadius: 26,
    borderWidth: 8,
  },
  introductionFocusNextAction: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 46,
    paddingHorizontal: 14,
  },
  introductionFocusTitle: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
    lineHeight: 18,
  },
  introductionIconAction: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D1D6",
    borderRadius: 16,
    borderWidth: 1,
    height: 46,
    justifyContent: "center",
    width: 46,
  },
  focusIntroductionOverlay: {
    backgroundColor: "rgba(17, 17, 17, 0.08)",
  },
  introductionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(17, 17, 17, 0.16)",
    justifyContent: "flex-end",
    padding: 10,
  },
  introductionPrimaryAction: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 16,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  introductionPrimaryActionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "center",
  },
  introductionSecondaryAction: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#D1D1D6",
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    minHeight: 50,
    paddingHorizontal: 16,
  },
  introductionSecondaryActionText: {
    color: "#111111",
    fontSize: 15,
    fontWeight: "900",
    lineHeight: 20,
    textAlign: "center",
  },
  introductionStepCount: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0,
  },
  introductionStepMeta: {
    alignItems: "center",
  },
  introductionTargetLabel: {
    color: "#6E6E73",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  introductionTargetPill: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderColor: "rgba(17, 17, 17, 0.12)",
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
    maxWidth: "86%",
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  introductionTargetText: {
    color: "#111111",
    fontSize: 13,
    fontWeight: "900",
    lineHeight: 17,
  },
  walkthroughActions: {
    gap: 10,
  },
  walkthroughDot: {
    backgroundColor: "#D1D1D6",
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  activeWalkthroughDot: {
    backgroundColor: "#111111",
    width: 26,
  },
  darkWalkthroughDot: {
    backgroundColor: "#3A3A3C",
  },
  walkthroughDots: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  walkthroughHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  walkthroughIcon: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 24,
    borderWidth: 1,
    height: 72,
    justifyContent: "center",
    width: 72,
  },
  walkthroughStepCard: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 18,
  },
  walkthroughStepText: {
    color: "#6E6E73",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22,
    textAlign: "center",
  },
  walkthroughStepTitle: {
    color: "#111111",
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
    textAlign: "center",
  },
  mutedText: {
    color: "#6E6E73",
    fontSize: 15,
    lineHeight: 22,
  },
  nativeDateTimeContent: {
    gap: 12,
    padding: 18,
    paddingBottom: 28,
  },
  nativeDateTimeSheet: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 30,
    borderWidth: 1,
    elevation: 16,
    marginBottom: 10,
    marginHorizontal: 10,
    overflow: "hidden",
    shadowColor: "#111111",
    shadowOffset: { height: -8, width: 0 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
  },
  onlineBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: "#6E6E73",
    borderRadius: 14,
    minHeight: 52,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
  },
  publicProfileCard: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 24,
    borderWidth: 1,
    gap: 16,
    marginHorizontal: 12,
    padding: 18,
    shadowColor: "#111111",
    shadowOffset: { height: 14, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 20,
  },
  pickerBackdrop: {
    backgroundColor: "transparent",
    flex: 1,
    justifyContent: "flex-end",
  },
  pickerHeader: {
    alignItems: "center",
    borderBottomColor: "#E5E5EA",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pickerTitle: {
    color: "#111111",
    fontSize: 18,
    fontWeight: "900",
  },
  profileCard: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 22,
    flexDirection: "row",
    gap: 14,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: "#2B2118",
    shadowOffset: { height: 9, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
  },
  profileHero: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderRadius: 26,
    flexDirection: "row",
    gap: 16,
    marginHorizontal: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    shadowColor: "#2B2118",
    shadowOffset: { height: 12, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 20,
  },
  profileName: {
    color: "#111111",
    fontSize: 19,
    fontWeight: "900",
  },
  profileAvatarImage: {
    borderRadius: 22,
    height: 68,
    width: 68,
  },
  resultCount: {
    backgroundColor: "#6E6E73",
    borderRadius: 8,
    color: "#FFFFFF",
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
    paddingHorizontal: 16,
  },
  resultsHeaderActions: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
  },
  safeArea: {
    backgroundColor: "#F7F3EC",
    flex: 1,
  },
  screen: {
    flex: 1,
  },
  screenContent: {
    flexGrow: 1,
    gap: 16,
    paddingBottom: 138,
    paddingTop: 12,
  },
  searchScreenContent: {
    paddingTop: 56,
  },
  searchCompactPanel: {
    gap: 10,
    marginTop: -10,
    paddingHorizontal: 16,
  },
  searchFilterIconButton: {
    alignItems: "center",
    backgroundColor: "#F3EEE6",
    borderColor: "#DED5C8",
    borderRadius: 999,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  searchFilterIconButtonActive: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  darkSearchFilterIconButtonActive: {
    backgroundColor: "#F5F5F7",
    borderColor: "#F5F5F7",
  },
  searchFilterPanel: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 14,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 18,
  },
  searchInlineIconButton: {
    alignItems: "center",
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  searchKeywordInput: {
    color: "#111111",
    flex: 1,
    fontSize: 16,
    fontWeight: "800",
    minHeight: 50,
    paddingVertical: 0,
  },
  searchKeywordRow: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#D8CFC2",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    minHeight: 58,
    paddingLeft: 16,
    paddingRight: 8,
    shadowColor: "#2B2118",
    shadowOffset: { height: 10, width: 0 },
    shadowOpacity: 0.07,
    shadowRadius: 18,
  },
  searchPanel: {
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderWidth: 1,
    borderLeftWidth: 0,
    borderRadius: 0,
    borderRightWidth: 0,
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  searchModeHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 2,
    paddingHorizontal: 16,
  },
  searchModeTitle: {
    color: "#111111",
    flex: 1,
    fontSize: 26,
    fontWeight: "900",
    lineHeight: 32,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: "#E5E5EA",
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 50,
    justifyContent: "center",
  },
  secondaryButtonText: {
    color: "#111111",
    fontSize: 16,
    fontWeight: "900",
  },
  selectableChip: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    minHeight: 42,
    justifyContent: "center",
    paddingHorizontal: 14,
  },
  selectableChipText: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "900",
  },
  selectedChip: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  selectedChipText: {
    color: "#FFFFFF",
  },
  sectionTitle: {
    color: "#111111",
    fontSize: 24,
    fontWeight: "900",
  },
  screenHeader: {
    gap: 8,
    paddingHorizontal: 16,
  },
  screenTitle: {
    color: "#111111",
    fontSize: 30,
    fontWeight: "900",
    letterSpacing: 0,
    lineHeight: 36,
  },
  kickerText: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.4,
    textTransform: "uppercase",
  },
  settingLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  settingMeta: {
    color: "#6E6E73",
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  settingsRow: {
    alignItems: "center",
    backgroundColor: "#FFFEFB",
    borderColor: "#E4DDD2",
    borderTopWidth: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    minHeight: 64,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  settingsActionButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 34,
    minWidth: 82,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  settingsActionButtonDisabled: {
    opacity: 0.58,
  },
  settingsActionButtonEnabled: {
    backgroundColor: "#357D77",
  },
  settingsActionButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "900",
  },
  successText: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E4DDD2",
    borderRadius: 12,
    borderWidth: 1,
    color: "#6E6E73",
    fontSize: 14,
    fontWeight: "900",
    marginHorizontal: 12,
    padding: 12,
  },
  statusPill: {
    alignSelf: "flex-start",
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 999,
    borderWidth: 1,
    color: "#111111",
    flexShrink: 1,
    fontSize: 11,
    fontWeight: "900",
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  switchLabel: {
    color: "#111111",
    flex: 1,
    fontSize: 15,
    fontWeight: "900",
  },
  messageBody: {
    color: "#111111",
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  messageBubble: {
    backgroundColor: "#F5F5F7",
    borderColor: "#E5E5EA",
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: "82%",
    padding: 12,
    position: "relative",
  },
  messageBubbleMine: {
    backgroundColor: "#111111",
    borderColor: "#111111",
  },
  messageBubbleRow: {
    alignItems: "flex-start",
    flexDirection: "row",
  },
  messageBubbleRowMine: {
    justifyContent: "flex-end",
  },
  messageComposer: {
    alignItems: "flex-end",
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 16,
    paddingVertical: 4,
  },
  messageComposerInput: {
    backgroundColor: "#F8F4ED",
    borderColor: "#E4DDD2",
    borderRadius: 18,
    borderWidth: 1,
    color: "#111111",
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    maxHeight: 120,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  messageHeaderSubtitle: {
    color: "#6E6E73",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
  messageMetaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  messageMetaRowMine: {
    justifyContent: "flex-end",
  },
  messageReadStatus: {
    color: "#8A8177",
    fontSize: 10,
    fontWeight: "900",
  },
  messageReadStatusMine: {
    color: "rgba(255,255,255,0.7)",
  },
  messageSendButton: {
    alignItems: "center",
    backgroundColor: "#111111",
    borderRadius: 999,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  messageThreadScroll: {
    flex: 1,
  },
  messageThreadScrollContent: {
    flexGrow: 1,
    justifyContent: "flex-end",
    paddingHorizontal: 16,
  },
  messageThreadShell: {
    flex: 1,
    gap: 12,
    paddingTop: 64,
  },
  messageBackButton: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  messageList: {
    gap: 10,
    paddingVertical: 12,
  },
  messageUnreadIndicator: {
    backgroundColor: "#FF453A",
    borderRadius: 4,
    height: 8,
    position: "absolute",
    right: 8,
    top: 8,
    width: 8,
  },
  messagesPageHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
  },
  messageTime: {
    color: "#6E6E73",
    fontSize: 10,
    fontWeight: "800",
    marginTop: 6,
  },
  messageTimeMine: {
    color: "rgba(255,255,255,0.7)",
  },
  unreadMessageBubble: {
    backgroundColor: "#FFFEFB",
    borderColor: "#111111",
    borderWidth: 2,
    paddingRight: 24,
  },
  darkUnreadMessageBubble: {
    backgroundColor: "#1C1C1E",
    borderColor: "#F5F5F7",
  },
  switchRow: {
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: 14,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  tabBar: {
    backgroundColor: "#FFFFFF",
    borderColor: "#E5E5EA",
    borderRadius: 999,
    borderWidth: 1,
    bottom: 36,
    elevation: 30,
    flexDirection: "row",
    gap: 4,
    left: "6%",
    padding: 4,
    position: "absolute",
    right: "6%",
    shadowColor: "#FFFFFF",
    shadowOffset: { height: 0, width: 0 },
    shadowOpacity: 0.32,
    shadowRadius: 18,
    zIndex: 30,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    minHeight: 40,
    justifyContent: "center",
    position: "relative",
  },
  tabUnreadDot: {
    alignItems: "center",
    backgroundColor: "#FF453A",
    borderColor: "#FFFFFF",
    borderRadius: 999,
    borderWidth: 1,
    height: 18,
    justifyContent: "center",
    minWidth: 18,
    paddingHorizontal: 5,
    position: "absolute",
    right: "26%",
    top: 4,
  },
  tabUnreadText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "900",
    lineHeight: 11,
  },
  textArea: {
    minHeight: 118,
    paddingTop: 14,
    textAlignVertical: "top",
  },
  textAreaSmall: {
    minHeight: 82,
    paddingTop: 14,
    textAlignVertical: "top",
  },
});
