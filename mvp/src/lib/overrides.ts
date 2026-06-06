export type Overrides = {
  dateByMsn: Map<string, Date>;
  qtyByMsnPart: Map<string, number>;
};

type Store = {
  manualDate: Map<string, Date>;
  manualQty: Map<string, number>;
  scenarioDate: Map<string, Date>;
  scenarioQty: Map<string, number>;
  activeScenarioId: string | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __aeroOverrides: Store | undefined;
}

function getStore(): Store {
  const existing = globalThis.__aeroOverrides as unknown as Partial<Store> | undefined;
  if (!existing || !(existing.manualDate instanceof Map)) {
    globalThis.__aeroOverrides = {
      manualDate: new Map(),
      manualQty: new Map(),
      scenarioDate: new Map(),
      scenarioQty: new Map(),
      activeScenarioId: null,
    };
  }
  return globalThis.__aeroOverrides!;
}

export function getEffectiveOverrides(): Overrides {
  const s = getStore();
  const dates = new Map(s.scenarioDate);
  for (const [k, v] of s.manualDate) dates.set(k, v);
  const qtys = new Map(s.scenarioQty);
  for (const [k, v] of s.manualQty) qtys.set(k, v);
  return { dateByMsn: dates, qtyByMsnPart: qtys };
}

export function setDateOverride(msn: string, date: Date | null) {
  const s = getStore();
  if (date) s.manualDate.set(msn, date);
  else s.manualDate.delete(msn);
}
export function setQtyOverride(msn: string, part: string, qty: number | null) {
  const s = getStore();
  const k = `${msn}|${part}`;
  if (qty != null && Number.isFinite(qty)) s.manualQty.set(k, qty);
  else s.manualQty.delete(k);
}

export function setActiveScenario(
  id: string | null,
  dates: Map<string, Date>,
  qtys: Map<string, number>,
) {
  const s = getStore();
  s.activeScenarioId = id;
  s.scenarioDate = dates;
  s.scenarioQty = qtys;
}
export function clearScenario() {
  const s = getStore();
  s.activeScenarioId = null;
  s.scenarioDate.clear();
  s.scenarioQty.clear();
}
export function getActiveScenarioId(): string | null {
  return getStore().activeScenarioId;
}

export function resetAll() {
  const s = getStore();
  s.manualDate.clear();
  s.manualQty.clear();
  s.scenarioDate.clear();
  s.scenarioQty.clear();
  s.activeScenarioId = null;
}

export function listOverrides() {
  const s = getStore();
  return {
    dates: Array.from(s.manualDate.entries()).map(([msn, d]) => ({
      msn,
      date: d.toISOString().slice(0, 10),
    })),
    qtys: Array.from(s.manualQty.entries()).map(([k, q]) => {
      const [msn, part] = k.split('|');
      return { msn, part, qty: q };
    }),
    scenario: {
      id: s.activeScenarioId,
      affectedDates: s.scenarioDate.size,
      affectedQtys: s.scenarioQty.size,
    },
  };
}
