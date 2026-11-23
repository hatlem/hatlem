"use client";

const name = "HATLEM";

interface KineticHeroProps {
  className?: string;
}

export const KineticHero = ({
  className = "display-massive text-cream select-none",
}: KineticHeroProps) => {
  return (
    <h1 className={className}>
      {name.split("").map((letter, i) => (
        <span
          key={i}
          className="kinetic-letter inline-block hover:text-aurora transition-colors duration-150"
          style={{
            animationDelay: `${0.3 + i * 0.06}s`,
          }}
        >
          {letter}
        </span>
      ))}
    </h1>
  );
};
