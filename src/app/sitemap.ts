import type { MetadataRoute } from "next";
import { locales, defaultLocale } from "@/i18n/config";
import type { Locale } from "@/i18n/config";
import { getPosts } from "@/data/posts";
import { SITE_URL } from "@/lib/seo";

function buildAlternates(pathname: string) {
  const languages: Record<string, string> = {};
  for (const locale of locales) {
    const prefix = locale === defaultLocale ? "" : `/${locale}`;
    const normalizedPath = pathname === "/" ? "" : pathname;
    languages[locale] = `${SITE_URL}${prefix}${normalizedPath}`;
  }
  return { languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages = ["/", "/about", "/projects", "/blog", "/contact"];
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = staticPages.map((page) => {
    const isHome = page === "/";
    return {
      url: `${SITE_URL}${isHome ? "" : page}`,
      lastModified: now,
      changeFrequency: isHome ? "weekly" : "monthly",
      priority: isHome ? 1.0 : page === "/blog" ? 0.9 : 0.8,
      alternates: buildAlternates(page),
    };
  });

  // Blog post entries with cross-locale alternates (index-based slug mapping)
  const blogEntries: MetadataRoute.Sitemap = [];
  const noPosts = getPosts("no");
  const enPosts = getPosts("en");
  const dePosts = getPosts("de");
  const maxLen = Math.max(noPosts.length, enPosts.length, dePosts.length);

  for (let i = 0; i < maxLen; i++) {
    const languages: Record<string, string> = {};

    if (noPosts[i]) languages["no"] = `${SITE_URL}/blog/${noPosts[i].slug}`;
    if (enPosts[i]) languages["en"] = `${SITE_URL}/en/blog/${enPosts[i].slug}`;
    if (dePosts[i]) languages["de"] = `${SITE_URL}/de/blog/${dePosts[i].slug}`;

    // Create an entry for each locale that has this index
    for (const locale of locales) {
      const posts = locale === "no" ? noPosts : locale === "en" ? enPosts : dePosts;
      const post = posts[i];
      if (!post) continue;

      const prefix = locale === defaultLocale ? "" : `/${locale}`;
      blogEntries.push({
        url: `${SITE_URL}${prefix}/blog/${post.slug}`,
        lastModified: new Date(post.date),
        changeFrequency: "yearly",
        priority: 0.7,
        alternates: { languages },
      });
    }
  }

  return [...staticEntries, ...blogEntries];
}
