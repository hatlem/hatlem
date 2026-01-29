import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Andreas Hatlem";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const subtitles: Record<string, string> = {
  no: "Digital entrepren\u00F8r",
  en: "Digital Entrepreneur",
  de: "Digitaler Unternehmer",
};

export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const subtitle = subtitles[locale] ?? subtitles.no;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(135deg, #0a0a0a 0%, #141414 50%, #0f1a12 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Aurora accent line */}
        <div
          style={{
            width: 80,
            height: 3,
            background: "linear-gradient(90deg, #6ee7b7, #34d399)",
            marginBottom: 32,
            borderRadius: 2,
          }}
        />

        {/* Name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 400,
            color: "#f0ebe3",
            letterSpacing: "-0.02em",
            lineHeight: 1,
          }}
        >
          Andreas Hatlem
        </div>

        {/* Subtitle */}
        <div
          style={{
            fontSize: 24,
            fontWeight: 400,
            color: "#6ee7b7",
            marginTop: 20,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          {subtitle}
        </div>

        {/* Domain */}
        <div
          style={{
            fontSize: 16,
            color: "#666",
            marginTop: 40,
            letterSpacing: "0.05em",
          }}
        >
          andreashatlem.no
        </div>
      </div>
    ),
    { ...size },
  );
}
