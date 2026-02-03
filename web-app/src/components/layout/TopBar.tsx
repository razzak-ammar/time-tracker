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
import { Moon, Sun, LogOut, User } from "lucide-react";
import { TabBar } from "./TabBar";

function getUserInitials(email: string) {
  return email.substring(0, 2).toUpperCase();
}

export function TopBar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  return (
    <div className="flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-background/80 dark:bg-gray-950/80 backdrop-blur-sm shrink-0">
      <div className="flex-1 min-w-0" aria-hidden />
      <div className="flex-shrink-0 min-w-0 overflow-x-auto scrollbar-hide justify-center">
        <TabBar />
      </div>
      <div className="flex-1 flex items-center justify-end gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-7 w-7"
          aria-label="Toggle theme"
        >
          {theme === "light" ? (
            <Moon className="h-3.5 w-3.5" />
          ) : (
            <Sun className="h-3.5 w-3.5" />
          )}
        </Button>
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full p-0"
                aria-label="Account menu"
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-primary/20 text-primary text-xs font-medium">
                    {getUserInitials(user.email ?? "")}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end">
              <DropdownMenuItem className="flex items-center gap-2">
                <User className="h-4 w-4 shrink-0" />
                <span className="truncate text-sm">{user.email}</span>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
