import { NextRequest, NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import { buildDemands, OEM_PART, OEM_SUPPLIER, type ShiftRule } from '@/lib/cascade';
import { aggregate, compareForAlerts, type AggCell, type Bucket } from '@/lib/aggregate';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TODAY = new Date(Date.UTC(2026, 5, 6)); // 2026-06-06 — Projekt-Stichtag

function parseShift(searchParams: URLSearchParams): ShiftRule | undefined {
  const from = searchParams.get('shiftFrom');
  const weeks = Number(searchParams.get('shiftWeeks') ?? '0');
  if (!from || !weeks) return undefined;
  const [y, m] = from.split('-').map(Number);
  if (!y || !m) return undefined;
  return { fromDate: new Date(Date.UTC(y, m - 1, 1)), deltaDays: weeks * 7 };
}

function partsForCells(
  cells: AggCell[],
  ds: ReturnType<typeof loadDataset>,
  tierFor: (p: string) => 0 | 1 | 2,
) {
  const partList = Array.from(new Set(cells.map((c) => c.part)));
  return partList.map((p) => ({
    part: p,
    description: p === OEM_PART ? 'Endmontage Flugzeug' : ds.partDescriptions.get(p) ?? '',
    leadTimeDays: ds.leadTimes.get(p) ?? 0,
    supplier: p === OEM_PART ? OEM_SUPPLIER : ds.suppliers.get(p) ?? 'unbekannt',
    tier: tierFor(p),
  }));
}

export async function GET(req: NextRequest) {
  const ds = loadDataset();
  const sp = req.nextUrl.searchParams;
  const supplier = sp.get('supplier');
  const bucket: Bucket = sp.get('bucket') === 'month' ? 'month' : 'week';
  const shift = parseShift(sp);

  const baseDemands = buildDemands(ds);
  const baseAgg = aggregate(baseDemands, bucket);
  const simDemands = shift ? buildDemands(ds, shift) : baseDemands;
  const simAgg = shift ? aggregate(simDemands, bucket) : baseAgg;

  const headParts = new Set(ds.headBom.map((b) => b.part));
  const subParts = new Set(ds.subBom.map((b) => b.sub));
  const tierFor = (part: string): 0 | 1 | 2 =>
    part === OEM_PART ? 0 : headParts.has(part) ? 1 : subParts.has(part) ? 2 : 2;

  const tiersBySupplier = new Map<string, Set<0 | 1 | 2>>();
  for (const c of simAgg) {
    const set = tiersBySupplier.get(c.supplier) ?? new Set<0 | 1 | 2>();
    set.add(tierFor(c.part));
    tiersBySupplier.set(c.supplier, set);
  }

  const realSuppliers = Array.from(new Set(ds.suppliers.values())).sort();
  const suppliers = [OEM_SUPPLIER, ...realSuppliers].map((name) => ({
    name,
    tiers: Array.from(tiersBySupplier.get(name) ?? []).sort(),
  }));

  const deliverCells = supplier ? simAgg.filter((c) => c.supplier === supplier) : simAgg;
  const procureCells = supplier
    ? simAgg.filter((c) => c.parentSupplier === supplier)
    : [];

  const deliverBuckets = Array.from(new Set(deliverCells.map((c) => c.bucket))).sort();
  const procureBuckets = Array.from(new Set(procureCells.map((c) => c.bucket))).sort();

  const allAlerts = shift ? compareForAlerts(baseAgg, simAgg, ds.leadTimes, TODAY) : [];
  const deliverPartSet = new Set(deliverCells.map((c) => c.part));
  const procurePartSet = new Set(procureCells.map((c) => c.part));
  const deliverAlerts = allAlerts.filter(
    (a) => a.supplier === supplier && deliverPartSet.has(a.part),
  );
  const procureAlerts = allAlerts.filter((a) => procurePartSet.has(a.part));

  return NextResponse.json({
    today: TODAY.toISOString().slice(0, 10),
    bucket,
    suppliers,
    shiftApplied: shift
      ? { fromDate: shift.fromDate.toISOString().slice(0, 10), deltaDays: shift.deltaDays }
      : null,
    deliver: {
      parts: partsForCells(deliverCells, ds, tierFor),
      buckets: deliverBuckets,
      cells: deliverCells,
      alerts: deliverAlerts,
    },
    procure: {
      parts: partsForCells(procureCells, ds, tierFor),
      buckets: procureBuckets,
      cells: procureCells,
      alerts: procureAlerts,
    },
  });
}
