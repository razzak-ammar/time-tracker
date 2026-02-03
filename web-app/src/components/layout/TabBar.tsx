"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/pinned", label: "Pinned" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar", label: "Calendar" },
  { href: "/time-entries", label: "Time Entries" },
];

export function TabBar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndex = tabs.findIndex((t) => t.href === pathname);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [pillReady, setPillReady] = useState(false);

  useLayoutEffect(() => {
    const i = activeIndex >= 0 ? activeIndex : 0;
    const el = tabRefs.current[i];
    const nav = navRef.current;
    if (!el || !nav) return;
    const navRect = nav.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();
    setPillStyle({
      left: elRect.left - navRect.left,
      width: elRect.width,
    });
    setPillReady(true);
  }, [activeIndex, pathname]);

  return (
    <nav
      ref={navRef}
      role="tablist"
      className="relative inline-flex rounded-2xl bg-muted/80 dark:bg-gray-800/90 p-1 shadow-sm border border-border/40"
      aria-label="Main navigation"
    >
      {pillReady && (
        <span
          className="absolute inset-y-1 rounded-full bg-background dark:bg-gray-900/95 shadow-sm transition-[left,width] duration-300 ease-out z-0"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
          }}
          aria-hidden
        />
      )}
      {tabs.map((tab, index) => {
        const isActive = pathname === tab.href;
        return (
          <span key={tab.href} className="inline-flex items-center relative z-10">
            {index > 0 && (
              <span
                className="w-px h-3.5 bg-border/80 mr-0.5 flex-shrink-0"
                aria-hidden
              />
            )}
            <Link
              ref={(el) => {
                tabRefs.current[index] = el;
              }}
              href={tab.href}
              role="tab"
              aria-selected={isActive}
              className={cn(
                "px-3 py-2 text-xs sm:text-sm font-medium rounded-xl transition-colors",
                "text-muted-foreground hover:text-foreground",
                isActive && "text-foreground"
              )}
            >
              {tab.label}
            </Link>
          </span>
        );
      })}
    </nav>
  );
}
