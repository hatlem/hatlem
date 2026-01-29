---
title: "Ein Portfolio Bauen: Terminal-Brutalismus Trifft Nordische Minimalistik"
excerpt: "Hinter den Kulissen von andreashatlem.no — Designphilosophie, technische Entscheidungen und warum es keine einzige abgerundete Ecke gibt."
date: "2026-01-28"
readingTime: "7 Min"
tags: ["Portfolio", "Design", "Next.js"]
featured: true
---

## Intention statt Vorlagen

Ich wollte eine Seite, die etwas über mich verrät, bevor man überhaupt die „Über"-Seite liest. Keine Vorlage mit ausgetauschten Farben. Nicht von einem Prompt generiert. Etwas, das sich bewusst anfühlt — technisch roh, menschlich durchdacht.

Das Ergebnis ist das, was ich Terminal-Brutalismus trifft nordische Minimalistik nenne. Dunkel wie eine norwegische Winternacht, mit einem Nordlicht-Teal als Akzent und Monospace-Typografie überall. Null abgerundete Ecken. Das ist kein Versehen.

## Der Stack

Die Entscheidungen sind bewusst und schlank:

- **Next.js 16** mit dem App Router und React 19
- **TypeScript** überall — keine Ausnahmen
- **Tailwind CSS v4** mit PostCSS
- **next-intl** für vollständige Internationalisierung (Norwegisch, Englisch, Deutsch)
- **pnpm** als Paketmanager

Kein Headless CMS, keine Datenbank, kein Analytics-SDK, keine Komponentenbibliothek. Blogbeiträge und Projektdaten leben als typisierte TypeScript-Objekte im Quellcode. Es ist ein Portfolio, und es weiß das.

## Die Designphilosophie

Die CSS-Datei eröffnet mit einem Kommentar: *„Terminal Brutalism + Post-AI Humanism. Anti-AI-slop. Intentionally human. Technically raw."*

Die Farbpalette ist von norwegischen Winternächten inspiriert — ein fast schwarzer Hintergrund, warmer cremefarbener Text und ein Nordlicht-Teal-Akzent, der überall auftaucht. Es gibt auch eine sekundäre „Mitternachtssonne"-Wärme als Kontrast.

Die Details belohnen Aufmerksamkeit:

- **Rausch- und Scanlinien-Overlays** — subtiles SVG-basiertes Filmkorn und eine langsam wandernde CRT-Scanlinie
- **Kinetische Typografie** — der Hero buchstabiert „ANDREAS" Buchstabe für Buchstabe mit 3D-Rotationsanimation
- **Terminal-Ästhetik** — Kommandoprompts, blinkende Cursor und Verzeichnis-Navigation
- **Brutalistische Karten** — Inhaltskarten mit versetzten Schatten-Pseudoelementen, die beim Hover shiften
- **Koordinaten** — 59°54'N 10°45'E und eine norwegische Flagge in der Ecke. Oslo-Stolz, ins Layout eingebaut.

## Dreisprachig von Tag eins

Die Seite wird auf Norwegisch (Standard), Englisch und Deutsch über next-intl ausgeliefert. Jede Sprache hat ihre eigene vollständige Nachrichtendatei und lokalisierte Blog-Inhalte — keine maschinell übersetzten Stubs, sondern echt angepasstes Schreiben.

## Keine clientseitige Datenabfrage

Alles ist server-gerendert. Blogbeiträge, Projekte, Übersetzungen — alles wird zur Build- oder Anforderungszeit aufgelöst. Die Client-Komponenten beschränken sich auf Scroll-Animationen, Navigationszustand und den Sprachumschalter.

## Die Schriftpaarung

Instrument Serif für Display-Überschriften und JetBrains Mono für alles andere. Serif + Monospace ist eine ungewöhnliche Kombination, die funktioniert, weil der brutalistische Kontext sie zusammenhält.

> Gebaut mit Intention, nicht mit Vorlagen.

Die gesamte Seite ging von create-next-app zum vollständigen dreisprachigen Portfolio in einer Handvoll Commits. Das ist Shipping-Geschwindigkeit in der Praxis.
