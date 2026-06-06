'use client';

import { useEffect, useMemo, useState } from 'react';

type MsnContrib = { msn: string; qty: number; targetDate: string };
type AggCell = {
  supplier: string;
  part: string;
  bucket: string;
  totalQty: number;
  unit: string;
  msnContribs: MsnContrib[];
  parentSupplier: string | null;
  parentPart: string | null;
};
type Tier = 0 | 1 | 2;
type PartMeta = {
  part: string;
  description: string;
  leadTimeDays: number;
  supplier: string;
  tier: Tier;
};
type SupplierMeta = { name: string; tiers: Tier[] };
type Alert = {
  supplier: string;
  part: string;
  bucket: string;
  baseQty: number;
  newQty: number;
  delta: number;
  daysUntil: number;
  threshold: number;
};
type Stream = { parts: PartMeta[]; buckets: string[]; cells: AggCell[]; alerts: Alert[] };
type Snapshot = {
  today: string;
  bucket: 'week' | 'month';
  suppliers: SupplierMeta[];
  shiftApplied: { fromDate: string; deltaDays: number } | null;
  deliver: Stream;
  procure: Stream;
};

const TIER_STYLES: Record<Tier, string> = {
  0: 'bg-violet-100 text-violet-800 border-violet-300',
  1: 'bg-amber-100 text-amber-800 border-amber-300',
  2: 'bg-emerald-100 text-emerald-800 border-emerald-300',
};
const BAR_COLORS: Record<Tier, string> = {
  0: 'bg-violet-500',
  1: 'bg-amber-500',
  2: 'bg-emerald-500',
};

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span
      className={`ml-1 inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none ${TIER_STYLES[tier]}`}
    >
      {tier === 0 ? 'OEM' : `T${tier}`}
    </span>
  );
}
function tiersLabel(tiers: Tier[]): string {
  if (tiers.length === 0) return '';
  return tiers.map((t) => (t === 0 ? 'OEM' : `T${t}`)).join('+');
}

