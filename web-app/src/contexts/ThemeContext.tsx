"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
type Accent = "violet" | "blue" | "emerald" | "amber" | "rose";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");
  const [accent, setAccent] = useState<Accent>("violet");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as Theme;
    if (savedTheme) {
      setTheme(savedTheme);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
    const savedAccent = (localStorage.getItem("accent") as Accent) || "violet";
    setAccent(savedAccent);
  }, []);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(theme);
    localStorage.setItem("theme", theme);
    root.setAttribute("data-accent", accent);
    localStorage.setItem("accent", accent);
  }, [theme, accent]);

  const toggleTheme = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
