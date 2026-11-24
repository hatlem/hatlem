import type { ReactNode } from "react";
import { FilmStill } from "./FilmStill";
import { FlowingTitle } from "./FlowingTitle";

/** Sidetopp med en scene fra filmen bak tittel og ingress. */
export const PageHero = ({
  second,
  title,
  lead,
  eyebrow,
  compact = false,
  children,
}: {
  second: number;
  title: string;
  lead?: string;
  eyebrow?: ReactNode;
  /** Lavere topp og mindre tittel, for lange titler som blogginnlegg. */
  compact?: boolean;
  children?: ReactNode;
}) => (
  <section className={`relative flex items-end overflow-hidden ${compact ? "min-h-[58svh]" : "min-h-[72svh]"}`}>
    <FilmStill second={second} priority className="absolute inset-0 h-full w-full object-cover" />
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/10" />
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-bg/70 via-transparent to-transparent" />
    <div className={`relative mx-auto w-full px-6 pb-16 pt-40 lg:px-8 lg:pb-20 ${compact ? "max-w-3xl" : "max-w-6xl"}`}>
      {eyebrow && <div className="mb-6">{eyebrow}</div>}
      <h1
        className={`font-serif tracking-tight text-cream ${
          compact
            ? "text-4xl leading-[1.08] md:text-[3.5rem]"
            : "max-w-3xl text-5xl leading-[1.02] md:text-7xl"
        }`}
      >
        <FlowingTitle text={title} />
      </h1>
      {lead && (
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-dim">
          <FlowingTitle text={lead} startMs={250} stepMs={18} />
        </p>
      )}
      {children}
    </div>
  </section>
);
