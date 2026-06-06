import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AeroSync — n-Tier Kapazitäts- und Bedarfsplanung',
  description: 'Konsolidierte Lieferketten-Sicht für OEM und Tier-Planer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-canvas text-ink antialiased">{children}</body>
    </html>
  );
}
