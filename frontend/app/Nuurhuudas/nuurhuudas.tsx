"use client";


import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import dynamic from "next/dynamic";
import Link from "next/link";

import Header from "../hesguud/Header";
import Footer from "../hesguud/Footer";
import ThemeToggle from "../hesguud/Themetoggle";

import "./Nuurhuudas.css";

// =====================================================
// RECHARTS — ГРАФИКИЙН ИМПОРТ
// =====================================================

import {
    ResponsiveContainer,
    BarChart,
    Bar,
    LineChart,
    Line,
    CartesianGrid,
    XAxis,
    YAxis,
    Tooltip,
} from "recharts";
// =====================================================
// MONGOLIA MAP
// =====================================================

const MongoliaMap = dynamic(() => import("./MongoliaMap"), {
    ssr: false,
    loading: () => (
        <div className="flex h-full w-full items-center justify-center text-sm text-slate-600 dark:text-slate-400">
            Газрын зураг ачаалж байна...
        </div>
    ),
});

const API_BASE_URL = "/backend";
const DEFAULT_STATION_ID = 549;
const TZ = "Asia/Ulaanbaatar";


const WEEKDAYS = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

// Card-ийн стиль нь nuurhuudas.css доторх .np-card класс дээр байна
const CARD = "np-card";

// =====================================================
// TYPES
// =====================================================

type Num = number | string | null | undefined;

interface Station {
    stants_dugaar: number | string;
    ner: string;
    ner_en?: string | null;
    aimag?: string | null;
    urgurug?: Num;
    urtrag?: Num;
    undur?: Num;
}

interface Weather {
    id?: Num;
    stants_dugaar?: Num;
    temperatur_c?: Num;
    medregdeh_c?: Num;
    chigleg_huvi?: Num;
    daralt_hpa?: Num;
    salhiny_hurd_ms?: Num;
    salhiny_chiglel?: string | null;
    salhiny_delbee_ms?: Num;
    haragts_km?: Num;
    uulshil_huvi?: Num;
    tsag_agaar_nohtsol?: string | null;
    hur_tunadas_mm?: Num;
    uv_index?: Num;
    shuurdyn_tseg_c?: Num;
    ajiglasan_ognoo?: string | null;
    hemjsen_ognoo?: string | null;
    tsag?: string | null;
    ognoo?: string | null;
    hadgalsan_ognoo?: string | null;
}

interface Forecast {
    stants_dugaar?: Num;
    ognoo?: string | null;
    garig?: string | null;
    temperatur_min_c?: Num;
    temperatur_max_c?: Num;
    nohtsol?: string | null;
    tsag_agaar_nohtsol?: string | null;
    hur_tunadas_magadlalt_huvi?: Num;
    hur_tunadas_mm?: Num;
    salhiny_hurd_ms?: Num;
    chigleg_huvi?: Num;
    uv_max?: Num;
    nar_mandah?: string | null;
    nar_jargah?: string | null;
    eh_urvalj?: string | null;
    hadgalsan_ognoo?: string | null;
}

interface AirQuality {
    stants_dugaar?: Num;
    aqi?: Num;
    angilal?: string | null;
    angilal_mn?: string | null;
    pm25?: Num;
    pm10?: Num;
    no2?: Num;
    so2?: Num;
    co?: Num;
    o3?: Num;
    eruul_mend_zuvlumj?: string | null;
    shinechilsen_ognoo?: string | null;
}

interface AlertItem {
    id?: string | number;
    garchig?: string | null;
    tailbar?: string | null;
    hundrel?: string | null;
    turul?: string | null;
    idevhtei?: boolean | number | string;
}

interface StationNow {
    temp: number | null;
    cond: string | null;
}

// =====================================================
// API URLS
// =====================================================

const stationsUrl = () => `${API_BASE_URL}/weather_db/stantsuud`;

const stationUrl = (id: number | string) =>
    `${API_BASE_URL}/weather_db/stantsuud/${id}`;

const currentUrl = (id: number | string) =>
    `${API_BASE_URL}/weather_db/tsag_agaar/current?station=${id}`;

const hourlyUrl = (id: number | string) =>
    `${API_BASE_URL}/weather_db/tsag_agaar/hourly/${id}`;

const forecastUrl = (id: number | string) =>
    `${API_BASE_URL}/weather_db/uridchilsan_medee?stants_dugaar=${id}`;

const airUrl = (id: number | string) =>
    `${API_BASE_URL}/weather_db/agaar_chanar/${id}`;

const alertsUrl = () =>
    `${API_BASE_URL}/weather_db/tsag_agaar_sanuulga?active=true`;

// =====================================================
// HELPERS
// =====================================================

const pad = (n: number) => String(n).padStart(2, "0");

function toNumber(value: Num): number | null {
    if (value === null || value === undefined || value === "") return null;
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
}

function formatTemp(value: Num): string {
    const result = toNumber(value);
    return result === null ? "--°" : `${Math.round(result)}°`;
}

function formatNumber(value: Num, suffix = ""): string {
    const result = toNumber(value);
    return result === null ? "--" : `${result}${suffix}`;
}

function formatRound(value: Num, suffix = ""): string {
    const result = toNumber(value);
    return result === null ? "--" : `${Math.round(result)}${suffix}`;
}

