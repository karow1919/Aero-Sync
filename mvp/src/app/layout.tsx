import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Aero Supply MVP',
  description: 'Aggregierte Kapazitäts- und Bedarfsplanung',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
