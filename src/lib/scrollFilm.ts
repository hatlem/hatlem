/** Ren logikk for skrollfilmen: skroll → bilde/kapittel, og rekkefølgen bildene lastes i. */

export const CHAPTER_TIMES: readonly (readonly [number, number])[] = [
  [0, 4],
  [4, 9],
  [9, 15],
  [15, 20],
  [20, 24],
  [24, 30],
];

const clamp01 = (value: number): number =>
  Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

export const frameForProgress = (progress: number, frameCount: number): number =>
  Math.min(frameCount - 1, Math.round(clamp01(progress) * (frameCount - 1)));

export const chapterForProgress = (progress: number, duration: number): number => {
  const time = clamp01(progress) * duration;
  const index = CHAPTER_TIMES.findIndex(([, end]) => time < end);
  return index === -1 ? CHAPTER_TIMES.length - 1 : index;
};

export const loadOrder = (frameCount: number, step = 8): number[] => {
  const seen = new Set<number>();
  const order: number[] = [];
  const add = (index: number) => {
    if (index < 0 || index >= frameCount || seen.has(index)) return;
    seen.add(index);
    order.push(index);
  };

  for (let s = step; s >= 1; s = Math.floor(s / 2)) {
    for (let i = 0; i < frameCount; i += s) add(i);
    if (s === step) add(frameCount - 1);
    if (s === 1) break;
  }
  return order;
};

export const nearestLoaded = (
  target: number,
  loaded: ReadonlySet<number>,
): number | null => {
  if (loaded.has(target)) return target;
  let best: number | null = null;
  for (const index of loaded) {
    const distance = Math.abs(index - target);
    const bestDistance = best === null ? Infinity : Math.abs(best - target);
    if (distance < bestDistance || (distance === bestDistance && index < (best ?? Infinity))) {
      best = index;
    }
  }
  return best;
};
