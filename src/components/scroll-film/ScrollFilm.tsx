"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CHAPTER_TIMES, chapterForProgress, frameForProgress } from "@/lib/scrollFilm";
import { drawCover, sizeCanvas } from "./drawCover";
import { MOBILE_QUERY, frameUrl, useFrameSequence, useMediaQuery } from "./useFrameSequence";
import { ChapterPanel, type ChapterContent } from "./ChapterPanel";

export type { ChapterContent };

interface ScrollFilmProps {
  chapters: ChapterContent[];
  intro: ReactNode;
  scrollHint: string;
}

const FALLBACK_FPS = 12;
const SCRUB_START = 0.002;

const scrollProgress = (section: HTMLElement): number => {
  const rect = section.getBoundingClientRect();
  const distance = rect.height - window.innerHeight;
  return distance > 0 ? -rect.top / distance : 0;
};

export const ScrollFilm = ({ chapters, intro, scrollHint }: ScrollFilmProps) => {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawnRef = useRef<{ index: number; set: string } | null>(null);
  const [chapter, setChapter] = useState(0);
  const [scrubbing, setScrubbing] = useState(false);

  const drawRef = useRef<(force?: boolean) => void>(() => {});
  const handleFrameLoaded = useCallback(() => drawRef.current(), []);
  const { set, manifest, nearestImage } = useFrameSequence(!reducedMotion, handleFrameLoaded);

  const draw = useCallback(
    (force = false) => {
      const section = sectionRef.current;
      const canvas = canvasRef.current;
      if (!section || !canvas || !manifest) return;
      const progress = scrollProgress(section);
      setChapter(chapterForProgress(progress, manifest.duration));

      const frame = nearestImage(frameForProgress(progress, manifest.frameCount));
      if (!frame) return;
      setScrubbing(progress > SCRUB_START);
      const drawn = drawnRef.current;
      if (!force && drawn && drawn.index === frame.index && drawn.set === set) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      sizeCanvas(canvas, canvas.clientWidth, canvas.clientHeight);
      drawCover(ctx, frame.image, canvas.width, canvas.height);
      drawnRef.current = { index: frame.index, set };
    },
    [manifest, nearestImage, set],
  );

  useEffect(() => {
    drawRef.current = draw;
    draw(true);
  }, [draw]);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        drawRef.current();
      });
    };
    const onResize = () => drawRef.current(true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion]);

  if (reducedMotion) {
    const fps = manifest?.fps ?? FALLBACK_FPS;
    return (
      <section aria-label={chapters[0]?.title} className="relative">
        {chapters.map((c, i) => (
          <div key={c.id} className="relative mx-auto max-w-6xl px-6 py-16 lg:px-8">
            <picture>
              <source media={MOBILE_QUERY} srcSet={frameUrl("mobil", CHAPTER_TIMES[i][0] * fps)} />
              <img
                src={frameUrl("desktop", CHAPTER_TIMES[i][0] * fps)}
                alt=""
                className="mb-8 aspect-video w-full object-cover"
                loading={i === 0 ? "eager" : "lazy"}
              />
            </picture>
            {i === 0 && intro}
            <h2 className="mt-6 font-serif text-3xl text-cream">{c.title}</h2>
            <p className="mt-4 max-w-xl leading-relaxed text-cream-dim">{c.body}</p>
            {c.footer}
          </div>
        ))}
      </section>
    );
  }

  const progressLabel = `${chapter + 1} / ${chapters.length}`;

  return (
    <section ref={sectionRef} className="relative" style={{ height: "500vh" }}>
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-bg">
        <picture>
          <source media={MOBILE_QUERY} srcSet="/film/poster-mobil.webp" />
          <img
            src="/film/poster-desktop.webp"
            alt=""
            fetchPriority="high"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
        <canvas ref={canvasRef} aria-hidden="true" className="absolute inset-0 h-full w-full" />
        <video
          key={set}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            scrubbing ? "opacity-0" : "opacity-100"
          }`}
        >
          <source src={set === "mobil" ? "/film/loop-mobil.mp4" : "/film/loop-desktop.mp4"} type="video/mp4" />
        </video>

        <ChapterPanel
          chapters={chapters}
          active={chapter}
          intro={intro}
          scrollHint={scrollHint}
          showHint={!scrubbing}
          progressLabel={progressLabel}
        />
      </div>
    </section>
  );
};
