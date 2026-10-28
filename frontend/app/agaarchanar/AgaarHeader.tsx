
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import "./AgaarHeader.css";

type Theme = "light" | "dark";

type MenuChild = {
  label: string;
  description: string;
  href: string;
};

type MenuItem = {
  label: string;
  icon: string;
  href?: string;
  children?: MenuChild[];
};

 const menuItems: MenuItem[] = [
  { label: "Цаг агаар", icon: "⌂", href: "/" },
  {
    label: "Агаарын чанар",
    icon: "◉",
     href: "/agaarchanar#overview",
    
  },

 /*{
    label: "Түүхэн мэдээлэл",
    icon: "▥",
    children: [
      {
        label: "Цагийн өөрчлөлт",
        description: "Цаг тутмын хэмжилт",
        href: "/agaarchanar/history/hourly",
      },
      {
        label: "Өдрийн өөрчлөлт",
        description: "Өдрийн дундаж үзүүлэлт",
        href: "/agaarchanar/history/daily",
      },
      {
        label: "Сарын статистик",
        description: "Сарын дундаж ба хандлага",
        href: "/agaarchanar/history/monthly",
      },
      {
        label: "Жилийн статистик",
        description: "Жилийн өөрчлөлт",
        href: "/agaarchanar/history/yearly",
      },
    ],
  },
 */
  {
    label: "Харьцуулалт",
    icon: "⇄",
    href: "/agaarchanar/compare",
  },
{
  label: "Эрүүл мэнд",
  icon: "♡",
  href: "/agaarchanar/eruul_mend",
  children: [
   
  ],
},
/*
  {
    label: "Тайлан",
    icon: "▤",
    children: [
      {
        label: "Статистик тайлан",
        description: "Өдөр, сар, жилийн нэгтгэл",
        href: "/agaarchanar/reports/statistics",
      },
      {
        label: "Өгөгдөл татах",
        description: "Өгөгдлийг CSV хэлбэрээр экспортлох",
        href: "/agaarchanar/reports/export",
      },
    ],
  },*/
];

const THEME_STORAGE_KEY = "agaar-theme";

function applyTheme(theme: Theme) {
  // Хуудасны үндсэн theme
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  // Харьцуулалтын хуудасны theme
  const comparePage = document.querySelector(".aq-compare-page");

  if (comparePage) {
    comparePage.setAttribute("data-theme", theme);
  }
}
export default function AgaarHeader() {
  const pathname = usePathname();

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    const initialTheme: Theme =
      savedTheme === "light" || savedTheme === "dark"
        ? savedTheme
        : "dark";

    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  function changeTheme() {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";

    setTheme(nextTheme);
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  }

  function closeMenu() {
    setOpenMenu(null);
    setMobileOpen(false);
  }

  function isActive(href?: string) {
    if (!href) return false;

    const hashIndex = href.indexOf("#");
    const path = hashIndex >= 0 ? href.slice(0, hashIndex) : href;

    if (hashIndex >= 0) return pathname === path;

    return pathname === path || pathname.startsWith(path + "/");
  }

  return (
    <header className="ag-header">
      <div className="ag-header-top">
        <Link
          href="/agaarchanar"
          className="ag-brand"
          onClick={closeMenu}
        >
          <span className="ag-brand-symbol">🌿</span>

          <span className="ag-brand-copy">
            <strong>АГААРЫН ЧАНАР</strong>
            <small>Агаарын чанарын мэдээллийн систем</small>
          </span>
        </Link>

        <div className="ag-header-right">
          <div className="ag-live-status">
            <span className="ag-live-dot" />
            <span>Хэмжилтийн мэдээлэл</span>
          </div>

          <button
            type="button"
            className="ag-theme-toggle"
            onClick={changeTheme}
            aria-label={
              theme === "dark"
                ? "Гэрэлтэй горимд шилжих"
                : "Харанхуй горимд шилжих"
            }
            title="Өнгөний горим солих"
          >
            <span aria-hidden="true">
              {theme === "dark" ? "☀️" : "🌙"}
            </span>
          
          </button>

          <button
            type="button"
            className="ag-mobile-button"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? "Цэс хаах" : "Цэс нээх"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
      </div>

      <nav
        className={`ag-navigation ${
          mobileOpen ? "ag-navigation-open" : ""
        }`}
        aria-label="Агаарын чанарын үндсэн цэс"
      >
        {menuItems.map((item) => {
          const hasChildren = Boolean(item.children?.length);
          const expanded = openMenu === item.label;

          const active =
            isActive(item.href) ||
            Boolean(item.children?.some((child) => isActive(child.href)));

          return (
            <div
              key={item.label}
              className={`ag-menu-item ${
                active ? "ag-menu-item-active" : ""
              }`}
            >
              {item.label === "Агаарын чанар" ? (
                <Link
                  href={item.href || "/agaarchanar/chanar"}
                  className="ag-menu-link"
                  onClick={closeMenu}
                >
                  <span className="ag-menu-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ) : hasChildren ? (
                <>
                  <button
                    type="button"
                    className="ag-menu-trigger"
                    onClick={() =>
                      setOpenMenu((current) =>
                        current === item.label ? null : item.label
                      )
                    }
                    aria-expanded={expanded}
                  >
                    <span className="ag-menu-icon">{item.icon}</span>
                    <span>{item.label}</span>
                    <span className="ag-menu-chevron">
                      {expanded ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {expanded && (
                    <div className="ag-dropdown">
                      <div className="ag-dropdown-heading">
                        {item.label}
                      </div>

                      {item.children?.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`ag-dropdown-link ${
                            isActive(child.href)
                              ? "ag-dropdown-link-active"
                              : ""
                          }`}
                          onClick={closeMenu}
                        >
                          <span className="ag-dropdown-icon">↗</span>

                          <span className="ag-dropdown-text">
                            <strong>{child.label}</strong>
                            <small>{child.description}</small>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  href={item.href || "/"}
                  className="ag-menu-link"
                  onClick={closeMenu}
                >
                  <span className="ag-menu-icon">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              )}
            </div>
          );
        })}
      </nav>
    </header>
  );
}
