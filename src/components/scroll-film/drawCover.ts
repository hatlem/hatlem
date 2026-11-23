/** Tegner et bilde som object-fit: cover på et canvas, med skarphet for høy DPR (maks 2). */
export const MAX_DPR = 2;

export const sizeCanvas = (canvas: HTMLCanvasElement, cssW: number, cssH: number): number => {
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  return dpr;
};

export const drawCover = (
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  canvasW: number,
  canvasH: number,
): void => {
  const scale = Math.max(canvasW / img.naturalWidth, canvasH / img.naturalHeight);
  const w = img.naturalWidth * scale;
  const h = img.naturalHeight * scale;
  ctx.drawImage(img, (canvasW - w) / 2, (canvasH - h) / 2, w, h);
};
