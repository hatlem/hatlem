import { describe, expect, it } from "vitest";
import {
  CHAPTER_TIMES,
  filmProgress,
  loopTimeForHandoff,
  nextLoopBoundary,
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

describe("filmProgress", () => {
  it("holds the film on its first frame during the loop handoff, then spans the rest", () => {
    expect(filmProgress(0, 0.03)).toBe(0);
    expect(filmProgress(0.03, 0.03)).toBe(0);
    expect(filmProgress(1, 0.03)).toBe(1);
    expect(filmProgress(0.515, 0.03)).toBeCloseTo(0.5, 5);
    expect(filmProgress(-1, 0.03)).toBe(0);
  });
});

describe("nextLoopBoundary", () => {
  it("returns the next time the loop is back on the film's first frame", () => {
    expect(nextLoopBoundary(0, 12, 2)).toBe(0);
    expect(nextLoopBoundary(2, 12, 2)).toBe(6);
    expect(nextLoopBoundary(6, 12, 2)).toBe(6);
    expect(nextLoopBoundary(7.5, 12, 2)).toBe(12);
    expect(nextLoopBoundary(3, 12, 1)).toBe(12);
    expect(nextLoopBoundary(3, Number.NaN, 2)).toBe(3);
  });
});

describe("loopTimeForHandoff", () => {
  it("scrubs the loop from where it paused to its boundary across the handoff zone", () => {
    expect(loopTimeForHandoff(0, 0.03, 2, 6)).toBe(2);
    expect(loopTimeForHandoff(0.015, 0.03, 2, 6)).toBe(4);
    expect(loopTimeForHandoff(0.03, 0.03, 2, 6)).toBe(6);
    expect(loopTimeForHandoff(0.5, 0.03, 2, 6)).toBe(6);
  });
});
