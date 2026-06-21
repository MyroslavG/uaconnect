"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { copy, type Locale } from "@/lib/i18n";

type ThemeToggleProps = {
  locale: Locale;
};

export function ThemeToggle({ locale }: ThemeToggleProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const label = copy[locale].theme.toggle;

  return (
    <Button
      aria-label={label}
      size="icon"
      variant="ghost"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={label}
    >
      <Sun className="h-4 w-4 scale-100 transition-transform dark:scale-0" />
      <Moon className="absolute h-4 w-4 scale-0 transition-transform dark:scale-100" />
    </Button>
  );
}
