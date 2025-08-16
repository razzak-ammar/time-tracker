// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ClientChrome } from "./ClientWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TimeTracker - Track Your Time",
  description: "A modern time tracking application",
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
