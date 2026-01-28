"use client";

const name = "ANDREAS";

export const KineticHero = () => {
  return (
    <h1 className="display-massive text-cream select-none">
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
