import type { Locale } from "@/i18n/config";
import { locales, defaultLocale } from "@/i18n/config";

export const SITE_URL = "https://andreashatlem.no";
export const SITE_NAME = "Andreas Hatlem";

export const ogLocaleMap: Record<Locale, string> = {
  no: "nb_NO",
  en: "en_US",
  de: "de_DE",
};

/**
 * Build canonical URL respecting `localePrefix: "as-needed"`.
 * Default locale (`no`) has no prefix; others get `/en`, `/de`.
 */
export function getCanonicalUrl(pathname: string, locale: Locale): string {
  const prefix = locale === defaultLocale ? "" : `/${locale}`;
  const normalizedPath = pathname === "/" ? "" : pathname;
  return `${SITE_URL}${prefix}${normalizedPath}`;
}

/**
 * Build hreflang alternate URLs for every locale.
 * Returns `{ no: url, en: url, de: url }` suitable for Next.js `metadata.alternates.languages`.
 */
export function getAlternateLanguages(pathname: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    languages[locale] = getCanonicalUrl(pathname, locale);
  }
  languages["x-default"] = getCanonicalUrl(pathname, defaultLocale);
  return languages;
}