/** Date -> "HH:mm" (Улаанбаатарын цагаар) */
function formatTime(date: Date | null): string {
    if (!date || Number.isNaN(date.getTime())) return "--:--";

    return date.toLocaleTimeString("mn-MN", {
        timeZone: TZ,
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

/** "6:05:00" -> "06:05" */
function formatClock(value: unknown): string {
    if (value === null || value === undefined || value === "") return "--:--";
    const raw = String(value).trim();
    const m = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    return m ? `${m[1].padStart(2, "0")}:${m[2]}` : raw;
}

function toMinutes(hhmm: string): number | null {
    const m = hhmm.match(/^(\d{2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function parseDate(value?: string | null): Date | null {
    if (!value) return null;

    const text = String(value).trim();

    // API-аас ирсэн ISO цаг:
    // 2026-10-19T16:00:00.000Z
    // Өгөгдөл нь Монголын орон нутгийн цаг бол Z-г UTC гэж хөрвүүлэхгүй.
    const isoMatch = text.match(
        /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?(?:\.\d+)?Z$/i
    );

    if (isoMatch) {
        const [, year, month, day, hour, minute, second] = isoMatch;

        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second ?? 0),
            0
        );
    }

    // MySQL datetime: 2026-10-19 16:00:00
    const sqlMatch = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})(?::(\d{2}))?/
    );

    if (sqlMatch && !/[zZ]$|[+-]\d{2}:\d{2}$/.test(text)) {
        const [, year, month, day, hour, minute, second] = sqlMatch;

        return new Date(
            Number(year),
            Number(month) - 1,
            Number(day),
            Number(hour),
            Number(minute),
            Number(second ?? 0),
            0
        );
    }

    // Бусад огнооны формат
    const date = new Date(text);

    return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value?: string | null): string {
    if (!value) return "Мэдээлэл байхгүй";

    const date = parseDate(value);
    if (!date) return value;

    return date.toLocaleString("mn-MN", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    });
}

function getDateOnly(value: unknown): string {
    if (!value) return "";
    const text = String(value).trim();
    return text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? text.substring(0, 10);
}

function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function getToday(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

/** Монголын одоогийн цагийг local Date болгож буцаана */
function getMongoliaNow(): Date {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(new Date());

    const get = (type: string) =>
        Number(parts.find((p) => p.type === type)?.value ?? 0);

    return new Date(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour") % 24,
        get("minute"),
        get("second"),
        0
    );
}

function getMongoliaHourKey(date: Date): string {
    const parts = new Intl.DateTimeFormat("sv-SE", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        hourCycle: "h23",
    }).formatToParts(date);

    const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? "";

    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}`;
}

function weekdayOf(date: string, fallback?: string | null): string {
    const [y, m, d] = date.split("-").map(Number);
    if (!y || !m || !d) return fallback ?? "--";
    return WEEKDAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "--";
}

function shortDate(date: string): string {
    const p = date.split("-");
    return p.length === 3 ? `${p[1]}-${p[2]}` : date || "--";
}

function dayLabel(date: Date): string {
    const today = getMongoliaNow();
    const key = toDateKey(date);

    if (key === toDateKey(today)) return "Өнөөдөр";

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (key === toDateKey(tomorrow)) return "Маргааш";

    return shortDate(key);
}

/**
 * Цагийн мэдээний огноо.
 * tsag нь "2026-10-08 13:00:00" эсвэл зөвхөн "13:00:00" байж болно.
 */
// =====================================================
// ЦАГААРЫН ОГНОО ТОДОРХОЙЛОХ
// =====================================================

function getHourlyDate(item: Weather): Date | null {
    const tsag = item.tsag ? String(item.tsag).trim() : "";

    // tsag талбарт бүтэн огноо байвал шууд ашиглана.
    const fullDate = parseDate(tsag);

    if (fullDate) {
        return fullDate;
    }

    // Огнооны боломжит талбаруудаас эх огноог олно.
    const baseDate =
        parseDate(item.ajiglasan_ognoo) ??
        parseDate(item.hadgalsan_ognoo) ??
        parseDate(item.hemjsen_ognoo) ??
        parseDate(item.ognoo);

    if (!baseDate) {
        return null;
    }

    // HH:mm эсвэл HH:mm:ss хэлбэрийн цагийг шалгана.
    const match = tsag.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

    if (!match) {
        return baseDate;
    }

    const hour = Number(match[1]);
    const minute = Number(match[2]);
    const second = Number(match[3] ?? 0);

    // Цагийн утгуудыг шалгана.
    if (
        hour < 0 ||
        hour > 23 ||
        minute < 0 ||
        minute > 59 ||
        second < 0 ||
        second > 59
    ) {
        return baseDate;
    }

    // Эх огноог өөрчлөхгүй, хуулбар дээр нь цаг тохируулна.
    const result = new Date(baseDate);
    result.setHours(hour, minute, second, 0);

    return result;
}


// =====================================================
// ӨДӨР / ШӨНИЙГ ТОДОРХОЙЛОХ
// =====================================================

function isNightAt(date: Date, days: Forecast[]): boolean {
    const key = toDateKey(date);

    const forecast = days.find(
        (item) => getDateOnly(item.ognoo) === key
    );

    const sunrise = toMinutes(formatClock(forecast?.nar_mandah));
    const sunset = toMinutes(formatClock(forecast?.nar_jargah));

    // Нар мандах, жаргах цагийн мэдээлэл байгаа үед ашиглана.
    if (sunrise !== null && sunset !== null) {
        const currentMinutes =
            date.getHours() * 60 + date.getMinutes();

        return currentMinutes < sunrise || currentMinutes >= sunset;
    }

    // Нарны цагийн мэдээлэл байхгүй үед ойролцоогоор тооцно.
    const hour = date.getHours();

    return hour < 6 || hour >= 18;
}


// =====================================================
// ЦАГ АГААРЫН ТЭМДЭГЛЭЛ
// =====================================================

function getWeatherIcon(
    value?: string | null,
    night = false
): string {
    const condition = (value ?? "").toLocaleLowerCase("mn-MN");

    if (condition.includes("цасан аадар")) return "🌨️";
    if (condition.includes("аянг")) return "⛈️";
    if (condition.includes("аадар")) return "⛈️";

    if (
        condition.includes("бороо") ||
        condition.includes("шиврээ") ||
        condition.includes("хур")
    ) {
        return "🌧️";
    }

    if (condition.includes("цас")) return "❄️";
    if (condition.includes("манан")) return "🌫️";
    if (condition.includes("салхи")) return "💨";

    if (condition.includes("бүрхэг")) return "☁️";

    if (
        condition.includes("үүл") &&
        condition.includes("бага")
    ) {
        return night ? "☁️" : "🌤️";
    }

    if (condition.includes("үүл")) return "☁️";

    if (
        condition.includes("цэлмэг") ||
        condition.includes("нартай") ||
        condition.includes("тогтуун")
    ) {
        return night ? "🌙" : "☀️";
    }

    return night ? "🌙" : "⛅";
}


// =====================================================
// ЦАГ АГААРЫН НӨХЦӨЛ АВАХ

// =====================================================

function getCondition(
    item: Weather | Forecast | null | undefined
): string {
    if (!item) return "";

    if ("tsag_agaar_nohtsol" in item && item.tsag_agaar_nohtsol) {
        return String(item.tsag_agaar_nohtsol);
    }

    if ("nohtsol" in item && item.nohtsol) {
        return String(item.nohtsol);
    }

    return "";
}


// =====================================================
// УРЬДЧИЛСАН МЭДЭЭНИЙ МЭДЭЭЛЛИЙН БҮРЭН БАЙДАЛ
// =====================================================

function getForecastScore(forecast: Forecast): number {
    const values = [
        forecast.temperatur_min_c,
        forecast.temperatur_max_c,
        forecast.nohtsol,
        forecast.hur_tunadas_magadlalt_huvi,
        forecast.hur_tunadas_mm,
        forecast.salhiny_hurd_ms,
        forecast.nar_mandah,
        forecast.nar_jargah,
    ];

    return values.filter(
        (value) =>
            value !== null &&
            value !== undefined &&
            value !== ""
    ).length;
}


// =====================================================
// АГААРЫН ЧАНАРЫН АНГИЛАЛ
// =====================================================

function getAirCategory(air: AirQuality | null): string {
    if (!air) {
        return "Мэдээлэл байхгүй";
    }

    return air.angilal_mn || air.angilal || "Ангилал тодорхойгүй";
}


// =====================================================
// API-ИЙН ХАРИУЛТААС МАССИВ АВАХ
// =====================================================

function getJsonArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }

    if (!value || typeof value !== "object") {
        return [];
    }

    const object = value as Record<string, unknown>;

    const possibleKeys = [
        "data",
        "items",
        "result",
        "results",
        "stations",
        "forecast",
        "hourly",
        "rows",
    ];

    for (const key of possibleKeys) {
        const candidate = object[key];

        if (Array.isArray(candidate)) {
            return candidate as T[];
        }
    }

    return [];
}


// =====================================================
// API-ИЙН data ТАЛБАРЫГ ЗАДЛАХ
// =====================================================

function unwrapData<T>(value: unknown): T | null {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
        return value as T;
    }

    const object = value as Record<string, unknown>;

    if (object.data !== undefined) {
        return object.data as T;
    }

    return value as T;
}


// =====================================================
// JSON API ДУУДАХ
// =====================================================

async function getJson(
    url: string,
    signal?: AbortSignal
): Promise<unknown> {
    const response = await fetch(url, {
        cache: "no-store",
        signal,
        headers: {
            Accept: "application/json",
        },
    });

    if (!response.ok) {
        throw new Error(`API алдаа: ${response.status} — ${url}`);
    }

    return response.json();
}


// =====================================================
// СТАНЦЫН МЭДЭЭЛЛИЙГ НЭГ ХЭЛБЭРТ ОРУУЛАХ
// =====================================================

function normalizeStation(value: unknown): Station | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const item = value as Record<string, unknown>;

    const id =
        item.stants_dugaar ??
        item.stantsDugaar ??
        item.id ??
        item.station_id;

    const name =
        item.ner ??
        item.name ??
        item.station_name;

    if (
        id === null ||
        id === undefined ||
        name === null ||
        name === undefined ||
        String(name).trim() === ""
    ) {
        return null;
    }

    return {
        stants_dugaar: String(id),
        ner: String(name),
        ner_en:
            item.ner_en != null
                ? String(item.ner_en)
                : null,
        aimag:
            item.aimag != null
                ? String(item.aimag)
                : null,
        urgurug: (
            item.urgurug ??
            item.latitude ??
            item.lat
        ) as Num,
        urtrag: (
            item.urtrag ??
            item.longitude ??
            item.lng ??
            item.lon
        ) as Num,
        undur: (
            item.undur ??
            item.elevation
        ) as Num,
    };
}


// =====================================================
// МАССИВЫН ЭХНИЙ ЭЛЕМЕНТ АВАХ
// =====================================================

function firstOf<T>(result: unknown): T | null {
    if (Array.isArray(result)) {
        return (result[0] as T | undefined) ?? null;
    }

    return (result as T | null) ?? null;
}

// =====================================================
// SMALL UI PARTS
// =====================================================

function SectionTitle({
    eyebrow,
    title,
    right,
}: {
    eyebrow?: string;
    title: string;
    right?: ReactNode;
}) {
    return (
        <div className="np-section-title">
            <div>
                {eyebrow && <p className="np-eyebrow">{eyebrow}</p>}
                <h2>{title}</h2>
            </div>
            {right}
        </div>
    );
}

function DetailTile({
    icon,
    label,
    value,
    note,
    extra,
}: {
    icon: string;
    label: string;
    value: ReactNode;
    note?: string;
    extra?: ReactNode;
}) {
    return (
        <div className="np-tile">
            <div className="np-tile-label">
                <span className="np-tile-icon">{icon}</span>
                {label}
            </div>
            <div className="np-tile-value">{value}</div>
            {note && <p className="np-tile-note">{note}</p>}
            {extra && <p className="np-tile-extra">{extra}</p>}
        </div>
    );
}

// ---------- 7 хоногийн температурын график ----------

function TemperatureChart({ days }: { days: Forecast[] }) {
    const n = days.length;
    const maxes = days.map((d) => toNumber(d.temperatur_max_c));
    const mins = days.map((d) => toNumber(d.temperatur_min_c));
    const all = [...maxes, ...mins].filter((v): v is number => v !== null);

    if (n === 0 || all.length === 0) return null;

    const W = 700;
    const H = 190;
    const top = 30;
    const bottom = 150;

    const lo = Math.floor(Math.min(...all) - 2);
    const hi = Math.ceil(Math.max(...all) + 2);
    const range = Math.max(hi - lo, 1);

    const x = (i: number) => ((i + 0.5) * W) / n;
    const y = (v: number) => bottom - ((v - lo) / range) * (bottom - top);

    const line = (values: (number | null)[]) =>
        values
            .map((v, i) => (v === null ? null : `${x(i)},${y(v)}`))
            .filter(Boolean)
            .join(" ");

    const renderPoints = (
        values: (number | null)[],
        kind: "max" | "min"
    ) =>
        values.map((v, i) =>
            v === null ? null : (
                <g key={`${kind}-${i}`}>
                    <circle
                        cx={x(i)}
                        cy={y(v)}
                        r="5"
                        className={
                            kind === "max"
                                ? "np-svg-dot-max"
                                : "np-svg-dot-min"
                        }
                        strokeWidth="2"
                    />
                    <text
                        x={x(i)}
                        y={kind === "max" ? y(v) - 12 : y(v) + 22}
                        textAnchor="middle"
                        className={`np-svg-label ${
                            kind === "max" ? "np-svg-label-max" : "np-svg-label-min"
                        }`}
                    >
                        {Math.round(v)}°
                    </text>
                </g>
            )
        );

    return (
        <svg
            viewBox={`0 0 ${W} ${H}`}
            className="np-svg-chart"
            role="img"
            aria-label="7 хоногийн температурын график"
        >
            {lo < 0 && hi > 0 && (
                <g>
                    <line
                        x1="0"
                        x2={W}
                        y1={y(0)}
                        y2={y(0)}
                        className="np-svg-zero-line"
                        strokeDasharray="4 4"
                    />
                    <text
                        x="2"
                        y={y(0) - 4}
                        className="np-svg-zero-label"
                    >
                        0°
                    </text>
                </g>
            )}

            {Array.from({ length: n }).map((_, i) => (
                <line
                    key={`g-${i}`}
                    x1={x(i)}
                    x2={x(i)}
                    y1={top - 8}
                    y2={bottom + 8}
                    className="np-svg-grid-line"
                />
            ))}

            <polyline
                points={line(maxes)}
                className="np-svg-line-max"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
            />
            <polyline
                points={line(mins)}
                className="np-svg-line-min"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
            />

            {renderPoints(maxes, "max")}
            {renderPoints(mins, "min")}
        </svg>
    );
}

// ---------- Борооны / цасны магадлал ----------

function PrecipitationChart({
    days,
    today,
}: {
    days: Forecast[];
    today: string;
}) {
    return (
        <div className="space-y-3">
            {days.map((d, i) => {
                const date = getDateOnly(d.ognoo);
                const prob = toNumber(d.hur_tunadas_magadlalt_huvi);
                const mm = toNumber(d.hur_tunadas_mm);
                const isSnow = getCondition(d)
                    .toLocaleLowerCase("mn-MN")
                    .includes("цас");
                const pct = prob === null ? 0 : Math.min(Math.max(prob, 0), 100);

                return (
                    <div key={`${date}-${i}`}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                            <span className="text-slate-700 dark:text-slate-300">
                                {date === today ? "Өнөөдөр" : weekdayOf(date)}{" "}
                                <span className="text-slate-500">
                                    {shortDate(date)}
                                </span>
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white">
                                {isSnow ? "❄️" : "🌧️"}{" "}
                                {prob === null ? "--" : `${Math.round(prob)}%`}
                                {mm !== null && mm > 0 && (
                                    <span className="ml-1 font-normal text-slate-600 dark:text-slate-400">
                                        · {mm.toFixed(1)} мм
                                    </span>
                                )}
                            </span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-50 dark:bg-[#0d1736]">
                            <div
                                className={`h-full rounded-full transition-all ${
                                    isSnow ? "bg-sky-400 dark:bg-sky-200" : "bg-blue-500"
                                }`}
                                style={{ width: `${pct}%` }}
                            />
                        </div>
                    </div>
                );
            })}

            <div className="flex gap-4 pt-1 text-xs text-slate-600 dark:text-slate-400">
                <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                    Бороо
                </span>
                <span className="flex items-center gap-1.5">
                    <i className="h-2.5 w-2.5 rounded-full bg-sky-400 dark:bg-sky-200" />
                    Цас
                </span>
            </div>
        </div>
    );
}

// ---------- Агаарын чанарын индекс ----------

const AQI_BANDS = [
    { max: 50, label: "Сайн", color: "bg-green-500" },
    { max: 100, label: "Дундаж", color: "bg-yellow-400" },
    { max: 150, label: "Мэдрэмтгий хүнд муу", color: "bg-orange-500" },
    { max: 200, label: "Муу", color: "bg-red-500" },
    { max: 300, label: "Маш муу", color: "bg-purple-500" },
    { max: 500, label: "Аюултай", color: "bg-rose-900" },
];

function AqiScale({ aqi }: { aqi: number | null }) {
    const pos = aqi === null ? 0 : (Math.min(Math.max(aqi, 0), 500) / 500) * 100;

    return (
        <div className="mt-4">
            <div className="relative pt-6">
                {aqi !== null && (
                    <div
                        className="absolute top-0 -translate-x-1/2 text-center"
                        style={{ left: `${pos}%` }}
                    >
                        <div className="rounded bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white dark:bg-white dark:text-[#0d1530]">
                            {Math.round(aqi)}
                        </div>
                        <div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-white" />
                    </div>
                )}

                <div className="flex h-3 overflow-hidden rounded-full">
                    {AQI_BANDS.map((band, i) => {
                        const prev = i === 0 ? 0 : AQI_BANDS[i - 1].max;
                        return (
                            <div
                                key={band.max}
                                className={band.color}
                                style={{ width: `${((band.max - prev) / 500) * 100}%` }}
                                title={`${band.label} (${prev}–${band.max})`}
                            />
                        );
                    })}
                </div>

                <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                    <span>150</span>
                    <span>200</span>
                    <span>300</span>
                    <span>500</span>
                </div>
            </div>
        </div>
    );
}

// ---------- UV индекс ----------

const UV_BANDS = [
    { to: 3, color: "bg-green-500" },
    { to: 6, color: "bg-yellow-400" },
    { to: 8, color: "bg-orange-500" },
    { to: 11, color: "bg-red-500" },
    { to: 14, color: "bg-purple-500" },
];

function getUvLevel(uv: number | null): { label: string; advice: string } {
    if (uv === null) return { label: "Мэдээлэлгүй", advice: "" };
    if (uv < 3) return { label: "Бага", advice: "Тусгай хамгаалалт шаардлагагүй." };
    if (uv < 6) {
        return { label: "Дунд", advice: "Нарны шил зүүж, үд дундын нарнаас сэрэмжлээрэй." };
    }
    if (uv < 8) {
        return { label: "Өндөр", advice: "Нарны тос түрхэж, малгай өмсөөрэй." };
    }
    if (uv < 11) {
        return { label: "Маш өндөр", advice: "11–16 цагийн хооронд нарны гэрлээс зайлсхийгээрэй." };
    }
    return { label: "Хэт өндөр", advice: "Гадаа удаан байхаас зайлсхийгээрэй." };
}

function UvScale({ uv }: { uv: number | null }) {
    const pos = uv === null ? 0 : (Math.min(Math.max(uv, 0), 14) / 14) * 100;

    return (
        <div className="relative mt-4 pt-6">
            {uv !== null && (
                <div
                    className="absolute top-0 -translate-x-1/2 text-center"
                    style={{ left: `${pos}%` }}
                >
                    <div className="rounded bg-slate-900 px-1.5 py-0.5 text-xs font-bold text-slate-900 dark:text-white dark:bg-white dark:text-[#0d1530]">
                        {Math.round(uv * 10) / 10}
                    </div>
                    <div className="mx-auto h-0 w-0 border-x-4 border-t-4 border-x-transparent border-t-slate-900 dark:border-t-white" />
                </div>
            )}

            <div className="flex h-3 overflow-hidden rounded-full">
                {UV_BANDS.map((band, i) => {
                    const prev = i === 0 ? 0 : UV_BANDS[i - 1].to;
                    return (
                        <div
                            key={band.to}
                            className={band.color}
                            style={{ width: `${((band.to - prev) / 14) * 100}%` }}
                        />
                    );
                })}
            </div>

            <div className="mt-1 flex justify-between text-[10px] text-slate-500">
                <span>0</span>
                <span>3</span>
                <span>6</span>
                <span>8</span>
                <span>11+</span>
            </div>
        </div>
    );
}

// =====================================================
// PAGE
// =====================================================

export default function Nuurhuudas() {
    const [stations, setStations] = useState<Station[]>([]);
    const [stationId, setStationId] = useState<number>(DEFAULT_STATION_ID);
    const [station, setStation] = useState<Station | null>(null);

    const [current, setCurrent] = useState<Weather | null>(null);
    const [hourly, setHourly] = useState<Weather[]>([]);
    const [forecast, setForecast] = useState<Forecast[]>([]);
    const [airQuality, setAirQuality] = useState<AirQuality | null>(null);
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    const [stripWeather, setStripWeather] = useState<
        Record<number, StationNow>
    >({});

    const [activeTab, setActiveTab] = useState<string>("Одоогийн цаг агаар");
    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);

    const [now, setNow] = useState<Date | null>(null);
    const [loading, setLoading] = useState(true);
    const [stationError, setStationError] = useState("");
    const [weatherError, setWeatherError] = useState("");

    const stripRef = useRef<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const [selectedStationId, setSelectedStationId] = useState<number>(549);
    
    // =====================================================
// RECHARTS — 7 ХОНОГИЙН ГРАФИКИЙН ӨГӨГДӨЛ
// =====================================================

const chartData = useMemo(
    () =>
        forecast.map((item) => ({
            day: item.garig ?? item.ognoo ?? "",
            precipitation: Number(item.hur_tunadas_mm ?? 0),
            windSpeed: Number(item.salhiny_hurd_ms ?? 0),
        })),
    [forecast]
);

    // -------------------------------------------------
    // Clock
    // -------------------------------------------------

    useEffect(() => {
        setNow(new Date());
        const timer = window.setInterval(() => setNow(new Date()), 30_000);
        return () => window.clearInterval(timer);
    }, []);

    // -------------------------------------------------
    // Close station dropdown on outside click
    // -------------------------------------------------

    useEffect(() => {
        function handleOutsideClick(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutsideClick);
        return () =>
            document.removeEventListener("mousedown", handleOutsideClick);
    }, []);


    // -------------------------------------------------
    // Load stations
    // -------------------------------------------------

    useEffect(() => {
        const controller = new AbortController();

        async function loadStations() {
            try {
                const json = await getJson(stationsUrl(), controller.signal);
                const rows = getJsonArray<unknown>(json)
                    .map(normalizeStation)
                    .filter((item): item is Station => item !== null);

                if (controller.signal.aborted) return;

                if (rows.length > 0) {
                    setStations(rows);
                    setStationError("");

                    const defaultExists = rows.some(
                        (item) =>
                            Number(item.stants_dugaar) === DEFAULT_STATION_ID
                    );

                    if (!defaultExists) {
                        setStationId(Number(rows[0].stants_dugaar));
                    }
                } else {
                    setStations([
                        {
                            stants_dugaar: DEFAULT_STATION_ID,
                            ner: "Улаанбаатар",
                            aimag: "Улаанбаатар",
                        },
                    ]);

                    setStationError(
                        "Станцын жагсаалт хоосон байна. Backend-ийн станцын API-г шалгана уу."
                    );
                }
            } catch (error) {
                if (controller.signal.aborted) return;

                console.error("Станцын жагсаалт татах алдаа:", error);

                setStations([
                    {
                        stants_dugaar: DEFAULT_STATION_ID,
                        ner: "Улаанбаатар",
                        aimag: "Улаанбаатар",
                    },
                ]);

                setStationError(
                    "Станцын жагсаалтыг API-аас авч чадсангүй. Улаанбаатарын үндсэн сонголтыг ашиглаж байна."
                );
            }
        }

        void loadStations();

        return () => controller.abort();
    }, []);

    // -------------------------------------------------
    // Load selected station and weather data
    // -------------------------------------------------

    useEffect(() => {
        const controller = new AbortController();
        let cancelled = false;

        async function loadSelectedStation() {
            setLoading(true);
            setWeatherError("");

            setCurrent(null);
            setHourly([]);
            setForecast([]);
            setAirQuality(null);

            const requests = await Promise.allSettled([
                getJson(stationUrl(stationId), controller.signal),
                getJson(currentUrl(stationId), controller.signal),
                getJson(hourlyUrl(stationId), controller.signal),
                getJson(forecastUrl(stationId), controller.signal),
                getJson(airUrl(stationId), controller.signal),
            ]);

            if (cancelled || controller.signal.aborted) return;

            const fallbackStation =
                stations.find(
                    (item) => Number(item.stants_dugaar) === stationId
                ) ?? null;

            const stationResult = requests[0];

            if (stationResult.status === "fulfilled") {
                const normalized = normalizeStation(
                    firstOf<unknown>(unwrapData<unknown>(stationResult.value))
                );
                setStation(normalized ?? fallbackStation);
            } else {
                setStation(fallbackStation);
            }

            const currentResult = requests[1];

            if (currentResult.status === "fulfilled") {
                setCurrent(
                    firstOf<Weather>(unwrapData<unknown>(currentResult.value))
                );
            } else {
                setCurrent(null);
                setWeatherError(
                    "Одоогийн цаг агаарын мэдээлэл татаж чадсангүй. Backend болон API хаягийг шалгана уу."
                );
            }

            const hourlyResult = requests[2];
            setHourly(
                hourlyResult.status === "fulfilled"
                    ? getJsonArray<Weather>(hourlyResult.value)
                    : []
            );

const forecastResult = requests[3];

if (forecastResult.status === "fulfilled") {
    const response = forecastResult.value;

    const forecastData = getJsonArray<Forecast>(response);

    setForecast(forecastData);
} else {
    console.error(
        "7 хоногийн мэдээ татахад алдаа гарлаа:",
        forecastResult.reason
    );

    setForecast([]);
}
            const airResult = requests[4];
            setAirQuality(
                airResult.status === "fulfilled"
                    ? firstOf<AirQuality>(unwrapData<unknown>(airResult.value))
                    : null
            );

            setLoading(false);
        }

        void loadSelectedStation();

        return () => {
            cancelled = true;
            controller.abort();
        };
    }, [stationId, stations]);

    // -------------------------------------------------
    // Load warning / alert information
    // -------------------------------------------------

   
    // -------------------------------------------------
    // Load temperatures for station strip
    // -------------------------------------------------

    useEffect(() => {
        if (stations.length === 0) return;

        const controller = new AbortController();

        async function loadStripWeather() {
            const results = await Promise.all(
                stations.map(async (item) => {
                    const id = Number(item.stants_dugaar);

                    try {
                        const json = await getJson(
                            currentUrl(id),
                            controller.signal
                        );

                        const weather = firstOf<Weather>(
                            unwrapData<unknown>(json)
                        );

                        return [
                            id,
                            {
                                temp: toNumber(weather?.temperatur_c),
                                cond: weather?.tsag_agaar_nohtsol ?? null,
                            },
                        ] as const;
                    } catch {
                        return [id, { temp: null, cond: null }] as const;
                    }
                })
            );

            if (!controller.signal.aborted) {
                setStripWeather(Object.fromEntries(results));
            }
        }

        void loadStripWeather();

        return () => controller.abort();
    }, [stations]);

    // -------------------------------------------------
    // Station search
    // -------------------------------------------------

    const filteredStations = useMemo(() => {
        const query = search.trim().toLocaleLowerCase("mn-MN");

        if (!query) return stations;

        return stations.filter((item) =>
            [item.ner, item.ner_en, item.aimag, String(item.stants_dugaar)]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLocaleLowerCase("mn-MN").includes(query)
                )
        );
    }, [stations, search]);

    // -------------------------------------------------
    // Forecast: өдөр бүрт нэг мэдээ, өнөөдрөөс хойш 7 хоног
    // -------------------------------------------------

const today = getToday();

console.log("Өнөөдрийн огноо:", today);
console.log("API-аас ирсэн forecast:", forecast);

const dailyForecast = useMemo(() => {
    const todayDate = getToday();
    const map = new Map<string, Forecast>();

    for (const item of forecast) {
        if (!item.ognoo) continue;

        const date = getDateOnly(item.ognoo);

        // Огнооны форматыг шалгана
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;

        // Өнөөдрөөс өмнөх мэдээг хасна
        if (date < todayDate) continue;

        const normalizedItem: Forecast = {
            ...item,
            ognoo: date,
        };

        const previous = map.get(date);

        // Нэг өдөр олон мөр байвал илүү бүрэн мэдээлэлтэйг авна
        if (
            !previous ||
            getForecastScore(normalizedItem) >
                getForecastScore(previous)
        ) {
            map.set(date, normalizedItem);
        }
    }

    // Огноогоор өсөх дарааллаар эрэмбэлнэ
    return Array.from(map.values())
        .sort((a, b) =>
            getDateOnly(a.ognoo).localeCompare(
                getDateOnly(b.ognoo)
            )
        )
        .slice(0, 7);
}, [forecast]);

const todayForecast =
    dailyForecast.find(
        (item) => getDateOnly(item.ognoo) === today
    ) ?? null;

    // -------------------------------------------------
    // Hourly: одоогийн цагаас эхлэн 24 цаг (цаг тутамд нэг)
    // -------------------------------------------------



const hourlyNext24 = useMemo(() => {
    const now = getMongoliaNow();
    const start = getHourBucket(now).getTime();
    const hourMs = 60 * 60 * 1000;

    const weatherByHour = new Map<number, Weather>();

    hourly.forEach((item) => {
        const date = getHourlyDate(item);

        if (!date || Number.isNaN(date.getTime())) {
            return;
        }

        const hour = getHourBucket(date).getTime();

        // Нэг цагийн олон мөр байвал хамгийн сүүлийн мөрийг хадгална.
        weatherByHour.set(hour, item);
    });

    return Array.from({ length: 24 }, (_, index) => {
        const timestamp = start + index * hourMs;

        return {
            time: new Date(timestamp),
            item: weatherByHour.get(timestamp) ?? null,
        };
    });
}, [hourly]);

// DEBUG: цагийн зөрүү шалгах
console.log("Монголын цаг:", getMongoliaNow().toString());

console.log(
    "Цагийн бүс:",
    Intl.DateTimeFormat().resolvedOptions().timeZone
);

console.log(
    "Hourly эхний 3 мөр:",
    hourly.slice(0, 3).map((item) => ({
        tsag: item.tsag,
        parsed: getHourlyDate(item)?.toString(),
        timestamp: getHourlyDate(item)?.getTime(),
    }))
);

console.log(
    "Next24 эхний 3 мөр:",
    hourlyNext24.slice(0, 3).map(({ time, item }) => ({
        time: time.toString(),
        timestamp: time.getTime(),
        hasData: Boolean(item),
    }))
);
function getHourBucket(date: Date): Date {
    const bucket = new Date(date);
    bucket.setMinutes(0, 0, 0);
    return bucket;
}

    // -------------------------------------------------
    // Derived current data
    // -------------------------------------------------

    const condition = current?.tsag_agaar_nohtsol ?? "";
    const nowNight = isNightAt(getMongoliaNow(), dailyForecast);

    const sunrise = formatClock(todayForecast?.nar_mandah);
    const sunset = formatClock(todayForecast?.nar_jargah);

    const aqi = toNumber(airQuality?.aqi);
    const uv = toNumber(current?.uv_index) ?? toNumber(todayForecast?.uv_max);
    const uvLevel = getUvLevel(uv);

const hourlyUv = hourlyNext24
    .flatMap(({ time, item }) => {
        if (!item) return [];

        const uv = toNumber(item.uv_index);

        if (uv === null) return [];

        return [{ time, uv }];
    });

    const activeAlerts = alerts.filter((item) => {
        const value = item.idevhtei;

        if (value === false || value === 0 || value === "0") return false;
        if (typeof value === "string" && value.toLowerCase() === "false") {
            return false;
        }

        return true;
    });

    const stationLabel =
        station?.ner ??
        stations.find((item) => Number(item.stants_dugaar) === stationId)
            ?.ner ??
        "Станц сонгох";

    // -------------------------------------------------
    // UI handlers
    // -------------------------------------------------

    const selectStation = useCallback((id: number | string) => {
        const parsed = Number(id);
        if (!Number.isFinite(parsed)) return;

        setStationId(parsed);
        setDropdownOpen(false);
        setSearch("");
    }, []);

    const scrollStrip = useCallback((direction: number) => {
        stripRef.current?.scrollBy({
            left: direction * 340,
            behavior: "smooth",
        });
    }, []);

    // =================================================
    // RENDER
    // =================================================

    return (
        <div className="np-page">
            <Header />
            <ThemeToggle className="fixed bottom-4 right-4 z-50" />

            <main className="np-main">
                {/* =====================================
                    1. БАЙРШИЛ ХАЙХ
                ===================================== */}

                <section className={`${CARD} np-card-raised`}>
                    <div className="np-search-row">
                        <div className="np-search-box" ref={dropdownRef}>
                            <p className="np-eyebrow np-eyebrow-mb">
                                Байршил сонгох
                            </p>

                            <div className="np-input-wrap">
                                <span className="np-input-icon">🔍</span>
                                <input
                                    value={search}
                                    onChange={(e) => {
                                        setSearch(e.target.value);
                                        setDropdownOpen(true);
                                    }}
                                    onFocus={() => setDropdownOpen(true)}
                                    placeholder={`${stationLabel}${
                                        station?.aimag
                                            ? `, ${station.aimag}`
                                            : ""
                                    }`}
                                    aria-label="Станц хайх"
                                    className="np-input"
                                />
                                {search && (
                                    <button
                                        type="button"
                                        onClick={() => setSearch("")}
                                        aria-label="Цэвэрлэх"
                                        className="np-input-clear"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>

                            {dropdownOpen && (
                                <div className="np-dropdown">
                                    <div className="np-dropdown-scroll">
                                        {filteredStations.length === 0 && (
                                            <p className="np-dropdown-empty">
                                                Станц олдсонгүй.
                                            </p>
                                        )}

                                        {filteredStations.map((item) => {
                                            const selected =
                                                Number(item.stants_dugaar) ===
                                                stationId;

                                            return (
                                                <button
                                                    type="button"
                                                    key={String(
                                                        item.stants_dugaar
                                                    )}
                                                    onClick={() =>
                                                        selectStation(
                                                            item.stants_dugaar
                                                        )
                                                    }
                                                    className={`np-dropdown-item ${
                                                        selected
                                                            ? "np-dropdown-item-selected"
                                                            : ""
                                                    }`}
                                                >
                                                    <span>📍 {item.ner}</span>
                                                    <span className="np-dropdown-area">
                                                        {item.aimag ?? ""}
                                                    </span>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="np-strip-wrap">
                            <button
                                type="button"
                                onClick={() => scrollStrip(-1)}
                                aria-label="Өмнөх станцууд"
                                className="np-strip-arrow"
                            >
                                ◀
                            </button>

                            <div ref={stripRef} className="np-strip">
                                {stations.map((item) => {
                                    const id = Number(item.stants_dugaar);
                                    const info = stripWeather[id];
                                    const selected = id === stationId;

                                    return (
                                        <button
                                            type="button"
                                            key={String(item.stants_dugaar)}
                                            onClick={() => selectStation(id)}
                                            aria-pressed={selected}
                                            className={`np-strip-item ${
                                                selected
                                                    ? "np-strip-item-selected"
                                                    : ""
                                            }`}
                                        >
                                            <span className="np-strip-name">
                                                {item.ner}
                                            </span>
                                            <span className="np-strip-icon">
                                                {getWeatherIcon(info?.cond)}
                                            </span>
                                            <strong className="np-strip-temp">
                                                {info?.temp === null ||
                                                info?.temp === undefined
                                                    ? "--°"
                                                    : `${Math.round(info.temp)}°`}
                                            </strong>
                                        </button>
                                    );
                                })}
                            </div>

                            <button
                                type="button"
                                onClick={() => scrollStrip(1)}
                                aria-label="Дараагийн станцууд"
                                className="np-strip-arrow"
                            >
                                ▶
                            </button>
                        </div>
                    </div>

                    {stationError && (
                        <p className="np-error-amber">{stationError}</p>
                    )}
                </section>

                {/* Идэвхтэй анхааруулга */}

                {activeAlerts.length > 0 && (
                    <Link href="/sermjluuleg" className="np-alert">
                        <span className="np-alert-icon">⚠️</span>
                        <span className="np-alert-text">
                            <strong>{activeAlerts.length} анхааруулга:</strong>{" "}
                            {activeAlerts
                                .slice(0, 2)
                                .map(
                                    (item) =>
                                        item.garchig ||
                                        item.turul ||
                                        "Цаг агаарын анхааруулга"
                                )
                                .join(" · ")}
                        </span>
                        <span className="np-alert-arrow">→</span>
                    </Link>
                )}

                {/* =====================================================
                    ОДООГИЙН ЦАГ АГААР + ГАЗРЫН ЗУРАГ
                ===================================================== */}

                <section className="np-hero-grid">

                    {/* ЗҮҮН ТАЛ — ОДООГИЙН ЦАГ АГААР */}
                    <div className={`${CARD} np-card-col np-col-5`}>
                        <div className="np-current-head">
                            <div className="np-current-head-text">
                                <p className="np-eyebrow">
                                    Одоогийн цаг агаар
                                </p>

                                <h1 className="np-station-title">
                                    {stationLabel}
                                </h1>

                                <p className="np-station-sub">
                                    {formatTime(now)}
                                    {station?.aimag ? ` · ${station.aimag}` : ""}
                                    {` · Станц ${stationId}`}
                                </p>
                            </div>

                            <Link
                                href="/sermjluuleg"
                                title="Цаг агаарын анхааруулга"
                                aria-label="Цаг агаарын анхааруулга"
                                className="np-info-link"
                            >
                                i
                            </Link>
                        </div>

                        {weatherError && (
                            <p className="np-error-red">{weatherError}</p>
                        )}

                        {loading && (
                            <p className="np-loading">
                                Цаг агаарын мэдээлэл ачаалж байна...
                            </p>
                        )}

                        {/* Үндсэн температур */}
                        <div className="np-temp-row">
                            <span className="np-temp-icon">
                                {getWeatherIcon(condition, nowNight)}
                            </span>

                            <div className="np-temp-block">
                                <div className="np-temp-value">
                                    {formatTemp(current?.temperatur_c)}
                                </div>

                                <p className="np-temp-cond">
                                    {condition ||
                                        getCondition(todayForecast) ||
                                        "Нөхцөл мэдээлэлгүй"}
                                </p>
                            </div>
                        </div>

                        {/* Өдрийн дээд, доод температур */}
                        <div className="np-minmax">
                            <span>
                                ↑ Дээд{" "}
                                <strong className="np-max">
                                    {formatTemp(todayForecast?.temperatur_max_c)}
                                </strong>
                            </span>

                            <span>
                                ↓ Доод{" "}
                                <strong className="np-min">
                                    {formatTemp(todayForecast?.temperatur_min_c)}
                                </strong>
                            </span>
                        </div>

                        {/* ОДООГИЙН ЦАГ АГААРЫН НЭМЭЛТ МЭДЭЭЛЭЛ */}
                        <div className="np-mini-grid">
                            <div className="np-mini">
                                <p className="np-mini-label">🌡️ Мэдрэгдэх</p>
                                <p className="np-mini-value">
                                    {formatTemp(current?.medregdeh_c)}
                                </p>
                            </div>

                            <div className="np-mini">
                                <p className="np-mini-label">💨 Салхи</p>
                                <p className="np-mini-value">
                                    {formatRound(current?.salhiny_hurd_ms)} м/с
                                </p>
                                <p className="np-mini-note">
                                    Чиглэл: {current?.salhiny_chiglel || "--"}
                                </p>
                            </div>

                            <div className="np-mini">
                                <p className="np-mini-label">🌅 Нар мандах</p>
                                <p className="np-mini-value">
                                    {sunrise || "--"}
                                </p>
                            </div>

                            <div className="np-mini">
                                <p className="np-mini-label">🌇 Нар жаргах</p>
                                <p className="np-mini-value">
                                    {sunset || "--"}
                                </p>
                            </div>
                        </div>

                        <p className="np-updated">
                            Сүүлийн шинэчлэлт:{" "}
                            {formatDate(
                                current?.ajiglasan_ognoo ??
                                    current?.hemjsen_ognoo ??
                                    current?.hadgalsan_ognoo
                            )}
                        </p>
                    </div>

                    {/* БАРУУН ТАЛ — ГАЗРЫН ЗУРАГ */}
                    <div className={`${CARD} np-card-col np-col-7`}>
                        <SectionTitle
                            eyebrow="Газрын зураг"
                            title={activeTab}
                        />

                        <div className="np-map-box">
                            <div className="np-map-inner">
                                <MongoliaMap activeLayer={activeTab} />
                            </div>
                        </div>
                    </div>
                </section>


                {/* =====================================================
                    БУСАД ДЭЛГЭРЭНГҮЙ МЭДЭЭЛЭЛ
                ===================================================== */}

                <section className={`${CARD} np-details-card`}>
                    <SectionTitle
                        eyebrow="Нэмэлт үзүүлэлтүүд"
                        title="Дэлгэрэнгүй мэдээлэл"
                    />

                    <div className="np-details-grid">
                        <DetailTile
                            icon="💧"
                            label="Чийгшил"
                            value={formatRound(current?.chigleg_huvi, "%")}
                            note="Харьцангуй чийгшил"
                        />

                        <DetailTile
                            icon="🎚️"
                            label="Даралт"
                            value={`${formatRound(current?.daralt_hpa)} гПа`}
                            note="Агаарын даралт"
                        />

                        <DetailTile
                            icon="🌧️"
                            label="Хур тунадас"
                            value={formatRound(
                                todayForecast?.hur_tunadas_magadlalt_huvi,
                                "%"
                            )}
                            note="Магадлал"
                            extra={`Хэмжээ: ${(
                                toNumber(todayForecast?.hur_tunadas_mm) ?? 0
                            ).toFixed(1)} мм`}
                        />

                        <DetailTile
                            icon="👁️"
                            label="Харагдац"
                            value={`${formatRound(current?.haragts_km)} км`}
                            note="Харагдах орчны зай"
                        />
                    </div>
                </section>

                {/* =====================================
                    3. ОЙРЫН 24 ЦАГИЙН ЦАГ АГААР
                ===================================== */}

                <section className={CARD}>
                    <SectionTitle
                        eyebrow="Ойрын 24 цаг"
                        title="Цаг тутмын цаг агаар"
                        right={
                            <span className="np-pill">
                                {hourlyNext24.length} цаг
                            </span>
                        }
                    />

                    {hourlyNext24.length === 0 ? (
                        <p className="np-empty">
                            {loading
                                ? "Цагийн мэдээлэл ачаалж байна..."
                                : "Цагийн мэдээлэл олдсонгүй."}
                        </p>
                    ) : (
                        <div className="np-hourly-row">
                            {hourlyNext24.map(({ time, item }, index) => {
                                const night = isNightAt(time, dailyForecast);
                                const condition = item?.tsag_agaar_nohtsol ?? "";

                                const previousTime =
                                    index > 0 ? hourlyNext24[index - 1].time : null;

                                const showDay =
                                    index === 0 ||
                                    (previousTime !== null &&
                                        (time.getDate() !== previousTime.getDate() ||
                                            time.getMonth() !== previousTime.getMonth() ||
                                            time.getFullYear() !== previousTime.getFullYear()));

                                return (
                                    <article
                                        key={time.getTime()}
                                        className={`np-hour ${
                                            index === 0 ? "np-hour-now" : ""
                                        }`}
                                    >
                                        <span className="np-hour-time">
                                            {index === 0
                                                ? "Одоо"
                                                : `${pad(time.getHours())}:00`}
                                        </span>

                                        <span className="np-hour-day">
                                            {showDay ? dayLabel(time) : ""}
                                        </span>

                                        <span className="np-hour-icon">
                                            {item
                                                ? getWeatherIcon(condition, night)
                                                : "—"}
                                        </span>

                                        <strong className="np-hour-temp">
                                            {item
                                                ? formatTemp(item.temperatur_c)
                                                : "—"}
                                        </strong>

                                        <span className="np-hour-hum">
                                            💧{" "}
                                            {item
                                                ? formatRound(item.chigleg_huvi, "%")
                                                : "—"}
                                        </span>

                                        <span className="np-hour-cond">
                                            {item
                                                ? condition || "Нөхцөл тодорхойгүй"
                                                : "Мэдээлэлгүй"}
                                        </span>
                                    </article>
                                );
                            })}
                        </div>
                    )}
                </section>

                {/* =====================================
                    4. 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ
                ===================================== */}

                <section className="np-section-grid">
                    <div className={`${CARD} np-card-min np-col-12`}>
                        <SectionTitle
                            eyebrow="Ирээдүйн мэдээ"
                            title="7 хоногийн урьдчилсан мэдээ"
                            right={
                                <div className="np-forecast-actions">
                                    

                                    <div className="np-legend">
                                        <span>
                                            <i className="np-legend-dot np-legend-orange" />
                                            Дээд
                                        </span>

                                        <span>
                                            <i className="np-legend-dot np-legend-sky" />
                                            Доод
                                        </span>
                                    </div>
                                </div>
                            }
                        />

                        {dailyForecast.length === 0 ? (
                            <p className="np-empty">
                                {loading
                                    ? "Урьдчилсан мэдээ ачаалж байна..."
                                    : "Урьдчилсан мэдээ олдсонгүй."}
                            </p>
                        ) : (
                            <div className="np-daily-scroll">
                                <div className="np-daily-inner">
                                    <div
                                        className="np-daily-grid"
                                        style={{
                                            gridTemplateColumns: `repeat(${dailyForecast.length}, minmax(0, 1fr))`,
                                        }}
                                    >
                                        {dailyForecast.map((item, index) => {
                                            const date = getDateOnly(item.ognoo);
                                            const text = getCondition(item);
                                            const isToday = date === today;

                                            return (
                                                <article
                                                    key={`${date}-${index}`}
                                                    className={`np-day ${
                                                        isToday ? "np-day-today" : ""
                                                    }`}
                                                >
                                                    <strong className="np-day-name">
                                                        {isToday
                                                            ? "Өнөөдөр"
                                                            : weekdayOf(date, item.garig)}
                                                    </strong>

                                                    <span className="np-day-date">
                                                        {shortDate(date)}
                                                    </span>

                                                    <span className="np-day-icon">
                                                        {getWeatherIcon(text)}
                                                    </span>

                                                    <span className="np-day-cond">
                                                        {text || "—"}
                                                    </span>

                                                    <span className="np-day-temps">
                                                        <span className="np-max">
                                                            {formatTemp(item.temperatur_max_c)}
                                                        </span>

                                                        <span className="np-slash">
                                                            {" / "}
                                                        </span>

                                                        <span className="np-min">
                                                            {formatTemp(item.temperatur_min_c)}
                                                        </span>
                                                    </span>
                                                </article>
                                            );
                                        })}
                                    </div>

                                    <TemperatureChart days={dailyForecast} />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

               
                {/* =====================================================
                    7 ХОНОГИЙН ЦАГ АГААРЫН ГРАФИКУУД
                ===================================================== */}

                <section className="np-charts-grid">

                    {/* ХУР ТУНАДАС */}
                    <div className="np-chart-card">

                        <div className="np-chart-head">
                            <div className="np-chart-head-left">
                                <div className="np-chart-icon">🌧️</div>
                                <div>
                                    <h2 className="np-chart-title">
                                        Хур тунадас
                                    </h2>
                                    <p className="np-chart-sub">
                                        Ирэх 7 хоногийн төлөв
                                    </p>
                                </div>
                            </div>

                            <span className="np-unit">мм</span>
                        </div>

                        <div className="np-chart-note">
                            <div className="np-chart-note-row">
                                <span className="np-chart-note-dot" />
                                <span className="np-chart-note-label">
                                    Өдрийн хур тунадасны хэмжээ
                                </span>
                            </div>
                            <p className="np-chart-note-text">
                                Багана өндөр байх тусам тухайн өдөр орох хур тунадас их байна.
                            </p>
                        </div>

                        <div className="np-chart-body">
                            {chartData.length === 0 ? (
                                <div className="np-chart-empty">
                                    Хур тунадасны мэдээлэл алга байна.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart
                                        data={chartData}
                                        margin={{ top: 12, right: 8, left: -18, bottom: 4 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="4 4"
                                            vertical={false}
                                            stroke="#94a3b8"
                                            strokeOpacity={0.22}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={12}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={42}
                                            domain={[0, "auto"]}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip
                                            cursor={{ fill: "#38a5d6", fillOpacity: 0.08 }}
                                            contentStyle={{
                                                borderRadius: 14,
                                                border: "1px solid #bae6fd",
                                                fontSize: 12,
                                                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                                            }}
                                            formatter={(value) => [
                                                `${Number(value ?? 0).toFixed(1)} мм`,
                                                "Хур тунадас",
                                            ]}
                                            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                                        />
                                        <Bar
                                            dataKey="precipitation"
                                            name="Хур тунадас"
                                            fill="#38A5D6"
                                            radius={[7, 7, 2, 2]}
                                            maxBarSize={42}
                                        />
                                    </BarChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="np-chart-foot">
                            <div className="np-chart-foot-row">
                                <span className="np-chart-foot-icon">💡</span>
                                <p className="np-chart-foot-text">
                                    Графикийн баганан дээр хулганаа байрлуулж тухайн өдрийн хэмжээг харна.
                                </p>
                            </div>
                        </div>
                    </div>


                    {/* САЛХИНЫ ХУРД */}
                    <div className="np-chart-card np-chart-card-orange">

                        <div className="np-chart-head">
                            <div className="np-chart-head-left">
                                <div className="np-chart-icon np-chart-icon-orange">💨</div>
                                <div>
                                    <h2 className="np-chart-title">
                                        Салхины хурд
                                    </h2>
                                    <p className="np-chart-sub">
                                        Ирэх 7 хоногийн төлөв
                                    </p>
                                </div>
                            </div>

                            <span className="np-unit np-unit-orange">м/с</span>
                        </div>

                        <div className="np-chart-note np-chart-note-orange">
                            <div className="np-chart-note-row">
                                <span className="np-chart-note-dot np-chart-note-dot-orange" />
                                <span className="np-chart-note-label">
                                    Өдрийн салхины хурд
                                </span>
                            </div>
                            <p className="np-chart-note-text">
                                Шугам дээшлэхэд салхины хурд нэмэгдэж, доошлоход буурна.
                            </p>
                        </div>

                        <div className="np-chart-body">
                            {chartData.length === 0 ? (
                                <div className="np-chart-empty">
                                    Салхины мэдээлэл алга байна.
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart
                                        data={chartData}
                                        margin={{ top: 12, right: 12, left: -18, bottom: 4 }}
                                    >
                                        <CartesianGrid
                                            strokeDasharray="4 4"
                                            vertical={false}
                                            stroke="#94a3b8"
                                            strokeOpacity={0.22}
                                        />
                                        <XAxis
                                            dataKey="day"
                                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                                            tickLine={false}
                                            axisLine={false}
                                            tickMargin={12}
                                        />
                                        <YAxis
                                            tick={{ fontSize: 11, fill: "#94a3b8" }}
                                            tickLine={false}
                                            axisLine={false}
                                            width={42}
                                            domain={[0, "auto"]}
                                            tickFormatter={(value) => `${value}`}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                borderRadius: 14,
                                                border: "1px solid #fed7aa",
                                                fontSize: 12,
                                                boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                                            }}
                                            formatter={(value) => [
                                                `${Number(value ?? 0).toFixed(1)} м/с`,
                                                "Салхины хурд",
                                            ]}
                                            labelStyle={{ fontWeight: 700, marginBottom: 4 }}
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="windSpeed"
                                            name="Салхины хурд"
                                            stroke="#EA8A24"
                                            strokeWidth={3}
                                            dot={{
                                                r: 4,
                                                fill: "#EA8A24",
                                                stroke: "#ffffff",
                                                strokeWidth: 2,
                                            }}
                                            activeDot={{
                                                r: 7,
                                                fill: "#EA8A24",
                                                stroke: "#ffffff",
                                                strokeWidth: 2,
                                            }}
                                            connectNulls={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>

                        <div className="np-chart-foot">
                            <div className="np-chart-foot-row">
                                <span className="np-chart-foot-icon">💡</span>
                                <p className="np-chart-foot-text">
                                    Цэг дээр хулганаа байрлуулж тухайн өдрийн салхины хурдыг харна.
                                </p>
                            </div>
                        </div>
                    </div>

                </section>


            </main>

            <Footer />
        </div>
    );
}