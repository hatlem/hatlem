import localFont from "next/font/local";

export const instrumentSerif = localFont({
  src: [
    { path: "./instrument-serif-italic-400-71f6e919.woff2", weight: "400", style: "italic" },
    { path: "./instrument-serif-normal-400-e16406e3.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-instrument-serif",
  display: "swap",
  adjustFontFallback: "Times New Roman",
});

export const jetbrainsMono = localFont({
  src: "./jetbrains-mono-normal-100-800-21fccb8e.woff2",
  weight: "100 800",
  style: "normal",
  variable: "--font-jetbrains-mono",
  display: "swap",
});
