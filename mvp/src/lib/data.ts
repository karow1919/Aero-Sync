import path from 'node:path';
import { parseCsv } from './csv';

const DATA_DIR = process.env.DATA_DIR ?? path.resolve(process.cwd(), '..');

export type ProductionEntry = { msn: string; date: Date };
export type HeadBomEntry = { msn: string; part: string; qty: number; unit: string };
export type SubBomEntry = {
  head: string;
  sub: string;
  description: string;
  qty: number;
  unit: string;
};
export type Dataset = {
  production: ProductionEntry[];
  headBom: HeadBomEntry[];
  subBom: SubBomEntry[];
  leadTimes: Map<string, number>;
  suppliers: Map<string, string>;
  partDescriptions: Map<string, string>;
};

function parseGermanDate(s: string): Date {
  const [d, m, y] = s.split('.').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

let cache: Dataset | null = null;

export function loadDataset(): Dataset {
  if (cache) return cache;

  const production = parseCsv(path.join(DATA_DIR, 'Produktionsplanungsdaten.csv'), ';').map(
    (r) => ({ msn: r['MSN'], date: parseGermanDate(r['Datum']) }),
  );

  const headBom = parseCsv(path.join(DATA_DIR, 'BOM-Liste-Airbus.csv'), ';').map((r) => ({
    msn: r['MSN'],
    part: r['Bauteilnummer'],
    qty: Number(r['Anzahl']),
    unit: r['Einheit'],
  }));

  const subBom = parseCsv(
    path.join(DATA_DIR, 'CSV Daten - Sub Bom Liste fuer Tier 1.csv'),
    ',',
  ).map((r) => ({
    head: r['(Head-)Bauteilnummer'],
    sub: r['(Sub-)Bauteilnummer'],
    description: r['Beschreibung'],
    qty: Number(r['Anzahl']),
    unit: r['Einheit'],
  }));

  const leadTimes = new Map<string, number>(
    parseCsv(path.join(DATA_DIR, 'CSV Daten - lead time tier 1.csv'), ',').map((r) => [
      r['Bauteilnummer'],
      Number(r['Leadtime']),
    ]),
  );

  const suppliers = new Map<string, string>(
    parseCsv(path.join(DATA_DIR, 'CSV Daten - part to suppleir connect.csv'), ',').map((r) => [
      r['Bauteilnummer'],
      r['Lieferant'],
    ]),
  );

  const partDescriptions = new Map<string, string>();
  for (const s of subBom) partDescriptions.set(s.sub, s.description);
  // Head part description fallback
  if (!partDescriptions.has('84729105')) partDescriptions.set('84729105', 'Galley (Head)');

  cache = { production, headBom, subBom, leadTimes, suppliers, partDescriptions };
  return cache;
}
