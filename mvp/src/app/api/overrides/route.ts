import { NextRequest, NextResponse } from 'next/server';
import {
  listOverrides,
  resetAll,
  setDateOverride,
  setQtyOverride,
} from '@/lib/overrides';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json(listOverrides());
}

export async function DELETE() {
  resetAll();
  return NextResponse.json({ ok: true });
}

type Body =
  | { kind: 'date'; msn: string; date: string | null }
  | { kind: 'qty'; msn: string; part: string; qty: number | null };

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  if (!body || !body.kind || !body.msn) {
    return NextResponse.json({ error: 'invalid payload' }, { status: 400 });
  }
  if (body.kind === 'date') {
    if (body.date === null || body.date === '') {
      setDateOverride(body.msn, null);
    } else {
      const [y, m, d] = body.date.split('-').map(Number);
      if (!y || !m || !d) {
        return NextResponse.json({ error: 'invalid date' }, { status: 400 });
      }
      setDateOverride(body.msn, new Date(Date.UTC(y, m - 1, d)));
    }
  } else if (body.kind === 'qty') {
    setQtyOverride(body.msn, body.part, body.qty);
  } else {
    return NextResponse.json({ error: 'unknown kind' }, { status: 400 });
  }
  return NextResponse.json(listOverrides());
}
