import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { getRequestLocale } from "@/lib/locale";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Kolo handles account, business, and contact information.",
};

const text = {
  uk: {
    badge: "Політика",
    title: "Політика конфіденційності",
    updated: "Оновлено: 14 липня 2026",
    intro:
      "Kolo допомагає людям знаходити українські бізнеси в Канаді. Ми збираємо лише ті дані, які потрібні для роботи каталогу, керування бізнес-профілями та захисту доступу власників.",
    sections: [
      {
        title: "Які дані ми збираємо",
        items: [
          "Дані акаунта, які ви надаєте через Google Sign-In або Sign in with Apple, зокрема ім'я, email і фото профілю, якщо вони доступні.",
          "Інформацію про бізнес, яку власник або адміністратор додає до профілю: назву, опис, категорію, місто, адресу, телефон, сайт, Instagram, логотип, послуги та події.",
          "Контактний email власника, якщо він відрізняється від email акаунта для входу.",
          "Дані, які ви вводите у пошук, наприклад місто, категорію або запит.",
          "Приблизну локацію лише тоді, коли ви самі дозволяєте браузеру або застосунку її використати для пошуку поруч.",
        ],
      },
      {
        title: "Як ми використовуємо дані",
        items: [
          "Щоб показувати бізнеси, послуги та події людям, які шукають українські бізнеси в Канаді.",
          "Щоб власники могли редагувати свої профілі після входу в акаунт.",
          "Щоб адміністратор міг перевіряти нові бізнеси та допомагати з онбордингом власників.",
          "Щоб покращувати якість пошуку, інтерфейсу та діагностику помилок.",
        ],
      },
      {
        title: "Публічна інформація",
        items: [
          "Опубліковані бізнес-профілі можуть містити назву бізнесу, опис, категорію, місто, адресу, сайт, Instagram, телефон, логотип, послуги та події.",
          "Контактну інформацію бізнесу можуть бачити лише користувачі, які увійшли в акаунт.",
          "Особистий email акаунта власника не призначений для публічного показу як контакт бізнесу.",
        ],
      },
      {
        title: "Сервіси, які ми використовуємо",
        items: [
          "Supabase використовується для авторизації, бази даних і зберігання зображень.",
          "Google і Apple використовуються для входу через Google Sign-In та Sign in with Apple.",
          "Хостинг-провайдер може обробляти технічні логи для безпеки, діагностики та роботи сайту.",
        ],
      },
      {
        title: "Ваш вибір",
        items: [
          "Власник бізнесу може редагувати профіль, контактний email, логотип, послуги та події у кабінеті.",
          "Ви можете не надавати геолокацію і вводити місто вручну.",
          "Щоб попросити видалити або виправити дані, зверніться до адміністратора Kolo через контакт, вказаний у сторінці застосунку або на сайті.",
        ],
      },
    ],
    back: "Повернутися на головну",
  },
  en: {
    badge: "Policy",
    title: "Privacy Policy",
    updated: "Updated: July 14, 2026",
    intro:
      "Kolo helps people find Ukrainian businesses in Canada. We collect only the information needed to run the directory, manage business profiles, and protect owner access.",
    sections: [
      {
        title: "Information We Collect",
        items: [
          "Account details provided through Google Sign-In or Sign in with Apple, including your name, email address, and profile photo when available.",
          "Business information added by an owner or admin, including name, description, category, city, address, phone, website, Instagram, logo, services, and events.",
          "Owner contact email when it is different from the sign-in account email.",
          "Search inputs such as city, category, and search terms.",
          "Approximate location only when you allow the browser or app to use it for nearby search.",
        ],
      },
      {
        title: "How We Use Information",
        items: [
          "To show businesses, services, and events to people looking for Ukrainian businesses in Canada.",
          "To let owners edit their profiles after signing in.",
          "To let an admin review new businesses and help onboard owners.",
          "To improve search quality, user experience, and error diagnostics.",
        ],
      },
      {
        title: "Public Information",
        items: [
          "Published business profiles may show the business name, description, category, city, address, website, Instagram, phone, logo, services, and events.",
          "Business contact details are available only to signed-in users.",
          "A business owner's personal sign-in email is not intended to be shown publicly as the business contact email.",
        ],
      },
      {
        title: "Services We Use",
        items: [
          "Supabase is used for authentication, database records, and image storage.",
          "Google and Apple are used for Google Sign-In and Sign in with Apple.",
          "The hosting provider may process technical logs for security, diagnostics, and site operation.",
        ],
      },
      {
        title: "Your Choices",
        items: [
          "Business owners can edit their profile, contact email, logo, services, and events in the dashboard.",
          "You can decline location access and type a city manually.",
          "To request deletion or correction of information, contact the Kolo admin through the contact listed on the app page or website.",
        ],
      },
    ],
    back: "Back to home",
  },
} as const;

export default async function PrivacyPolicyPage() {
  const locale = await getRequestLocale();
  const labels = text[locale];

  return (
    <section className="container max-w-4xl py-12 md:py-16">
      <Badge variant="outline" className="bg-card text-foreground">
        {labels.badge}
      </Badge>
      <h1 className="mt-5 text-4xl font-black tracking-normal md:text-6xl">
        {labels.title}
      </h1>
      <p className="mt-3 text-sm font-semibold text-muted-foreground">
        {labels.updated}
      </p>
      <p className="mt-6 text-lg leading-8 text-muted-foreground">
        {labels.intro}
      </p>

      <div className="mt-10 grid gap-6">
        {labels.sections.map((section) => (
          <section className="rounded-lg border bg-card p-5 shadow-sm" key={section.title}>
            <h2 className="text-2xl font-black">{section.title}</h2>
            <ul className="mt-4 grid gap-3 text-sm leading-6 text-muted-foreground">
              {section.items.map((item) => (
                <li className="flex gap-3" key={item}>
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <Link
        className="mt-8 inline-flex rounded-md border bg-card px-4 py-2 text-sm font-bold shadow-sm transition hover:border-hover-blue-border hover:bg-hover-blue"
        href="/"
      >
        {labels.back}
      </Link>
    </section>
  );
}
