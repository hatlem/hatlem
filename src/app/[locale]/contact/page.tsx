import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ScrollReveal } from "@/components/ScrollReveal";
import { ContactForm } from "@/components/ContactForm";
import { Footer } from "@/components/Footer";

interface ContactPageProps {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: ContactPageProps): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function ContactPage({ params }: ContactPageProps) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("contact");
  const tCommon = await getTranslations("common");
  const tTerminal = await getTranslations("terminal");
  return (
    <>
      <div className="pt-32 pb-32">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          {/* Terminal header */}
          <ScrollReveal>
            <div className="mb-4 font-mono text-xs text-muted">
              <span className="text-aurora">&gt;</span> {tTerminal("contactInit")}
              <span className="terminal-cursor" />
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.05}>
            <div className="mb-4">
              <div className="terminal-line mb-4">{t("section")}</div>
              <h1 className="display-large text-cream">{t("title")}</h1>
            </div>
          </ScrollReveal>

          <ScrollReveal delay={0.1}>
            <p className="mb-12 text-cream-dim leading-relaxed">
              {t("description")}
            </p>
          </ScrollReveal>

          <ScrollReveal delay={0.15}>
            <div className="brutal-card p-8">
              {/* Terminal decoration */}
              <div className="mb-6 font-mono text-xs text-muted">
                <span className="text-aurora">&gt;</span> {t("terminal")}
              </div>
              <ContactForm />
            </div>
          </ScrollReveal>

          {/* Alternative contact */}
          <ScrollReveal delay={0.2}>
            <div className="mt-12 border-t border-border pt-8">
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-4">
                <span className="text-aurora">{"/"}</span>
                <span className="text-aurora">/</span> {t("alternative")}
              </div>
              <div className="flex flex-wrap gap-6 font-mono text-sm">
                <a
                  href="mailto:hello@andreashatlem.no"
                  className="link-hover text-cream-dim"
                >
                  hello@andreashatlem.no
                </a>
                <a
                  href="https://github.com/hatlem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-hover text-cream-dim"
                >
                  github.com/hatlem
                </a>
                <a
                  href="https://linkedin.com/in/andreashatlem"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-hover text-cream-dim"
                >
                  LinkedIn
                </a>
              </div>
            </div>
          </ScrollReveal>

          {/* Location info */}
          <ScrollReveal delay={0.25}>
            <div className="mt-12 flex items-center gap-4 font-mono text-xs text-muted">
              <span className="text-lg">🇳🇴</span>
              <div>
                <div className="text-cream-dim">{tCommon("location")}</div>
                <div>{tCommon("coordinates")} · {tCommon("timezone")}</div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </div>
      <Footer />
    </>
  );
}
