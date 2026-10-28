"use client";

import { useEffect, useState } from "react";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
    const root = document.documentElement;
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
}

export default function ThemeToggle({ className = "" }: { className?: string }) {
    const [theme, setTheme] = useState<Theme | null>(null);

    // layout.tsx-ийн script тавьсан "dark" class-аас эхний төлвийг уншина
    useEffect(() => {
        setTheme(
            document.documentElement.classList.contains("dark")
                ? "dark"
                : "light"
        );
    }, []);

    // Хэрэглэгч гараар сонгоогүй бол төхөөрөмжийн тохиргоог дагана
    useEffect(() => {
        const media = window.matchMedia("(prefers-color-scheme: dark)");

        const onChange = (event: MediaQueryListEvent) => {
            try {
                if (localStorage.getItem("theme")) return;
            } catch {
                /* storage хаалттай */
            }
            const next: Theme = event.matches ? "dark" : "light";
            applyTheme(next);
            setTheme(next);
        };

        media.addEventListener("change", onChange);
        return () => media.removeEventListener("change", onChange);
    }, []);

    function choose(next: Theme) {
        applyTheme(next);
        setTheme(next);

        try {
            localStorage.setItem("theme", next);
        } catch {
            /* storage хаалттай */
        }
    }

    // Hydration алдаанаас сэргийлж, ачаалахаас өмнө ижил хэмжээтэй хоосон хэсэг
    if (theme === null) {
        return <div className={`h-10 w-[84px] ${className}`} aria-hidden />;
    }

    const isDark = theme === "dark";

    const base =
        "grid h-8 w-8 place-items-center rounded-full text-base transition";

    return (
        <div
            role="group"
            aria-label="Загвар сонгох"
            className={`inline-flex items-center gap-1 rounded-full bg-white p-1 shadow-sm shadow-slate-300/40 dark:bg-[#131d31] dark:shadow-none ${className}`}
        >
            <button
                type="button"
                onClick={() => choose("light")}
                aria-pressed={!isDark}
                aria-label="Гэрэлтэй горим"
                title="Гэрэлтэй горим"
                className={`${base} ${
                    !isDark
                        ? "bg-sky-100 shadow-sm"
                        : "opacity-50 hover:opacity-100"
                }`}
            >
                ☀️
            </button>
            <button
                type="button"
                onClick={() => choose("dark")}
                aria-pressed={isDark}
                aria-label="Харанхуй горим"
                title="Харанхуй горим"
                className={`${base} ${
                    isDark
                        ? "bg-sky-500/25 shadow-sm"
                        : "opacity-50 hover:opacity-100"
                }`}
            >
                🌙
            </button>
        </div>
    );
}