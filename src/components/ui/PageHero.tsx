import type { ReactNode } from "react";
import { FilmStill } from "./FilmStill";
import { FlowingTitle } from "./FlowingTitle";

/** Sidetopp med en scene fra filmen bak tittel og ingress. */
export const PageHero = ({
  second,
  title,
  lead,
  children,
}: {
  second: number;
  title: string;
  lead: string;
  children?: ReactNode;
}) => (
  <section className="relative flex min-h-[72svh] items-end overflow-hidden">
    <FilmStill second={second} priority className="absolute inset-0 h-full w-full object-cover" />
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-bg via-bg/55 to-bg/10" />
    <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-bg/70 via-transparent to-transparent" />
    <div className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-40 lg:px-8 lg:pb-20">
      <h1 className="max-w-3xl font-serif text-5xl leading-[1.02] tracking-tight text-cream md:text-7xl">
        <FlowingTitle text={title} />
      </h1>
      <p className="mt-6 max-w-xl text-lg leading-relaxed text-cream-dim">
        <FlowingTitle text={lead} startMs={250} stepMs={18} />
      </p>
      {children}
    </div>
  </section>
);
