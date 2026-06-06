import { NextRequest, NextResponse } from 'next/server';
import { loadDataset } from '@/lib/data';
import { findScenario, SCENARIOS } from '@/lib/scenarios';
import { clearScenario, getActiveScenarioId, setActiveScenario } from '@/lib/overrides';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    activeId: getActiveScenarioId(),
    scenarios: SCENARIOS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
    })),
  });
}

export async function DELETE() {
  clearScenario();
  return NextResponse.json({ ok: true, activeId: null });
}

export async function POST(req: NextRequest) {
  const { id } = (await req.json()) as { id?: string | null };
  if (!id) {
    clearScenario();
    return NextResponse.json({ ok: true, activeId: null });
  }
  const scenario = findScenario(id);
  if (!scenario) {
    return NextResponse.json({ error: 'unknown scenario' }, { status: 404 });
  }
  const ds = loadDataset();
  const patch = scenario.apply(ds);
  setActiveScenario(scenario.id, patch.dates, patch.qtys);
  return NextResponse.json({
    ok: true,
    activeId: scenario.id,
    affectedDates: patch.dates.size,
    affectedQtys: patch.qtys.size,
  });
}
