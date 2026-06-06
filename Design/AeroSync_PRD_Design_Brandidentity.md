# AeroSync — PRD · Sektion 4: Design & Brand Identity

> Abgeleitet aus dem Discovery-Workshop (Zielgruppe, Markenwerte, Vibe). Diese Sektion definiert
> die visuelle und verbale Identität von AeroSync sowie ein direkt baubares Design-Token-System.
> Stand: Hackathon. Build-Stack: Cursor + Codex.

---

## 4.0 Design-Profil (Input → Richtung)

| Eingabe | Entscheidung |
|---|---|
| Hauptpersona | **OEM- und Tier-Planer gleichwertig** → neutrale Bühne, keine Sicht ist „Gast" |
| Marken-Spektrum | **Seriös & vertrauenswürdig** (Luftfahrt = sicherheitskritisch), **modern statt verstaubt** |
| Grund-Vibe | **Hell, klar, luftig — aber informationsdicht; industrieller Touch; Gefühl von Sicherheit/Kontrolle** |
| Positionierung | **Glaubwürdiger Enterprise-Peer** (auf Augenhöhe mit AirSupply/SAP Ariba) |
| Farbwelt | **Hell & clean mit kühlem Akzent** |

**Konzeptuelle Richtung: „Precision Instrument".**
AeroSync sieht aus wie ein modernes Cockpit-/Control-Room-Werkzeug, das in ein helles,
ruhiges Enterprise-Layout übersetzt wurde. Präzision, Ruhe und Lesbarkeit vor Effekt. Das
Produkt soll sich anfühlen wie ein **geeichtes Instrument**, nicht wie eine Marketing-Website.

---

## 4.1 Design-Prinzipien

1. **Ruhe ist Sicherheit.** In einer sicherheitskritischen Domäne erzeugt visuelle Hektik
   Misstrauen. Wenige, konsistente Akzente; keine Alarm-Inflation; gedämpfte Semantik-Farben.
2. **Dichte ohne Enge.** Viele Daten, aber durch strenge Hierarchie, Whitespace-Rhythmus und
   ein Spaltenraster atembar gehalten — „luftig & klar, trotzdem informationsdicht".
3. **Neutrale Bühne.** OEM und Lieferant teilen dieselbe Sprache. Kein „OEM-Branding", das
   Lieferanten als Gäste markiert. Die Tier-Ebene des Nutzers wird durch Position/Label
   markiert, nicht durch eine andere visuelle Welt.
4. **Zahlen sind die Helden.** Termine, Mengen, MSN, Bauteilnummern: in einer monospaced,
   tabellarisch ausgerichteten Schrift, damit Spalten sauber kämmen und Vergleichbarkeit
   sofort sichtbar ist.
5. **Bewegung nur, wo sie Bedeutung trägt.** Das Motion-Budget konzentriert sich auf den
   einen Moment, der das Produkt erklärt: die Live-Kaskade.

---

## 4.2 Brand-Persönlichkeit & Positionierung

AeroSync tritt als **glaubwürdiger Enterprise-Peer** auf — souverän, technisch fundiert,
unaufgeregt. Wir konkurrieren nicht über „frischer/jünger als SAP", sondern über
**Klarheit und durchgängige n-Tier-Sicht**, die die Platzhirsche nicht bieten.

Persönlichkeit in drei Worten: **präzise · ruhig · verlässlich.**

Was wir bewusst NICHT sind: verspielt, laut, „disruptiv-startup-bunt", verspieltes Onboarding
mit Maskottchen, Dark-Mode-Gaming-Ästhetik.

---

## 4.3 Markenstimme (Voice & Tone)

- **Sachlich und konkret.** Wir sprechen die Sprache der Planer (MSN, FAL/Station 40,
  Leadtime, Forecast-Freeze). Fachbegriffe werden nicht „erklärt wie für Laien", sondern
  korrekt verwendet — das schafft Peer-Glaubwürdigkeit.
- **Ruhig, nie alarmistisch.** Auch kritische Zustände werden faktisch formuliert.
  Statt „⚠️ ACHTUNG VERZUG!" → „Bestelltermin liegt 4 Tage nach dem benötigten Datum."
