import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getMessages, getTranslations } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { hasLocale } from "next-intl";
import { locales } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { ogLocaleMap } from "@/lib/seo";
import { Navigation } from "@/components/Navigation";
import { NoiseOverlay } from "@/components/NoiseOverlay";

interface Props {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "meta" });

  return {
    title: {
      default: t("title"),
      template: `%s — ${t("title")}`,
    },
    description: t("description"),
    openGraph: {
      locale: ogLocaleMap[locale as Locale] ?? "nb_NO",
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;

  if (!hasLocale(locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages} locale={locale}>
      <NoiseOverlay />
      <div className="scan-line" aria-hidden="true" />
      <Navigation />
      <main className="min-h-screen">{children}</main>
    </NextIntlClientProvider>
  );
}
