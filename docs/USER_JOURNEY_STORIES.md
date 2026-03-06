# User Journey Stories — andreashatlem.no

## Overview

**Project:** Personal portfolio and blog for Andreas Hatlem
**URL:** https://andreashatlem.no
**Stack:** Next.js 16, next-intl (i18n), Tailwind CSS 4, Markdown blog, statically generated
**Supported Locales:** Norwegian (default, no prefix), English (`/en`), German (`/de`)
**Pages:** Home, About, Projects, Blog (index + individual posts), Contact
**Key Features:** Internationalization (3 languages), blog with markdown/frontmatter, project showcase, brutalist/terminal design aesthetic, scroll-reveal animations, responsive mobile navigation, language switcher, SEO (sitemap, robots, OG images, JSON-LD structured data), accessibility-conscious markup

### User Types

| User Type | Description |
|---|---|
| **Recruiter / Hiring Manager** | Evaluating Andreas as a candidate or collaborator; needs quick access to skills, experience, and projects |
| **Potential Client / Business Contact** | Looking to hire or partner; wants to understand capabilities and reach out |
| **Fellow Developer / Tech Reader** | Interested in blog content, technical opinions, and project details |
| **Norwegian Visitor** | Default locale visitor, may or may not understand English |
| **International Visitor** | English or German speaker navigating from search or direct link |
| **Search Engine Crawler** | Indexing the site for search results |
| **Screen Reader / Assistive Tech User** | Navigating with assistive technology |
| **Mobile User** | Browsing on a phone or small tablet |

---

## Happy Path Journeys

---

### Recruiter: Evaluating a Candidate

**Persona:** Technical recruiter at a Scandinavian tech company, browsing on a laptop.
**Goal:** Quickly assess Andreas's experience, skills, and shipped projects.
**Preconditions:** None. Arrives via LinkedIn link or direct URL.

#### Steps

1. **Lands on homepage** (`andreashatlem.no`) -- sees the kinetic "ANDREAS" hero with role subtitle "Produktbygger -- Oslo -- Bygget Siden 1999" in Norwegian (default locale).
2. **Switches language** to English via the language switcher (flag buttons in the top-right navigation bar). URL changes to `/en`. Hero now shows "Product Builder -- Oslo -- Building Since 1999".
3. **Clicks "About Me"** CTA button or nav link. Arrives at `/en/about`.
4. **Reads the About page** -- sees the personal narrative, timeline (1999 to 2022), and stats (25+ years, 1 agency exit, infinite projects shipped).
5. **Navigates to Projects** via nav bar. Arrives at `/en/projects`.
6. **Browses project cards** -- sees BurnBacon, GetIntent, GetMailer, GetCookies (featured), Human-Like, Utelivskartet (on ice). Each card shows title, description, tech stack tags, and live/GitHub links.
7. **Clicks a live project link** (e.g., "getmailer.co") -- opens in a new tab (`target="_blank"`, `rel="noopener noreferrer"`).
8. **Returns to the portfolio** and clicks "Contact" in the nav.
9. **Views contact information** -- sees email (andreas.hatlem@gmail.com), LinkedIn (/in/hatlem), Facebook, GitHub cards plus Oslo location info.
10. **Clicks the email card** -- `mailto:` link opens their email client.

#### Edge Cases

- Recruiter bookmarks `/en/about` -- the English locale persists correctly on return.
- Recruiter shares the URL with a colleague -- the `/en` prefix ensures English content is served.
- Recruiter visits on an ultra-wide monitor -- max-w-6xl container prevents content from stretching uncomfortably.

---

### Potential Client: Exploring Capabilities and Making Contact

**Persona:** Marketing director at a Norwegian company, browsing in Norwegian.
**Goal:** Understand what Andreas builds, see proof of work, and send an inquiry.
**Preconditions:** Arrives via Google search in Norwegian.

#### Steps

