import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";
import type { Locale } from "@/i18n/config";

export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  readingTime: string;
  tags: string[];
  featured: boolean;
}

const blogDir = path.join(process.cwd(), "content", "blog");

function markdownToHtml(markdown: string): string {
  const result = remark().use(html, { sanitize: false }).processSync(markdown);
  return result.toString();
}

function readPost(slug: string, locale: Locale): BlogPost | null {
  const filePath = path.join(blogDir, slug, `${locale}.md`);
  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  return {
    slug,
    title: data.title,
    excerpt: data.excerpt,
    content: markdownToHtml(content),
    date: data.date,
    readingTime: data.readingTime,
    tags: data.tags ?? [],
    featured: data.featured ?? false,
  };
}

export function getPosts(locale: Locale): BlogPost[] {
  if (!fs.existsSync(blogDir)) return [];

  const slugs = fs
    .readdirSync(blogDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const posts = slugs
    .map((slug) => readPost(slug, locale))
    .filter((p): p is BlogPost => p !== null);

  posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return posts;
}

export function getPostBySlug(locale: Locale, slug: string): BlogPost | undefined {
  return readPost(slug, locale) ?? undefined;
}

export function getAllSlugs(): { locale: Locale; slug: string }[] {
  if (!fs.existsSync(blogDir)) return [];

  const slugs = fs
    .readdirSync(blogDir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const result: { locale: Locale; slug: string }[] = [];
  const locales: Locale[] = ["no", "en", "de"];

  for (const slug of slugs) {
    for (const locale of locales) {
      const filePath = path.join(blogDir, slug, `${locale}.md`);
      if (fs.existsSync(filePath)) {
        result.push({ locale, slug });
      }
    }
  }

  return result;
}

/**
 * Get the corresponding blog post slug in another locale.
 * With markdown-based posts, the slug (folder name) is the same across locales.
 * Returns the slug if the post exists in the target locale, undefined otherwise.
 */
export function getCorrespondingSlug(
  _fromLocale: Locale,
  toLocale: Locale,
  slug: string,
): string | undefined {
  const filePath = path.join(blogDir, slug, `${toLocale}.md`);
  if (fs.existsSync(filePath)) return slug;
  return undefined;
}
