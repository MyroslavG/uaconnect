import type { Locale } from "@/lib/i18n";

export const koloSummerParty = {
  endAt: "2026-08-30T23:00:00.000Z",
  eventbriteUrl:
    "https://www.ottawaucc.ca/events-1/ukraine-week-in-ottawa",
  imageUrl: "/ukraine_week.jpg",
  location: "Lansdowne Park, Ottawa, ON",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Lansdowne%20Park%2C%20Ottawa%2C%20ON",
  startAt: "2026-08-23T20:00:00.000Z",
} as const;

export function isKoloSummerPartyVisible(now = new Date()) {
  return now.getTime() < new Date(koloSummerParty.endAt).getTime();
}

export function getKoloSummerPartyCopy(locale: Locale) {
  return locale === "uk"
    ? {
        badge: "Подія",
        title: "Ukraine Week in Ottawa",
        host: "",
        summary:
          "Тиждень подій до 35-річчя Незалежності України: культура, спільнота, забіг, молитва, майстер-класи й фестивальна програма.",
        date: "23–30 серпня 2026",
        location: "Ottawa, ON · різні локації",
        imageAlt: "Ukraine Week in Ottawa, 23–30 August 2026",
        eventbrite: "Деталі події",
        maps: "Відкрити Google Maps",
        details: "Деталі події",
        overviewTitle: "Ukraine Week in Ottawa",
        overview:
          "З 23 до 30 серпня Ottawa відзначатиме 35 років Незалежності України серією подій про спадщину, культуру та спільноту.",
        secondPart:
          "У програмі: Solidarity Run, підняття прапора, молитва за Україну, майстер-класи, кіновечір і сімейна фестивальна програма з Capital Ukrainian Festival.",
        safety:
          "23–30 серпня 2026 · Ottawa, ON. Частина програми 29–30 серпня відбудеться в Lansdowne Park.",
        registration:
          "Деталі часу й окремих локацій оновлюються організаторами.",
        highlights: [
          "Solidarity Run",
          "Підняття прапора",
          "Молитва за Україну",
          "Майстер-класи",
          "Кіновечір",
          "Фестиваль у Lansdowne",
        ],
      }
    : {
        badge: "Event",
        title: "Ukraine Week in Ottawa",
        host: "",
        summary:
          "A week of events marking 35 years of Ukrainian Independence through culture, community, workshops, prayer, and festival programming.",
        date: "August 23–30, 2026",
        location: "Ottawa, ON · various locations",
        imageAlt: "Ukraine Week in Ottawa, August 23–30, 2026",
        eventbrite: "Event details",
        maps: "Open Google Maps",
        details: "Event details",
        overviewTitle: "Ukraine Week in Ottawa",
        overview:
          "From August 23 to 30, Ottawa marks 35 years of Ukrainian Independence with a week of heritage, culture, and community events.",
        secondPart:
          "The program includes a Solidarity Run, flag raising, prayer for Ukraine, workshops, a movie night, and family programming with Capital Ukrainian Festival.",
        safety:
          "August 23–30, 2026 · Ottawa, ON. Part of the August 29–30 programming takes place at Lansdowne Park.",
        registration:
          "Times and individual locations are being updated by the organizers.",
        highlights: [
          "Solidarity Run",
          "Flag raising",
          "Prayer for Ukraine",
          "Workshops",
          "Movie night",
          "Lansdowne festival",
        ],
      };
}
