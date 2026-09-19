"use client";

import { Moon, Sun } from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";

export function ThemeToggle() {
  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("apexai-theme", next);
  }

  return (
    <IconButton label="切换颜色模式" onClick={toggleTheme} className="theme-toggle">
      <Sun className="theme-icon-sun" aria-hidden="true" />
      <Moon className="theme-icon-moon" aria-hidden="true" />
    </IconButton>
  );
}