- **Zweisprachig-bewusst.** UI primär Deutsch, etablierte englische Aerospace-Termini
  (Lead time, Forecast, Final Assembly Line) bleiben englisch — wie im realen Arbeitsalltag.
- **Keine Hype-Adjektive im Produkt.** „revolutionär", „smart", „magisch" gehören in den
  Pitch, nicht ins Interface.

Mikrotext-Beispiele:
- Leerzustand: „Noch kein Ratenplan hinterlegt. Lege eine MSN-Sequenz an, um die Kaskade zu starten."
- Bestätigung: „Rate aktualisiert. 3 Tier-Ebenen neu terminiert."
- Frozen-Hinweis: „Frozen Zone — fix bis Produktion. Änderungen erfordern Freigabe."

---

## 4.4 Name & Logo

**Name: AeroSync** — „Aero" (Luftfahrt, Präzision) + „Sync" (Synchronisation über Stufen).
Die Marke verspricht das Kernfeature im Wort: Gleichtakt über die ganze Kette.

**Logo-Konzept (Vorschläge für den Build):**
- **Nested-Chevron-Mark:** drei ineinandergeschobene Chevrons/Winkel, die nach rechts
  zeigen — visuelle Metapher für n-Tier-Stufen, die in Takt laufen. Funktioniert einfarbig.
- **Cascade-Tick:** ein abfallender Treppen-/Kaskaden-Strich (wie ein Backward-Schedule-Diagramm),
  der gleichzeitig wie ein Höhenmesser/Instrument-Zeiger lesbar ist.
- **Wortmarke:** IBM Plex Sans Medium, leicht verengtes Tracking (-0.5%), „Sync" optional in
  der Akzentfarbe. Reduziert, ingenieurhaft, kein Verlauf, kein Schatten.

---

## 4.5 Farbsystem

Helle, kühl getönte Basis (nicht Reinweiß → wirkt teurer und ruhiger) + **ein** dominanter
kühler Akzent (Steel-Azure) + zurückhaltende Neutralen für die industrielle Struktur.

### Neutralen (kühl getönt)
| Token | Hex | Verwendung |
|---|---|---|
| `canvas` | `#F6F8FB` | App-Hintergrund (luftig, leicht kühl) |
| `surface` | `#FFFFFF` | Karten, Tabellen, Panels |
| `surface-alt` | `#EEF2F7` | Zebra-Zeilen, gedämpfte Flächen |
| `border` | `#DCE3EC` | Hairline-Linien (Struktur statt Schatten) |
| `border-strong` | `#C2CDDA` | aktive/fokussierte Ränder |
| `ink-strong` | `#0F1A26` | Überschriften, primäre Zahlen |
| `ink` | `#2A3744` | Fließtext |
| `ink-muted` | `#5E6E7E` | Sekundärtext, Labels |
| `ink-subtle` | `#8A98A6` | Platzhalter, deaktiviert |

### Akzent (Steel-Azure — der eine kühle Akzent)
| Token | Hex | Verwendung |
|---|---|---|
| `primary` | `#1C5BBE` | Primäraktionen, aktive Elemente, Links |
| `primary-hover` | `#154A9C` | Hover/aktiv |
| `primary-soft` | `#EAF1FB` | Hintergrund für Selektion/Highlight |

### Planungs-Horizonte (domänenspezifisch — Kern der App)
Die drei Bestell-Horizonte aus dem Prozess bekommen eine eigene, eindeutige Farbsemantik.
Diese Skala ist das wichtigste funktionale Farbsignal im Produkt.

| Horizont | Token | Text/Fill | Bedeutung |
|---|---|---|---|
| Forecast (flexibel, weit) | `horizon-open` | Text `#2F6BD6` / Fill `#EAF0FE` | offen, frei änderbar |
| Flexibel, aber nah | `horizon-narrowing` | Text `#9A6614` / Fill `#FBF1DF` | schließt sich, mit Vorsicht ändern |
| Frozen (fix) | `horizon-frozen` | Text `#33495C` / Fill `#E6EEF2` | eingefroren, fix bis Produktion (Lock-Icon) |

