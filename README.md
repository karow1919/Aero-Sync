# AeroSync

Hackathon-MVP für eine **konsolidierte n-Tier Kapazitäts- und Bedarfsplanung** in
der Luftfahrt-Supply-Chain. Die Plattform stellt OEM- und Tier-Planer auf
dieselbe Bühne, berechnet aus einer geteilten Datenbasis den kaskadierten
Bedarf vom Endmontage-Termin bis in die Sub-BOM und visualisiert Änderungen
live als gestaffelte Ripple-Animation („man sieht die Lieferkette atmen").

> **Status**: Hackathon-Demo, lokale Ausführung. Repo:
> <https://github.com/karow1919/Aero-Sync>

---

## Stack

| Schicht | Technologie |
|---|---|
| Datengenerator | Python 3.12 · pandas · numpy |
| Backend / API | Next.js 15 (App Router, Node-Runtime), TypeScript |
| Frontend | React 19 + Tailwind v3, IBM Plex Sans/Mono |
| Datenhaltung | Lokales Einlesen der CSVs (fs, kein DB) + in-memory Override-Layer |

---

## Verzeichnisstruktur

```
.
├── README.md
├── generate_produktionsplan.py           # Python-Generator für den Ratenplan
├── Produktionsplanungsdaten.csv          # 515 MSNs über 18 Monate
├── BOM-Liste-Airbus.csv                  # MSN → Head-Bauteil → Anzahl
├── CSV Daten - Sub Bom Liste fuer Tier 1.csv  # Head → Sub-Bauteile
├── CSV Daten - lead time tier 1.csv      # Bauteil → Leadtime [Tage]
├── CSV Daten - part to suppleir connect.csv   # Bauteil → Lieferant
├── MSN-Galley-Zuweisung.xlsx             # Referenz, nicht im MVP benutzt
├── Design/
│   └── AeroSync_PRD_Design_Brandidentity.md  # Brand & Design-Tokens
└── mvp/                                  # Next.js-App
    ├── package.json
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx
    │   │   ├── page.tsx                  # Dashboard + Live-Demo
    │   │   ├── globals.css               # Design-Tokens
    │   │   └── api/
    │   │       ├── snapshot/route.ts     # liefert Charts/Tree/Alerts
    │   │       ├── overrides/route.ts    # manuelle MSN-Edits
    │   │       └── scenarios/route.ts    # Test-Szenarien
    │   └── lib/
    │       ├── csv.ts                    # CSV-Parser (; und ,)
    │       ├── data.ts                   # CSV-Loader (cached)
    │       ├── cascade.ts                # Tier-0/1/2-Bedarfskaskade
    │       ├── aggregate.ts              # Bucket-Aggregation + Alerts
    │       ├── overrides.ts              # Edit- + Szenario-Layer
    │       └── scenarios.ts              # 5 Demo-Szenarien
    ├── tailwind.config.ts
    └── tsconfig.json
```

---

## Setup

### Voraussetzungen

- Node.js 24 oder neuer (Windows: `winget install OpenJS.NodeJS`)
- Python 3.12 (nur falls du Testdaten neu generieren willst)

### Test-Daten erzeugen (optional)

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install pandas numpy
.\.venv\Scripts\python.exe .\generate_produktionsplan.py
```

Schreibt `Produktionsplanungsdaten.csv` mit 515 MSNs (Rate 30/Monat ±15 %)
über 18 Monate ab `start_date = 2026-06-06` neu.

### Web-App starten

```powershell
cd .\mvp
npm install
npm run dev
```

Standard-Port: <http://localhost:3000> (oder der nächste freie, z. B. `3001`).

Die App liest die CSVs aus dem **Eltern-Verzeichnis** (`process.cwd() = mvp/`,
Daten aus `..`). Wenn du den Datensatz änderst, einfach den Dev-Server neu
starten — der Loader cached den Datensatz im Speicher.

---

## Datenmodell

| Datei | Spalten | Zweck |
|---|---|---|
| `Produktionsplanungsdaten.csv` (`;`) | `MSN;Datum` | Endmontage-Termin pro Flugzeug |
| `BOM-Liste-Airbus.csv` (`;`) | `MSN;Bauteilnummer;Anzahl;Einheit` | Tier-1-Head-Bauteil pro MSN (Galley `84729105`, 3–5 Stück) |
| `CSV Daten - Sub Bom Liste fuer Tier 1.csv` (`,`) | `(Head-)Bauteilnummer;(Sub-)Bauteilnummer;Beschreibung;Anzahl;Einheit` | 10 Sub-Bauteile pro Galley |
| `CSV Daten - lead time tier 1.csv` (`,`) | `Bauteilnummer;Leadtime` | Leadtime [Tage] für Head + Subs |
| `CSV Daten - part to suppleir connect.csv` (`,`) | `Bauteilnummer;Lieferant` | Lieferanten-Zuordnung |

Daraus entstehen **6 Lieferanten-Sichten**:

- `Airbus (OEM)` – Tier 0, virtuell (eigene Endmontage)
- `Cabin Integrators GmbH` – T1 (Galley) + T2 (Mülleimer-Modul)
- `AeroSystems Iberia`, `Hanseatic Fasteners`, `Advanced Fluids & Mats`,
  `Standard Parts Co.` – reine T2-Lieferanten

---

## Geschäftslogik: Kaskade & Aggregation

Pro MSN wird in `lib/cascade.ts` folgendes Demand-Tripel erzeugt:

| Tier | Datum | Menge |
|---|---|---|
| **T0** (OEM) | Endmontagedatum | 1 Flugzeug |
| **T1** (Head) | T0 − LT(Head) | Anzahl aus BOM-Liste-Airbus |
| **T2** (Sub) | T1 − LT(Sub) | T1-Menge × Sub-Anzahl aus Sub-BOM |

Alle Demand-Items werden anschließend in `lib/aggregate.ts` nach
`Lieferant × Bauteil × Bucket` (Kalenderwoche **oder** Monat) summiert.
Die Bucket-Achse wird kontinuierlich erzeugt – auch leere Monate sind drin,
damit die Zeitachse aller Charts deckungsgleich ist.

**Alerts** vergleichen den pristinen CSV-Stand mit dem aktuellen Zustand
(Manuelle Edits + Szenario + What-If-Shift). Eine Mengenänderung in einem
Bucket triggert einen roten Alert, wenn die verbleibende Vorwarnzeit kleiner
ist als `2 × Leadtime` für das betroffene Bauteil.

---

## UI-Modi

### 1. Einzel-Sicht

Klassisches Lieferanten-Dashboard. Links Bauteilliste, rechts ein Säulen­
diagramm + Lieferbeziehungs-Tree (Parent oben, Sub-Suppliers gruppiert
unten). Tabs **Auslieferung** / **Beschaffung**, Klick auf eine Säule öffnet
den Drill-Down mit MSN-Aufschlüsselung.

### 2. Live-Demo

Tier-Banner links (`OEM` / `Tier 1` / `Tier 2`), rechts gestapelte
Säulen­diagramme mit identischer Monatsskala. Snapshot-Polling alle 2.5 s,
alle Charts pollen unabhängig pro Lieferant.

**Sidebar mit Test-Szenarien:** Toggle eines aus 5 vorgefertigten
Szenarien wendet sofort einen Bündel von Datums- und Mengen-Overrides an.
Verändert sich der Bedarf, läuft eine **scroll-getriggerte Ripple-Animation**
durch die Tier-Hierarchie:

- **grün** (`success`): der Balken wächst von alt zu neu (mehr Bedarf)
- **rot** (`critical`): der Balken schrumpft von alt zu neu (weniger Bedarf)
- Welle pro Bucket: links → rechts, ca. 20 ms pro Monat
- Welle pro Supplier: oben → unten, ca. 550 ms pro Tier-Position
- Eine Reihe animiert erst, wenn sie in die mittlere Viewport-Zone
  scrollt (IntersectionObserver, `rootMargin: -32%`)

### 3. Manuelle Bedarfs-Edits

Im Drill-Down öffnet **„Bedarf anpassen"** den Edit-Modus. Pro MSN-Zeile
sind Endmontage-Datum und Galley-Anzahl direkt editierbar. **„Übernehmen"**
schickt die Werte an `POST /api/overrides`, die Snapshot wird neu geladen
und alle Tier-Bedarfe kaskadieren automatisch nach.

---

## API

| Endpoint | Methode | Beschreibung |
|---|---|---|
| `/api/snapshot?supplier=…&bucket=week\|month&shiftFrom=YYYY-MM&shiftWeeks=N` | GET | Alles, was die UI braucht: Lieferantenliste, Bauteilliste, Bucket-Range, Cells, Tree, MSN-Info, Overrides-Status, Alerts |
| `/api/overrides` | GET / POST / DELETE | Liste / Setzen / komplettes Zurücksetzen manueller MSN-Edits |
| `/api/scenarios` | GET / POST `{id}` / DELETE | Verfügbare Szenarien / Aktivierung / Zurücksetzen |

---

## Test-Szenarien

| ID | Wirkung |
|---|---|
| `half-shift-sep` | September halbieren – Hälfte der MSNs auf Oct/Nov umverteilen |
| `engine-shortage-sep` | Engine-Shortage – komplettes September-Volumen +60 Tage |
| `rate-rampup-q1` | Rate-Erhöhung Q1 2027 – alle Jan–Mar-MSNs −14 Tage |
| `galley-add-on` | Customer Add-On Galleys – ~15 % der MSNs erhalten +2 Galleys |
| `fal-freeze-dec` | Werks-Stop Dezember – alle Dec-2026-MSNs +31 Tage |

Manuelle Edits gewinnen pro MSN/Part gegenüber Szenario-Overrides; was-wäre-
wenn-Shift kann zusätzlich übergelegt werden.

---

## Design-Tokens

Vollständig in `mvp/src/app/globals.css` und `mvp/tailwind.config.ts`
gepflegt. Highlights:

- **Akzent:** Steel-Azure `#1C5BBE`
- **Neutrale:** kühl-helles `#F6F8FB` (Canvas), `#FFFFFF` (Surface), Ink-
  Skala `#0F1A26 → #8A98A6`
- **Semantik:** Success `#1E8E5A`, Warning `#C8821A`, Critical `#BC3B2E`
- **Schrift:** IBM Plex Sans (UI) + IBM Plex Mono (Daten, `tabular-nums`)
- **Form:** kleine Radien (2/4/6 px), Hairline-Borders, Schatten nur auf
  Overlays

Hintergrund-Dokument: `Design/AeroSync_PRD_Design_Brandidentity.md`.

---

## Bekannte Grenzen / Demo-Hinweise

- Overrides + Szenarien liegen **nur im Server-Speicher**. Bei einem
  Dev-Server-Neustart sind sie weg — die CSVs werden nicht verändert.
- Der CSV-Cache invalidiert nur beim Neustart. Wenn du den Python-Generator
  neu laufen lässt, danach `npm run dev` neustarten.
- Polling-Takt 2.5 s + Animationen bis ~4 s gesamt: bei sehr schnellen
  Szenario-Wechseln können sich Animationen überlagern.
- Die Datei `MSN-Galley-Zuweisung.xlsx` wird vom MVP nicht eingelesen — die
  Mengen kommen aus `BOM-Liste-Airbus.csv`.

---

## Lizenz / Kontext

Erstellt im Rahmen eines Hackathons (Juni 2026). Test-Daten sind synthetisch;
echte Airbus-/Lieferantendaten kommen hier nicht zum Einsatz.
