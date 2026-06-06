import type { Dataset } from './data';

export type ScenarioPatch = {
  dates: Map<string, Date>;
  qtys: Map<string, number>;
};

export type Scenario = {
  id: string;
  title: string;
  description: string;
  apply: (ds: Dataset) => ScenarioPatch;
};

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400_000);
}
function inMonth(d: Date, year: number, month: number): boolean {
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1;
}

const HALF_SHIFT_SEP: Scenario = {
  id: 'half-shift-sep',
  title: 'September halbieren',
  description:
    'Die Hälfte aller Endmontagen aus September 2026 wird auf Oktober und November umverteilt (FAL-Engpass).',
  apply(ds) {
    const dates = new Map<string, Date>();
    const msns = ds.production
      .filter((p) => inMonth(p.date, 2026, 9))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
    const half = Math.floor(msns.length / 2);
    msns.slice(half).forEach((p, i) => {
      dates.set(p.msn, addDays(p.date, i % 2 === 0 ? 30 : 60));
    });
    return { dates, qtys: new Map() };
  },
};

const ENGINE_SHORTAGE_SEP: Scenario = {
  id: 'engine-shortage-sep',
  title: 'Engine-Shortage Sept→Nov',
  description:
    'Engine-Lieferprobleme: alle September-Endmontagen 2026 werden um 60 Tage nach hinten verschoben.',
  apply(ds) {
    const dates = new Map<string, Date>();
    for (const p of ds.production) {
      if (inMonth(p.date, 2026, 9)) dates.set(p.msn, addDays(p.date, 60));
    }
    return { dates, qtys: new Map() };
  },
};

const RATE_RAMPUP_Q1: Scenario = {
  id: 'rate-rampup-q1',
  title: 'Rate-Erhöhung Q1 2027',
  description:
    'Boost: Alle MSNs aus Januar–März 2027 werden um 2 Wochen vorgezogen (höhere FAL-Rate).',
  apply(ds) {
    const dates = new Map<string, Date>();
    for (const p of ds.production) {
      if (p.date.getUTCFullYear() === 2027 && p.date.getUTCMonth() < 3) {
        dates.set(p.msn, addDays(p.date, -14));
      }
    }
    return { dates, qtys: new Map() };
  },
};

const GALLEY_ADD_ON: Scenario = {
  id: 'galley-add-on',
  title: 'Customer Add-On Galleys',
  description:
    'Drei Großkunden ordern zusätzliche Galleys: für rund 15 % der MSNs steigt die Galley-Anzahl um +2 Stück.',
  apply(ds) {
    const qtys = new Map<string, number>();
    const headByMsn = new Map<string, { part: string; qty: number }>();
    for (const b of ds.headBom) {
      if (!headByMsn.has(b.msn)) headByMsn.set(b.msn, { part: b.part, qty: b.qty });
    }
    const msns = Array.from(headByMsn.keys()).sort();
    for (let i = 0; i < msns.length; i++) {
      if (i % 7 === 0) {
        const h = headByMsn.get(msns[i])!;
        qtys.set(`${msns[i]}|${h.part}`, h.qty + 2);
      }
    }
    return { dates: new Map(), qtys };
  },
};

const FAL_FREEZE_DEC: Scenario = {
  id: 'fal-freeze-dec',
  title: 'Werks-Stop Dezember',
  description:
    'FAL-Schließung Dezember 2026: alle Endmontagen werden auf Januar 2027 verschoben (+31 Tage).',
  apply(ds) {
    const dates = new Map<string, Date>();
    for (const p of ds.production) {
      if (inMonth(p.date, 2026, 12)) dates.set(p.msn, addDays(p.date, 31));
    }
    return { dates, qtys: new Map() };
  },
};

export const SCENARIOS: Scenario[] = [
  HALF_SHIFT_SEP,
  ENGINE_SHORTAGE_SEP,
  RATE_RAMPUP_Q1,
  GALLEY_ADD_ON,
  FAL_FREEZE_DEC,
];

export function findScenario(id: string | null): Scenario | undefined {
  if (!id) return undefined;
  return SCENARIOS.find((s) => s.id === id);
}
