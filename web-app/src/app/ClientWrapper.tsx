"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { TopBar } from "@/components/layout/TopBar";
import { Loader2 } from "lucide-react";

interface ClientChromeProps {
  children: React.ReactNode;
}

const PUBLIC_PATHS = ["/auth", "/"];

export function ClientChrome({ children }: ClientChromeProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const isAuthPage = pathname === "/auth";
  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (authLoading) return;
    if (user) return;
    if (isPublicPath) return;
    router.replace("/auth");
  }, [authLoading, user, isPublicPath, router]);

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (!authLoading && !user && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background dark:bg-gray-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Redirecting…</p>
        </div>
      </div>
    );
  }

  const isCalendar = pathname === "/calendar";

  return (
    <div className="h-dvh flex flex-col bg-background dark:bg-gray-950">
      <TopBar />
      <main
        className={`flex-1 min-h-0 flex flex-col ${isCalendar ? "overflow-hidden" : "overflow-auto"}`}
      >
        {children}
      </main>
    </div>
  );
}
