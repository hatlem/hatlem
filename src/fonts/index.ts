import localFont from "next/font/local";

export const fraunces = localFont({
  src: [
    { path: "./fraunces-latin-wght-normal.woff2", weight: "100 900", style: "normal" },
    { path: "./fraunces-latin-wght-italic.woff2", weight: "100 900", style: "italic" },
  ],
  variable: "--font-fraunces",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const inter = localFont({
  src: "./inter-latin-wght-normal.woff2",
  weight: "100 900",
  style: "normal",
  variable: "--font-inter",
  display: "swap",
  adjustFontFallback: "Arial",
});
