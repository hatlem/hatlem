"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { LanguageSwitcher } from "./LanguageSwitcher";

export const Navigation = () => {
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const tTerminal = useTranslations("terminal");
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname) {
      queueMicrotask(() => setMobileOpen(false));
    }
    prevPathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navLinks = [
    { href: "/about", label: t("about") },
    { href: "/projects", label: t("projects") },
    { href: "/blog", label: t("blog") },
    { href: "/contact", label: t("contact") },
  ];

  const isActive = useCallback(
    (href: string) => {
      if (href === "/") return pathname === "/";
      return pathname.startsWith(href);
    },
    [pathname]
  );

  return (
    <>
      <header
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-bg/95 border-b border-border"
            : "bg-transparent"
        }`}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 lg:px-8">
          {/* Logo - terminal style */}
          <Link
            href="/"
            className="group flex items-center gap-2"
          >
            <span className="text-aurora font-mono text-sm">~/</span>
            <span className="font-serif text-lg text-cream tracking-tight transition-colors group-hover:text-aurora">
              andreashatlem
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden items-center gap-8 md:flex">
            {/* Location - Norwegian identity */}
            <span className="coords hidden lg:flex items-center gap-2">
              <span className="text-sm">🇳🇴</span>
              <span className="coords-value">{tCommon("locationShort")}</span>
            </span>

            <div className="h-4 w-px bg-border" />

            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`link-hover text-xs uppercase tracking-[0.15em] transition-colors ${
                  isActive(link.href)
                    ? "text-aurora"
                    : "text-muted hover:text-cream"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="h-4 w-px bg-border" />
            <LanguageSwitcher />
          </div>

          {/* Mobile hamburger - brutalist */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="relative z-50 flex h-8 w-8 flex-col items-center justify-center gap-1.5 md:hidden"
            aria-label={tCommon("toggleMenu")}
          >
            <span
              className={`h-px w-5 bg-cream transition-all duration-200 ${
                mobileOpen ? "translate-y-[3px] rotate-45 bg-aurora" : ""
              }`}
            />
            <span
              className={`h-px w-5 bg-cream transition-all duration-200 ${
                mobileOpen ? "-translate-y-[3px] -rotate-45 bg-aurora" : ""
              }`}
            />
          </button>
        </nav>
      </header>

      {/* Mobile overlay - raw, full screen */}
      <div
        className={`fixed inset-0 z-40 bg-bg transition-all duration-300 md:hidden ${
          mobileOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Terminal-style decoration */}
        <div className="absolute top-20 left-6 text-muted font-mono text-xs">
          <div>&gt; {tTerminal("navInit")}</div>
          <div className="text-aurora">&gt; {tTerminal("ready")}</div>
        </div>

        <div className="flex h-full flex-col items-start justify-center gap-6 px-6">
          {navLinks.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`display-large transition-all duration-300 ${
                mobileOpen
                  ? "translate-x-0 opacity-100"
                  : "translate-x-8 opacity-0"
              } ${isActive(link.href) ? "text-aurora" : "text-cream hover:text-aurora"}`}
              style={{ transitionDelay: mobileOpen ? `${100 + i * 60}ms` : "0ms" }}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Bottom section with language switcher and coordinates */}
        <div className="absolute bottom-8 left-6 right-6 flex flex-col gap-4">
          <LanguageSwitcher />
          <div className="flex justify-between items-center text-muted font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-sm">🇳🇴</span>
              <span>{tCommon("location")}</span>
            </div>
            <span className="text-aurora">{tCommon("timezone")}</span>
          </div>
        </div>
      </div>
    </>
  );
};