> Designhinweis: „Frozen" bewusst als kühl-graue **Eis-Tönung** (nicht Rot) — fix bedeutet
> nicht „Fehler", sondern „verriegelt". Das hält die rote Farbe frei für echte Konflikte.

### Semantik (gedämpft — Anti-Alarm-Inflation)
| Token | Hex | Verwendung |
|---|---|---|
| `success` | `#1E8E5A` | termingerecht, bestätigt |
| `warning` | `#C8821A` | Engpass-Risiko, knapp |
| `critical` | `#BC3B2E` | Termin verfehlt, echter Konflikt (sparsam!) |
| `info` | `#1C5BBE` | = primary |

---

## 4.6 Typografie

Zwei Schnitte derselben Familie — maximal kohärent, ingenieurhaft, lizenzfrei (gut für Hackathon):

- **UI & Headings:** **IBM Plex Sans** (technisch-präzise, neutral-modern, Enterprise-Heritage).
  Bewusst NICHT Inter/Roboto/Arial.
- **Daten, IDs, Zahlen:** **IBM Plex Mono** mit **tabular figures** — für MSN, Bauteilnummern,
  Mengen, Termine. Sorgt für kämmende Spalten und das „Instrument"-Gefühl.

```
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
```

Skala (Desktop, dichte Enterprise-Variante):
| Stil | Größe / Zeilenhöhe | Schnitt |
|---|---|---|
| Display (Pitch/Hero) | 28 / 34 | Plex Sans 600 |
| H1 | 22 / 28 | Plex Sans 600 |
| H2 | 18 / 24 | Plex Sans 600 |
| H3 | 15 / 20 | Plex Sans 600 |
| Body | 14 / 20 | Plex Sans 400 |
| Body-strong | 14 / 20 | Plex Sans 500 |
| Tabellentext | 13 / 18 | Plex Sans 400 |
| Daten/Zahlen | 13 / 18 | **Plex Mono 400**, `font-variant-numeric: tabular-nums` |
| Label/Caption | 12 / 16 | Plex Sans 500, Tracking +2%, ggf. UPPERCASE |

---

## 4.7 Layout, Spacing, Form

- **Raster:** 4 px Basis, 8 px Rhythmus. Inhalts-Spaltenraster mit klaren Gutters für „dicht, aber luftig".
- **Tabellenzeilen:** kompakt, 34–36 px Höhe; optionaler „Comfortable"-Modus (44 px).
- **Radius:** klein und präzise — `radius-sm 2px` (Daten-Chips), `radius-md 4px` (Inputs/Buttons),
  `radius-lg 6px` (Karten). Keine „bubbly" runden Ecken — industriell.
- **Elevation:** überwiegend **Hairline-Borders statt Schatten** (flach, technisch). Schatten nur
  für echte Overlays (Modals, Dropdowns): `0 4px 16px rgba(15,26,38,.10)`.
- **Linien:** 1 px, Farbe `border`. Struktur entsteht durch Linien und Ausrichtung, nicht durch Farbe.

---

## 4.8 Ikonografie & Bildsprache

- **Line-Icons**, 1.5 px Strich, 20-px-Raster, geometrisch (z. B. Lucide / Phosphor). Keine
  gefüllten, verspielten Icons.
- **Funktionale Schlüssel-Icons:** Schloss (frozen), abfallende Stufen (Kaskade/Backward-Schedule),
  verbundene Knoten (Cross-Tier-Matching).
- **Keine Stock-Fotos, keine 3D-Illustrationen.** Höchstens dezente Blueprint-/Raster-Texturen oder
  ein feines Linien-Schema als Hintergrund-Atmosphäre in leeren Bereichen.
- **Datenvisualisierung:** Gantt-/Timeline-Balken in der Horizont-Farbsemantik; dünne Linien,
  klare Achsen, monospaced Achsenbeschriftung.

---

## 4.9 Motion — der „Hero-Moment"