1. **Lands on the homepage** at `andreashatlem.no` (no locale prefix, Norwegian is default).
2. **Sees the terminal-style hero** with "> hei --from oslo" and animated letter-by-letter name reveal.
3. **Scrolls down** to the blog section on the home page, which shows featured posts and archive posts with scroll-reveal animations.
4. **Clicks "Prosjekter"** in the nav bar. Sees the asymmetric grid of project cards with Norwegian labels like "Pa Is" for on-ice projects.
5. **Reviews the GetIntent project** -- reads about AI-powered landing page personalization, notes the tech stack (Next.js, TypeScript, AI/LLM, Edge Functions).
6. **Clicks the external link icon** on the GetIntent card -- opens getintent.co in a new tab.
7. **Returns and navigates to "Kontakt"** via the nav bar.
8. **Sees all contact options** -- Email, LinkedIn, Facebook, GitHub cards in a responsive 4-column grid.
9. **Clicks the email card** to compose a message.

#### Edge Cases

- Client clicks "...og mange flere prosjekter under Getia." link at the bottom of the projects page -- opens getia.no in a new tab.
- Client on a slow connection -- scroll-reveal animations use IntersectionObserver with `threshold: 0.1`, so content appears as soon as 10% is visible, preventing jarring delays.

---

### Tech Reader: Consuming Blog Content

**Persona:** Developer interested in AI and automation, arrives from a shared blog link.
**Goal:** Read a specific blog post, then explore more content.
**Preconditions:** Clicks a shared link to `/en/blog/ai-agent-performance-manager`.

#### Steps

1. **Lands on the blog post** at `/en/blog/ai-agent-performance-manager`.
2. **Sees terminal-style breadcrumb** at top: `~ / blog / ai-agent-performance-manager` (with clickable `~` for home and `blog` for the blog index).
3. **Reads the article metadata** -- date (Jan 29, 2026), reading time (6 min), tags (AI, Marketing, Claude Code, Automation).
4. **Reads the full markdown-rendered content** -- headings, paragraphs, blockquotes, lists rendered via the `prose-custom` CSS class.
5. **Finishes reading** and sees the "Back to blog" link at the bottom.
6. **Clicks "Back to blog"** -- arrives at `/en/blog` with the full blog index.
7. **Sees featured posts** (2 posts in a 2-column grid) and archive posts (list format).
8. **Clicks the other featured post** ("The Moltbot Phenomenon") to continue reading.
9. **Switches language to Norwegian** via the language switcher -- URL changes to `/blog/the-moltbot-phenomenon` (same slug, Norwegian content from `content/blog/the-moltbot-phenomenon/no.md`).

#### Edge Cases

- Post slug does not exist in the requested locale -- `getPostBySlug` returns `undefined`, `notFound()` is called, and Next.js renders its 404 page.
- Blog post content contains inline code, blockquotes, and lists -- all styled correctly by `prose-custom` CSS.
- Shared link includes a locale the user doesn't read -- they can switch languages and the blog post loads in their preferred language (if the translation exists for that slug).

---

### Norwegian Visitor: First-Time Homepage Experience

**Persona:** Norwegian internet user, arrives from a Google search or social media.
**Goal:** Get a sense of who Andreas is and what he does.
**Preconditions:** None. Browser likely has Norwegian language preferences.

#### Steps

1. **Lands on homepage** at `andreashatlem.no`. Norwegian content loads by default (no prefix needed).
2. **Experiences the animated hero** -- sees "> hei --from oslo" terminal prompt, letters of "ANDREAS" animate in one-by-one with `letter-reveal` keyframe, role text fades up with staggered delays.
3. **Notices the Norwegian flag** and "OSLO, NORGE" in the bottom-right corner (desktop only, hidden on mobile via `hidden lg:block`).
4. **Sees the navigation bar** with "Om Meg", "Prosjekter", "Blogg", "Kontakt" and a Norwegian flag indicator next to "Oslo" in the nav.
5. **Scrolls down** -- scroll-reveal animations trigger on each section as they enter the viewport.
6. **Sees the blog section** with "Utvalgt" (Featured) and "Arkiv" (Archive) subsections.
7. **Reads a featured blog card** showing date, reading time, title, excerpt, and tags.
8. **Clicks "Alle Innlegg"** button to see the full blog index.
9. **Returns home** by clicking the "~/ andreashatlem" logo in the top-left corner.

#### Edge Cases

