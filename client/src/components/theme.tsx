"use client";

import { Moon, Sun } from "lucide-react";
import { ThemeProvider as NextThemesProvider, useTheme } from "next-themes";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return <NextThemesProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>{children}</NextThemesProvider>;
}

export function ThemeToggle() {
  const { setTheme } = useTheme();
  return (
    <>
      <Button variant="ghost" size="icon" className="dark:hidden" aria-label="Switch to dark theme" onClick={() => setTheme("dark")}>
        <Moon aria-hidden="true" />
      </Button>
      <Button variant="ghost" size="icon" className="hidden dark:inline-flex" aria-label="Switch to light theme" onClick={() => setTheme("light")}>
        <Sun aria-hidden="true" />
      </Button>
    </>
  );
}
