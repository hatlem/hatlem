"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { loadOrder, nearestLoaded } from "@/lib/scrollFilm";

export type FrameSet = "desktop" | "mobil";

export interface FilmManifest {
  fps: number;
  frameCount: number;
  duration: number;
  loopSegments?: number;
}

export const MOBILE_QUERY = "(max-aspect-ratio: 4/5), (max-width: 640px)";
const CONCURRENCY = 6;

export const frameUrl = (set: FrameSet, index: number): string =>
  `/film/${set}/f${String(index + 1).padStart(4, "0")}.webp`;

const subscribeMedia = (query: string) => (onChange: () => void) => {
  const mql = window.matchMedia(query);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
};

export const useMediaQuery = (query: string, serverValue = false): boolean =>
  useSyncExternalStore(
    subscribeMedia(query),
    () => window.matchMedia(query).matches,
    () => serverValue,
  );

interface Cache {
  images: Map<number, HTMLImageElement>;
  loaded: Set<number>;
}

/** Laster bildesettet som passer skjermen (grovt først), og gir nærmeste ferdiglastede bilde. */
export const useFrameSequence = (enabled: boolean, onFrameLoaded: () => void) => {
  const isMobile = useMediaQuery(MOBILE_QUERY);
  const set: FrameSet = isMobile ? "mobil" : "desktop";
  const [manifest, setManifest] = useState<FilmManifest | null>(null);
  const caches = useRef<Record<FrameSet, Cache>>({
    desktop: { images: new Map(), loaded: new Set() },
    mobil: { images: new Map(), loaded: new Set() },
  });
  const onLoadedRef = useRef(onFrameLoaded);
  useEffect(() => {
    onLoadedRef.current = onFrameLoaded;
  }, [onFrameLoaded]);

  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch("/film/manifest.json", { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`manifest ${res.status}`))))
      .then((data: FilmManifest) => setManifest(data))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) console.error("[skrollfilm]", error);
      });
    return () => controller.abort();
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !manifest) return;
    const cache = caches.current[set];
    const queue = loadOrder(manifest.frameCount).filter((i) => !cache.loaded.has(i));
    let cancelled = false;

    const next = async (): Promise<void> => {
      while (!cancelled && queue.length > 0) {
        const index = queue.shift()!;
        const img = new Image();
        img.decoding = "async";
        img.src = frameUrl(set, index);
        try {
          await img.decode();
        } catch {
          continue;
        }
        if (cancelled) return;
        cache.images.set(index, img);
        cache.loaded.add(index);
        onLoadedRef.current();
      }
    };

    for (let i = 0; i < CONCURRENCY; i++) void next();
    return () => {
      cancelled = true;
    };
  }, [enabled, manifest, set]);

  const nearestImage = useCallback(
    (target: number): { index: number; image: HTMLImageElement } | null => {
      const cache = caches.current[set];
      const index = nearestLoaded(target, cache.loaded);
      return index === null ? null : { index, image: cache.images.get(index)! };
    },
    [set],
  );

  return { set, manifest, nearestImage };
};
