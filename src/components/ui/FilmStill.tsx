import { MOBILE_MEDIA, frameAtSecond, frameUrl } from "@/lib/filmFrames";

/** Stillbilde fra filmen: stående utsnitt på mobil, bredt på PC. */
export const FilmStill = ({
  second,
  className = "",
  priority = false,
}: {
  second: number;
  className?: string;
  priority?: boolean;
}) => {
  const index = frameAtSecond(second);
  return (
    <picture>
      <source media={MOBILE_MEDIA} srcSet={frameUrl("mobil", index)} />
      <img
        src={frameUrl("desktop", index)}
        alt=""
        aria-hidden="true"
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={className}
      />
    </picture>
  );
};