- Visitor scrolls very fast -- IntersectionObserver fires once per element and uses `unobserve` after, so animations only trigger once and don't replay.
- Visitor has JavaScript disabled -- `ScrollReveal` components will remain in their initial `opacity: 0; transform: translateY(30px)` state. Content would be invisible. This is a known limitation of the client-side scroll-reveal pattern.
- Visitor has `prefers-reduced-motion` -- no explicit media query override exists in the CSS; animations still play. (See Accessibility Journeys for details.)

---

### International Visitor: German-Speaking User

**Persona:** German-speaking professional, arrives at the site via a direct link.
**Goal:** Browse the portfolio in German.
**Preconditions:** Navigates to `andreashatlem.no/de` or switches language on arrival.

#### Steps

1. **Arrives at `/de`** -- German locale loads. Nav shows "Uber Mich", "Projekte", "Blog", "Kontakt".
2. **Browses the homepage** -- all hero text, blog section headers, and CTA buttons are in German.
3. **Clicks on a blog post** -- arrives at `/de/blog/the-moltbot-phenomenon`. German markdown content loads from `content/blog/the-moltbot-phenomenon/de.md`.
4. **Navigates to the About page** (`/de/about`) -- reads the German translation of the timeline and personal story.
5. **Navigates to Projects** (`/de/projects`) -- project descriptions remain in English (hardcoded in `projects.ts` data file, not internationalized).
6. **Clicks the language switcher** to go to English -- URL updates to `/en/projects`, content language changes for translated strings but project data stays the same.

#### Edge Cases

- German blog post translation is missing for a given slug -- `getPostBySlug("de", slug)` returns `undefined`, page shows 404.
- User navigates directly to `/de/blog/nonexistent-post` -- `notFound()` is triggered.
- Project data (titles, descriptions, tech tags) is not internationalized -- German users see English project descriptions. This is by design (developer tool names are typically English).

---

## Error & Recovery Journeys

---

### Visitor: 404 Not Found

**Persona:** Any user who navigates to a non-existent URL.
**Goal:** Understand they've reached a dead end and find their way back.
**Preconditions:** Arrives at an invalid URL, e.g., `/en/nonexistent-page`.

#### Steps

