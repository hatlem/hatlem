import type { CSSProperties } from "react";

export const wordClass = (visible: boolean) =>
  `inline-block transition-[opacity,transform,filter] ease-[cubic-bezier(0.22,1,0.36,1)] will-change-transform ${
    visible
      ? "translate-y-0 opacity-100 blur-0 duration-700"
      : "-translate-y-2 opacity-0 blur-[3px] duration-300"
  }`;

export const enterDelay = (visible: boolean, ms: number): CSSProperties =>
  ({ transitionDelay: visible ? `${Math.round(ms)}ms` : "0ms" });

/** Ord som glir inn ett og ett når de blir synlige, og forsvinner samlet når de skjules. */
export const FlowingWords = ({
  text,
  visible,
  startMs = 0,
  stepMs = 55,
}: {
  text: string;
  visible: boolean;
  startMs?: number;
  stepMs?: number;
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
