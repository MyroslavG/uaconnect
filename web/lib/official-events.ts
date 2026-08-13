import type { Locale } from "@/lib/i18n";

export const koloSummerParty = {
  endAt: "2026-08-30T01:00:00.000Z",
  eventbriteUrl:
    "https://www.eventbrite.ca/e/kolo-summer-party-tickets-1997616640145",
  imageUrl: "/summer-party2.jpeg",
  location: "Bob Mitchell Park / Crestview Outdoor Pool, Ottawa, ON",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Bob%20Mitchell%20Park%20%2F%20Crestview%20Outdoor%20Pool%2C%20Ottawa%2C%20ON",
  startAt: "2026-08-29T20:30:00.000Z",
} as const;

export function isKoloSummerPartyVisible(now = new Date()) {
  return now.getTime() < new Date(koloSummerParty.endAt).getTime();
}

export function getKoloSummerPartyCopy(locale: Locale) {
  return locale === "uk"
    ? {
        badge: "Подія Kolo",
        title: "Summer Pool Party",
        host: "",
        summary:
          "Запрошуємо на сімейну вечірку біля басейну, де ми разом завершимо літо яскраво, весело та у хорошій компанії.",
        date: "Субота, 29 серпня · 16:30–21:00",
        location: "Bob Mitchell Park / Crestview Outdoor Pool",
        imageAlt: "Summer Pool Party біля басейну в Ottawa",
        eventbrite: "Відкрити Eventbrite",
        maps: "Відкрити Google Maps",
        details: "Деталі події",
        overviewTitle: "Summer Pool Party вже скоро! ☀️💦",
        overview:
          "Запрошуємо на сімейну вечірку біля басейну, де ми разом завершимо літо яскраво, весело та у хорошій компанії.",
        secondPart:
          "На вас чекають басейн, дитяча шоу-програма, сімейні конкурси, музика, фотозона, аквааеробіка та багато гарного настрою.",
        safety:
          "29 серпня · 16:30–21:00 · Bob Mitchell Park / Crestview Outdoor Pool.",
        registration:
          "Квитки та деталі доступні на Eventbrite.",
        highlights: [
          "Басейн",
          "Дитяча шоу-програма",
          "Сімейні конкурси",
          "Музика",
          "Фотозона",
          "Аквааеробіка",
        ],
      }
    : {
        badge: "Kolo event",
        title: "Summer Pool Party",
        host: "",
        summary:
          "Join a family pool party where we close the summer brightly, joyfully, and in good company.",
        date: "Saturday, August 29 · 4:30 PM - 9 PM",
        location: "Bob Mitchell Park / Crestview Outdoor Pool",
        imageAlt: "Summer Pool Party by the pool in Ottawa",
        eventbrite: "Open Eventbrite",
        maps: "Open Google Maps",
        details: "Event details",
        overviewTitle: "Summer Pool Party is coming soon! ☀️💦",
        overview:
          "Join a family pool party where we close the summer brightly, joyfully, and in good company.",
        secondPart:
          "Expect the pool, a kids show program, family contests, music, a photo zone, aqua aerobics, and lots of good energy.",
        safety:
          "August 29 · 4:30 PM - 9 PM · Bob Mitchell Park / Crestview Outdoor Pool.",
        registration:
          "Tickets and details are available on Eventbrite.",
        highlights: [
          "Pool",
          "Kids show",
          "Family contests",
          "Music",
          "Photo zone",
          "Aqua aerobics",
        ],
      };
}
