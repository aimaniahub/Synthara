import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from '@/components/theme-provider';
import { ErrorHandler } from '@/components/error-handler';
import { Inter, Space_Grotesk } from 'next/font/google'; // Import GoogleFont objects

// Configure Inter font with fallback handling
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter', // CSS variable for Inter
  display: 'swap',
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});

// Configure Space Grotesk font with fallback handling
const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk', // CSS variable for Space Grotesk
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  fallback: ['system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
});


export const metadata: Metadata = {
  title: 'Synthara AI Platform | Intelligent Synthetic Data',
  description: 'Generate, analyze, and utilize high-quality synthetic data with Synthara AI. Powering innovation for data scientists, developers, and analysts.',
  keywords: 'synthetic data, data generation, AI, machine learning, data analysis, data privacy, synthara',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        {/* Removed direct Google Fonts links as next/font handles optimization */}
      </head>
      <body className="font-body antialiased min-h-screen flex flex-col bg-background text-foreground selection:bg-primary selection:text-primary-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ErrorHandler />
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
