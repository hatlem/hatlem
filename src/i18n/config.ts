export const locales = ["no", "en", "de"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "no";

export const localeNames: Record<Locale, string> = {
  no: "Norsk",
  en: "English",
  de: "Deutsch",
};

export const localeFlags: Record<Locale, string> = {
  no: "🇳🇴",
  en: "🇬🇧",
  de: "🇩🇪",
};
