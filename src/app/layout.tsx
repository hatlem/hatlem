import type { Metadata } from "next";
import { Agentation } from "agentation";
import { instrumentSerif, jetbrainsMono } from "../fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Andreas Hatlem — Product Builder",
    template: "%s — Andreas Hatlem",
  },
  description:
    "Product builder shipping for the web since 1999. Explore my projects, read my blog, or get in touch.",
  metadataBase: new URL("https://andreashatlem.no"),
  openGraph: {
    type: "website",
    siteName: "Andreas Hatlem",
    locale: "nb_NO",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className="dark">
      <body
        className={`${instrumentSerif.variable} ${jetbrainsMono.variable} antialiased`}
      >
        {children}
        {process.env.NODE_ENV === "development" && <Agentation endpoint="http://localhost:4747" />}
      </body>
    </html>
  );
}
