import type { DemandItem } from './cascade';
import { isoWeekKey, monthKey } from './cascade';

export type Bucket = 'week' | 'month';

export type MsnContrib = { msn: string; qty: number; targetDate: string };

export type AggCell = {
  supplier: string;
  part: string;
  bucket: string;
  totalQty: number;
  unit: string;
  msnContribs: MsnContrib[];
  parentSupplier: string | null;
  parentPart: string | null;
};

export function bucketKey(d: Date, b: Bucket): string {
  return b === 'week' ? isoWeekKey(d) : monthKey(d);
}

export function generateBucketRange(start: Date, end: Date, b: Bucket): string[] {
  if (end < start) return [];
  if (b === 'month') {
    const out: string[] = [];
    let y = start.getUTCFullYear();
    let m = start.getUTCMonth();
    const endY = end.getUTCFullYear();
    const endM = end.getUTCMonth();
    while (y < endY || (y === endY && m <= endM)) {
      out.push(`${y}-${String(m + 1).padStart(2, '0')}`);
      m++;
      if (m > 11) {
        m = 0;
        y++;
      }
    }
    return out;
  }
  const out: string[] = [];
  const cur = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()),
  );
  const endTs = end.getTime();
  while (cur.getTime() <= endTs) {
    const key = isoWeekKey(cur);
    if (out.length === 0 || out[out.length - 1] !== key) out.push(key);
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function aggregate(items: DemandItem[], b: Bucket): AggCell[] {
  const map = new Map<string, AggCell>();
  for (const it of items) {
    const bk = bucketKey(it.targetDate, b);
    const key = `${it.supplier}|${it.part}|${bk}`;
    let cell = map.get(key);
    if (!cell) {
      cell = {
        supplier: it.supplier,
        part: it.part,
        bucket: bk,
        totalQty: 0,
        unit: it.unit,
        msnContribs: [],
        parentSupplier: it.parentSupplier,
        parentPart: it.parentPart,
      };
      map.set(key, cell);
    }
    cell.totalQty += it.qty;
    cell.msnContribs.push({
      msn: it.msn,
      qty: it.qty,
      targetDate: it.targetDate.toISOString().slice(0, 10),
    });
  }
  // Stable ordering of contributions for readable drill-downs
  for (const cell of map.values()) {
    cell.msnContribs.sort((a, b2) => a.targetDate.localeCompare(b2.targetDate) || a.msn.localeCompare(b2.msn));
  }
  return Array.from(map.values());
}

export type Alert = {
  supplier: string;
  part: string;
  bucket: string;
  baseQty: number;
  newQty: number;
  delta: number;
  daysUntil: number;
  threshold: number;
};

export function compareForAlerts(
  baseline: AggCell[],
  simulated: AggCell[],
  leadTimes: Map<string, number>,
  today: Date,
): Alert[] {
  const base = new Map(baseline.map((c) => [`${c.supplier}|${c.part}|${c.bucket}`, c]));
  const sim = new Map(simulated.map((c) => [`${c.supplier}|${c.part}|${c.bucket}`, c]));
  const keys = new Set<string>([...base.keys(), ...sim.keys()]);
  const alerts: Alert[] = [];
  for (const k of keys) {
    const b = base.get(k);
    const s = sim.get(k);
    const baseQty = b?.totalQty ?? 0;
    const newQty = s?.totalQty ?? 0;
    if (baseQty === newQty) continue;
    const dates = [...(b?.msnContribs ?? []), ...(s?.msnContribs ?? [])].map((c) =>
      new Date(c.targetDate).getTime(),
    );
    if (dates.length === 0) continue;
    const earliest = Math.min(...dates);
    const daysUntil = Math.floor((earliest - today.getTime()) / 86400_000);
    const ref = (b ?? s)!;
    const lead = leadTimes.get(ref.part) ?? 0;
    const threshold = 2 * lead;
    if (daysUntil < threshold) {
      alerts.push({
        supplier: ref.supplier,
        part: ref.part,
        bucket: ref.bucket,
        baseQty,
        newQty,
        delta: newQty - baseQty,
        daysUntil,
        threshold,
      });
    }
  }
  alerts.sort((a, b) => a.daysUntil - b.daysUntil);
  return alerts;
}
