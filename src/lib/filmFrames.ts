/** Adresser til stillbilder fra skrollfilmen (felles for server- og klientkomponenter). */
export type FrameSet = "desktop" | "mobil";

export const FILM_FPS = 12;
export const MOBILE_MEDIA = "(max-aspect-ratio: 4/5), (max-width: 640px)";

export const frameUrl = (set: FrameSet, index: number): string =>
  `/film/${set}/f${String(index + 1).padStart(4, "0")}.webp`;

export const frameAtSecond = (second: number, fps = FILM_FPS): number =>
  Math.max(0, Math.round(second * fps));
