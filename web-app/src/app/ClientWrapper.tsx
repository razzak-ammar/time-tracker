"use client";

import { useState, useEffect } from "react";
import { Header } from "@/components/layout/Header";
import { Navigation } from "@/components/layout/Navigation";

interface ClientChromeProps {
  children: React.ReactNode;
}

export function ClientChrome({ children }: ClientChromeProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);

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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 overflow-x-hidden">
      <Header onToggleMobileNav={toggleMobileNav} />
      <div className="flex">
        <Navigation
          isOpen={isMobileNavOpen}
          onClose={closeMobileNav}
          collapsed={isSidebarCollapsed}
          setCollapsed={setIsSidebarCollapsed}
        />
        <main className="flex-1 md:ml-0 min-h-[calc(100vh-3.5rem)] md:min-h-[calc(100vh-4rem)] pt-12 md:pt-0 w-0">
          <div className="w-full h-full overflow-x-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
