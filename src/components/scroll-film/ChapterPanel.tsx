import type { ReactNode } from "react";

export interface ChapterContent {
  id: string;
  title: string;
  body: string;
  footer?: ReactNode;
}

interface ChapterPanelProps {
  chapters: ChapterContent[];
  active: number;
  intro: ReactNode;
  scrollHint: string;
  showHint: boolean;
  progressLabel: string;
}

/** Kapitteltekst over filmen: panel til venstre på PC, nederst over en gradient på mobil. */
export const ChapterPanel = ({
  chapters,
  active,
  intro,
  scrollHint,
  showHint,
  progressLabel,
}: ChapterPanelProps) => (
  <>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg via-bg/40 to-transparent md:bg-gradient-to-r md:from-bg/90 md:via-bg/30"
    />

    <div className="absolute inset-x-0 bottom-0 px-6 pb-10 md:inset-y-0 md:left-0 md:right-auto md:flex md:w-[46%] md:max-w-xl md:items-center md:pb-0 lg:px-12">
      <div className="relative w-full">
        {chapters.map((c, i) => {
          const isActive = i === active;
          return (
            <article
              key={c.id}
              className={`transition-all duration-500 ease-out ${
                isActive
                  ? "relative translate-y-0 opacity-100"
                  : "pointer-events-none absolute inset-x-0 bottom-0 translate-y-6 opacity-0"
              }`}
            >
              {i === 0 && <div className="mb-6">{intro}</div>}
              <h2 className="font-serif text-2xl leading-tight text-cream md:text-4xl">{c.title}</h2>
              <p className="mt-4 text-sm leading-relaxed text-cream-dim md:text-base">{c.body}</p>
              {c.footer && <div className="mt-6">{c.footer}</div>}
            </article>
          );
        })}
      </div>
    </div>

    <div className="pointer-events-none absolute right-6 top-24 font-mono text-[10px] tracking-[0.2em] text-aurora md:bottom-8 md:top-auto">
      {progressLabel}
    </div>

    <div
      className={`pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 font-mono text-[10px] uppercase tracking-[0.3em] text-cream-dim transition-opacity duration-500 md:bottom-8 ${
        showHint ? "opacity-100" : "opacity-0"
      }`}
    >
      {scrollHint} ↓
    </div>
  </>
);