function PartChart({
  part,
  stream,
  onDrill,
}: {
  part: PartMeta;
  stream: Stream;
  onDrill: (cell: AggCell) => void;
}) {
  const cellByBucket = useMemo(() => {
    const m = new Map<string, AggCell>();
    for (const c of stream.cells) if (c.part === part.part) m.set(c.bucket, c);
    return m;
  }, [stream.cells, part.part]);

  const maxQty = useMemo(() => {
    let m = 0;
    for (const v of cellByBucket.values()) if (v.totalQty > m) m = v.totalQty;
    return m;
  }, [cellByBucket]);

  const totalQty = useMemo(() => {
    let s = 0;
    for (const v of cellByBucket.values()) s += v.totalQty;
    return s;
  }, [cellByBucket]);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-mono text-base font-semibold">{part.part}</span>
          <TierBadge tier={part.tier} />
          <span className="ml-2 text-sm text-slate-600">{part.description}</span>
        </div>
        <div className="text-xs text-slate-500">
          Lieferant: <span className="font-medium">{part.supplier}</span> · LT {part.leadTimeDays} d · Gesamt {totalQty}
        </div>
      </div>
      <div className="flex h-48 items-end gap-[2px] border-b border-slate-200 pb-1">
        {stream.buckets.map((b) => {
          const cell = cellByBucket.get(b);
          const qty = cell?.totalQty ?? 0;
          const pct = maxQty > 0 ? (qty / maxQty) * 100 : 0;
          return (
            <button
              type="button"
              key={b}
              disabled={!cell}
              onClick={() => cell && onDrill(cell)}
              className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end disabled:cursor-default"
              title={cell ? `${b}: ${qty}` : `${b}: keine`}
            >
              <span className="mb-0.5 text-[10px] font-mono text-slate-600 opacity-0 group-hover:opacity-100">
                {qty || ''}
              </span>
              <div
                className={`w-full rounded-t transition-opacity ${BAR_COLORS[part.tier]} ${
                  cell ? 'opacity-80 group-hover:opacity-100' : 'opacity-0'
                }`}
                style={{ height: `${pct}%`, minHeight: cell ? 2 : 0 }}
              />
            </button>
          );
        })}
      </div>
      <div className="flex gap-[2px] pt-1">
        {stream.buckets.map((b) => (
          <div
            key={b}
            className="flex-1 text-center font-mono text-[9px] text-slate-500"
            style={{ writingMode: 'horizontal-tb' }}
          >
            {b}
          </div>
        ))}
      </div>
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="mb-4 rounded-lg border border-red-300 bg-red-50 p-4">
      <h2 className="mb-2 font-semibold text-red-800">
        ⚠ Verletzung der 2×Leadtime-Ankündigungsregel ({alerts.length})
      </h2>
      <ul className="max-h-44 space-y-1 overflow-auto text-sm text-red-900">
        {alerts.slice(0, 60).map((a, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono">{a.bucket}</span>
            <span>·</span>
            <span className="font-mono">{a.part}</span>
            <span>·</span>
            <span>
              {a.baseQty} → {a.newQty} ({a.delta > 0 ? '+' : ''}
              {a.delta})
            </span>
            <span>·</span>
            <span>
              in {a.daysUntil} Tagen, Schwelle {a.threshold}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function Page() {
  const [supplier, setSupplier] = useState<string>('');
  const [bucket, setBucket] = useState<'week' | 'month'>('month');
  const [shiftFrom, setShiftFrom] = useState<string>('');
  const [shiftWeeks, setShiftWeeks] = useState<number>(0);
  const [view, setView] = useState<'deliver' | 'procure'>('deliver');
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [drill, setDrill] = useState<AggCell | null>(null);

  useEffect(() => {
    const p = new URLSearchParams();
    if (supplier) p.set('supplier', supplier);
    p.set('bucket', bucket);
    if (shiftFrom && shiftWeeks) {
      p.set('shiftFrom', shiftFrom);
      p.set('shiftWeeks', String(shiftWeeks));
    }
    setLoading(true);
    fetch(`/api/snapshot?${p.toString()}`)
      .then((r) => r.json())
      .then((d: Snapshot) => {
        setSnap(d);
        if (!supplier && d.suppliers.length > 0) setSupplier(d.suppliers[0].name);
      })
      .finally(() => setLoading(false));
  }, [supplier, bucket, shiftFrom, shiftWeeks]);

  const stream = snap ? snap[view] : null;
  const procureEmpty = (snap?.procure.parts.length ?? 0) === 0;

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Aero Supply MVP</h1>
          <p className="text-sm text-slate-500">
            Aggregierte Kapazitäts- und Bedarfsplanung — Stichtag {snap?.today ?? '…'}
          </p>
        </div>
        {loading && <span className="text-sm text-slate-500">lade…</span>}
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-4">
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-slate-700">Lieferant</span>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            {snap?.suppliers.map((s) => {
              const label = tiersLabel(s.tiers);
              return (
                <option key={s.name} value={s.name}>
                  {s.name}
                  {label ? ` — ${label}` : ''}
                </option>
              );
            })}
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-slate-700">Bucket</span>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as 'week' | 'month')}
            className="rounded border border-slate-300 px-2 py-1.5"
          >
            <option value="week">Kalenderwoche</option>
            <option value="month">Monat</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-slate-700">What-If: ab Monat (YYYY-MM)</span>
          <input
            type="month"
            value={shiftFrom}
            onChange={(e) => setShiftFrom(e.target.value)}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className="mb-1 font-medium text-slate-700">Verschiebung (Wochen, − = vorziehen)</span>
          <input
            type="number"
            value={shiftWeeks}
            onChange={(e) => setShiftWeeks(Number(e.target.value))}
            className="rounded border border-slate-300 px-2 py-1.5"
          />
        </label>
        {snap?.shiftApplied && (
          <div className="md:col-span-4 text-xs text-slate-500">
            Simulation aktiv: ab {snap.shiftApplied.fromDate} um {snap.shiftApplied.deltaDays} Tage verschoben.
            <button
              className="ml-3 rounded bg-slate-200 px-2 py-0.5 text-xs hover:bg-slate-300"
              onClick={() => {
                setShiftFrom('');
                setShiftWeeks(0);
              }}
            >
              Zurücksetzen
            </button>
          </div>
        )}
      </section>

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setView('deliver')}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            view === 'deliver'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          Auslieferung
          <span className="ml-1.5 text-xs text-slate-400">
            ({snap?.deliver.parts.length ?? 0})
          </span>
        </button>
        <button
          onClick={() => setView('procure')}
          disabled={procureEmpty}
          className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium ${
            view === 'procure'
              ? 'border-sky-600 text-sky-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          } ${procureEmpty ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          Beschaffung
          <span className="ml-1.5 text-xs text-slate-400">
            ({snap?.procure.parts.length ?? 0})
          </span>
        </button>
      </div>

      {stream && <AlertsPanel alerts={stream.alerts} />}

      {stream && stream.parts.length === 0 && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-slate-500">
          {view === 'deliver'
            ? 'Dieser Lieferant hat keine Auslieferungen im aktuellen Datensatz.'
            : 'Dieser Lieferant beschafft im aktuellen Datensatz keine Sub-Bauteile.'}
        </div>
      )}

      {stream && stream.parts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {stream.parts.map((p) => (
            <PartChart key={p.part} part={p} stream={stream} onDrill={setDrill} />
          ))}
        </div>
      )}

      {drill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDrill(null)}
        >
          <div
            className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-lg bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold">
                  Drill-down — {drill.part} · {drill.bucket}
                </h3>
                <p className="text-sm text-slate-500">
                  Lieferant {drill.supplier} · Gesamtbedarf {drill.totalQty} {drill.unit} ·{' '}
                  {drill.msnContribs.length} MSN-Beiträge
                </p>
              </div>
              <button
                onClick={() => setDrill(null)}
                className="rounded bg-slate-200 px-2 py-1 text-sm hover:bg-slate-300"
              >
                schließen
              </button>
            </div>
            <table className="min-w-full text-sm">
              <thead className="border-b border-slate-200 text-left text-slate-600">
                <tr>
                  <th className="py-1.5 pr-3">MSN</th>
                  <th className="py-1.5 pr-3">Menge</th>
                  <th className="py-1.5">Zieldatum</th>
                </tr>
              </thead>
              <tbody>
                {drill.msnContribs.map((c, i) => (
                  <tr key={i} className="border-b border-slate-100">
                    <td className="py-1 pr-3 font-mono">{c.msn}</td>
                    <td className="py-1 pr-3 font-mono">{c.qty}</td>
                    <td className="py-1 font-mono">{c.targetDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
