// components/layout/Header.tsx
"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Moon, Sun, LogOut, User, Palette, Menu } from "lucide-react";
import { useMemo } from "react";

type HeaderProps = {
  onToggleMobileNav?: () => void;
};

export function Header({ onToggleMobileNav }: HeaderProps) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme, accent, setAccent } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const getUserInitials = (email: string) =>
    email.substring(0, 2).toUpperCase();

  const accentColors = useMemo(
    () =>
      [
        { name: "violet", color: "#8b5cf6" },
        { name: "blue", color: "#3b82f6" },
        { name: "emerald", color: "#10b981" },
        { name: "amber", color: "#f59e0b" },
        { name: "rose", color: "#f43f5e" },
      ] as const,
    [],
  );
  type AccentColor = (typeof accentColors)[number]["name"];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/80 bg-card/95 dark:bg-gray-900/90 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="mx-auto w-full  px-3 sm:px-4">
        <div className="h-14 md:h-16 flex items-center justify-between gap-2">
          {/* Left: Hamburger (mobile) + Brand */}
          <div className="flex items-center gap-2 min-w-0">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-11 w-11 -ml-1"
              onClick={onToggleMobileNav}
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 md:w-8 md:h-8 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg grid place-items-center">
                <span className="text-white font-bold text-xs md:text-sm">
                  T
                </span>
              </div>
              <h1 className="text-base md:text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent truncate">
                TimeTracker
              </h1>
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Accent (desktop only) */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11"
                    aria-label="Choose accent color"
                  >
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{
                        backgroundColor:
                          accentColors.find((c) => c.name === accent)?.color ||
                          "#8b5cf6",
                      }}
                    />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    <Palette className="mr-2 h-4 w-4" />
                    Theme Color
                  </DropdownMenuItem>
                  <div className="p-2">
                    <div className="grid grid-cols-5 gap-2">
                      {accentColors.map((color) => (
                        <button
                          key={color.name}
                          onClick={() => setAccent(color.name as AccentColor)}
                          className={`h-8 w-8 rounded-full border-2 transition-transform ${
                            accent === color.name
                              ? "border-gray-900 dark:border-white scale-110"
                              : "border-gray-300 dark:border-gray-600 hover:scale-105"
                          }`}
                          style={{ backgroundColor: color.color }}
                          aria-label={`Set accent ${color.name}`}
                        />
                      ))}
                    </div>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Theme toggle */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-11 w-11"
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>

            {/* User menu */}
            {user && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 rounded-full"
                    aria-label="Open user menu"
                  >
                    <Avatar className="h-8 w-8 md:h-9 md:w-9">
                      <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white font-semibold text-xs md:text-sm">
                        {getUserInitials(user.email || "")}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-60" align="end" forceMount>
                  <DropdownMenuItem className="flex items-center">
                    <User className="mr-2 h-4 w-4" />
                    <span className="truncate font-medium text-sm">
                      {user.email}
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
