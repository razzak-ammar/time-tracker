"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArchiveRestore,
  CalendarDays,
  Clock3,
  Ellipsis,
  Folder,
  Pin,
} from "lucide-react";
import { useLayoutEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const primaryTabs = [
  { href: "/dashboard", label: "Projects", icon: Folder },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/time-entries", label: "Entries", icon: Clock3 },
];

const revealLabelClasses = cn(
  "max-w-0 -translate-x-1 overflow-hidden whitespace-nowrap opacity-0",
  "transition-[max-width,opacity,transform,margin] duration-300 ease-out",
  "group-hover/nav:ml-1.5 group-hover/nav:max-w-28 group-hover/nav:translate-x-0 group-hover/nav:opacity-100",
  "group-focus-within/nav:ml-1.5 group-focus-within/nav:max-w-28 group-focus-within/nav:translate-x-0 group-focus-within/nav:opacity-100",
  "motion-reduce:transition-none",
);

const secondaryTabs = [
  { href: "/pinned", label: "Pinned", icon: Pin },
  { href: "/recently-deleted", label: "Recently deleted", icon: ArchiveRestore },
];

export function TabBar() {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const tabRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const activeIndex = primaryTabs.findIndex((tab) => tab.href === pathname);
  const secondaryActive = secondaryTabs.some((tab) => tab.href === pathname);
  const [pillStyle, setPillStyle] = useState({ left: 0, width: 0 });
  const [pillReady, setPillReady] = useState(false);

  useLayoutEffect(() => {
    if (activeIndex < 0) {
      setPillReady(false);
      return;
    }

    const el = tabRefs.current[activeIndex];
    const nav = navRef.current;
    if (!el || !nav) return;

    const updatePill = () => {
      const navRect = nav.getBoundingClientRect();
      const elRect = el.getBoundingClientRect();
      setPillStyle({
        left: elRect.left - navRect.left,
        width: elRect.width,
      });
      setPillReady(true);
    };

    updatePill();
    const observer = new ResizeObserver(updatePill);
    observer.observe(nav);
    return () => observer.disconnect();
  }, [activeIndex, pathname]);

  return (
    <nav
      ref={navRef}
      className="group/nav relative inline-flex items-center rounded-xl border border-border/50 bg-muted/55 p-0.5 shadow-sm transition-[box-shadow,background-color] duration-300 ease-out hover:shadow-md focus-within:shadow-md dark:bg-gray-800/65 motion-reduce:transition-none"
      aria-label="Main navigation"
    >
      {pillReady && activeIndex >= 0 && (
        <span
          className="absolute inset-y-0.5 z-0 rounded-[10px] bg-background shadow-sm transition-[left,width] duration-300 ease-out dark:bg-gray-950/90"
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
          }}
          aria-hidden
        />
      )}
      {primaryTabs.map((tab, index) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            title={tab.label}
            className={cn(
              "relative z-10 flex h-8 items-center rounded-[10px] px-2.5 text-xs font-medium",
              "transition-[color,background-color] duration-200 ease-out sm:text-sm motion-reduce:transition-none",
              "text-muted-foreground hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06]",
              isActive && "text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span className={revealLabelClasses}>{tab.label}</span>
          </Link>
        );
      })}

      <span className="relative z-10 mx-0.5 h-4 w-px bg-border/70" aria-hidden />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-label="More navigation"
            title="More"
            className={cn(
              "relative z-10 h-8 rounded-[10px] px-2.5 text-muted-foreground transition-[color,background-color] duration-200 ease-out hover:bg-black/[0.04] hover:text-foreground dark:hover:bg-white/[0.06] motion-reduce:transition-none",
              secondaryActive &&
                "bg-background text-foreground shadow-sm hover:bg-muted/80 dark:bg-gray-950/90 dark:hover:bg-gray-900",
            )}
          >
            <Ellipsis className="size-4 shrink-0" />
            <span className={revealLabelClasses}>More</span>
            {secondaryActive && (
              <span
                className="absolute bottom-1 right-1 size-1 rounded-full bg-emerald-500"
                aria-hidden
              />
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48 rounded-xl p-1.5 shadow-xl">
          {secondaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = pathname === tab.href;
            return (
              <DropdownMenuItem
                key={tab.href}
                asChild
                className={cn(
                  "rounded-lg px-2.5 py-2",
                  isActive && "bg-accent text-accent-foreground",
                )}
              >
                <Link href={tab.href} aria-current={isActive ? "page" : undefined}>
                  <Icon className="size-4" />
                  <span>{tab.label}</span>
                  {isActive && (
                    <span className="ml-auto size-1.5 rounded-full bg-emerald-500" aria-hidden />
                  )}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}
