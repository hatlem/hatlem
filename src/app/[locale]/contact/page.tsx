import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { ScrollReveal } from "@/components/ScrollReveal";
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
            <p className="mb-16 text-cream-dim leading-relaxed">
              {t("description")}
            </p>
          </ScrollReveal>

          {/* Contact cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <ScrollReveal delay={0.15}>
              <a
                href="mailto:andreas.hatlem@gmail.com"
                className="brutal-card group flex flex-col items-center gap-4 p-8 text-center transition-colors hover:border-aurora"
              >
                <div className="text-muted transition-colors group-hover:text-aurora">
                  <MailIcon />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
                    {t("email")}
                  </div>
                  <div className="font-mono text-sm text-cream-dim group-hover:text-aurora transition-colors">
                    andreas.hatlem@gmail.com
                  </div>
                </div>
              </a>
            </ScrollReveal>

            <ScrollReveal delay={0.2}>
              <a
                href="https://linkedin.com/in/hatlem"
                target="_blank"
                rel="noopener noreferrer"
                className="brutal-card group flex flex-col items-center gap-4 p-8 text-center transition-colors hover:border-aurora"
              >
                <div className="text-muted transition-colors group-hover:text-aurora">
                  <LinkedInIcon />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
                    LinkedIn
                  </div>
                  <div className="font-mono text-sm text-cream-dim group-hover:text-aurora transition-colors">
                    /in/hatlem
                  </div>
                </div>
              </a>
            </ScrollReveal>

            <ScrollReveal delay={0.25}>
              <a
                href="https://github.com/hatlem"
                target="_blank"
                rel="noopener noreferrer"
                className="brutal-card group flex flex-col items-center gap-4 p-8 text-center transition-colors hover:border-aurora"
              >
                <div className="text-muted transition-colors group-hover:text-aurora">
                  <GitHubIcon />
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-wider text-muted mb-2">
                    GitHub
                  </div>
                  <div className="font-mono text-sm text-cream-dim group-hover:text-aurora transition-colors">
                    hatlem
                  </div>
                </div>
              </a>
            </ScrollReveal>
          </div>

          {/* Location info */}
          <ScrollReveal delay={0.3}>
            <div className="mt-16 flex items-center gap-4 font-mono text-xs text-muted">
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