Motion ist sparsam und zweckgebunden:
- **Standard-Transitions:** 160–200 ms, `ease-out`. Hover/Fokus dezent.
- **Signature-Interaktion — die Live-Kaskade:** Wenn der OEM die Rate ändert, **propagiert die
  Termin-/Mengenverschiebung sichtbar von Tier zu Tier nach unten** — als gestaffelte „Ripple"
  (80–120 ms Versatz pro Ebene, `cubic-bezier(.2,.8,.2,1)`), mit kurzem Highlight-Puls auf den
  geänderten Zellen. Das ist die visuelle Verkörperung des Value Props (Angriff auf die
  Signalverzerrung / Bullwhip). **Hierauf das gesamte Motion-Budget konzentrieren.**

---

## 4.10 Das eine merkfähige Element (Signature)

> **„Man sieht die Lieferkette atmen."**

Die Live-Kaskaden-Ripple ist das, was nach dem Pitch hängen bleibt. Eine einzige Eingabe oben
beim OEM läuft sichtbar und ruhig durch alle Tiers. Dieser Moment ist gleichzeitig Demo-Wow,
Markenkern und Beweis des Nutzenversprechens — und sollte im Build die höchste Sorgfalt bekommen.

---

## 4.11 Anti-Patterns (bewusst vermeiden)

- Lila/Violett-Verläufe auf Weiß (generische AI-/SaaS-Ästhetik).
- Neon- oder Vollton-Rot als Dauerzustand → Alarm-Müdigkeit in einer Safety-Domäne.
- Verspielte Illustrationen, Maskottchen, Emoji-Microcopy im Produkt.
- Inter/Roboto/Arial als Hausschrift.
- Dark-Mode als Default (Entscheidung: hell). Dark-Mode höchstens später als Option.
- „OEM-zentrisches" Branding, das Lieferanten visuell zu Gästen degradiert.

---

## 4.12 Design-Tokens (CSS — direkt baubar)

```css
:root {
  /* Neutralen (kühl getönt) */
  --canvas: #F6F8FB;
  --surface: #FFFFFF;
  --surface-alt: #EEF2F7;
  --border: #DCE3EC;
  --border-strong: #C2CDDA;
  --ink-strong: #0F1A26;
  --ink: #2A3744;
  --ink-muted: #5E6E7E;
  --ink-subtle: #8A98A6;

  /* Akzent (Steel-Azure) */
  --primary: #1C5BBE;
  --primary-hover: #154A9C;
  --primary-soft: #EAF1FB;

  /* Planungs-Horizonte */
  --horizon-open-fg: #2F6BD6;     --horizon-open-bg: #EAF0FE;
  --horizon-narrow-fg: #9A6614;   --horizon-narrow-bg: #FBF1DF;
  --horizon-frozen-fg: #33495C;   --horizon-frozen-bg: #E6EEF2;

  /* Semantik (gedämpft) */
  --success: #1E8E5A;
  --warning: #C8821A;
  --critical: #BC3B2E;
  --info: #1C5BBE;

  /* Typografie */
  --font-ui: 'IBM Plex Sans', system-ui, sans-serif;
  --font-data: 'IBM Plex Mono', ui-monospace, monospace;

  /* Form & Raum */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 6px;
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px;
  --shadow-overlay: 0 4px 16px rgba(15,26,38,.10);

  /* Motion */
  --ease-standard: cubic-bezier(.2,.8,.2,1);
  --dur-fast: 160ms;
  --dur-cascade-stagger: 100ms;
}

.tabular { font-family: var(--font-data); font-variant-numeric: tabular-nums; }
```

---

## 4.13 Offene Punkte für Folge-Sessions

- Logo-Variante final wählen (Nested-Chevron vs. Cascade-Tick) und als SVG umsetzen.
- Komponenten-Bibliothek (Tabelle, Timeline/Gantt, Tier-Navigator, Horizont-Chip) als
  konkrete Specs.
- Accessibility-Check: alle Text/Fill-Paare auf WCAG AA prüfen (besonders die Horizont-Chips).
- Marketing-/Pitch-Layer: ggf. eine ausdrucksstärkere Display-Schrift nur für Außenkommunikation.
