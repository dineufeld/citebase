import type { Metadata } from 'next';
import { Manrope, Geist_Mono } from 'next/font/google';
import './globals.css';

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Citebase — Chat with your docs',
  description:
    'Upload PDFs and text files, then ask grounded questions with hybrid retrieval and citations.',
};

// No-flash theme bootstrap. Runs synchronously during HTML parsing, before paint.
// Reads localStorage "cb-theme" (expected "dark" | "light"); falls back to
// the user's OS-level prefers-color-scheme. Only sets data-theme="dark" when
// dark is requested, matching the :root[data-theme="dark"] selector in globals.css.
const themeBootstrap = `(function(){try{var t=localStorage.getItem("cb-theme");if(t==null)t=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";if(t==="dark")document.documentElement.setAttribute("data-theme","dark")}catch(e){}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${manrope.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
      </body>
    </html>
  );
}
