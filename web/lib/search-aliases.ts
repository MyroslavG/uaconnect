const categorySearchAliases: Record<string, string> = {
  "advertising-services":
    "advertising marketing design print branding social media реклама маркетинг дизайн друк брендинг соцмережі",
  "auto-repair":
    "auto car repair detailing mechanic авто автосервіс ремонт детайлінг механік",
  beauty:
    "beauty hair nails manicure pedicure makeup brows salon краса волосся нігті манікюр педикюр макіяж брови салон ногти маникюр педикюр",
  bookkeepers:
    "bookkeeper bookkeeping accountant accounting payroll invoices reporting tax finance бухгалтер бухгалтерія облік зарплата рахунки звітність фінанси",
  cleaning: "cleaning cleaner housekeeping move out прибирання клінінг чистка",
  construction:
    "construction renovation contractor repair building будівництво ремонт майстер",
  events: "events party wedding decor planning івенти події весілля декор свято",
  flowers: "flowers florist bouquets квіти флорист букети",
  "grocery-stores":
    "food grocery bakery catering products cake sweets їжа продукти пекарня кейтеринг торт торти десерти",
  "insurance-brokers": "insurance broker страхування страховий брокер",
  "it-services":
    "it tech software websites automation ai support technology repair phone iphone сайти техпідтримка автоматизація ремонт телефон айфон",
  lawyers:
    "law lawyer legal attorney immigration юрист юридичні правова імміграція",
  "mortgage-brokers":
    "mortgage broker financing refinance renewal pre approval home loan іпотека іпотечний брокер кредит фінансування рефінансування житло",
  moving:
    "moving movers relocation packing delivery furniture transport переїзд перевезення доставка пакування меблі",
  photographers:
    "photo video photography photographer фотo фото відео фотограф зйомка",
  realtors:
    "realtor real estate home mortgage рієлтор нерухомість житло",
  "repair-services":
    "repair handyman appliance furniture service phone iphone ремонт майстер техніка меблі телефон айфон",
  restaurants:
    "food restaurant cafe bakery catering kitchen cake sweets їжа ресторан кафе пекарня кейтеринг кухня торт десерти",
  shops: "shop store retail boutique магазин крамниця товари",
  "textile-decor":
    "textile decor pillows curtains upholstery home текстиль декор подушки штори перетяжка",
  "travel-tours":
    "travel tours trips tickets vacation подорожі тури квитки відпочинок",
  tutors: "tutor lessons teacher education репетитор уроки навчання викладач",
  "wellness-care":
    "wellness yoga trainer meditation mental health self care massage здоров'я йога тренер медитація психолог масаж",
};

const queryAliasGroups = [
  ["нігті", "ногти", "nails", "nail", "манікюр", "маникюр", "manicure"],
  ["брови", "брови", "brows", "eyebrows"],
  ["макіяж", "макияж", "makeup", "mua"],
  ["іпотека", "ипотека", "mortgage", "home loan", "pre approval"],
  ["бухгалтер", "bookkeeper", "bookkeeping", "accountant", "accounting"],
  ["переїзд", "переезд", "moving", "movers", "relocation"],
  ["торт", "торти", "cake", "cakes", "dessert", "десерт"],
  ["фото", "photographer", "photography", "фотограф"],
  ["ремонт телефону", "phone repair", "iphone repair", "айфон", "телефон"],
  ["сайт", "website", "web design", "розробка сайту", "вебсайт"],
  ["страхування", "insurance", "broker"],
  ["юрист", "lawyer", "legal", "immigration"],
  ["репетитор", "tutor", "lessons", "teacher"],
  ["клінінг", "cleaning", "cleaner", "прибирання"],
  ["масаж", "massage", "wellness"],
];

export function getCategorySearchAliases(categorySlug: string) {
  return categorySearchAliases[categorySlug] ?? "";
}

export function getExpandedSearchTerms(query: string | undefined) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return [];
  }

  const terms = new Set([normalizedQuery]);

  for (const group of queryAliasGroups) {
    const normalizedGroup = group.map(normalizeSearchText).filter(Boolean);
    const isMatch = normalizedGroup.some(
      (alias) =>
        alias === normalizedQuery ||
        alias.includes(normalizedQuery) ||
        normalizedQuery.includes(alias),
    );

    if (isMatch) {
      normalizedGroup.forEach((alias) => terms.add(alias));
    }
  }

  return Array.from(terms);
}

export function normalizeSearchText(value: string | undefined | null) {
  return value?.trim().replace(/\s+/g, " ").toLocaleLowerCase() ?? "";
}
