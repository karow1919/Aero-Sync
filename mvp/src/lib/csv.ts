import fs from 'node:fs';

export function parseCsv(filePath: string, separator: ',' | ';' = ','): Record<string, string>[] {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/^﻿/, '');
  const lines = raw.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];
  const header = lines[0].split(separator).map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const cells = line.split(separator);
    const row: Record<string, string> = {};
    header.forEach((h, i) => {
      row[h] = (cells[i] ?? '').trim();
    });
    return row;
  });
}
