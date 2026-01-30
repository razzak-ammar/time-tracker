"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";
import { Loader2 } from "lucide-react";

interface ClientChromeProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ["/auth", "/"];

export function ClientChrome({ children }: ClientChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

  const isAuthPage = pathname === "/auth";
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // Redirect unauthenticated users from protected routes to /auth
  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    if (isPublicPath) return;
    router.replace("/auth");
  }, [authLoading, user, isPublicPath, router]);

  const toggleMobileNav = () => {
    setIsMobileNavOpen(!isMobileNavOpen);
  };

  const closeMobileNav = () => {
    setIsMobileNavOpen(false);
  };

  // Prevent body scroll when mobile nav is open
  useEffect(() => {
    if (isMobileNavOpen) {
      document.body.classList.add("nav-open");
    } else {
      document.body.classList.remove("nav-open");
    }

    return () => {
      document.body.classList.remove("nav-open");
    };
  }, [isMobileNavOpen]);

  // Persist desktop sidebar collapsed state
  useEffect(() => {
    try {
      const stored = localStorage.getItem("tt_sidebar_collapsed");
      if (stored !== null) {
        setIsSidebarCollapsed(stored === "1");
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "tt_sidebar_collapsed",
        isSidebarCollapsed ? "1" : "0",
      );
    } catch {}
  }, [isSidebarCollapsed]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  // Show loader while redirecting unauthenticated users from protected routes
  if (!authLoading && !user && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
          <p className="text-sm text-gray-500">Redirecting…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden bg-background dark:bg-gray-950">
      <Header onToggleMobileNav={toggleMobileNav} />
      <div className="flex flex-1 min-h-0">
        <Navigation
          isOpen={isMobileNavOpen}
          onClose={closeMobileNav}
          collapsed={isSidebarCollapsed}
          setCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 min-h-0 md:ml-0 pt-12 md:pt-0 w-0 overflow-hidden">
          <div className="w-full h-full overflow-y-auto overflow-x-hidden">{children}</div>
        </main>
      </div>
    </div>
  );
}
