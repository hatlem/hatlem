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

const postsData: Record<Locale, BlogPost[]> = {
  no: [
    {
      slug: "bygge-for-web-i-2026",
      title: "Å Bygge for Web i 2026",
      excerpt:
        "Webplattformen har utviklet seg dramatisk. Her er mønstrene og verktøyene jeg bruker når jeg starter et nytt prosjekt i dag.",
      content: `<h2>Landskapet har endret seg</h2>
<p>Web i 2026 ser bemerkelsesverdig annerledes ut enn for bare noen år siden. Server components er ikke lenger eksperimentelle — de er standarden. Grensen mellom backend og frontend har blitt utvisket på måter som gjør bygging av fullstack-applikasjoner genuint behagelig.</p>

<p>Når jeg starter et nytt prosjekt i dag, ser stacken min omtrent slik ut: Next.js med App Router, TypeScript overalt, Tailwind for styling, og PostgreSQL med Prisma for data. Det er ikke den mest eksotiske stacken, men det er en der hver del har fortjent sin plass gjennom pålitelighet.</p>

<h2>Hva som har endret seg i hvordan jeg tenker</h2>
<p>Det største skiftet er ikke i verktøyene — det er i den mentale modellen. Jeg tenker i form av dataflyt nå, ikke komponenthierarkier. Hvor bor dataene? Hvor ferske må de være? Hva skjer når nettverket er tregt?</p>

<p>Server components svarer på så mange av disse spørsmålene elegant. Hent dataene der du trenger dem. Ingen waterfall av API-kall. Ingen client-side state management for data som aldri burde ha forlatt serveren i utgangspunktet.</p>

<h2>Verktøyene jeg bruker</h2>
<p>Utover kjernestacken har noen verktøy blitt uunnværlige:</p>
<ul>
<li><strong>Zod</strong> for validering ved hver grense</li>
<li><strong>Tailwind CSS v4</strong> med sin nye CSS-first konfigurasjon</li>
<li><strong>Vitest</strong> for enhetstester som faktisk kjører raskt</li>
<li><strong>Playwright</strong> for E2E-tester som ikke flaker</li>
</ul>

<p>Fellesnevneren? Hvert verktøy gjør én ting bra og holder seg ellers unna. Jeg har sluttet å jage nyhet og begynt å optimalisere for forutsigbarhet.</p>

<blockquote>Den beste koden er koden du ikke trenger å tenke på to ganger.</blockquote>

<p>Bygg ting som fungerer. Ship dem. Iterer. Webben har aldri vært en bedre plattform for akkurat det.</p>`,
      date: "2026-01-15",
      readingTime: "6 min",
      tags: ["Webutvikling", "JavaScript", "Next.js"],
      featured: true,
    },
    {
      slug: "typescript-endret-hvordan-jeg-tenker",
      title: "Hvorfor TypeScript Endret Hvordan Jeg Tenker Om Kode",
      excerpt:
        "Det handler ikke om å fange bugs ved kompilering. Det handler om å designe bedre grensesnitt og kommunisere intensjon tydeligere.",
      content: `<h2>Mer enn typesikkerhet</h2>
<p>Når folk snakker om TypeScript, sentrerer samtalen vanligvis rundt "å fange bugs før runtime." Det er sant, men det går glipp av den dypere verdien. TypeScript endret fundamentalt hvordan jeg designer programvare.</p>

<p>Før TypeScript skrev jeg en funksjon og tenkte på hva den gjør. Nå tenker jeg på hva den lover. Typesignaturen er en kontrakt — et offentlig API for hver kodebit, uansett hvor liten.</p>

<h2>Design med typer først</h2>
<p>Jeg skriver ofte typene før implementasjonen. Ikke på en rigid måte, men som et tenkeverktøy. Hvilken form har dataene? Hva kan gå galt? Hva er edge cases?</p>

<h2>Den sammensatte effekten</h2>
<p>Den virkelige magien er hvordan disse små begrensningene bygger på hverandre. Når hver funksjon kommuniserer sine kontrakter tydelig, blir hele kodebasen mer navigerbar.</p>

<blockquote>TypeScript får deg ikke til å skrive mer kode. Det får deg til å tenke tydeligere om koden du skriver.</blockquote>`,
      date: "2025-12-03",
      readingTime: "5 min",
      tags: ["TypeScript", "Programvaredesign"],
      featured: true,
    },
    {
      slug: "kunsten-a-shippe",
      title: "Kunsten å Shippe",
      excerpt:
        "Perfekt er fienden av shipped. Her er hvordan jeg har lært å balansere kvalitet med momentum.",
      content: `<h2>Perfeksjonismefellen</h2>
<p>Jeg pleide å bruke uker på å polere features før jeg viste dem til noen. Koden var ren, testene var omfattende, edge cases var håndtert. Og så shipet jeg det og oppdaget at brukerne ville ha noe helt annet.</p>

<p>Den erfaringen gjentok seg nok ganger til å fundamentalt endre tilnærmingen min. Nå optimaliserer jeg for læringshastighet, ikke kodekvalitet — i hvert fall i de tidlige fasene.</p>

<h2>Shipping-rammeverket</h2>
<p>Tilnærmingen min har destillert ned til et enkelt rammeverk:</p>
<ul>
<li><strong>Uke 1:</strong> Bygg kjerneflyten. Ingen edge cases, ingen feilhåndtering utover det grunnleggende.</li>
<li><strong>Uke 2:</strong> Ship det til ekte brukere. Se dem bruke det. Lytt til hva som forvirrer dem.</li>
<li><strong>Uke 3:</strong> Forsterk det som betyr noe. Fiks det brukerne faktisk treffer på.</li>
</ul>

<blockquote>Ship tidlig, lær raskt, så bygg det riktig.</blockquote>`,
      date: "2025-10-18",
      readingTime: "4 min",
      tags: ["Produktivitet", "Ingeniørkultur"],
      featured: false,
    },
  ],
  en: [
    {
      slug: "building-for-the-web-in-2026",
      title: "Building for the Web in 2026",
      excerpt:
        "The web platform has evolved dramatically. Here are the patterns and tools I reach for when starting a new project today.",
      content: `<h2>The landscape has shifted</h2>
<p>The web in 2026 looks remarkably different from just a few years ago. Server components aren't experimental anymore — they're the default. The line between backend and frontend has blurred in ways that make building full-stack applications genuinely pleasant.</p>

<p>When I start a new project today, my stack looks something like this: Next.js with the App Router, TypeScript everywhere, Tailwind for styling, and PostgreSQL with Prisma for data. It's not the most exotic stack, but it's one where every piece has earned its place through reliability.</p>

<h2>What's changed in how I think</h2>
<p>The biggest shift isn't in the tools — it's in the mental model. I think in terms of data flow now, not component hierarchies. Where does the data live? How fresh does it need to be? What happens when the network is slow?</p>

<p>Server components answer so many of these questions elegantly. Fetch your data where you need it. No waterfall of API calls. No client-side state management library for data that should never have left the server in the first place.</p>

<h2>The tools I reach for</h2>
<p>Beyond the core stack, a few tools have become indispensable:</p>
<ul>
<li><strong>Zod</strong> for validation at every boundary</li>
<li><strong>Tailwind CSS v4</strong> with its new CSS-first configuration</li>
<li><strong>Vitest</strong> for unit tests that actually run fast</li>
<li><strong>Playwright</strong> for E2E tests that don't flake</li>
</ul>

<p>The common thread? Each tool does one thing well and gets out of the way. I've stopped chasing novelty and started optimizing for predictability.</p>

<blockquote>The best code is the code you don't have to think about twice.</blockquote>

<p>Build things that work. Ship them. Iterate. The web has never been a better platform for doing exactly that.</p>`,
      date: "2026-01-15",
      readingTime: "6 min",
      tags: ["Web Development", "JavaScript", "Next.js"],
      featured: true,
    },
    {
      slug: "typescript-changed-how-i-think",
      title: "Why TypeScript Changed How I Think About Code",
      excerpt:
        "It's not about catching bugs at compile time. It's about designing better interfaces and communicating intent more clearly.",
      content: `<h2>More than type safety</h2>
<p>When people talk about TypeScript, the conversation usually centers on "catching bugs before runtime." That's true, but it misses the deeper value. TypeScript fundamentally changed how I design software.</p>

<p>Before TypeScript, I'd write a function and think about what it does. Now I think about what it promises. The type signature is a contract — a public API for every piece of code, no matter how small.</p>

<h2>Designing with types first</h2>
<p>I often write the types before the implementation. Not in a rigid, architecture-astronaut way, but as a thinking tool. What shape does the data have? What can go wrong? What are the edge cases?</p>

<h2>The compound effect</h2>
<p>The real magic is how these small constraints compound. When every function communicates its contracts clearly, the entire codebase becomes more navigable.</p>

<blockquote>TypeScript doesn't make you write more code. It makes you think more clearly about the code you write.</blockquote>`,
      date: "2025-12-03",
      readingTime: "5 min",
      tags: ["TypeScript", "Software Design"],
      featured: true,
    },
    {
      slug: "the-art-of-shipping",
      title: "The Art of Shipping",
      excerpt:
        "Perfect is the enemy of shipped. Here's how I've learned to balance quality with momentum.",
      content: `<h2>The perfectionism trap</h2>
<p>I used to spend weeks polishing features before showing them to anyone. The code was clean, the tests were comprehensive, the edge cases were handled. And then I'd ship it and discover that users wanted something completely different.</p>

<p>That experience repeated enough times to fundamentally change my approach. Now I optimize for learning speed, not code quality — at least in the early stages.</p>

<h2>The shipping framework</h2>
<p>My approach has distilled into a simple framework:</p>
<ul>
<li><strong>Week 1:</strong> Build the core flow. No edge cases, no error handling beyond the basics.</li>
<li><strong>Week 2:</strong> Ship it to real users. Watch them use it. Listen to what confuses them.</li>
<li><strong>Week 3:</strong> Harden what matters. Fix what users actually hit.</li>
</ul>

<blockquote>Ship early, learn fast, then build it right.</blockquote>`,
      date: "2025-10-18",
      readingTime: "4 min",
      tags: ["Productivity", "Engineering Culture"],
      featured: false,
    },
  ],
  de: [
    {
      slug: "web-entwicklung-2026",
      title: "Web-Entwicklung im Jahr 2026",
      excerpt:
        "Die Webplattform hat sich dramatisch weiterentwickelt. Hier sind die Muster und Tools, die ich heute bei neuen Projekten verwende.",
      content: `<h2>Die Landschaft hat sich verändert</h2>
<p>Das Web im Jahr 2026 sieht bemerkenswert anders aus als noch vor wenigen Jahren. Server Components sind nicht mehr experimentell — sie sind der Standard. Die Grenze zwischen Backend und Frontend ist auf eine Weise verschwommen, die das Erstellen von Full-Stack-Anwendungen wirklich angenehm macht.</p>

<p>Wenn ich heute ein neues Projekt starte, sieht mein Stack ungefähr so aus: Next.js mit dem App Router, TypeScript überall, Tailwind für Styling und PostgreSQL mit Prisma für Daten.</p>

<h2>Was sich in meinem Denken geändert hat</h2>
<p>Die größte Veränderung liegt nicht in den Tools — sie liegt im mentalen Modell. Ich denke jetzt in Datenflüssen, nicht in Komponentenhierarchien.</p>

<h2>Die Tools, die ich verwende</h2>
<ul>
<li><strong>Zod</strong> für Validierung an jeder Grenze</li>
<li><strong>Tailwind CSS v4</strong> mit seiner neuen CSS-first Konfiguration</li>
<li><strong>Vitest</strong> für Unit-Tests, die tatsächlich schnell laufen</li>
<li><strong>Playwright</strong> für E2E-Tests, die nicht flackern</li>
</ul>

<blockquote>Der beste Code ist der Code, über den man nicht zweimal nachdenken muss.</blockquote>`,
      date: "2026-01-15",
      readingTime: "6 Min",
      tags: ["Webentwicklung", "JavaScript", "Next.js"],
      featured: true,
    },
    {
      slug: "typescript-hat-mein-denken-veraendert",
      title: "Warum TypeScript Mein Denken Über Code Verändert Hat",
      excerpt:
        "Es geht nicht darum, Bugs zur Kompilierzeit zu finden. Es geht darum, bessere Schnittstellen zu entwerfen und Absichten klarer zu kommunizieren.",
      content: `<h2>Mehr als Typsicherheit</h2>
<p>Wenn Leute über TypeScript sprechen, dreht sich das Gespräch normalerweise um "Bugs vor der Laufzeit finden." Das stimmt, aber es verfehlt den tieferen Wert. TypeScript hat fundamental verändert, wie ich Software entwerfe.</p>

<p>Vor TypeScript schrieb ich eine Funktion und dachte darüber nach, was sie tut. Jetzt denke ich darüber nach, was sie verspricht. Die Typsignatur ist ein Vertrag.</p>

<h2>Der zusammengesetzte Effekt</h2>
<p>Die wahre Magie liegt darin, wie sich diese kleinen Einschränkungen summieren. Wenn jede Funktion ihre Verträge klar kommuniziert, wird die gesamte Codebasis navigierbarer.</p>

<blockquote>TypeScript bringt dich nicht dazu, mehr Code zu schreiben. Es bringt dich dazu, klarer über den Code nachzudenken, den du schreibst.</blockquote>`,
      date: "2025-12-03",
      readingTime: "5 Min",
      tags: ["TypeScript", "Software-Design"],
      featured: true,
    },
    {
      slug: "die-kunst-des-shippens",
      title: "Die Kunst des Shippens",
      excerpt:
        "Perfektion ist der Feind des Gelieferten. So habe ich gelernt, Qualität mit Momentum zu balancieren.",
      content: `<h2>Die Perfektionismusfalle</h2>
<p>Früher verbrachte ich Wochen damit, Features zu polieren, bevor ich sie jemandem zeigte. Der Code war sauber, die Tests waren umfassend, die Edge Cases waren behandelt. Und dann shippte ich es und entdeckte, dass die Benutzer etwas völlig anderes wollten.</p>

<h2>Das Shipping-Framework</h2>
<ul>
<li><strong>Woche 1:</strong> Den Kernfluss bauen. Keine Edge Cases, keine Fehlerbehandlung über die Grundlagen hinaus.</li>
<li><strong>Woche 2:</strong> An echte Benutzer shippen. Zusehen, wie sie es benutzen.</li>
<li><strong>Woche 3:</strong> Verstärken, was wichtig ist. Beheben, worauf Benutzer tatsächlich stoßen.</li>
</ul>

<blockquote>Früh shippen, schnell lernen, dann richtig bauen.</blockquote>`,
      date: "2025-10-18",
      readingTime: "4 Min",
      tags: ["Produktivität", "Ingenieurkultur"],
      featured: false,
    },
  ],
};

export function getPosts(locale: Locale): BlogPost[] {
  return postsData[locale] || postsData.no;
}

export function getPostBySlug(locale: Locale, slug: string): BlogPost | undefined {
  const localePosts = getPosts(locale);
  return localePosts.find((post) => post.slug === slug);
}

export function getAllSlugs(): { locale: Locale; slug: string }[] {
  const slugs: { locale: Locale; slug: string }[] = [];
  for (const [locale, posts] of Object.entries(postsData)) {
    for (const post of posts) {
      slugs.push({ locale: locale as Locale, slug: post.slug });
    }
  }
  return slugs;
}
