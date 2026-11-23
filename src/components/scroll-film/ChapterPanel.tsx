import type { CSSProperties, ReactNode } from "react";

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
}

const TITLE_STEP_MS = 55;
const BODY_STEP_MS = 14;
const BODY_GAP_MS = 120;
const MAX_BODY_SPAN_MS = 700;

const wordClass = (visible: boolean) =>
  `inline-block transition-[opacity,transform,filter] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
    visible
      ? "translate-y-0 opacity-100 blur-0 duration-700"
      : "-translate-y-2 opacity-0 blur-[3px] duration-300"
  }`;

const enterDelay = (visible: boolean, ms: number): CSSProperties =>
  ({ transitionDelay: visible ? `${Math.round(ms)}ms` : "0ms" });

/** Ord som glir inn ett og ett når kapittelet blir aktivt, og forsvinner samlet når det forlates. */
const FlowingWords = ({
  text,
  visible,
  startMs,
  stepMs,
}: {
  text: string;
  visible: boolean;
  startMs: number;
  stepMs: number;
}) => {
  const words = text.split(" ");
  return (
    <>
      <span className="sr-only">{text}</span>
      <span aria-hidden="true">
        {words.map((word, i) => (
          <span key={i}>
            <span
              className={`${wordClass(visible)} ${visible ? "" : "translate-y-[0.4em]"}`}
              style={enterDelay(visible, startMs + i * stepMs)}
            >
              {word}
            </span>
            {i < words.length - 1 && " "}
          </span>
        ))}
      </span>
    </>
  );
};

/** Kapitteltekst over filmen: til venstre på PC, nederst over en gradient på mobil. */
export const ChapterPanel = ({ chapters, active, intro, scrollHint, showHint }: ChapterPanelProps) => (
  <>
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg/90 via-bg/20 to-transparent md:bg-gradient-to-r md:from-bg/70 md:via-bg/10"
    />

    <div className="absolute inset-x-0 bottom-0 px-6 pb-14 md:inset-y-0 md:left-0 md:right-auto md:flex md:w-[46%] md:max-w-xl md:items-center md:pb-0 lg:px-12">
      <div className="relative w-full">
        {chapters.map((c, i) => {
          const visible = i === active;
          const titleWords = c.title.split(" ").length;
          const bodyWords = c.body.split(" ").length;
          const bodyStart = titleWords * TITLE_STEP_MS + BODY_GAP_MS;
          const bodyStep = Math.min(BODY_STEP_MS, MAX_BODY_SPAN_MS / Math.max(1, bodyWords));
          const footerDelay = bodyStart + bodyWords * bodyStep + BODY_GAP_MS;

          return (
            <article
              key={c.id}
              aria-hidden={!visible}
              className={visible ? "relative" : "pointer-events-none absolute inset-x-0 bottom-0"}
            >
              {i === 0 && intro}
              <h2 className="font-serif text-2xl leading-tight text-cream md:text-4xl">
                <FlowingWords text={c.title} visible={visible} startMs={0} stepMs={TITLE_STEP_MS} />
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-cream-dim md:text-base">
                <FlowingWords text={c.body} visible={visible} startMs={bodyStart} stepMs={bodyStep} />
              </p>
              {c.footer && (
                <div className={`mt-6 ${wordClass(visible)}`} style={enterDelay(visible, footerDelay)}>
                  {c.footer}
                </div>
              )}
            </article>
          );
        })}
      </div>
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
