import type { Metadata } from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { Inter, Space_Grotesk, Source_Code_Pro } from 'next/font/google'
import { cn } from '@/lib/utils';

const fontBody = Inter({
  subsets: ['latin'],
  variable: '--font-body',
})

const fontHeadline = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-headline',
})

const fontCode = Source_Code_Pro({
  subsets: ['latin'],
  variable: '--font-code',
})

export const metadata: Metadata = {
  title: 'ForensicAI',
  description: 'AI-Powered Forensic Analysis Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={cn("font-body antialiased", fontBody.variable, fontHeadline.variable, fontCode.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
