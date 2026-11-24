const DATE_LOCALES: Record<string, string> = { no: "nb-NO", en: "en-GB", de: "de-DE" };

export const formatPostDate = (date: string, locale: string, month: "short" | "long" = "short"): string =>
  new Date(date).toLocaleDateString(DATE_LOCALES[locale] ?? "nb-NO", {
    year: "numeric",
    month,
    ...(month === "long" ? { day: "numeric" } : {}),
  });
