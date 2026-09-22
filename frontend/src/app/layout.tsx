import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'e-LMPC RADAR | Legal Metrology Automated Compliance System',
  description: 'Department of Consumer Affairs Automated Compliance System under Legal Metrology (Packaged Commodities) Rules, 2011',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased text-slate-900 bg-slate-50">
        {children}
      </body>
    </html>
  );
}
