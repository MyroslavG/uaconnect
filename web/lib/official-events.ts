import type { Locale } from "@/lib/i18n";

export const koloSummerParty = {
  endAt: "2026-08-30T01:00:00.000Z",
  eventbriteUrl:
    "https://www.eventbrite.ca/e/kolo-summer-party-tickets-1997616640145",
  imageUrl: "/summer-party.jpg",
  location: "Crestview Outdoor Pool, Ottawa, ON",
  mapUrl:
    "https://www.google.com/maps/search/?api=1&query=Crestview%20Outdoor%20Pool%2C%20Ottawa%2C%20ON",
  startAt: "2026-08-29T20:30:00.000Z",
} as const;

export function isKoloSummerPartyVisible(now = new Date()) {
  return now.getTime() < new Date(koloSummerParty.endAt).getTime();
}

export function getKoloSummerPartyCopy(locale: Locale) {
  return locale === "uk"
    ? {
        badge: "Подія Kolo",
        title: "KOLO Summer Party",
        host: "KOLO × Mykyta Zakharchenko",
        summary:
          "Сімейний Summer Party з басейном, конкурсами, дитячим ярмарком, шоу-програмою та лотереєю.",
        date: "Субота, 29 серпня · 16:30–21:00",
        location: "Crestview Outdoor Pool · Ottawa, ON",
        imageAlt: "KOLO Summer Party біля басейну в Ottawa",
        eventbrite: "Відкрити Eventbrite",
        maps: "Відкрити Google Maps",
        details: "Деталі події",
        overviewTitle: "Завершуємо літо разом",
        overview:
          "29 серпня KOLO × Mykyta Zakharchenko запрошують вас на теплу сімейну зустріч, де поєднаємо відпочинок біля басейну та літню вечірку в парку.",
        secondPart:
          "Подія складатиметься з двох частин: спочатку проведемо час біля басейну, а потім продовжимо вечір у парку з активностями, спілкуванням та сімейною атмосферою.",
        safety:
          "Під час частини заходу біля басейну будуть присутні рятувальники. Якщо плануєте плавати, візьміть купальники, рушники, воду та невеликі снеки.",
        registration:
          "Участь у сімейному конкурсі проходить за попереднім записом, оскільки кількість місць обмежена.",
        highlights: [
          "Відпочинок біля басейну",
          "Аеробіка у воді",
          "Сімейний конкурс",
          "Шоу-програма для дітей",
          "Вечірка та активності в парку",
          "Нові знайомства та тепла сімейна атмосфера",
        ],
      }
    : {
        badge: "Kolo event",
        title: "KOLO Summer Party",
        host: "KOLO × Mykyta Zakharchenko",
        summary:
          "A family summer meetup with pool time, contests, a kids market, a show program, and a raffle.",
        date: "Saturday, August 29 · 4:30 PM - 9 PM",
        location: "Crestview Outdoor Pool · Ottawa, ON",
        imageAlt: "KOLO Summer Party by the pool in Ottawa",
        eventbrite: "Open Eventbrite",
        maps: "Open Google Maps",
        details: "Event details",
        overviewTitle: "Closing summer together",
        overview:
          "On August 29, KOLO × Mykyta Zakharchenko invites families to a warm community meetup with pool time and a summer party in the park.",
        secondPart:
          "The event has two parts: time by the pool first, then an evening in the park with activities, conversation, and a family-friendly atmosphere.",
        safety:
          "Lifeguards will be present during the pool portion. If you plan to swim, bring swimwear, towels, water, and light snacks.",
        registration:
          "Family contest participation requires advance registration because spots are limited.",
        highlights: [
          "Pool time",
          "Water aerobics",
          "Family contest",
          "Kids show program",
          "Park party and activities",
          "New connections and a warm family atmosphere",
        ],
      };
}
