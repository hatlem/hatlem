import { describe, expect, it } from "vitest";
import {
  CHAPTER_TIMES,
  chapterForProgress,
  frameForProgress,
  loadOrder,
  nearestLoaded,
} from "./scrollFilm";

describe("frameForProgress", () => {
  it("maps progress to a clamped 0-based frame index", () => {
    expect(frameForProgress(0, 360)).toBe(0);
    expect(frameForProgress(1, 360)).toBe(359);
    expect(frameForProgress(0.5, 360)).toBe(180);
    expect(frameForProgress(-0.2, 360)).toBe(0);
    expect(frameForProgress(1.4, 360)).toBe(359);
    expect(frameForProgress(Number.NaN, 360)).toBe(0);
  });
});

describe("chapterForProgress", () => {
  it("follows the chapter time ranges", () => {
    expect(CHAPTER_TIMES).toHaveLength(6);
    expect(chapterForProgress(0, 30)).toBe(0);
    expect(chapterForProgress(4 / 30, 30)).toBe(1);
    expect(chapterForProgress(14.9 / 30, 30)).toBe(2);
    expect(chapterForProgress(0.999, 30)).toBe(5);
    expect(chapterForProgress(1, 30)).toBe(5);
  });
});

describe("loadOrder", () => {
  it("loads a coarse pass first, then fills in every frame once", () => {
    const order = loadOrder(17, 8);
    expect(order.slice(0, 3)).toEqual([0, 8, 16]);
    expect(order).toHaveLength(17);
    expect([...order].sort((a, b) => a - b)).toEqual([...Array(17).keys()]);
  });

  it("always includes the last frame in the first pass", () => {
    expect(loadOrder(20, 8).slice(0, 4)).toEqual([0, 8, 16, 19]);
  });
});

describe("nearestLoaded", () => {
  it("returns the closest loaded frame, preferring the lower one on ties", () => {
    expect(nearestLoaded(10, new Set([0, 8, 16]))).toBe(8);
    expect(nearestLoaded(12, new Set([8, 16]))).toBe(8);
    expect(nearestLoaded(15, new Set([8, 16]))).toBe(16);
    expect(nearestLoaded(5, new Set())).toBeNull();
  });
});
