"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const currentTheme = (theme === "system" ? resolvedTheme : theme) ?? "light";
  const isDark = mounted && currentTheme === "dark";

  const handleToggle = () => {
    const nextTheme = isDark ? "light" : "dark";
    setTheme(nextTheme);
  };

  const content = (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className={cn("relative", className)}
      aria-label="Theme umschalten"
    >
      <Sun
        className={cn(
          "h-5 w-5 transition-transform duration-300",
          isDark ? "-rotate-90 scale-0" : "rotate-0 scale-100"
        )}
      />
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-transform duration-300",
          isDark ? "rotate-0 scale-100" : "rotate-90 scale-0"
        )}
      />
    </Button>
  );

  if (!mounted) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn("relative", className)}
        aria-label="Theme umschalten"
        disabled
      >
        <Sun className="h-5 w-5 opacity-0" />
      </Button>
    );
  }

  return content;
}
