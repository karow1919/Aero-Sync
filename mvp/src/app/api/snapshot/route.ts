import { NextRequest, NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import { buildDemands, OEM_PART, OEM_SUPPLIER, type ShiftRule } from '@/lib/cascade';
import {
  aggregate,
  compareForAlerts,
  generateBucketRange,
  type AggCell,
  type Bucket,
} from '@/lib/aggregate';
import { getEffectiveOverrides, listOverrides } from '@/lib/overrides';
import { findScenario } from '@/lib/scenarios';

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

type GraphNode = { part: string; supplier: string; tier: 0 | 1 | 2; description: string };
type GraphChild = GraphNode & { qtyPerParent: number | null; unit: string | null };
type GraphEntry = { parent: GraphNode | null; children: GraphChild[] };

function buildPartGraph(
  ds: ReturnType<typeof loadDataset>,
  tierFor: (p: string) => 0 | 1 | 2,
): Record<string, GraphEntry> {
  const nodeFor = (part: string): GraphNode => ({
    part,
    supplier: part === OEM_PART ? OEM_SUPPLIER : ds.suppliers.get(part) ?? 'unbekannt',
    tier: tierFor(part),
    description:
      part === OEM_PART ? 'Endmontage Flugzeug' : ds.partDescriptions.get(part) ?? '',
  });

  const graph: Record<string, GraphEntry> = {};
  const headPartsUnique = Array.from(new Set(ds.headBom.map((b) => b.part)));

  graph[OEM_PART] = {
    parent: null,
    children: headPartsUnique.map((p) => ({ ...nodeFor(p), qtyPerParent: null, unit: null })),
  };

  for (const headPart of headPartsUnique) {
    const subs = ds.subBom.filter((s) => s.head === headPart);
    graph[headPart] = {
      parent: nodeFor(OEM_PART),
      children: subs.map((s) => ({ ...nodeFor(s.sub), qtyPerParent: s.qty, unit: s.unit })),
    };
  }

  for (const sub of ds.subBom) {
    if (!graph[sub.sub]) {
      graph[sub.sub] = { parent: nodeFor(sub.head), children: [] };
    }
  }

  return graph;
}

export async function GET(req: NextRequest) {
  const ds = loadDataset();
  const sp = req.nextUrl.searchParams;
  const supplier = sp.get('supplier');
  const bucket: Bucket = sp.get('bucket') === 'month' ? 'month' : 'week';
  const shift = parseShift(sp);

  const overrides = getEffectiveOverrides();
  const hasAnyDeviation = overrides.dateByMsn.size > 0 || overrides.qtyByMsnPart.size > 0 || !!shift;
  const pristineDemands = buildDemands(ds);
  const pristineAgg = hasAnyDeviation ? aggregate(pristineDemands, bucket) : null;
  const simDemands = buildDemands(ds, shift, overrides);
  const simAgg = aggregate(simDemands, bucket);
  const baseAgg = pristineAgg ?? simAgg;

  let minTs = Infinity;
  let maxTs = -Infinity;
  for (const d of pristineDemands) {
    const t = d.targetDate.getTime();
    if (t < minTs) minTs = t;
    if (t > maxTs) maxTs = t;
  }
  for (const d of simDemands) {
    const t = d.targetDate.getTime();
    if (t < minTs) minTs = t;
    if (t > maxTs) maxTs = t;
  }
  const bucketRange =
    Number.isFinite(minTs) && Number.isFinite(maxTs)
      ? generateBucketRange(new Date(minTs), new Date(maxTs), bucket)
      : [];

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

  const deliverBuckets = bucketRange;
  const procureBuckets = bucketRange;

  const allAlerts = hasAnyDeviation
    ? compareForAlerts(baseAgg, simAgg, ds.leadTimes, TODAY)
    : [];
  const deliverPartSet = new Set(deliverCells.map((c) => c.part));
  const procurePartSet = new Set(procureCells.map((c) => c.part));
  const deliverAlerts = allAlerts.filter(
    (a) => a.supplier === supplier && deliverPartSet.has(a.part),
  );
  const procureAlerts = allAlerts.filter((a) => procurePartSet.has(a.part));

  const partGraph = buildPartGraph(ds, tierFor);

  const overrideSummary = listOverrides();

  const headBomByMsn = new Map<string, { part: string; qty: number }[]>();
  for (const b of ds.headBom) {
    const arr = headBomByMsn.get(b.msn) ?? [];
    arr.push({ part: b.part, qty: b.qty });
    headBomByMsn.set(b.msn, arr);
  }
  const msnInfo: Record<
    string,
    {
      date: string;
      hasDateOverride: boolean;
      headPart: string;
      headQty: number;
      hasQtyOverride: boolean;
    }
  > = {};
  for (const prod of ds.production) {
    const effectiveDate = overrides.dateByMsn.get(prod.msn) ?? prod.date;
    const headEntry = headBomByMsn.get(prod.msn)?.[0];
    const headPart = headEntry?.part ?? '';
    const baseHeadQty = headEntry?.qty ?? 0;
    const overrideQty = overrides.qtyByMsnPart.get(`${prod.msn}|${headPart}`);
    msnInfo[prod.msn] = {
      date: effectiveDate.toISOString().slice(0, 10),
      hasDateOverride: overrides.dateByMsn.has(prod.msn),
      headPart,
      headQty: overrideQty ?? baseHeadQty,
      hasQtyOverride: overrideQty !== undefined,
    };
  }

  return NextResponse.json({
    today: TODAY.toISOString().slice(0, 10),
    bucket,
    suppliers,
    partGraph,
    overrides: overrideSummary,
    msnInfo,
    bucketRange,
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
