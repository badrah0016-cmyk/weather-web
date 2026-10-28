
"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import "./Header.css";

type Theme = "light" | "dark";

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();

    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
        try {
            const savedTheme = localStorage.getItem("weather-theme");

            if (savedTheme === "dark" || savedTheme === "light") {
                setTheme(savedTheme);
            }
        } catch {
            // Default нь light mode
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);

        try {
            localStorage.setItem("weather-theme", theme);
        } catch {
            // Горимыг тухайн хуудсанд үргэлжлүүлэн хэрэглэнэ
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme((current) =>
            current === "light" ? "dark" : "light"
        );
    };


const navItems = [
    {
        label: "Монголийн Цаг агаар",
        path: "/",
        icon: "⌂",
    },
    {
        label: "Агаарын чанар",
        path: "/agaarchanar",
        icon: "≋",
    },
    {
        label: "Сэрэмжлүүлэг",
        path: "/sermjluuleg",
        icon: "♧",
    },
];


    return (
        <header className="header">
            <div className="header-top">
                <button
                    type="button"
                    className="logo"
                    onClick={() => router.push("/")}
                    aria-label="WeatherMN нүүр хуудас"
                >
                    <span className="logo-icon">
                        <span aria-hidden="true">☁</span>
                        <span className="logo-sun" aria-hidden="true">
                            ☀
                        </span>
                    </span>

                    <span className="logo-text">
                        <span className="logo-title">
                            Weather<span>MN</span>
                        </span>
                        <span className="logo-subtitle">
                            Монгол орны цаг агаар
                        </span>
                    </span>
                </button>

                <div className="header-actions">
                    <span className="header-status">
                        <span className="status-dot" />
                        Цаг агаарын мэдээлэл
                    </span>

                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={toggleTheme}
                        aria-label={
                            theme === "light"
                                ? "Харанхуй горимд шилжих"
                                : "Гэрэлтэй горимд шилжих"
                        }
                        title={
                            theme === "light"
                                ? "Dark mode"
                                : "Light mode"
                        }
                    >
                        <span className="theme-icon" aria-hidden="true">
                            {theme === "light" ? "☾" : "☀"}
                        </span>
                     
                    </button>
                </div>
            </div>

            <nav className="menu" aria-label="Үндсэн цэс">
                <div className="menu-inner">
                    {navItems.map((item) => {
                        const isActive =
                            item.path === "/"
                                ? pathname === "/"
                                : pathname === item.path ||
                                  pathname.startsWith(`${item.path}/`);

                        return (
                            <button
                                key={item.path}
                                type="button"
                                className={`menu-link ${
                                    isActive ? "active" : ""
                                }`}
                                onClick={() => router.push(item.path)}
                                aria-current={isActive ? "page" : undefined}
                            >
                                <span
                                    className="menu-icon"
                                    aria-hidden="true"
                                >
                                    {item.icon}
                                </span>
                                <span>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </header>
    );
}
