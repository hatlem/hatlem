import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";
import { PageHero } from "@/components/ui/PageHero";
import type { Locale } from "@/i18n/config";
import { SITE_NAME, ogLocaleMap, getCanonicalUrl, getAlternateLanguages } from "@/lib/seo";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: getCanonicalUrl("/contact", locale as Locale),
      languages: getAlternateLanguages("/contact"),
    },
    openGraph: {
      title: t("title"),
      description: t("description"),
      url: getCanonicalUrl("/contact", locale as Locale),
      siteName: SITE_NAME,
      locale: ogLocaleMap[locale as Locale],
    },
  };
}

const MailIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
    <path d="M22 6l-10 7L2 6" />
  </svg>
);

const LinkedInIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
);

const FacebookIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const GitHubIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
  </svg>
);

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tCommon = await getTranslations("common");

  const channels = [
    { href: "mailto:andreas.hatlem@gmail.com", label: t("email"), value: "andreas.hatlem@gmail.com", icon: <MailIcon />, external: false },
    { href: "https://www.linkedin.com/in/hatlem/", label: "LinkedIn", value: "linkedin.com/in/hatlem", icon: <LinkedInIcon />, external: true },
    { href: "https://github.com/hatlem", label: "GitHub", value: "github.com/hatlem", icon: <GitHubIcon />, external: true },
    { href: "https://www.facebook.com/andreas.hatlem/", label: "Facebook", value: "facebook.com/andreas.hatlem", icon: <FacebookIcon />, external: true },
  ];

  return (
    <>
      <PageHero second={29.5} title={t("title")} lead={t("description")} />

      <section className="mx-auto max-w-6xl px-6 pb-28 pt-4 lg:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {channels.map((c, i) => (
            <ScrollReveal key={c.label} delay={0.05 * (i % 2)}>
              <a
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                className="soft-card group flex items-center gap-5 p-6 lg:p-7"
              >
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 text-cream-dim transition-colors group-hover:border-aurora/50 group-hover:text-aurora">
                  {c.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs uppercase tracking-[0.14em] text-cream-dim">{c.label}</span>
                  <span className="mt-1 block truncate text-lg text-cream transition-colors group-hover:text-aurora">
                    {c.value}
                  </span>
                </span>
              </a>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal>
          <div className="mt-14 flex items-center gap-4 text-sm text-cream-dim">
            <span className="text-lg" aria-hidden="true">🇳🇴</span>
            <div>
              <div className="text-cream">{tCommon("location")}</div>
              <div>{tCommon("coordinates")} · {tCommon("timezone")}</div>
            </div>
          </div>
        </ScrollReveal>
      </section>
      <Footer />
    </>
  );
}
