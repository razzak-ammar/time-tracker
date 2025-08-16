"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Clock,
  Pin,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const navItems = [
  {
    href: "/pinned",
    label: "Pinned",
    icon: Pin,
    description: "Quick access to pinned projects",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Overview and statistics",
  },
  {
    href: "/time-entries",
    label: "Time Entries",
    icon: Clock,
    description: "View and manage all time entries",
  },
];

interface NavigationProps {
  isOpen: boolean;
  onClose: () => void;
  collapsed?: boolean;
  setCollapsed?: (collapsed: boolean) => void;
}

export function Navigation({
  isOpen,
  onClose,
  collapsed = false,
  setCollapsed,
}: NavigationProps) {
  const pathname = usePathname();

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
        </div>
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "group/sidebar fixed left-0 top-0 z-40 md:z-auto h-screen w-72 md:w-64 transform bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200/50 dark:border-gray-800/50 shadow-2xl transition-all duration-300 ease-in-out md:translate-x-0 md:shadow-none md:static md:top-auto md:h-[calc(100vh-4rem)] md:min-h-[calc(100vh-4rem)] md:overflow-y-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
          collapsed && "md:w-16 md:hover:w-64",
        )}
      >
        {/* Mobile Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200/50 dark:border-gray-800/50 md:hidden">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">T</span>
            </div>
            <h2 className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              TimeTracker
            </h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Content */}
        <div className="flex flex-col h-full">
          {/* Desktop header removed to avoid duplicate title with top header */}

          {/* Navigation Items */}
          <nav
            className={cn(
              "flex-1 p-4 space-y-3 transition-[padding] duration-200",
              collapsed && "md:p-2",
            )}
          >
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => {
                    if (window.innerWidth < 768) {
                      onClose();
                    }
                  }}
                  className="block"
                >
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start h-14 md:h-12 text-base font-medium transition-all duration-200 group relative overflow-hidden touch-manipulation cursor-pointer",
                      collapsed &&
                        "md:h-12 md:px-0 md:justify-center md:group-hover/sidebar:justify-start md:group-hover/sidebar:px-4",
                      isActive
                        ? "bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-md"
                        : "hover:bg-gray-100 dark:hover:bg-gray-800 active:bg-gray-200 dark:active:bg-gray-700",
                    )}
                  >
                    {/* Active indicator */}
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-1 bg-white rounded-r-full " />
                    )}

                    <Icon
                      className={cn(
                        "h-5 w-5",
                        collapsed
                          ? "md:mx-auto md:mr-0 md:group-hover/sidebar:mx-0 md:group-hover/sidebar:mr-4"
                          : "mr-3",
                      )}
                    />
                    <span
                      className={cn(
                        "truncate transition-all",
                        collapsed
                          ? "md:opacity-0 md:group-hover/sidebar:opacity-100 md:w-0 md:group-hover/sidebar:w-auto md:overflow-hidden"
                          : "",
                      )}
                    >
                      {item.label}
                    </span>

                    {/* Hover effect */}
                    {!isActive && (
                      <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
                    )}

                    {/* Touch feedback */}
                    <div className="absolute inset-0 bg-white/20 opacity-0 active:opacity-100 transition-opacity duration-75" />
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Section */}
          <div
            className={cn(
              "p-4 border-t border-gray-200/50 dark:border-gray-800/50 transition-[padding] duration-200",
              collapsed && "md:p-2",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-between",
                collapsed && "md:justify-center",
              )}
            >
              <div
                className={cn(
                  "text-xs text-gray-500 dark:text-gray-400",
                  collapsed && "md:hidden",
                )}
              >
                TimeTracker v1.0
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setCollapsed && setCollapsed(!collapsed)}
                aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {collapsed ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
