"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  CHAPTER_TIMES,
  chapterForProgress,
  filmProgress,
  frameForProgress,
  loopTimeForHandoff,
  nextLoopBoundary,
} from "@/lib/scrollFilm";
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
// Første del av skrollengden spoler loopen fram til den er tilbake på filmens første bilde; der tar filmen over
const HANDOFF = 0.03;
const AT_TOP = 0.0005;
// Hvor raskt vist posisjon glir mot skrollposisjonen per bilde (0–1)
const EASE = 0.18;
const SETTLED = 0.0004;

const scrollProgress = (section: HTMLElement): number => {
  const rect = section.getBoundingClientRect();
  const distance = rect.height - window.innerHeight;
  return distance > 0 ? -rect.top / distance : 0;
};

export const ScrollFilm = ({ chapters, intro, scrollHint }: ScrollFilmProps) => {
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const sectionRef = useRef<HTMLElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const drawnRef = useRef<{ index: number; set: string } | null>(null);
  const shownRef = useRef<number | null>(null);
  const [chapter, setChapter] = useState(0);
  const [atTop, setAtTop] = useState(true);

  const drawRef = useRef<(progress: number, force?: boolean) => void>(() => {});
  const handleFrameLoaded = useCallback(() => drawRef.current(shownRef.current ?? 0), []);
  const { set, manifest, nearestImage } = useFrameSequence(!reducedMotion, handleFrameLoaded);

  const handoffRef = useRef<{ from: number; to: number } | null>(null);

  const syncLoop = useCallback(
    (progress: number, hasFrame: boolean) => {
      const video = videoRef.current;
      if (!video) return;

      if (!hasFrame || progress <= AT_TOP) {
        handoffRef.current = null;
        video.style.visibility = "visible";
        if (video.paused) void video.play().catch(() => {});
        return;
      }

      if (progress >= HANDOFF) {
        video.style.visibility = "hidden";
        if (!video.paused) video.pause();
        return;
      }

      if (!handoffRef.current) {
        video.pause();
        const from = video.currentTime;
        handoffRef.current = {
          from,
          to: nextLoopBoundary(from, video.duration, manifest?.loopSegments ?? 1),
        };
      }
      const { from, to } = handoffRef.current;
      const time = Math.min(loopTimeForHandoff(progress, HANDOFF, from, to), video.duration - 0.001);
      video.style.visibility = "visible";
      if (Math.abs(video.currentTime - time) > 1 / 48) video.currentTime = time;
    },
    [manifest],
  );

  const draw = useCallback(
    (progress: number, force = false) => {
      const canvas = canvasRef.current;
      if (!canvas || !manifest) return;
      const film = filmProgress(progress, HANDOFF);
      setChapter(chapterForProgress(film, manifest.duration));
      setAtTop(progress <= AT_TOP);

      const frame = nearestImage(frameForProgress(film, manifest.frameCount));
      syncLoop(progress, frame !== null);
      if (!frame) return;
      const drawn = drawnRef.current;
      if (!force && drawn && drawn.index === frame.index && drawn.set === set) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      sizeCanvas(canvas, canvas.clientWidth, canvas.clientHeight);
      drawCover(ctx, frame.image, canvas.width, canvas.height);
      drawnRef.current = { index: frame.index, set };
    },
    [manifest, nearestImage, set, syncLoop],
  );

  const currentTarget = useCallback(
    () => (sectionRef.current ? scrollProgress(sectionRef.current) : 0),
    [],
  );

  useEffect(() => {
    drawRef.current = draw;
    const progress = shownRef.current ?? currentTarget();
    shownRef.current = progress;
    draw(progress, true);
  }, [draw, currentTarget]);

  useEffect(() => {
    if (reducedMotion) return;
    let raf = 0;
    const step = () => {
      const target = currentTarget();
      const shown = shownRef.current ?? target;
      const diff = target - shown;
      const next = Math.abs(diff) < SETTLED ? target : shown + diff * EASE;
      shownRef.current = next;
      drawRef.current(next);
      raf = next === target ? 0 : requestAnimationFrame(step);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(step);
    };
    const onResize = () => drawRef.current(shownRef.current ?? currentTarget(), true);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
    };
  }, [reducedMotion, currentTarget]);

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
          ref={videoRef}
          key={set}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={set === "mobil" ? "/film/loop-mobil.mp4" : "/film/loop-desktop.mp4"} type="video/mp4" />
        </video>

        <ChapterPanel
          chapters={chapters}
          active={chapter}
          intro={intro}
          scrollHint={scrollHint}
          showHint={atTop}
        />
      </div>
    </section>
  );
};
