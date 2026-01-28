import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPosts } from "@/data/posts";
import type { Locale } from "@/i18n/config";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Footer } from "@/components/Footer";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "blog" });

  return {
    title: t("title"),
    description: t("description"),
  };
}

const ArrowIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" />
  </svg>
);

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("blog");
  const tTerminal = await getTranslations("terminal");

  const allPosts = getPosts(locale as Locale);
  const featured = allPosts.filter((p) => p.featured);
  const rest = allPosts.filter((p) => !p.featured);

  return (
    <>
      <div className="pt-32 pb-32">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          {/* Terminal header */}
          <ScrollReveal>
            <div className="mb-4 font-mono text-xs text-muted">
              <span className="text-aurora">&gt;</span> {tTerminal("blogCd")}
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
            <p className="mb-16 max-w-lg text-cream-dim leading-relaxed">
              {t("description")}
            </p>
          </ScrollReveal>

          {/* Featured posts */}
          {featured.length > 0 && (
            <div className="mb-16">
              <ScrollReveal>
                <div className="mb-6 font-mono text-[10px] uppercase tracking-wider text-muted">
                  <span className="text-aurora">{"/"}</span>
                  <span className="text-aurora">/</span> {t("featured")}
                </div>
              </ScrollReveal>

              <div className="grid gap-6 md:grid-cols-2">
                {featured.map((post, i) => (
                  <ScrollReveal key={post.slug} delay={0.08 * i}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="brutal-card group flex h-full flex-col p-6 lg:p-8"
                    >
                      <div className="mb-4 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted">
                        <time>
                          {new Date(post.date).toLocaleDateString("en-US", {
                            year: "numeric",
                            month: "short",
                          })}
                        </time>
                        <span className="text-border">/</span>
                        <span>{post.readingTime}</span>
                      </div>
                      <h3 className="mb-3 font-serif text-2xl text-cream transition-colors group-hover:text-aurora">
                        {post.title}
                      </h3>
                      <p className="mb-6 flex-1 text-sm text-cream-dim leading-relaxed">
                        {post.excerpt}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag) => (
                          <span key={tag} className="tag">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}

          {/* All posts */}
          {rest.length > 0 && (
            <div>
              <ScrollReveal>
                <div className="mb-6 font-mono text-[10px] uppercase tracking-wider text-muted">
                  <span className="text-aurora">{"/"}</span>
                  <span className="text-aurora">/</span> {t("archive")}
                </div>
              </ScrollReveal>

              <div className="space-y-1">
                {rest.map((post, i) => (
                  <ScrollReveal key={post.slug} delay={0.06 * i}>
                    <Link
                      href={`/blog/${post.slug}`}
                      className="group flex items-center justify-between border-b border-border py-6 transition-colors hover:border-aurora"
                    >
                      <div className="flex-1">
                        <div className="mb-2 flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-muted">
                          <time>
                            {new Date(post.date).toLocaleDateString("en-US", {
                              year: "numeric",
                              month: "short",
                            })}
                          </time>
                          <span>{post.readingTime}</span>
                        </div>
                        <h3 className="font-serif text-xl text-cream transition-colors group-hover:text-aurora">
                          {post.title}
                        </h3>
                      </div>
                      <div className="ml-8 text-muted opacity-0 transition-all group-hover:translate-x-1 group-hover:text-aurora group-hover:opacity-100">
                        <ArrowIcon />
                      </div>
                    </Link>
                  </ScrollReveal>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
