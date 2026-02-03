// app/layout.tsx
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ClientChrome } from "./ClientWrapper";

const inter = Inter({ subsets: ["latin"] });

// Theme colors matching globals.css (light: 40 18% 97%, dark: 222.2 84% 4.9%)
const themeColorLight = "#faf8f5";
const themeColorDark = "#0a0d14";

export const metadata: Metadata = {
  title: "TimeTracker - Track Your Time",
  description: "A modern time tracking application",
  other: {
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "default",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: themeColorLight },
    { media: "(prefers-color-scheme: dark)", color: themeColorDark },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // NOTE: because this is a Server Component by default, make it a Client Layout
  // or move this state to a client wrapper. Easiest: mark this file "use client"
  // OR wrap Header+Navigation+main in a small ClientLayout.
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <AuthProvider>
          <ThemeProvider>
            <ClientChrome>{children}</ClientChrome>
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