1. **Navigates to a non-existent path** like `/en/foo`.
2. **Next.js renders its default 404 page** (no custom `not-found.tsx` exists in the project).
3. **Navigation bar is still visible** (it's rendered in the locale layout).
4. **User clicks a nav link** to recover -- navigates back to a valid page.

#### Edge Cases

- URL contains a valid locale prefix but invalid path (e.g., `/de/abc`) -- locale layout renders, 404 page appears within the layout (with navigation).
- URL contains an invalid locale prefix (e.g., `/fr/about`) -- the `hasLocale(locales, locale)` check in the locale layout triggers `notFound()`.
- URL is the root with an unsupported locale (e.g., `/fr`) -- same behavior, falls through to 404.

---

### Visitor: Blog Post Missing in Current Locale

**Persona:** A reader who switches languages on a blog post that doesn't have a translation.
**Goal:** Read the blog post in their preferred language.
**Preconditions:** Currently reading a post in English, switches to German.

#### Steps

1. **Reading** `/en/blog/some-post-slug`.
2. **Clicks the German flag** in the language switcher.
3. **Router navigates to** `/de/blog/some-post-slug`.
4. **If `de.md` exists** in `content/blog/some-post-slug/` -- German content loads successfully.
5. **If `de.md` does NOT exist** -- `getPostBySlug("de", "some-post-slug")` returns `undefined`, `notFound()` is called, user sees 404.

#### Edge Cases

- Currently all blog posts have all 3 locale files (en, no, de), so this scenario does not occur with existing content. It would only happen if a future post omits a translation.
- The `generateMetadata` function for blog posts builds `alternates.languages` only for locales where the post exists (via `getCorrespondingSlug`), so search engines won't be pointed to missing translations.

---

### Visitor: Direct URL to Blog Index with No Posts

**Persona:** Any visitor accessing the blog when no content exists.
**Goal:** See the blog page without errors.
**Preconditions:** The `content/blog/` directory is empty or doesn't exist.

#### Steps

1. **Navigates to `/en/blog`**.
2. **`getPosts("en")` returns an empty array** because no blog directories exist.
3. **Blog page renders** with the header, section labels, and description but no post cards or list items (the `featured.length > 0` and `rest.length > 0` conditionals prevent rendering empty sections).
4. **Page looks sparse but functional** -- no errors, no broken layout.

#### Edge Cases

- The `content/blog/` directory itself doesn't exist -- `getPosts` checks `fs.existsSync(blogDir)` and returns `[]`, so no crash occurs.

---

## Edge Case Journeys

---

### Visitor: Rapid Language Switching

**Persona:** Curious user clicking between language flags quickly.
**Goal:** Switch between Norwegian, English, and German in quick succession.
**Preconditions:** On any page.

#### Steps

1. **On the homepage** at `andreashatlem.no`.
2. **Clicks English flag** -- `router.replace(pathname, { locale: "en" })` fires, URL changes to `/en`.
3. **Immediately clicks German flag** -- `router.replace` fires again with `locale: "de"`, URL changes to `/de`.
4. **Clicks Norwegian flag** -- returns to `/` (no prefix).
5. **All transitions work** because `router.replace` is synchronous in intent and next-intl handles the locale prefix removal/addition.

#### Edge Cases

- The language switcher uses `usePathname()` from next-intl navigation, which returns the locale-stripped pathname. So switching from `/en/about` to German correctly navigates to `/de/about`, not `/de/en/about`.
- Blog post URLs use the same slug across all locales (same folder name). Language switching on a blog post stays on the same slug.

---

### Visitor: Deep-Linking to a Specific Locale Page

**Persona:** Someone receiving a shared link with a locale prefix.
**Goal:** See content in the correct language immediately.
**Preconditions:** Clicks a link like `andreashatlem.no/en/about`.

#### Steps

1. **Browser navigates to** `/en/about`.
2. **Middleware** (in `proxy.ts` / the next-intl middleware) detects `en` as a valid locale.
3. **English About page renders** immediately -- no redirect, no flicker.
4. **Navigation shows English labels** ("About", "Projects", "Blog", "Contact").
5. **Language switcher highlights the English flag** as active.

#### Edge Cases

- Link is `/no/about` -- since `no` is the default locale and `localePrefix: "as-needed"` is configured, next-intl middleware may redirect to `/about` (removing the unnecessary prefix). Behavior depends on next-intl's redirect settings.
- Link is `/en` (just the locale, no path) -- renders the English homepage.

---

### Visitor: Mobile Menu Interaction

**Persona:** User on a phone or narrow viewport.
**Goal:** Navigate to different pages via the mobile hamburger menu.
**Preconditions:** Viewport width < 768px (md breakpoint).

#### Steps

1. **Desktop navigation is hidden** (`hidden md:flex`), **hamburger button is visible** (`md:hidden`).
2. **Taps the hamburger** -- `mobileOpen` state toggles to `true`.
3. **Full-screen overlay appears** with terminal-style decoration ("> navigation.init()" and "> ready_") and large display-text nav links.
4. **Body scroll is locked** -- `document.body.style.overflow = "hidden"` is applied.
5. **Links animate in** with staggered `transitionDelay` (100ms + 60ms per item).
6. **Taps a nav link** (e.g., "About") -- `onClick` handler calls `setMobileOpen(false)`, and the pathname change effect also closes the menu.
7. **Overlay fades out**, body scroll is restored, new page content loads.
8. **Language switcher** is available at the bottom of the mobile overlay.

#### Edge Cases

- User opens the menu and taps the hamburger again to close it -- the two-span hamburger animates back from X to parallel lines.
- User navigates to the same page they're already on -- `pathname` changes still detected by `useEffect` (comparing with `prevPathnameRef`); menu closes.
- User rotates phone to landscape while menu is open -- menu remains functional; the `fixed inset-0` positioning adapts.
- Component unmount -- the `useEffect` cleanup restores `document.body.style.overflow = ""`.

---

### Visitor: Scrolling Behavior and Animations

**Persona:** Any visitor scrolling through the site.
**Goal:** Experience smooth content reveals without jarring jumps.
**Preconditions:** JavaScript enabled, standard browser.

#### Steps

1. **Initial page load** -- elements wrapped in `<ScrollReveal>` start with `opacity: 0` and `translateY(30px)`.
2. **As user scrolls**, `IntersectionObserver` fires when each element is 10% visible (with `-60px` bottom margin).
3. **Element gets `.visible` class** -- transitions to `opacity: 1` and `translateY(0)` over 0.7s with a custom cubic bezier.
4. **Staggered delays** (via `delay` prop) create a cascading reveal effect within sections.
5. **Once revealed, observer disconnects** for that element -- scrolling back up does not re-hide/re-animate.

#### Edge Cases

- Very tall viewport where all content is visible on load -- IntersectionObserver fires immediately for visible elements, so animations still trigger.
- Browser doesn't support IntersectionObserver (very old browsers) -- `ScrollReveal` would never add the `.visible` class; content stays invisible. Mitigation: IntersectionObserver is supported in all modern browsers.

---

### Visitor: Header Scroll Behavior

**Persona:** Any visitor scrolling the page.
**Goal:** Navigation remains accessible while scrolling.
**Preconditions:** On any page.

#### Steps

1. **At the top of the page** -- header has `bg-transparent` (transparent background).
2. **Scrolls down past 40px** -- scroll event listener fires, `scrolled` state becomes `true`.
3. **Header transitions to** `bg-bg/95 border-b border-border` (semi-transparent dark background with bottom border).
4. **Scrolls back to top** -- header becomes transparent again.
5. **Header is always fixed** (`fixed top-0 left-0 right-0 z-50`) and accessible.

#### Edge Cases

- Scroll listener uses `{ passive: true }` for performance -- no scroll jank.
- Cleanup removes the listener on component unmount.

---

### Search Engine: Crawling and Indexing

**Persona:** Googlebot or other search engine crawler.
**Goal:** Index all pages with correct language variants and structured data.
**Preconditions:** Crawler accesses the site.

#### Steps

1. **Fetches `/robots.txt`** -- dynamically generated via `app/robots.ts`, allows all user agents, points to sitemap at `andreashatlem.no/sitemap.xml`.
2. **Fetches `/sitemap.xml`** -- dynamically generated via `app/sitemap.ts`:
   - 5 static pages (/, /about, /projects, /blog, /contact) with alternates for all 3 locales.
   - Blog post entries with per-locale URLs and cross-locale alternates.
   - Priorities: homepage (1.0), blog index (0.9), other pages (0.8), posts (0.7).
3. **Crawls each page** -- finds:
   - `<link rel="canonical">` for the current locale version.
   - `<link rel="alternate" hreflang="...">` for all locale variants plus `x-default`.
   - OpenGraph meta tags (title, description, URL, locale, type).
   - Twitter card meta tags.
4. **Finds JSON-LD structured data** on:
   - Homepage: `Person` schema with name, URL, jobTitle, and sameAs links.
   - Blog posts: `Article` schema with headline, description, datePublished, and author.
5. **Fetches OG image** at `/{locale}/opengraph-image` -- edge-rendered dynamic image showing "Andreas Hatlem" with locale-specific subtitle.

#### Edge Cases

- Sitemap blog entry alternate generation uses index-based mapping across locales, which works correctly when all locales have the same posts (current state).
- OG image uses `export const runtime = "edge"` -- may need to be changed to `"nodejs"` if deployed on Railway (per project memory notes about OG image runtime issues).
- Security headers (X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Referrer-Policy, HSTS, Permissions-Policy) are applied to all routes via `next.config.ts`.

---

## Accessibility Journeys

---

### Screen Reader User: Navigating the Site

**Persona:** Visually impaired user using a screen reader (e.g., VoiceOver, NVDA).
**Goal:** Navigate and understand all content on the site.
**Preconditions:** Using a screen reader with a modern browser.

#### Steps

1. **Lands on homepage** -- `<html>` has `class="dark"` but no `lang` attribute on the root layout. The locale layout does not explicitly set `lang` on a wrapper element. **Gap:** The `<html>` element should ideally have `lang` set to the current locale for screen readers.
2. **Navigates the header** -- screen reader finds:
   - Logo link "~/ andreashatlem" (reads as the text content).
   - Nav links: "About", "Projects", "Blog", "Contact".
   - Hamburger button has `aria-label="Toggle menu"` (or locale equivalent).
3. **Encounters decorative elements** -- `NoiseOverlay` and scan-line div both have `aria-hidden="true"`, correctly hidden from assistive tech.
4. **Reads the hero** -- `<h1>` contains the name "ANDREAS" via `KineticHero`. Each letter is in a `<span>`, so screen readers should read the full word.
5. **Navigates blog cards** -- each card is wrapped in a `<Link>` (which renders as `<a>`), so each card is a single focusable element.
6. **Reads project cards** -- external links have descriptive `aria-label` attributes like "GetMailer source code" and "GetMailer live".
7. **Footer social links** -- GitHub, LinkedIn, Facebook links each have `aria-label` text.

#### Edge Cases

- The `KineticHero` component splits "ANDREAS" into individual `<span>` elements. Some screen readers may read this letter-by-letter rather than as a word. The `select-none` class prevents text selection but not screen reader access.
- Blog post content is rendered via `dangerouslySetInnerHTML` -- the markdown-to-HTML pipeline produces semantic HTML (headings, paragraphs, lists, blockquotes), which is screen-reader-friendly.
- Scroll-reveal animations use CSS transitions (not ARIA live regions), so screen readers announce content regardless of visual state.
- The coordinates display ("59 54'N 10 45'E") uses HTML entities (`&apos;`) which screen readers handle correctly.

---

### Keyboard-Only User: Tab Navigation

**Persona:** User who navigates entirely with keyboard (Tab, Enter, Escape).
**Goal:** Access all interactive elements without a mouse.
**Preconditions:** Using keyboard navigation in a desktop browser.

#### Steps

1. **Tabs through the header** -- focus moves through: logo link, location text (not focusable), nav links (About, Projects, Blog, Contact), language switcher buttons (3 buttons).
2. **Tabs into the hero section** -- focus lands on "About Me" CTA (btn-primary), then "Projects" CTA (btn-secondary).
3. **Tabs through blog section** -- focus lands on each blog card link, then the "All Posts" button.
4. **Tabs through the footer** -- focus lands on the home link, nav links, and social media links.
5. **Pressing Enter** on any focused link navigates to that destination.

#### Edge Cases

- **Focus indicators:** The site relies on browser default focus outlines. No custom `:focus-visible` styles are defined in the CSS. Depending on the browser, focus may be hard to see against the dark background. **Gap:** Custom focus styles in the aurora color would improve visibility.
- **Language switcher buttons** are standard `<button>` elements, so they're natively keyboard accessible.
- **Mobile menu** is behind an `md:hidden` class on desktop, so it's not in the tab order on desktop viewports.
- **Skip-to-content link:** No skip-navigation link exists. **Gap:** A skip link would help keyboard users bypass the navigation.

---

### Reduced Motion User: Animation Preferences

**Persona:** User with `prefers-reduced-motion: reduce` system preference set.
**Goal:** Browse the site without excessive or distracting animations.
**Preconditions:** OS or browser setting for reduced motion is enabled.

#### Steps

1. **Lands on the homepage** -- kinetic hero letter-reveal animation plays (0.8s per letter with staggered delays).
2. **Scroll-reveal animations trigger** with 0.7s transitions as user scrolls.
3. **Noise overlay** continuously animates (noise-shift, 0.5s steps infinite).
4. **Scan line** continuously animates across the viewport (8s linear infinite).
5. **Terminal cursor** blinks infinitely (1s step-end infinite).

**Current behavior:** All animations play regardless of the `prefers-reduced-motion` preference. There is no `@media (prefers-reduced-motion: reduce)` query in the CSS.

**Gap:** The site should respect `prefers-reduced-motion` by:
- Disabling or simplifying the `letter-reveal`, `fade-up`, and scroll-reveal transitions.
- Stopping the continuous noise-shift and scan-line animations.
- Optionally keeping the terminal cursor blink (it's a subtle, expected UI pattern).

#### Edge Cases

- If reduced motion is respected, `ScrollReveal` elements should start in their visible state (no opacity/transform transition).
- The `KineticHero` letter animation should be replaced with a simple fade or no animation.

---

## Cross-Cutting Concerns

---

### Performance

- **Static generation:** Pages use `generateStaticParams` for locales and blog slugs, enabling static site generation at build time.
- **Standalone output:** `output: "standalone"` in next.config.ts for optimized production builds.
- **Font optimization:** Google Fonts (Instrument Serif, JetBrains Mono) loaded via `next/font` with `display: "swap"`.
- **Scroll listener:** Uses `{ passive: true }` to prevent blocking the main thread.
- **IntersectionObserver:** Disconnects after element is revealed to avoid unnecessary observation.
- **No client-side data fetching:** All data (blog posts, projects) is read at build time from the filesystem.

### SEO

- **Canonical URLs:** Every page has a canonical URL respecting locale prefix rules.
- **Hreflang alternates:** All pages declare alternate URLs for all 3 locales plus `x-default`.
- **Structured data:** JSON-LD for `Person` (homepage) and `Article` (blog posts).
- **OG/Twitter meta:** Title, description, URL, locale, image for each page.
- **Sitemap:** Comprehensive sitemap with priorities, change frequencies, and language alternates.
- **Robots.txt:** Allows all crawlers, references the sitemap.

### Security

- **Security headers:** X-Frame-Options (DENY), X-Content-Type-Options (nosniff), Referrer-Policy, HSTS (2 years with preload), Permissions-Policy (camera/microphone/geolocation denied).
- **External links:** All use `target="_blank"` with `rel="noopener noreferrer"`.
- **No user input:** The site has no forms, login, or user-submitted content. The contact page directs users to external platforms (email, LinkedIn, etc.).
- **Content rendering:** Blog content uses `dangerouslySetInnerHTML` but the source is local markdown files authored by the site owner (not user-generated content), so XSS risk is minimal. The `remark-html` plugin is used with `{ sanitize: false }` -- this is acceptable since the author controls all content.

### Internationalization

- **3 locales:** Norwegian (`no`, default), English (`en`), German (`de`).
- **Locale prefix:** `as-needed` strategy -- default locale (Norwegian) has no URL prefix; others get `/en` or `/de`.
- **Translated content:** UI strings via JSON message files; blog content via per-locale markdown files.
- **Non-translated content:** Project data (titles, descriptions, tech tags) is English-only in the data file. This is intentional for a developer portfolio.
- **Locale detection:** The next-intl middleware handles locale detection from the URL path.

### Responsive Design

- **Breakpoints:** Standard Tailwind breakpoints; primary break at `md` (768px) for mobile/desktop nav switch and `lg` (1024px) for wider layouts.
- **Mobile nav:** Full-screen overlay replaces desktop nav links below 768px.
- **Grid layouts:** Blog cards use `md:grid-cols-2`, projects use `lg:grid-cols-12` with varied spans.
- **Typography scaling:** `.display-massive` uses `clamp(4rem, 18vw, 14rem)` on desktop, `clamp(3rem, 15vw, 8rem)` on mobile.
- **Hidden elements:** Desktop-only elements (coordinates display, location in nav) use `hidden lg:block` / `hidden lg:flex`.

---

## Completeness Checklist

| Area | Covered | Notes |
|---|---|---|
| Homepage landing | Yes | Hero, blog section, CTAs |
| About page | Yes | Story, timeline, stats |
| Projects page | Yes | Card grid, external links, status badges |
| Blog index | Yes | Featured/archive split, empty state |
| Blog post detail | Yes | Breadcrumb, content, back link |
| Contact page | Yes | Email, LinkedIn, Facebook, GitHub cards |
| Language switching | Yes | 3 locales, flag buttons, URL updates |
| Mobile navigation | Yes | Hamburger, overlay, body scroll lock |
| 404 handling | Yes | Invalid paths, missing translations |
| SEO/crawling | Yes | Sitemap, robots, OG, JSON-LD, alternates |
| Screen reader | Yes | aria-labels, aria-hidden, semantic HTML |
| Keyboard navigation | Yes | Tab order, focusable elements |
| Reduced motion | Partial | **Gap:** No `prefers-reduced-motion` support |
| Color contrast | Partial | Dark theme with muted text -- contrast ratios should be audited |
| Focus indicators | Partial | **Gap:** No custom focus styles; relies on browser defaults |
| Skip navigation | No | **Gap:** No skip-to-content link |
| `lang` attribute | Partial | **Gap:** `<html>` tag does not dynamically set `lang` per locale |
| Error boundaries | No | No custom `error.tsx` files exist |
| Loading states | No | No custom `loading.tsx` files exist |
| Offline/slow network | No | No service worker or offline fallback |
| Print styles | No | No print-specific CSS |
