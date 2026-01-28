"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";

export const ContactForm = () => {
  const t = useTranslations("contact.form");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setStatus("sending");

    // Simulate send — replace with actual API call
    setTimeout(() => {
      setStatus("sent");
    }, 1200);
  };

  if (status === "sent") {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="mb-4 flex h-12 w-12 items-center justify-center border border-aurora text-aurora">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div className="font-mono text-xs text-aurora uppercase tracking-wider">
          {t("sent")}
        </div>
        <p className="mt-4 text-sm text-cream-dim">
          {t("sentMessage")}
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <div>
          <label
            htmlFor="name"
            className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted"
          >
            {t("name")}
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder={t("namePlaceholder")}
            className="form-input"
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted"
          >
            {t("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder={t("emailPlaceholder")}
            className="form-input"
          />
        </div>
      </div>
      <div>
        <label
          htmlFor="message"
          className="mb-2 block font-mono text-[10px] uppercase tracking-wider text-muted"
        >
          {t("message")}
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          placeholder={t("messagePlaceholder")}
          className="form-input resize-none"
        />
      </div>
      <button
        type="submit"
        disabled={status === "sending"}
        className="btn-primary w-full justify-center disabled:opacity-60 sm:w-auto"
      >
        {status === "sending" ? (
          <>
            <span className="inline-block h-3 w-3 animate-spin border border-current border-t-transparent" />
            {t("sending")}
          </>
        ) : (
          <>
            {t("send")}
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2.5 6H9.5M6.5 3L9.5 6L6.5 9" />
            </svg>
          </>
        )}
      </button>
    </form>
  );
};
