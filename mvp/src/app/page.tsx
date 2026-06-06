'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

function useInCenter<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inCenter, setInCenter] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setInCenter(true);
      return;
    }
    const obs = new IntersectionObserver(
      ([entry]) => setInCenter(entry.isIntersecting),
      { rootMargin: '-32% 0px -32% 0px', threshold: 0 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return { ref, inCenter };
}

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
type GraphNode = { part: string; supplier: string; tier: Tier; description: string };
type GraphChild = GraphNode & { qtyPerParent: number | null; unit: string | null };
type GraphEntry = { parent: GraphNode | null; children: GraphChild[] };
type MsnInfo = {
  date: string;
  hasDateOverride: boolean;
  headPart: string;
  headQty: number;
  hasQtyOverride: boolean;
};
type OverridesSummary = {
  dates: Array<{ msn: string; date: string }>;
  qtys: Array<{ msn: string; part: string; qty: number }>;
  scenario: { id: string | null; affectedDates: number; affectedQtys: number };
};
type ScenarioMeta = { id: string; title: string; description: string };
type Snapshot = {
  today: string;
  bucket: 'week' | 'month';
  suppliers: SupplierMeta[];
  shiftApplied: { fromDate: string; deltaDays: number } | null;
  partGraph: Record<string, GraphEntry>;
  msnInfo: Record<string, MsnInfo>;
  overrides: OverridesSummary;
  deliver: Stream;
  procure: Stream;
};

function panesEqual(a: Record<string, Snapshot>, b: Record<string, Snapshot>) {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((key) => JSON.stringify(a[key]) === JSON.stringify(b[key]));
}

function TierBadge({ tier }: { tier: Tier }) {
  return (
    <span className="ml-1.5 inline-flex items-center rounded-sm border border-line-strong bg-surface-alt px-1.5 py-[2px] text-[10px] font-medium uppercase tracking-label text-ink-muted">
      {tier === 0 ? 'OEM' : `T${tier}`}
    </span>
  );
}
function tiersLabel(tiers: Tier[]): string {
  if (tiers.length === 0) return '';
  return tiers.map((t) => (t === 0 ? 'OEM' : `T${t}`)).join(' + ');
}

function AnimatedBar({
  oldQty,
  newQty,
  maxQty,
  delayMs,
  cell,
  bucket,
  onDrill,
  animate = true,
}: {
  oldQty: number;
  newQty: number;
  maxQty: number;
  delayMs: number;
  cell: AggCell | undefined;
  bucket: string;
  onDrill: (cell: AggCell) => void;
  animate?: boolean;
}) {
  const oldPct = maxQty > 0 ? Math.min(100, (oldQty / maxQty) * 100) : 0;
  const newPct = maxQty > 0 ? Math.min(100, (newQty / maxQty) * 100) : 0;
  const delta = Math.abs(newPct - oldPct);
  const changed = oldQty !== newQty;
  const increase = newQty > oldQty;
  const decrease = newQty < oldQty;

  const [phase, setPhase] = useState<'before' | 'highlight' | 'settle' | 'after'>(
    changed ? 'before' : 'after',
  );

  const playedRef = useRef(false);
  const lastValuesRef = useRef<{ o: number; n: number } | null>(null);

  useEffect(() => {
    const last = lastValuesRef.current;
    if (!last || last.o !== oldQty || last.n !== newQty) {
      playedRef.current = false;
      lastValuesRef.current = { o: oldQty, n: newQty };
    }

    if (!changed) {
      setPhase('after');
      return;
    }
    if (playedRef.current) {
      setPhase('after');
      return;
    }
    if (!animate) {
      setPhase('before');
      return;
    }
    setPhase('before');
    const startMs = delayMs + 80;
    const t1 = setTimeout(() => setPhase('highlight'), startMs);
    const t2 = setTimeout(() => setPhase('settle'), startMs + 900);
    const t3 = setTimeout(() => {
      setPhase('after');
      playedRef.current = true;
    }, startMs + 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [oldQty, newQty, delayMs, changed, animate]);

  let blueHeightPct = newPct;
  let overlayHeightPct = 0;
  let overlayOpacity = 0;
  if (changed) {
    if (phase === 'before') {
      blueHeightPct = oldPct;
    } else if (phase === 'highlight') {
      blueHeightPct = oldPct;
      overlayHeightPct = delta;
      overlayOpacity = 0.95;
    } else if (phase === 'settle') {
      blueHeightPct = newPct;
      overlayHeightPct = delta;
      overlayOpacity = 0.9;
    } else {
      blueHeightPct = newPct;
      overlayHeightPct = delta;
      overlayOpacity = 0;
    }
  }

  const barTrans = 'height 450ms cubic-bezier(.2,.8,.2,1), opacity 300ms ease-out';

  return (
    <button
      type="button"
      onClick={() => cell && onDrill(cell)}
      disabled={!cell || (newQty === 0 && oldQty === 0)}
      className="group relative flex h-full flex-1 cursor-pointer flex-col items-center justify-end disabled:cursor-default"
      title={`${bucket}: ${newQty}${changed ? ` (vorher ${oldQty})` : ''}`}
    >
      <span className="mb-1 font-mono text-[10px] text-ink-muted opacity-0 transition-opacity group-hover:opacity-100">
        {newQty || ''}
      </span>
      <div
        className="absolute bottom-0 w-full rounded-sm bg-primary"
        style={{
          height: `${blueHeightPct}%`,
          minHeight: blueHeightPct > 0 ? 2 : 0,
          transition: barTrans,
        }}
      />
      {increase && (
        <div
          className="absolute w-full rounded-sm bg-success"
          style={{
            bottom: `${oldPct}%`,
            height: `${overlayHeightPct}%`,
            opacity: overlayOpacity,
            transition: barTrans,
          }}
        />
      )}
      {decrease && (
        <div
          className="absolute w-full rounded-sm bg-critical"
          style={{
            bottom: `${newPct}%`,
            height: `${overlayHeightPct}%`,
            opacity: overlayOpacity,
            transition: barTrans,
          }}
        />
      )}
    </button>
  );
}

function PartChart({
  part,
  stream,
  onDrill,
  prevStream,
  tierIdx = 0,
  animate = true,
}: {
  part: PartMeta;
  stream: Stream;
  onDrill: (cell: AggCell) => void;
  prevStream?: Stream;
  tierIdx?: number;
  animate?: boolean;
}) {
  const cellByBucket = useMemo(() => {
    const m = new Map<string, AggCell>();
    for (const c of stream.cells) if (c.part === part.part) m.set(c.bucket, c);
    return m;
  }, [stream.cells, part.part]);

  const prevQtyByBucket = useMemo(() => {
    const m = new Map<string, number>();
    if (!prevStream) return m;
    for (const c of prevStream.cells)
      if (c.part === part.part) m.set(c.bucket, c.totalQty);
    return m;
  }, [prevStream, part.part]);

  const chartUnit = useMemo(() => {
    for (const c of stream.cells) if (c.part === part.part) return c.unit;
    return '';
  }, [stream.cells, part.part]);

  const maxQty = useMemo(() => {
    let m = 0;
    for (const v of cellByBucket.values()) if (v.totalQty > m) m = v.totalQty;
    for (const v of prevQtyByBucket.values()) if (v > m) m = v;
    return m;
  }, [cellByBucket, prevQtyByBucket]);

  const totalQty = useMemo(() => {
    let s = 0;
    for (const v of cellByBucket.values()) s += v.totalQty;
    return s;
  }, [cellByBucket]);

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <span className="font-mono text-[15px] font-semibold text-ink-strong">{part.part}</span>
          <TierBadge tier={part.tier} />
          <span className="ml-3 text-sm text-ink">{part.description}</span>
        </div>
        <div className="text-xs text-ink-muted">
          <span className="uppercase tracking-label text-ink-subtle">Lieferant</span>{' '}
          <span className="font-medium text-ink">{part.supplier}</span>
          <span className="mx-2 text-line-strong">·</span>
          <span className="uppercase tracking-label text-ink-subtle">Lead Time</span>{' '}
          <span className="font-mono">{part.leadTimeDays}</span>
          <span className="text-ink-subtle"> d</span>
          <span className="mx-2 text-line-strong">·</span>
          <span className="uppercase tracking-label text-ink-subtle">Gesamt</span>{' '}
          <span className="font-mono text-ink-strong">{totalQty}</span>
        </div>
      </div>

      <div className="flex gap-2">
        <div className="flex h-56 w-16 flex-col justify-between pr-2 text-right">
          <div>
            <div className="font-mono text-[14px] font-bold leading-none text-primary">
              {maxQty}
            </div>
            <div className="mt-0.5 text-[9px] uppercase tracking-label text-ink-subtle">
              Max
            </div>
          </div>
          <div className="font-mono text-[10px] leading-none text-ink-muted">
            {Math.round(maxQty / 2)}
          </div>
          <div>
            <div className="font-mono text-[10px] leading-none text-ink-muted">0</div>
            {chartUnit && (
              <div className="mt-0.5 text-[9px] uppercase tracking-label text-ink-subtle">
                {chartUnit}
              </div>
            )}
          </div>
        </div>
        <div className="flex h-56 flex-1 items-end gap-[2px] border-b-2 border-l-2 border-line-strong pb-1">
          {stream.buckets.map((b, idx) => {
            const cell = cellByBucket.get(b);
            const newQty = cell?.totalQty ?? 0;
            const oldQty = prevStream
              ? prevQtyByBucket.get(b) ?? 0
              : newQty;
            const delayMs = tierIdx * 550 + idx * 20;
            return (
              <AnimatedBar
                key={b}
                bucket={b}
                cell={cell}
                oldQty={oldQty}
                newQty={newQty}
                maxQty={maxQty}
                delayMs={delayMs}
                onDrill={onDrill}
                animate={animate}
              />
            );
          })}
        </div>
      </div>
      <div className="flex gap-[2px] pt-1 pl-[4.5rem]">
        {stream.buckets.map((b) => (
          <div key={b} className="flex-1 text-center font-mono text-[9px] text-ink-subtle">
            {b}
          </div>
        ))}
      </div>
    </div>
  );
}

function LiveSupplierRow({
  name,
  snap,
  prevSnap,
  tierIdx,
  view,
  onDrill,
}: {
  name: string;
  snap: Snapshot | undefined;
  prevSnap?: Snapshot;
  tierIdx: number;
  view: 'deliver' | 'procure';
  onDrill: (cell: AggCell) => void;
}) {
  const stream = snap?.[view];
  const prevStream = prevSnap?.[view];
  const { ref: rowRef, inCenter } = useInCenter<HTMLDivElement>();
  const [partKey, setPartKey] = useState<string>('');
  useEffect(() => {
    if (!stream || stream.parts.length === 0) {
      setPartKey('');
      return;
    }
    if (!partKey || !stream.parts.some((p) => p.part === partKey)) {
      setPartKey(stream.parts[0].part);
    }
  }, [stream, partKey]);

  const activePart = stream?.parts.find((p) => p.part === partKey);
  const supMeta = snap?.suppliers.find((s) => s.name === name);

  return (
    <div ref={rowRef} className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-2">
        <div className="flex items-center gap-2">
          <h4 className="text-[13px] font-semibold text-ink-strong">{name}</h4>
          {supMeta && supMeta.tiers.length > 0 && (
            <span className="rounded-sm border border-line-strong bg-surface-alt px-1.5 py-[2px] text-[10px] font-medium uppercase tracking-label text-ink-muted">
              {tiersLabel(supMeta.tiers)}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-label text-ink-subtle">
            · {view === 'deliver' ? 'Auslieferung' : 'Beschaffung'}
          </span>
          {!inCenter && prevStream && (
            <span className="rounded-sm border border-horizon-narrow-fg/30 bg-horizon-narrow-bg px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-label text-horizon-narrow-fg">
              scroll für Update
            </span>
          )}
        </div>
        {stream && stream.parts.length > 1 && (
          <select
            value={partKey}
            onChange={(e) => setPartKey(e.target.value)}
            className="rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink focus:border-primary focus:outline-none"
          >
            {stream.parts.map((p) => (
              <option key={p.part} value={p.part}>
                {p.part}
              </option>
            ))}
          </select>
        )}
      </div>
      {!stream || stream.parts.length === 0 || !activePart ? (
        <div className="px-4 py-8 text-center text-[11px] uppercase tracking-label text-ink-subtle">
          — keine {view === 'deliver' ? 'Auslieferungen' : 'Beschaffungen'} —
        </div>
      ) : (
        <div className="p-3">
          <PartChart
            part={activePart}
            stream={stream}
            prevStream={prevStream}
            tierIdx={tierIdx}
            onDrill={onDrill}
            animate={inCenter}
          />
        </div>
      )}
    </div>
  );
}

function groupChildrenBySupplier(children: GraphChild[]) {
  const map = new Map<string, GraphChild[]>();
  for (const c of children) {
    const arr = map.get(c.supplier);
    if (arr) arr.push(c);
    else map.set(c.supplier, [c]);
  }
  return Array.from(map.entries())
    .map(([supplier, parts]) => ({ supplier, parts }))
    .sort((a, b) => b.parts.length - a.parts.length || a.supplier.localeCompare(b.supplier));
}

function TreeNode({
  node,
  variant = 'normal',
}: {
  node: GraphNode;
  variant?: 'normal' | 'center';
}) {
  const isCenter = variant === 'center';
  return (
    <div
      className={`min-w-[10rem] max-w-[14rem] rounded-md border bg-surface px-3 py-2 text-center ${
        isCenter ? 'border-primary' : 'border-line'
      }`}
    >
      <div className="flex items-baseline justify-center">
        <span className="font-mono text-[13px] font-semibold text-ink-strong">{node.part}</span>
        <TierBadge tier={node.tier} />
      </div>
      <div className="mt-0.5 truncate text-xs text-ink-muted">{node.description}</div>
      <div className="mt-1 text-[11px] font-medium text-ink">{node.supplier}</div>
    </div>
  );
}

function PartTree({
  entry,
  center,
}: {
  entry: GraphEntry | null;
  center: GraphNode | null;
}) {
  if (!entry || !center) return null;
  const { parent, children } = entry;
  const groups = groupChildrenBySupplier(children);

  return (
    <div className="rounded-lg border border-line bg-surface p-5">
      <h3 className="mb-4 text-[11px] font-semibold uppercase tracking-label text-ink-muted">
        Lieferbeziehung
      </h3>
      <div className="flex flex-col items-center">
        {parent ? (
          <>
            <div className="mb-2 text-[10px] uppercase tracking-label text-ink-subtle">
              geht an
            </div>
            <TreeNode node={parent} />
            <div className="h-6 w-px bg-line-strong" />
          </>
        ) : (
          <div className="mb-2 text-[10px] uppercase tracking-label text-ink-subtle">
            Endprodukt — kein Abnehmer im Modell
          </div>
        )}

        <TreeNode node={center} variant="center" />

        {children.length > 0 ? (
          <>
            <div className="h-6 w-px bg-line-strong" />
            <div className="mb-3 text-[10px] uppercase tracking-label text-ink-subtle">
              wird beliefert von · {groups.length} Lieferanten · {children.length} Bauteile
            </div>
            <div className="flex w-full flex-wrap items-start justify-center gap-3">
              {groups.map((group) => (
                <div
                  key={group.supplier}
                  className="flex max-w-[18rem] flex-col gap-2 rounded-md border border-line bg-surface-alt p-3"
                >
                  <div className="text-center text-xs font-semibold text-ink-strong">
                    {group.supplier}
                    <span className="ml-1 font-normal text-ink-subtle">
                      · {group.parts.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {group.parts.map((c) => (
                      <div
                        key={c.part}
                        className="min-w-[8.5rem] rounded-sm border border-line bg-surface px-2 py-1.5 text-center"
                      >
                        <div className="flex items-baseline justify-center">
                          <span className="font-mono text-[12px] font-semibold text-ink-strong">
                            {c.part}
                          </span>
                          <TierBadge tier={c.tier} />
                        </div>
                        <div className="mt-0.5 truncate text-[10px] text-ink-muted">
                          {c.description}
                        </div>
                        {c.qtyPerParent != null && (
                          <div className="mt-1 inline-block rounded-sm border border-line bg-surface-alt px-1.5 py-[2px] font-mono text-[10px] text-ink">
                            {c.qtyPerParent} {c.unit ?? ''} / Stück
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-3 text-[10px] uppercase tracking-label text-ink-subtle">
            keine Sub-Bauteile im Modell
          </div>
        )}
      </div>
    </div>
  );
}

function CompactChart({
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
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-[11px]">
        <span className="truncate text-ink-muted">{part.description}</span>
        <span className="shrink-0 font-mono text-ink-strong">{totalQty}</span>
      </div>
      <div className="flex h-24 items-end gap-[2px] border-b border-line pb-0.5">
        {stream.buckets.map((b) => {
          const cell = cellByBucket.get(b);
          const qty = cell?.totalQty ?? 0;
          const pct = maxQty > 0 ? (qty / maxQty) * 100 : 0;
          return (
            <button
              key={b}
              type="button"
              disabled={!cell}
              onClick={() => cell && onDrill(cell)}
              className="group flex h-full flex-1 cursor-pointer flex-col justify-end disabled:cursor-default"
              title={`${b}: ${qty}`}
            >
              <div
                className={`w-full rounded-sm bg-primary transition-all ${
                  cell ? 'opacity-90 group-hover:opacity-100' : 'opacity-0'
                }`}
                style={{ height: `${pct}%`, minHeight: cell ? 2 : 0 }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CompactPane({
  name,
  snap,
  view,
  onDrill,
}: {
  name: string;
  snap: Snapshot | undefined;
  view: 'deliver' | 'procure';
  onDrill: (cell: AggCell) => void;
}) {
  const stream = snap?.[view];
  const [partKey, setPartKey] = useState<string>('');

  useEffect(() => {
    if (!stream || stream.parts.length === 0) {
      setPartKey('');
      return;
    }
    if (!partKey || !stream.parts.some((p) => p.part === partKey)) {
      setPartKey(stream.parts[0].part);
    }
  }, [stream, partKey]);

  const activePart = stream?.parts.find((p) => p.part === partKey);
  const supMeta = snap?.suppliers.find((s) => s.name === name);

  return (
    <div className="flex flex-col rounded-lg border border-line bg-surface p-3">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h4 className="truncate text-[12px] font-semibold text-ink-strong">{name}</h4>
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] uppercase tracking-label text-ink-subtle">
            {supMeta && supMeta.tiers.length > 0 && (
              <span className="rounded-sm border border-line-strong bg-surface-alt px-1 text-ink-muted">
                {tiersLabel(supMeta.tiers)}
              </span>
            )}
            <span>{view === 'deliver' ? 'Auslieferung' : 'Beschaffung'}</span>
          </div>
        </div>
        {stream && stream.parts.length > 1 && (
          <select
            value={partKey}
            onChange={(e) => setPartKey(e.target.value)}
            className="shrink-0 rounded-sm border border-line bg-surface px-1.5 py-0.5 font-mono text-[11px] text-ink focus:border-primary focus:outline-none"
          >
            {stream.parts.map((p) => (
              <option key={p.part} value={p.part}>
                {p.part}
              </option>
            ))}
          </select>
        )}
      </div>
      {!activePart || !stream || stream.parts.length === 0 ? (
        <div className="flex h-24 items-center justify-center text-[11px] text-ink-subtle">
          — keine Daten —
        </div>
      ) : (
        <CompactChart part={activePart} stream={stream} onDrill={onDrill} />
      )}
    </div>
  );
}

function AlertsPanel({ alerts }: { alerts: Alert[] }) {
  if (alerts.length === 0) return null;
  return (
    <section className="mb-4 rounded-md border border-critical/40 bg-critical-soft p-4">
      <div className="mb-2 flex items-center gap-2">
        <span aria-hidden className="h-2 w-2 rounded-sm bg-critical" />
        <h2 className="text-[13px] font-semibold uppercase tracking-label text-critical">
          2× Lead Time — Ankündigungsregel verletzt · {alerts.length}
        </h2>
      </div>
      <ul className="max-h-44 space-y-1 overflow-auto text-[13px] text-ink">
        {alerts.slice(0, 60).map((a, i) => (
          <li key={i} className="flex flex-wrap items-center gap-x-2">
            <span className="font-mono text-ink-strong">{a.bucket}</span>
            <span className="text-ink-subtle">·</span>
            <span className="font-mono">{a.part}</span>
            <span className="text-ink-subtle">·</span>
            <span className="font-mono">
              {a.baseQty} → {a.newQty} ({a.delta > 0 ? '+' : ''}
              {a.delta})
            </span>
            <span className="text-ink-subtle">·</span>
            <span>
              <span className="font-mono">{a.daysUntil}</span> Tage bis Fälligkeit, Schwelle{' '}
              <span className="font-mono">{a.threshold}</span>
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
  const [selectedPart, setSelectedPart] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [edits, setEdits] = useState<
    Record<string, { date?: string; headQty?: number }>
  >({});
  const [refetchToken, setRefetchToken] = useState(0);
  const [mode, setMode] = useState<'single' | 'live'>('single');
  const [panes, setPanes] = useState<Record<string, Snapshot>>({});
  const [prevPanes, setPrevPanes] = useState<Record<string, Snapshot>>({});
  const [scenarios, setScenarios] = useState<ScenarioMeta[]>([]);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/scenarios')
      .then((r) => r.json())
      .then((d: { activeId: string | null; scenarios: ScenarioMeta[] }) => {
        setScenarios(d.scenarios);
        setActiveScenario(d.activeId);
      });
  }, [refetchToken]);

  const applyScenario = async (id: string | null) => {
    if (id) {
      await fetch('/api/scenarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
    } else {
      await fetch('/api/scenarios', { method: 'DELETE' });
    }
    refetch();
  };

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
  }, [supplier, bucket, shiftFrom, shiftWeeks, refetchToken]);

  const refetch = () => setRefetchToken((t) => t + 1);

  const saveEdits = async () => {
    const entries = Object.entries(edits);
    if (entries.length === 0) {
      setEditMode(false);
      return;
    }
    setLoading(true);
    for (const [msn, vals] of entries) {
      const info = snap?.msnInfo[msn];
      if (vals.date !== undefined) {
        await fetch('/api/overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: 'date', msn, date: vals.date || null }),
        });
      }
      if (vals.headQty !== undefined && info?.headPart) {
        await fetch('/api/overrides', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            kind: 'qty',
            msn,
            part: info.headPart,
            qty: Number.isFinite(vals.headQty) ? vals.headQty : null,
          }),
        });
      }
    }
    setEdits({});
    setEditMode(false);
    setDrill(null);
    refetch();
  };

  const resetAllOverrides = async () => {
    await fetch('/api/overrides', { method: 'DELETE' });
    refetch();
  };

  const overrideCount =
    (snap?.overrides.dates.length ?? 0) + (snap?.overrides.qtys.length ?? 0);

  const supplierNames = useMemo(
    () => snap?.suppliers.map((s) => s.name) ?? [],
    [snap?.suppliers],
  );

  useEffect(() => {
    if (mode !== 'live' || supplierNames.length === 0) return;
    let cancelled = false;
    const loadAll = async () => {
      const results = await Promise.all(
        supplierNames.map((name) =>
          fetch(`/api/snapshot?supplier=${encodeURIComponent(name)}&bucket=${bucket}`)
            .then((r) => r.json() as Promise<Snapshot>)
            .catch(() => null),
        ),
      );
      if (cancelled) return;
      const next: Record<string, Snapshot> = {};
      supplierNames.forEach((name, i) => {
        const v = results[i];
        if (v) next[name] = v;
      });
      setPanes((curr) => {
        if (Object.keys(curr).length === 0) {
          setPrevPanes(next);
          return next;
        }
        if (panesEqual(curr, next)) {
          return curr;
        }
        setPrevPanes(curr);
        return next;
      });
    };
    loadAll();
    const id = setInterval(loadAll, 2500);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [mode, bucket, supplierNames, refetchToken]);

  const stream = snap ? snap[view] : null;
  const procureEmpty = (snap?.procure.parts.length ?? 0) === 0;

  useEffect(() => {
    if (!stream) return;
    if (stream.parts.length === 0) {
      setSelectedPart(null);
      return;
    }
    if (!selectedPart || !stream.parts.some((p) => p.part === selectedPart)) {
      setSelectedPart(stream.parts[0].part);
    }
  }, [stream, selectedPart]);

  useEffect(() => {
    setSelectedPart(null);
  }, [view, supplier]);

  const activePart = stream?.parts.find((p) => p.part === selectedPart) ?? null;

  const inputCls =
    'rounded-md border border-line bg-surface px-2 py-1.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary';
  const labelCls = 'mb-1 text-[11px] font-semibold uppercase tracking-label text-ink-muted';

  return (
    <main className="mx-auto max-w-[1400px] px-6 py-6">
      <header className="mb-6 flex items-end justify-between border-b border-line pb-4">
        <div>
          <h1 className="text-[22px] font-semibold leading-7 tracking-tight text-ink-strong">
            AeroSync
          </h1>
          <p className="mt-1 text-[13px] text-ink-muted">
            n-Tier Kapazitäts- und Bedarfsplanung —{' '}
            <span className="uppercase tracking-label text-ink-subtle">Stichtag</span>{' '}
            <span className="font-mono text-ink">{snap?.today ?? '—'}</span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex rounded-md border border-line bg-surface p-0.5">
            <button
              onClick={() => setMode('single')}
              className={`rounded-sm px-2.5 py-1 text-[11px] uppercase tracking-label transition-colors ${
                mode === 'single'
                  ? 'bg-primary text-surface'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Einzel
            </button>
            <button
              onClick={() => setMode('live')}
              className={`rounded-sm px-2.5 py-1 text-[11px] uppercase tracking-label transition-colors ${
                mode === 'live'
                  ? 'bg-primary text-surface'
                  : 'text-ink-muted hover:text-ink'
              }`}
            >
              Live-Demo
            </button>
          </div>
          {overrideCount > 0 && (
            <>
              <span className="rounded-sm border border-horizon-narrow-fg/30 bg-horizon-narrow-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-label text-horizon-narrow-fg">
                {overrideCount} Override{overrideCount === 1 ? '' : 's'}
              </span>
              <button
                onClick={resetAllOverrides}
                className="rounded-sm border border-line bg-surface px-2 py-0.5 text-[11px] uppercase tracking-label text-ink-muted hover:border-primary hover:text-primary"
              >
                Alle zurücksetzen
              </button>
            </>
          )}
          {loading && (
            <span className="text-[11px] uppercase tracking-label text-ink-subtle">lade …</span>
          )}
        </div>
      </header>

      <section className="mb-4 grid grid-cols-1 gap-3 rounded-lg border border-line bg-surface p-4 md:grid-cols-4">
        <label className="flex flex-col text-sm">
          <span className={labelCls}>Lieferant</span>
          <select
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className={inputCls}
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
          <span className={labelCls}>Bucket</span>
          <select
            value={bucket}
            onChange={(e) => setBucket(e.target.value as 'week' | 'month')}
            className={inputCls}
          >
            <option value="week">Kalenderwoche</option>
            <option value="month">Monat</option>
          </select>
        </label>
        <label className="flex flex-col text-sm">
          <span className={labelCls}>What-If · ab Monat</span>
          <input
            type="month"
            value={shiftFrom}
            onChange={(e) => setShiftFrom(e.target.value)}
            className={inputCls}
          />
        </label>
        <label className="flex flex-col text-sm">
          <span className={labelCls}>Verschiebung · Wochen (− = vorziehen)</span>
          <input
            type="number"
            value={shiftWeeks}
            onChange={(e) => setShiftWeeks(Number(e.target.value))}
            className={inputCls}
          />
        </label>
        {snap?.shiftApplied && (
          <div className="md:col-span-4 flex flex-wrap items-center gap-3 text-[12px] text-ink-muted">
            <span className="rounded-sm border border-horizon-narrow-fg/30 bg-horizon-narrow-bg px-2 py-0.5 text-[11px] font-medium uppercase tracking-label text-horizon-narrow-fg">
              Simulation aktiv
            </span>
            <span>
              ab <span className="font-mono">{snap.shiftApplied.fromDate}</span> um{' '}
              <span className="font-mono">{snap.shiftApplied.deltaDays}</span> Tage verschoben
            </span>
            <button
              className="rounded-sm border border-line bg-surface px-2 py-0.5 text-[11px] uppercase tracking-label text-ink-muted hover:border-primary hover:text-primary"
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

      <div className="mb-4 flex gap-1 border-b border-line">
        <button
          onClick={() => setView('deliver')}
          className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-medium uppercase tracking-label ${
            view === 'deliver'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink'
          }`}
        >
          Auslieferung{' '}
          <span className="ml-1 font-mono text-[11px] text-ink-subtle">
            {snap?.deliver.parts.length ?? 0}
          </span>
        </button>
        <button
          onClick={() => setView('procure')}
          disabled={procureEmpty}
          className={`-mb-px border-b-2 px-4 py-2 text-[13px] font-medium uppercase tracking-label ${
            view === 'procure'
              ? 'border-primary text-primary'
              : 'border-transparent text-ink-muted hover:text-ink'
          } ${procureEmpty ? 'cursor-not-allowed opacity-40' : ''}`}
        >
          Beschaffung{' '}
          <span className="ml-1 font-mono text-[11px] text-ink-subtle">
            {snap?.procure.parts.length ?? 0}
          </span>
        </button>
      </div>

      {mode === 'single' && stream && <AlertsPanel alerts={stream.alerts} />}

      {mode === 'live' && (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_18rem]">
          <div className="flex flex-col gap-3">
            <p className="rounded-sm border border-primary/30 bg-primary-soft px-3 py-2 text-[12px] text-ink">
              Tier-gestapelte Live-Ansicht — gleiche Monatsskala in allen Charts. Klicke eine OEM-Säule,
              um Bedarfe anzupassen; Änderungen propagieren via 2.5 s Polling durch alle Tiers.
            </p>
            {(() => {
              const groups = new Map<number, SupplierMeta[]>();
              for (const s of snap?.suppliers ?? []) {
                const minTier = Math.min(...(s.tiers.length ? s.tiers : [0]));
                const list = groups.get(minTier) ?? [];
                list.push(s);
                groups.set(minTier, list);
              }
              const sorted = Array.from(groups.entries()).sort(
                (a, b) => a[0] - b[0],
              );
              const tierLabel = (t: number) =>
                t === 0 ? 'OEM' : `Tier ${t}`;
              const tierSubtitle = (t: number) =>
                t === 0 ? 'Endkunde' : t === 1 ? 'Direkt-Lieferant' : 'Sub-Lieferant';
              let cascadeIdx = 0;
              return sorted.map(([tier, sups]) => (
                <div
                  key={tier}
                  className="flex gap-3 rounded-lg border border-line bg-surface-alt/40 p-3"
                >
                  <div className="flex w-24 shrink-0 flex-col items-center justify-center rounded-md border border-line bg-surface px-2 py-3 text-center">
                    <div className="text-[10px] font-semibold uppercase tracking-label text-ink-subtle">
                      Stufe
                    </div>
                    <div className="mt-1 text-[26px] font-bold leading-tight text-primary">
                      {tierLabel(tier)}
                    </div>
                    <div className="mt-1 text-[10px] uppercase tracking-label text-ink-muted">
                      {tierSubtitle(tier)}
                    </div>
                    <div className="mt-2 text-[10px] uppercase tracking-label text-ink-subtle">
                      {sups.length} {sups.length === 1 ? 'Lieferant' : 'Lieferanten'}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2">
                    {sups
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((s) => {
                        const ci = cascadeIdx++;
                        return (
                          <LiveSupplierRow
                            key={s.name}
                            name={s.name}
                            snap={panes[s.name]}
                            prevSnap={prevPanes[s.name]}
                            tierIdx={ci}
                            view={view}
                            onDrill={setDrill}
                          />
                        );
                      })}
                  </div>
                </div>
              ));
            })()}
            <p className="text-center text-[11px] uppercase tracking-label text-ink-subtle">
              Snapshot-Polling alle 2.5 s · {Object.keys(panes).length} aktive Panels
            </p>
          </div>

          <aside className="rounded-lg border border-line bg-surface p-3">
            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-label text-ink-muted">
              Test-Szenarien
            </h3>
            <p className="mb-3 text-[11px] text-ink-subtle">
              Aktiviere ein Szenario per Toggle — Änderung propagiert sofort durch alle Panels und
              löst Ankündigungs-Alerts aus, wo die 2× Lead Time verletzt wird.
            </p>
            <div className="space-y-2">
              {scenarios.map((s) => {
                const active = activeScenario === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => applyScenario(active ? null : s.id)}
                    className={`block w-full rounded-md border px-2.5 py-2 text-left transition-colors ${
                      active
                        ? 'border-primary bg-primary-soft'
                        : 'border-line bg-surface hover:border-line-strong'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span
                        className={`text-[12px] font-semibold ${
                          active ? 'text-primary' : 'text-ink-strong'
                        }`}
                      >
                        {s.title}
                      </span>
                      <span
                        className={`shrink-0 rounded-sm px-1.5 py-[1px] text-[9px] font-semibold uppercase tracking-label ${
                          active
                            ? 'bg-primary text-surface'
                            : 'border border-line bg-surface text-ink-subtle'
                        }`}
                      >
                        {active ? 'aktiv' : 'aus'}
                      </span>
                    </div>
                    <div className="mt-1 text-[11px] leading-snug text-ink-muted">
                      {s.description}
                    </div>
                  </button>
                );
              })}
            </div>
            {activeScenario && (
              <button
                onClick={() => applyScenario(null)}
                className="mt-3 w-full rounded-md border border-line bg-surface px-2 py-1.5 text-[11px] uppercase tracking-label text-ink-muted hover:border-primary hover:text-primary"
              >
                Szenario zurücksetzen
              </button>
            )}
          </aside>
        </div>
      )}

      {mode === 'single' && stream && stream.parts.length === 0 && (
        <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-ink-muted">
          {view === 'deliver'
            ? 'Dieser Lieferant hat keine Auslieferungen im aktuellen Datensatz.'
            : 'Dieser Lieferant beschafft im aktuellen Datensatz keine Sub-Bauteile.'}
        </div>
      )}

      {mode === 'single' && stream && stream.parts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
          <aside className="rounded-lg border border-line bg-surface p-2">
            <h2 className="px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-label text-ink-muted">
              Bauteilliste · {stream.parts.length}
            </h2>
            <ul className="space-y-1">
              {stream.parts.map((p) => {
                const active = p.part === selectedPart;
                return (
                  <li key={p.part}>
                    <button
                      onClick={() => setSelectedPart(p.part)}
                      className={`w-full rounded-md px-2 py-2 text-left text-sm transition-colors ${
                        active
                          ? 'bg-primary-soft ring-1 ring-primary'
                          : 'hover:bg-surface-alt'
                      }`}
                    >
                      <div className="flex items-baseline gap-1">
                        <span className="font-mono font-semibold text-ink-strong">{p.part}</span>
                        <TierBadge tier={p.tier} />
                      </div>
                      <div className="truncate text-xs text-ink">{p.description}</div>
                      <div className="text-[10px] text-ink-subtle">
                        {p.supplier} · LT <span className="font-mono">{p.leadTimeDays}</span> d
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </aside>
          <div className="flex flex-col gap-4">
            {activePart ? (
              <>
                <PartChart part={activePart} stream={stream} onDrill={setDrill} />
                <PartTree
                  entry={snap?.partGraph[activePart.part] ?? null}
                  center={{
                    part: activePart.part,
                    supplier: activePart.supplier,
                    tier: activePart.tier,
                    description: activePart.description,
                  }}
                />
              </>
            ) : (
              <div className="rounded-lg border border-dashed border-line bg-surface p-8 text-center text-ink-muted">
                Wähle links ein Bauteil aus.
              </div>
            )}
          </div>
        </div>
      )}

      {drill && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink-strong/40 p-4"
          onClick={() => {
            setDrill(null);
            setEditMode(false);
            setEdits({});
          }}
        >
          <div
            className="max-h-[88vh] w-full max-w-4xl overflow-auto rounded-lg border border-line bg-surface p-5 shadow-overlay"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-[15px] font-semibold text-ink-strong">
                  Drill-down · <span className="font-mono">{drill.part}</span> ·{' '}
                  <span className="font-mono">{drill.bucket}</span>
                </h3>
                <p className="text-[13px] text-ink-muted">
                  Lieferant <span className="text-ink">{drill.supplier}</span> · Gesamtbedarf{' '}
                  <span className="font-mono text-ink">
                    {drill.totalQty} {drill.unit}
                  </span>{' '}
                  · <span className="font-mono">{drill.msnContribs.length}</span> MSN-Beiträge
                </p>
              </div>
              <div className="flex items-center gap-2">
                {!editMode ? (
                  <button
                    onClick={() => setEditMode(true)}
                    className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs uppercase tracking-label text-ink-muted hover:border-primary hover:text-primary"
                  >
                    Bedarf anpassen
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        setEditMode(false);
                        setEdits({});
                      }}
                      className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs uppercase tracking-label text-ink-muted hover:border-ink-muted"
                    >
                      Verwerfen
                    </button>
                    <button
                      onClick={saveEdits}
                      disabled={Object.keys(edits).length === 0}
                      className="rounded-md border border-primary bg-primary px-2.5 py-1 text-xs uppercase tracking-label text-surface hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Übernehmen ({Object.keys(edits).length})
                    </button>
                  </>
                )}
                <button
                  onClick={() => {
                    setDrill(null);
                    setEditMode(false);
                    setEdits({});
                  }}
                  className="rounded-md border border-line bg-surface px-2.5 py-1 text-xs uppercase tracking-label text-ink-muted hover:border-primary hover:text-primary"
                >
                  schließen
                </button>
              </div>
            </div>

            {editMode && (
              <p className="mb-3 rounded-sm border border-primary/30 bg-primary-soft px-3 py-2 text-[12px] text-ink">
                Edit-Modus aktiv. Ändere Endmontage-Datum oder Galley-Menge pro MSN. „Übernehmen"
                kaskadiert die Änderungen sofort durch alle Tier-Ebenen.
              </p>
            )}

            <table className="min-w-full text-sm">
              <thead className="border-b border-line text-left text-[11px] uppercase tracking-label text-ink-muted">
                <tr>
                  <th className="py-1.5 pr-3">MSN</th>
                  <th className="py-1.5 pr-3">Beitrag</th>
                  <th className="py-1.5 pr-3">Zieldatum</th>
                  <th className="py-1.5 pr-3">Endmontage</th>
                  <th className="py-1.5">Galley/MSN</th>
                </tr>
              </thead>
              <tbody>
                {drill.msnContribs.map((c) => {
                  const info = snap?.msnInfo[c.msn];
                  const edit = edits[c.msn] ?? {};
                  const effectiveDate = edit.date ?? info?.date ?? '';
                  const effectiveQty =
                    edit.headQty !== undefined ? edit.headQty : info?.headQty ?? 0;
                  return (
                    <tr key={c.msn} className="border-b border-line">
                      <td className="py-1.5 pr-3 font-mono text-ink">
                        {c.msn}
                        {(info?.hasDateOverride || info?.hasQtyOverride) && (
                          <span className="ml-1.5 inline-block rounded-sm border border-horizon-narrow-fg/30 bg-horizon-narrow-bg px-1 text-[9px] font-medium uppercase tracking-label text-horizon-narrow-fg">
                            ovr
                          </span>
                        )}
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-ink">
                        {c.qty} <span className="text-ink-subtle">{drill.unit}</span>
                      </td>
                      <td className="py-1.5 pr-3 font-mono text-ink">{c.targetDate}</td>
                      <td className="py-1.5 pr-3 font-mono">
                        {editMode ? (
                          <input
                            type="date"
                            value={effectiveDate}
                            onChange={(e) =>
                              setEdits((s) => ({
                                ...s,
                                [c.msn]: { ...s[c.msn], date: e.target.value },
                              }))
                            }
                            className="rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className="text-ink">{info?.date ?? '—'}</span>
                        )}
                      </td>
                      <td className="py-1.5 font-mono">
                        {editMode ? (
                          <input
                            type="number"
                            min={0}
                            step={1}
                            value={effectiveQty}
                            onChange={(e) =>
                              setEdits((s) => ({
                                ...s,
                                [c.msn]: { ...s[c.msn], headQty: Number(e.target.value) },
                              }))
                            }
                            className="w-16 rounded-sm border border-line bg-surface px-1.5 py-0.5 text-xs text-ink focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        ) : (
                          <span className="text-ink">{info?.headQty ?? '—'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
