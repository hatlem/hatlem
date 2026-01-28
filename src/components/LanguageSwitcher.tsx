"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { locales, localeNames, localeFlags, type Locale } from "@/i18n/config";

export const LanguageSwitcher = () => {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  const handleChange = (newLocale: Locale) => {
    router.replace(pathname, { locale: newLocale });
  };

  return (
    <div className="flex items-center gap-1">
      {locales.map((loc) => (
        <button
          key={loc}
          onClick={() => handleChange(loc)}
          className={`flex items-center gap-1 px-2 py-1 font-mono text-[10px] uppercase tracking-wider transition-colors ${
            locale === loc
              ? "text-aurora"
              : "text-muted hover:text-cream"
          }`}
          title={localeNames[loc]}
        >
          <span>{localeFlags[loc]}</span>
          <span className="hidden sm:inline">{loc.toUpperCase()}</span>
        </button>
      ))}
    </div>
  );
};
