import type { Dataset } from './data';
import type { Overrides } from './overrides';

export type DemandItem = {
  msn: string;
  part: string;
  supplier: string;
  qty: number;
  unit: string;
  targetDate: Date;
  tier: 0 | 1 | 2;
  assemblyDate: Date;
  parentSupplier: string | null;
  parentPart: string | null;
};

export const OEM_SUPPLIER = 'Airbus (OEM)';
export const OEM_PART = 'MSN';

export type ShiftRule = { fromDate: Date; deltaDays: number };

export function shiftDate(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 86400_000);
}

export function applyShift(assemblyDate: Date, shift?: ShiftRule): Date {
  if (!shift) return assemblyDate;
  if (assemblyDate < shift.fromDate) return assemblyDate;
  return shiftDate(assemblyDate, shift.deltaDays);
}

export function buildDemands(
  ds: Dataset,
  shift?: ShiftRule,
  overrides?: Overrides,
): DemandItem[] {
  const out: DemandItem[] = [];

  const headBomByMsn = new Map<string, typeof ds.headBom>();
  for (const e of ds.headBom) {
    const arr = headBomByMsn.get(e.msn);
    if (arr) arr.push(e);
    else headBomByMsn.set(e.msn, [e]);
  }

  const subByHead = new Map<string, typeof ds.subBom>();
  for (const e of ds.subBom) {
    const arr = subByHead.get(e.head);
    if (arr) arr.push(e);
    else subByHead.set(e.head, [e]);
  }

  for (const prod of ds.production) {
    const baseDate = overrides?.dateByMsn.get(prod.msn) ?? prod.date;
    const assembly = applyShift(baseDate, shift);
    out.push({
      msn: prod.msn,
      part: OEM_PART,
      supplier: OEM_SUPPLIER,
      qty: 1,
      unit: 'Flugzeug',
      targetDate: assembly,
      tier: 0,
      assemblyDate: assembly,
      parentSupplier: null,
      parentPart: null,
    });
    const heads = headBomByMsn.get(prod.msn) ?? [];
    for (const h of heads) {
      const qtyHead = overrides?.qtyByMsnPart.get(`${prod.msn}|${h.part}`) ?? h.qty;
      const leadH = ds.leadTimes.get(h.part) ?? 0;
      const tier1Date = shiftDate(assembly, -leadH);
      const headSupplier = ds.suppliers.get(h.part) ?? 'unbekannt';
      out.push({
        msn: prod.msn,
        part: h.part,
        supplier: headSupplier,
        qty: qtyHead,
        unit: h.unit,
        targetDate: tier1Date,
        tier: 1,
        assemblyDate: assembly,
        parentSupplier: OEM_SUPPLIER,
        parentPart: OEM_PART,
      });
      const subs = subByHead.get(h.part) ?? [];
      for (const s of subs) {
        const leadS = ds.leadTimes.get(s.sub) ?? 0;
        const tier2Date = shiftDate(tier1Date, -leadS);
        out.push({
          msn: prod.msn,
          part: s.sub,
          supplier: ds.suppliers.get(s.sub) ?? 'unbekannt',
          qty: qtyHead * s.qty,
          unit: s.unit,
          targetDate: tier2Date,
          tier: 2,
          assemblyDate: assembly,
          parentSupplier: headSupplier,
          parentPart: h.part,
        });
      }
    }
  }
  return out;
}

export function isoWeekKey(d: Date): string {
  const tmp = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((tmp.getTime() - yearStart.getTime()) / 86400_000 + 1) / 7);
  return `${tmp.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function monthKey(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
