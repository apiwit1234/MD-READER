import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PAX Reader',
  description: 'Local markdown reader',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="h-full overflow-hidden">{children}</body>
    </html>
  );
}
