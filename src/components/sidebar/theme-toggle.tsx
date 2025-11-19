import React from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [theme, setThemeState] = React.useState<string | null>(null);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const isDark =
      savedTheme === "dark" ||
      (!savedTheme &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
    setThemeState(isDark ? "dark" : "light");
  }, []);

  const setTheme = (newTheme: string) => {
    if (newTheme === "system") {
      localStorage.removeItem("theme");
      const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      document.documentElement.classList.toggle("dark", isDark);
      setThemeState(isDark ? "dark" : "light");
    } else {
      localStorage.theme = newTheme;
      document.documentElement.classList.toggle("dark", newTheme === "dark");
      setThemeState(newTheme);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme == "light" ? "dark" : "light")}
    >
      <Sun
        className={`h-[1.2rem] w-[1.2rem] transition-all ${
          theme === "dark" ? "rotate-90 scale-0" : "rotate-0 scale-100"
        }`}
      />
      <Moon
        className={`absolute h-[1.2rem] w-[1.2rem] transition-all ${
          theme === "dark" ? "rotate-0 scale-100" : "-rotate-90 scale-0"
        }`}
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
