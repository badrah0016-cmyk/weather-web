"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type KeyboardEvent as ReactKeyboardEvent,
    type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useParams, useRouter } from "next/navigation";

import Header from "../../hesguud/Header";
import Footer from "../../hesguud/Footer";

import "./tsagagaar.css";

// Нүүр хуудсанд ашигладаг газрын зургийн component.
// MongoliaMap.tsx файлыг app/city/ хавтас руу хуулсан (эсвэл доорх замыг
// нүүр хуудасныхаа хавтас руу засна уу).
const MongoliaMap = dynamic(
  () => import("../../Nuurhuudas/MongoliaMap"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center text-sm text-slate-600 dark:text-slate-400">
        Газрын зураг ачаалж байна...
      </div>
    ),
  }
);
// =====================================================
// CONFIG
// =====================================================

const API_BASE_URL = "/backend";
const enc = encodeURIComponent;
const TZ = "Asia/Ulaanbaatar";

/**
 * Backend цагийн утгыг "…Z" (UTC) гэж буцааж байгаа ч үнэндээ
 * Улаанбаатарын local цаг (DB-д naive хадгалсан) бол true болгоно.
 * Цагийн мэдээ 8 цагаар зөрж харагдаж байвал үүнийг солиорой.
 */
const TREAT_UTC_SUFFIX_AS_LOCAL = false;

const CARD =
    "rounded-2xl border border-slate-200 dark:border-[#26376f] bg-white dark:bg-[#111d44] p-4 shadow-lg shadow-slate-300/50 dark:shadow-black/20 sm:p-5";

// =====================================================
// API
// =====================================================

const STATIONS_ENDPOINT = `${API_BASE_URL}/weather_db/stantsuud`;

const CURRENT_ENDPOINT = (id: string) =>
    `${API_BASE_URL}/weather_db/tsag_agaar/current?station=${enc(id)}`;

const HOURLY_ENDPOINT = (id: string) =>
    `${API_BASE_URL}/weather_db/tsag_agaar/hourly/${enc(id)}`;

const STATION_ENDPOINT = (id: string) =>
    `${API_BASE_URL}/weather_db/stantsuud/${enc(id)}`;

const FORECAST_ENDPOINT = (id: string) =>
    `${API_BASE_URL}/weather_db/uridchilsan_medee?stants_dugaar=${enc(id)}`;

// =====================================================
// TYPES
// =====================================================

type Num = number | string | null;

type Station = {
    stants_dugaar: string;
    ner: string;
    ner_en?: string;
    aimag?: string;
    urgurug?: string;
    urtrag?: string;
    undur?: Num;
};

type WeatherBase = {
    id?: number | string;
    stants_dugaar?: string;
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
    tsag?: string | null;
    ognoo?: string | null;
    ajiglasan_ognoo?: string | null;
    hemjsen_ognoo?: string | null;
    hadgalsan_ognoo?: string | null;
    eh_urvalj?: string | null;
    turul?: string | null;
};

type CurrentWeather = WeatherBase & {
    ner?: string;
    ner_en?: string;
    aimag?: string;
};

type Hourly = WeatherBase;

type Forecast = {
    id?: number | string;
    stants_dugaar?: string;
    ognoo?: string;
    garig?: string;
    temperatur_min_c?: Num;
    temperatur_max_c?: Num;
    nohtsol?: string | null;
    hur_tunadas_magadlalt_huvi?: Num;
    hur_tunadas_mm?: Num;
    salhiny_hurd_ms?: Num;
    salhiny_chigleg_gradus?: Num;
    salhiny_delbee_max_ms?: Num;
    chigleg_huvi?: Num;
    tsas_cm?: Num;
    uv_max?: Num;
    nar_mandah?: string | null;
    nar_jargah?: string | null;
    nar_togtoh_tsag?: Num;
    eh_urvalj?: string | null;
};

type StationNow = {
    temp: number | null;
    cond: string | null;
};

type HourSlot = {
    time: Date;
    item: Hourly | null;
};

// =====================================================
// HELPERS
// =====================================================

const weekdays = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

const isEmpty = (value: unknown) =>
    value === null || value === undefined || value === "";

const pad = (value: number) => String(value).padStart(2, "0");

const normalize = (value: unknown) =>
    String(value ?? "").toLowerCase().trim();

function num(value: unknown): number {
    return isEmpty(value) ? NaN : Number(value);
}

function roundValue(value: unknown): string | number {
    if (isEmpty(value)) return "-";

    const result = Number(value);

    return Number.isFinite(result) ? Math.round(result) : "-";
}

function getDateOnly(value: unknown): string {
    if (!value) return "";

    const text = String(value).trim();

    return (
        text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? text.substring(0, 10)
    );
}

/** local Date -> "YYYY-MM-DD" */
function toDateKey(date: Date): string {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
        date.getDate()
    )}`;
}

function toMinutes(value: string): number | null {
    const match = value.match(/^(\d{2}):(\d{2})$/);

    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function getToday(): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(new Date());

    const get = (type: string) =>
        parts.find((part) => part.type === type)?.value ?? "";

    return `${get("year")}-${get("month")}-${get("day")}`;
}

/**
 * Дурын мөчийг "Улаанбаатарын хананы цаг" болгон local Date-д хөрвүүлнэ.
 * (Бүх цагийн харьцуулалт энэ хананы цагаар хийгдэнэ.)
 */
function instantToMongoliaWall(date: Date): Date {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
    }).formatToParts(date);

    const get = (type: string) =>
        Number(parts.find((part) => part.type === type)?.value ?? 0);

    return new Date(
        get("year"),
        get("month") - 1,
        get("day"),
        get("hour") % 24,
        get("minute"),
        get("second")
    );
}

function getMongoliaNow(): Date {
    return instantToMongoliaWall(new Date());
}

function formatDate(date: string): string {
    const parts = date.split("-");

    return parts.length !== 3 ? date || "-" : `${parts[2]}.${parts[1]}`;
}

function getWeekday(date: string): string {
    if (!date) return "-";

    const [year, month, day] = date.split("-").map(Number);

    return (
        weekdays[new Date(Date.UTC(year, month - 1, day)).getUTCDay()] ??
        "-"
    );
}

function formatTime(value: unknown): string {
    if (isEmpty(value)) return "-";

    const raw = String(value).trim();
    const match = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);

    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : raw;
}

// =====================================================
// DATE PARSING
// =====================================================

function parseLocalDateTime(text: string): Date | null {
    const match = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/
    );

    if (!match) return null;

    const date = new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4]),
        Number(match[5]),
        Number(match[6] ?? 0)
    );

    return Number.isNaN(date.getTime()) ? null : date;
}

/** Үр дүн: Улаанбаатарын хананы цаг (local Date) */
function parseDateTime(value: unknown): Date | null {
    if (!value) return null;

    const text = String(value).trim();

    if (/Z$/i.test(text) || /[+-]\d{2}:\d{2}$/.test(text)) {
        const date = new Date(text);

        if (Number.isNaN(date.getTime())) return null;

        // "…Z" гэсэн ч үнэндээ local цаг хадгалсан DB-д зориулсан сонголт
        if (TREAT_UTC_SUFFIX_AS_LOCAL && /Z$/i.test(text)) {
            return new Date(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate(),
                date.getUTCHours(),
                date.getUTCMinutes(),
                date.getUTCSeconds()
            );
        }

        return instantToMongoliaWall(date);
    }

    return parseLocalDateTime(text);
}

/**
 * Огнооны түлхүүр "YYYY-MM-DD".
 *  - "2026-10-19"                    -> өөрөө
 *  - "2026-10-19T00:00:00.000Z"      -> 2026-10-19 (DATE багана)
 *  - "2026-10-18T16:00:00.000Z"      -> 2026-10-19 (Улаанбаатарын цагаар)
 */
function dateKeyOf(value: unknown): string {
    if (!value) return "";

    const text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;

    const midnight = text.match(
        /^(\d{4}-\d{2}-\d{2})[T ]00:00:00(?:\.0+)?Z?$/
    );

    if (midnight) return midnight[1];

    const date = parseDateTime(text);

    return date ? toDateKey(date) : getDateOnly(text);
}

function toArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];

    if (
        value &&
        typeof value === "object" &&
        Array.isArray((value as { data?: unknown }).data)
    ) {
        return (value as { data: T[] }).data;
    }

    return [];
}

// =====================================================
// HOURLY DATE TIME
// tsag нь:
//   1. 2026-10-08 13:00:00 / 2026-10-08T13:00:00
//   2. 13:00:00  (зөвхөн цаг — огноог ognoo / ajiglasan_ognoo-оос авна)
// =====================================================

function baseDateKey(item: Hourly): string {
    return (
        dateKeyOf(item.ognoo) ||
        dateKeyOf(item.ajiglasan_ognoo) ||
        dateKeyOf(item.hemjsen_ognoo) ||
        dateKeyOf(item.hadgalsan_ognoo)
    );
}

const TIME_ONLY = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

function getHourlyDateTime(item: Hourly): Date | null {
    const time = item.tsag ? String(item.tsag).trim() : "";

    const full = time ? parseDateTime(time) : null;

    if (full) return full;

    const match = time.match(TIME_ONLY);
    const key = baseDateKey(item);

    if (match && key) {
        const [year, month, day] = key.split("-").map(Number);

        return new Date(
            year,
            month - 1,
            day,
            Number(match[1]),
            Number(match[2]),
            Number(match[3] ?? 0)
        );
    }

    return (
        parseDateTime(item.ajiglasan_ognoo) ??
        parseDateTime(item.hemjsen_ognoo) ??
        parseDateTime(item.hadgalsan_ognoo)
    );
}

type DatedHour = { item: Hourly; date: Date };

/**
 * Цагийн мөрүүдэд огноо онооно.
 * Бүх мөр зөвхөн цагтай (13:00:00) бөгөөд нэг ижил огноотой ирвэл
 * (өөрөөр хэлбэл маргаашийн цагууд ч өнөөдрийн огноотой ирж байвал)
 * цаг буцаж эхэлсэн мөчөөс дараагийн өдөр гэж тооцно.
 */
function datedHours(rows: Hourly[]): DatedHour[] {
    if (!Array.isArray(rows)) return [];

    const timeOnly = rows.filter((row) =>
        TIME_ONLY.test(String(row.tsag ?? "").trim())
    );

    const keys = new Set(timeOnly.map(baseDateKey));
    const infer =
        timeOnly.length > 1 && keys.size === 1 && !keys.has("");

    const result: DatedHour[] = [];

    if (infer) {
        const [year, month, day] = Array.from(keys)[0]
            .split("-")
            .map(Number);

        const ordered = [...timeOnly].sort((a, b) => {
            const x = Number(a.id);
            const y = Number(b.id);

            return Number.isFinite(x) && Number.isFinite(y) ? x - y : 0;
        });

        let offset = 0;
        let previous = -1;

        for (const item of ordered) {
            const match = String(item.tsag).trim().match(TIME_ONLY);

            if (!match) continue;

            const minutes = Number(match[1]) * 60 + Number(match[2]);

            if (minutes < previous) offset += 1;
            previous = minutes;

            result.push({
                item,
                date: new Date(
                    year,
                    month - 1,
                    day + offset,
                    Number(match[1]),
                    Number(match[2]),
                    Number(match[3] ?? 0)
                ),
            });
        }
    }

    for (const item of rows) {
        if (infer && timeOnly.includes(item)) continue;

        const date = getHourlyDateTime(item);

        if (date) result.push({ item, date });
    }

    return result.sort((a, b) => a.date.getTime() - b.date.getTime());
}

function getHourBucket(date: Date): Date {
    const result = new Date(date);
    result.setMinutes(0, 0, 0);
    return result;
}

function addHours(date: Date, hours: number): Date {
    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate(),
        date.getHours() + hours,
        date.getMinutes(),
        date.getSeconds()
    );
}

function isNightAt(date: Date, forecasts: Forecast[]): boolean {
    const key = toDateKey(date);

    const forecast = forecasts.find((item) => item.ognoo === key);

    if (forecast?.nar_mandah && forecast?.nar_jargah) {
        const sunrise = toMinutes(formatTime(forecast.nar_mandah));
        const sunset = toMinutes(formatTime(forecast.nar_jargah));

        if (sunrise !== null && sunset !== null) {
            const minutes = date.getHours() * 60 + date.getMinutes();

            return minutes < sunrise || minutes >= sunset;
        }
    }

    return date.getHours() < 6 || date.getHours() >= 18;
}

// =====================================================
// WEATHER CONDITION + ICON
// =====================================================

type WeatherKind =
    | "thunderSnow"
    | "thunder"
    | "snowShower"
    | "snow"
    | "drizzle"
    | "shower"
    | "rain"
    | "fog"
    | "overcast"
    | "cloudy"
    | "clear"
    | "default";

const WEATHER_INFO: Record<
    WeatherKind,
    {
        label: string;
        icon: string;
        nightLabel?: string;
        nightIcon?: string;
    }
> = {
    thunderSnow: { label: "Аянгатай цасан аадар", icon: "⚡🌨️" },
    thunder: { label: "Аянгатай аадар", icon: "⚡⛈️" },
    snowShower: { label: "Цасан аадар", icon: "🌨️" },
    snow: { label: "Цастай", icon: "❄️" },
    drizzle: { label: "Шиврээ бороо", icon: "🌧️" },
    shower: { label: "Аадар бороо", icon: "⛈️" },
    rain: { label: "Бороотой", icon: "🌧️" },
    fog: { label: "Манантай", icon: "🌫️" },
    overcast: { label: "Бүрхэг", icon: "☁️" },
    cloudy: { label: "Үүлтэй", icon: "☁️" },
    clear: {
        label: "Нартай",
        icon: "☀️",
        nightLabel: "Сартай",
        nightIcon: "🌙",
    },
    default: {
        label: "Бага зэрэг үүлтэй",
        icon: "🌤️",
        nightLabel: "Сартай",
        nightIcon: "🌙",
    },
};

function getWeatherKind(condition?: string | null): WeatherKind {
    const text = (condition ?? "").toLowerCase().trim();
    const has = (word: string) => text.includes(word);

    if (has("аянг") && has("цас")) return "thunderSnow";
    if (has("аянг")) return "thunder";
    if (has("цасан аадар")) return "snowShower";
    if (has("цас")) return "snow";
    if (has("шиврээ")) return "drizzle";
    if (has("аадар")) return "shower";
    if (has("бороо")) return "rain";
    if (has("манан")) return "fog";
    if (has("бүрхэг")) return "overcast";
    if (has("үүл")) return "cloudy";
    if (has("цэлмэг") || has("тогтуун")) return "clear";

    return "default";
}

function getWeatherInfo(condition?: string | null, night = false) {
    const info = WEATHER_INFO[getWeatherKind(condition)];

    return {
        label: night && info.nightLabel ? info.nightLabel : info.label,
        icon: night && info.nightIcon ? info.nightIcon : info.icon,
    };
}

// =====================================================
// SCORES
// =====================================================

function getForecastScore(forecast: Forecast): number {
    return [
        forecast.temperatur_min_c,
        forecast.temperatur_max_c,
        forecast.nohtsol,
        forecast.hur_tunadas_magadlalt_huvi,
        forecast.hur_tunadas_mm,
        forecast.salhiny_hurd_ms,
        forecast.nar_mandah,
        forecast.nar_jargah,
    ].filter((value) => !isEmpty(value)).length;
}

function getHourlyScore(item: Hourly): number {
    return [
        item.temperatur_c,
        item.medregdeh_c,
        item.tsag_agaar_nohtsol,
        item.chigleg_huvi,
        item.salhiny_hurd_ms,
        item.hur_tunadas_mm,
    ].filter((value) => !isEmpty(value)).length;
}

// =====================================================
// GET JSON
// =====================================================

async function getJson(url: string, message: string) {
    const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
    });

    if (!response.ok) {
        throw new Error(`${message} HTTP ${response.status}`);
    }

    const json = await response.json();

    return json?.data ?? json;
}

function extractHourlyData(response: unknown): Hourly[] {
    if (Array.isArray(response)) return response as Hourly[];

    if (!response || typeof response !== "object") return [];

    const data = response as { hourly?: unknown; data?: unknown };

    if (Array.isArray(data.hourly)) return data.hourly as Hourly[];
    if (Array.isArray(data.data)) return data.data as Hourly[];

    if (
        data.data &&
        typeof data.data === "object" &&
        Array.isArray((data.data as { hourly?: unknown }).hourly)
    ) {
        return (data.data as { hourly: Hourly[] }).hourly;
    }

    return [];
}

function getLatestWeather<T extends CurrentWeather>(data: T[]): T | null {
    if (!Array.isArray(data) || data.length === 0) return null;

    const getTime = (item: T) =>
        (
            parseDateTime(
                item.ajiglasan_ognoo ??
                    item.hemjsen_ognoo ??
                    item.tsag ??
                    item.hadgalsan_ognoo
            ) ?? getHourlyDateTime(item)
        )?.getTime() ?? 0;

    return [...data].sort((a, b) => getTime(b) - getTime(a))[0] ?? null;
}

// =====================================================
// 24 HOURS / 7 DAYS BUILDERS
// =====================================================

/** Одоогийн цагаас эхэлсэн нийт 24 цагийн слот. */
function buildNext24Hours(rows: Hourly[], now: Date): HourSlot[] {
    const start = getHourBucket(now);
    const end = addHours(start, 24).getTime();
    const byHour = new Map<number, Hourly>();

    for (const { item, date } of datedHours(rows)) {
        const key = getHourBucket(date).getTime();

        if (key < start.getTime() || key >= end) continue;

        const previous = byHour.get(key);

        if (!previous || getHourlyScore(item) >= getHourlyScore(previous)) {
            byHour.set(key, item);
        }
    }

    return Array.from({ length: 24 }, (_, index) => {
        const time = addHours(start, index);

        return { time, item: byHour.get(time.getTime()) ?? null };
    });
}

/** Өдөр бүрт нэг (хамгийн бүрэн) мэдээ, өнөөдрөөс эхлэх 7 хоног. */
function buildSevenDays(rows: Forecast[], today: string): Forecast[] {
    const byDate = new Map<string, Forecast>();

    for (const row of rows) {
        const key = dateKeyOf(row?.ognoo);

        if (!key) continue;

        const previous = byDate.get(key);

        if (
            !previous ||
            getForecastScore(row) >= getForecastScore(previous)
        ) {
            byDate.set(key, { ...row, ognoo: key });
        }
    }

    const all = Array.from(byDate.values()).sort((a, b) =>
        String(a.ognoo).localeCompare(String(b.ognoo))
    );

    const future = all.filter((item) => String(item.ognoo) >= today);

    return (future.length ? future : all.slice(-7)).slice(0, 7);
}

// =====================================================
// RAIN HELPERS
// =====================================================

function getRainProbability(value: unknown): string {
    const result = num(value);

    return Number.isFinite(result) ? `${Math.round(result)}%` : "-";
}

function getRainAmount(value: unknown): string {
    const result = num(value);

    return Number.isFinite(result) ? `${result.toFixed(1)} мм` : "-";
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
        <div className="mb-4 flex items-start justify-between gap-3">
            <div>
                {eyebrow && (
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-300">
                        {eyebrow}
                    </p>
                )}
                <h2 className="text-lg font-bold text-slate-900 dark:text-white sm:text-xl">
                    {title}
                </h2>
            </div>
            {right}
        </div>
    );
}

// =====================================================
// COMPONENT
// =====================================================

export default function CityPage() {
    const params = useParams();
    const router = useRouter();

    const rawId = params?.id;
    const stationId = String(
        Array.isArray(rawId) ? rawId[0] : rawId ?? "549"
    );

    // ---------------- STATE ----------------

    const [stationData, setStationData] = useState<Station | null>(null);
    const [stations, setStations] = useState<Station[]>([]);
    const [current, setCurrent] = useState<CurrentWeather | null>(null);
    const [hourlyAll, setHourlyAll] = useState<Hourly[]>([]);
    const [forecastAll, setForecastAll] = useState<Forecast[]>([]);
    const [stripWeather, setStripWeather] = useState<
        Record<string, StationNow>
    >({});

    const [loading, setLoading] = useState(true);
    const [hourlyLoading, setHourlyLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [activeIndex, setActiveIndex] = useState(0);

    const [now, setNow] = useState<Date | null>(null);

    // Станцын мэдээлэл ирээгүй үед жагсаалтаас авна
    const station: Station | null =
        stationData ??
        stations.find((item) => String(item.stants_dugaar) === stationId) ??
        null;

    const stripRef = useRef<HTMLDivElement | null>(null);
    const dropdownRef = useRef<HTMLDivElement | null>(null);

    // ---------------- CLOCK (цаг өнгөрөх тусам жагсаалт шинэчлэгдэнэ) ----------------

    useEffect(() => {
        setNow(getMongoliaNow());

        const timer = window.setInterval(
            () => setNow(getMongoliaNow()),
            30_000
        );

        return () => window.clearInterval(timer);
    }, []);

    // ---------------- CLOSE DROPDOWN ON OUTSIDE CLICK ----------------

    useEffect(() => {
        function handleOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }

        document.addEventListener("mousedown", handleOutside);

        return () =>
            document.removeEventListener("mousedown", handleOutside);
    }, []);

    // ---------------- LOAD STATIONS ----------------

    useEffect(() => {
        let active = true;

        async function loadStations() {
            try {
                const data = await getJson(
                    STATIONS_ENDPOINT,
                    "Станцуудыг авахад алдаа гарлаа."
                );

                if (active) setStations(toArray<Station>(data));
            } catch (err) {
                console.error("STATIONS ERROR:", err);

                if (active) setStations([]);
            }
        }

        void loadStations();

        return () => {
            active = false;
        };
    }, []);

    // ---------------- STATION STRIP TEMPERATURES ----------------

    useEffect(() => {
        if (stations.length === 0) return;

        let active = true;

        async function loadStrip() {
            const next: Record<string, StationNow> = {};
            const ids = stations.map((item) => String(item.stants_dugaar));

            // 6-аар багцлан татна (олон хүсэлт зэрэг явуулахгүй)
            for (let i = 0; i < ids.length; i += 6) {
                const batch = ids.slice(i, i + 6);

                const results = await Promise.all(
                    batch.map(async (id) => {
                        try {
                            const data = await getJson(
                                CURRENT_ENDPOINT(id),
                                "Станцын мэдээлэл авахад алдаа гарлаа."
                            );

                            const row = Array.isArray(data)
                                ? getLatestWeather(data as CurrentWeather[])
                                : (data as CurrentWeather | null);

                            return [
                                id,
                                {
                                    temp: isEmpty(row?.temperatur_c)
                                        ? null
                                        : Number(row?.temperatur_c),
                                    cond: row?.tsag_agaar_nohtsol ?? null,
                                },
                            ] as const;
                        } catch {
                            return [id, { temp: null, cond: null }] as const;
                        }
                    })
                );

                if (!active) return;

                results.forEach(([id, value]) => {
                    next[id] = value;
                });

                setStripWeather({ ...next });
            }
        }

        void loadStrip();

        return () => {
            active = false;
        };
    }, [stations]);

    // ---------------- FILTER STATIONS (яг таарсан > эхлэлээр > агуулсан) ----------------

    const filteredStations = useMemo(() => {
        const keyword = normalize(search);

        if (!keyword) return stations;

        const scored: { item: Station; score: number }[] = [];

        for (const item of stations) {
            const fields = [
                item.ner,
                item.ner_en,
                item.aimag,
                item.stants_dugaar,
            ].map(normalize);

            let score = -1;

            if (fields.some((f) => f === keyword)) score = 0;
            else if (fields.some((f) => f.startsWith(keyword))) score = 1;
            else if (fields.some((f) => f.includes(keyword))) score = 2;

            if (score >= 0) scored.push({ item, score });
        }

        return scored
            .sort(
                (a, b) =>
                    a.score - b.score ||
                    (a.item.ner ?? "").localeCompare(b.item.ner ?? "", "mn")
            )
            .map((entry) => entry.item);
    }, [stations, search]);

    useEffect(() => {
        setActiveIndex(0);
    }, [search]);

    // ---------------- LOAD MAIN DATA (endpoint-ууд хэвээр) ----------------

    useEffect(() => {
        let active = true;

        async function load() {
            setLoading(true);
            setError("");
            setStationData(null);
            setCurrent(null);
            setForecastAll([]);

            const results = await Promise.allSettled([
                getJson(
                    STATION_ENDPOINT(stationId),
                    "Станцын мэдээлэл авахад алдаа гарлаа."
                ),
                getJson(
                    CURRENT_ENDPOINT(stationId),
                    "Одоогийн цаг агаар авахад алдаа гарлаа."
                ),
                getJson(
                    FORECAST_ENDPOINT(stationId),
                    "Урьдчилсан мэдээ авахад алдаа гарлаа."
                ),
            ]);

            if (!active) return;

            const [stationResult, currentResult, forecastResult] = results;

            const failures: string[] = [];

            if (stationResult.status === "fulfilled") {
                const value = stationResult.value;

                setStationData(
                    (Array.isArray(value)
                        ? value[0] ?? null
                        : value) as Station | null
                );
            } else {
                failures.push(String(stationResult.reason?.message ?? ""));
                setStationData(null);
            }

            if (currentResult.status === "fulfilled") {
                const value = currentResult.value;

                const isList =
                    Array.isArray(value) ||
                    Array.isArray((value as { data?: unknown } | null)?.data);

                setCurrent(
                    isList
                        ? getLatestWeather(toArray<CurrentWeather>(value))
                        : (value as CurrentWeather | null)
                );
            } else {
                failures.push(String(currentResult.reason?.message ?? ""));
                setCurrent(null);
            }

            if (forecastResult.status === "fulfilled") {
                setForecastAll(toArray<Forecast>(forecastResult.value));
            } else {
                failures.push(String(forecastResult.reason?.message ?? ""));
                setForecastAll([]);
            }

            if (failures.length > 0) {
                console.error("CITY PAGE ERROR:", failures);
                setError(failures.filter(Boolean).join(" · "));
            }

            setLoading(false);
        }

        void load();

        return () => {
            active = false;
        };
    }, [stationId]);

    // ---------------- LOAD HOURLY DATA ----------------

    useEffect(() => {
        let active = true;

        async function loadHourly() {
            setHourlyLoading(true);
            setHourlyAll([]);

            try {
                const response = await getJson(
                    HOURLY_ENDPOINT(stationId),
                    "Цагийн мэдээлэл авахад алдаа гарлаа."
                );

                if (active) setHourlyAll(extractHourlyData(response));
            } catch (err) {
                console.error("HOURLY ERROR:", err);

                if (active) setHourlyAll([]);
            } finally {
                if (active) setHourlyLoading(false);
            }
        }

        void loadHourly();

        return () => {
            active = false;
        };
    }, [stationId]);

    // ---------------- TIME-DEPENDENT DATA ----------------

    const todayKey = now ? toDateKey(now) : getToday();

    const tomorrowKey = now ? toDateKey(addHours(now, 24)) : "";

    /** Өнөөдрөөс эхэлсэн 7 хоног (шөнө дунд өнгөрвөл автоматаар шилжинэ) */
    const forecasts = useMemo(
        () => buildSevenDays(forecastAll, todayKey),
        [forecastAll, todayKey]
    );

    /** Одоогийн цагаас эхэлсэн 24 цаг (цаг өнгөрөх тусам шилжинэ) */
    const hourlySlots = useMemo(
        () => (now ? buildNext24Hours(hourlyAll, now) : []),
        [hourlyAll, now]
    );

    const availableHours = hourlySlots.filter((slot) => slot.item).length;

    /** Одоогийн цагт хамгийн ойр (1.5 цагаас ойр) цагийн мөр */
    const currentHourly = useMemo(() => {
        if (!now) return null;

        let best: DatedHour | null = null;
        let bestDiff = Infinity;

        for (const entry of datedHours(hourlyAll)) {
            const diff = Math.abs(entry.date.getTime() - now.getTime());

            if (diff < bestDiff) {
                best = entry;
                bestDiff = diff;
            }
        }

        return best && bestDiff <= 90 * 60 * 1000 ? best : null;
    }, [hourlyAll, now]);

    /** Цагийн мэдээ үндсэн, current API нь дутууг нөхнө */
    const displayCurrent = useMemo<CurrentWeather | null>(() => {
        if (!current && !currentHourly) return null;

        const merged: CurrentWeather = { ...(current ?? {}) };

        if (currentHourly) {
            for (const [key, value] of Object.entries(currentHourly.item)) {
                if (!isEmpty(value)) {
                    (merged as Record<string, unknown>)[key] = value;
                }
            }
        }

        return merged;
    }, [current, currentHourly]);

    // ---------------- GRAPH DATA ----------------

    const maxes = forecasts.map((item) => num(item.temperatur_max_c));
    const mins = forecasts.map((item) => num(item.temperatur_min_c));

    const graphValues = [...maxes, ...mins].filter(Number.isFinite);

    const graphMinValue = graphValues.length
        ? Math.floor(Math.min(...graphValues) - 2)
        : 0;

    const graphMaxValue = graphValues.length
        ? Math.ceil(Math.max(...graphValues) + 2)
        : 10;

    const graphRange = Math.max(graphMaxValue - graphMinValue, 1);

    const graphWidth = Math.max(forecasts.length * 120, 720);
    const graphHeight = 170;
    const graphTop = 18;
    const graphBottom = 132;
    const graphPaddingX = 60;

    const graphX = (index: number) =>
        forecasts.length <= 1
            ? graphWidth / 2
            : graphPaddingX +
              (index * (graphWidth - graphPaddingX * 2)) /
                  (forecasts.length - 1);

    const graphY = (value: number) =>
        graphBottom -
        ((value - graphMinValue) / graphRange) * (graphBottom - graphTop);

    const graphLine = (values: number[]) =>
        values
            .map((value, index) =>
                Number.isFinite(value)
                    ? `${graphX(index)},${graphY(value)}`
                    : null
            )
            .filter((point): point is string => Boolean(point))
            .join(" ");

    const graphTicks = [
        graphMaxValue,
        Math.round((graphMaxValue + graphMinValue) / 2),
        graphMinValue,
    ];

    const renderArea = (values: number[], kind: "max" | "min") => {
        if (forecasts.length < 2 || !values.every(Number.isFinite)) {
            return null;
        }

        return (
            <polygon
                points={`${graphPaddingX},${graphBottom} ${graphLine(
                    values
                )} ${graphWidth - graphPaddingX},${graphBottom}`}
                className={`graph-${kind}-area`}
            />
        );
    };

    const renderPoints = (
        values: number[],
        kind: "max" | "min",
        labelOffset: number
    ) =>
        values.map((value, index) =>
            Number.isFinite(value) ? (
                <g key={`${kind}-point-${index}`}>
                    <circle
                        cx={graphX(index)}
                        cy={graphY(value)}
                        r="5"
                        className={`graph-${kind}-point`}
                    />
                    <text
                        x={graphX(index)}
                        y={graphY(value) + labelOffset}
                        textAnchor="middle"
                        className={`graph-temperature-label graph-${kind}-label`}
                    >
                        {roundValue(value)}°
                    </text>
                </g>
            ) : null
        );

    // ---------------- TODAY ----------------

    const todayForecast =
        forecasts.find((item) => item.ognoo === todayKey) ?? forecasts[0];

    const sunrise = todayForecast?.nar_mandah
        ? formatTime(todayForecast.nar_mandah)
        : "-";

    const sunset = todayForecast?.nar_jargah
        ? formatTime(todayForecast.nar_jargah)
        : "-";

    const nowNight = now ? isNightAt(now, forecasts) : false;

    const currentWeatherInfo = getWeatherInfo(
        displayCurrent?.tsag_agaar_nohtsol ?? todayForecast?.nohtsol,
        nowNight
    );

    // ---------------- DETAIL TILES ----------------

    const detailTiles: {
        icon: string;
        label: string;
        value: ReactNode;
        note: string;
        extra?: ReactNode;
    }[] = [
        {
            icon: "🌡️",
            label: "Мэдрэгдэх",
            value: `${roundValue(displayCurrent?.medregdeh_c)}°`,
            note: `Бодит: ${roundValue(displayCurrent?.temperatur_c)}°`,
        },
        {
            icon: "💨",
            label: "Салхи",
            value: `${roundValue(displayCurrent?.salhiny_hurd_ms)} м/с`,
            note: `Чиглэл: ${displayCurrent?.salhiny_chiglel ?? "-"}`,
        },
        {
            icon: "💧",
            label: "Чийгшил",
            value: `${roundValue(displayCurrent?.chigleg_huvi)}%`,
            note: "Харьцангуй чийгшил",
        },
        {
            icon: "🎚️",
            label: "Даралт",
            value: `${roundValue(displayCurrent?.daralt_hpa)} гПа`,
            note: "Агаарын даралт",
        },
        {
            icon: "🌅",
            label: "Нар мандах",
            value: sunrise,
            note: "Өнөөдөр",
        },
        {
            icon: "🌇",
            label: "Нар жаргах",
            value: sunset,
            note: "Өнөөдөр",
        },
        {
            icon: "🌧️",
            label: "Хур тунадас",
            value: getRainProbability(
                todayForecast?.hur_tunadas_magadlalt_huvi
            ),
            note: "Магадлал",
            extra: (
                <small>
                    Хэмжээ: {getRainAmount(todayForecast?.hur_tunadas_mm)}
                </small>
            ),
        },
        {
            icon: "👁️",
            label: "Харагдац",
            value: `${roundValue(displayCurrent?.haragts_km)} км`,
            note: "Харагдах орчны зай",
        },
        {
            icon: "☀️",
            label: "UV индекс",
            value: roundValue(displayCurrent?.uv_index),
            note: "Хэт ягаан туяа",
        },
    ];

    // ---------------- SUMMARY ROWS ----------------

    const summaryRows: {
        icon: string;
        label: string;
        title: string;
        value: ReactNode;
    }[] = [
        {
            icon: "🌡️",
            label: "Температур",
            title: "Бодит температур",
            value: `${roundValue(displayCurrent?.temperatur_c)}°`,
        },
        {
            icon: "💨",
            label: "Салхи",
            title: displayCurrent?.salhiny_chiglel ?? "-",
            value: (
                <>
                    {roundValue(displayCurrent?.salhiny_hurd_ms)}
                    <small>м/с</small>
                </>
            ),
        },
        {
            icon: "💧",
            label: "Чийгшил",
            title: "Агаарын чийг",
            value: `${roundValue(displayCurrent?.chigleg_huvi)}%`,
        },
    ];

    // ---------------- STATION HANDLERS ----------------

    const stationLabel =
        station?.ner ??
        stations.find((item) => String(item.stants_dugaar) === stationId)
            ?.ner ??
        "Станц сонгох";

    const selectStation = useCallback(
        (item: Station) => {
            const id = String(item.stants_dugaar ?? "").trim();

            if (!id || !Number.isFinite(Number(id))) return;

            setSearch("");
            setDropdownOpen(false);

            if (id === stationId) return;

            router.push(`/city/${encodeURIComponent(id)}`);
        },
        [router, stationId]
    );

    const scrollStrip = useCallback((direction: number) => {
        stripRef.current?.scrollBy({
            left: direction * 340,
            behavior: "smooth",
        });
    }, []);

    function onSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
        if (event.key === "ArrowDown") {
            event.preventDefault();
            setDropdownOpen(true);
            setActiveIndex((i) =>
                Math.min(i + 1, Math.max(filteredStations.length - 1, 0))
            );
        } else if (event.key === "ArrowUp") {
            event.preventDefault();
            setActiveIndex((i) => Math.max(i - 1, 0));
        } else if (event.key === "Enter") {
            event.preventDefault();
            const item = filteredStations[activeIndex];
            if (item) selectStation(item);
        } else if (event.key === "Escape") {
            setDropdownOpen(false);
        }
    }

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="weather-page">
            <Header />

            <main className="weather-main">
                <div className="weather-container">
                    {error && <div className="weather-error">⚠️ {error}</div>}

                    {/* =====================================
                        СТАНЦ ХАЙХ (нүүр хуудастай ижил)
                    ===================================== */}

                    <section className={`${CARD} relative z-30 mb-6`}>
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
                            <div className="relative lg:w-80" ref={dropdownRef}>
                                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-widest text-amber-600 dark:text-amber-300">
                                    Байршил сонгох
                                </p>

                                <div className="relative">
                                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400">
                                        🔍
                                    </span>

                                    <input
                                        value={search}
                                        onChange={(e) => {
                                            setSearch(e.target.value);
                                            setDropdownOpen(true);
                                        }}
                                        onFocus={() => setDropdownOpen(true)}
                                        onKeyDown={onSearchKeyDown}
                                        role="combobox"
                                        aria-expanded={dropdownOpen}
                                        aria-controls="city-station-listbox"
                                        aria-autocomplete="list"
                                        autoComplete="off"
                                        placeholder={`${stationLabel}${
                                            station?.aimag
                                                ? `, ${station.aimag}`
                                                : ""
                                        }`}
                                        aria-label="Станц хайх"
                                        className="w-full rounded-xl border border-slate-200 dark:border-[#2a3b7d] bg-slate-50 dark:bg-[#0d1736] py-3 pl-10 pr-10 text-sm text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-300 outline-none transition focus:border-amber-500 dark:focus:border-amber-300"
                                    />

                                    {search && (
                                        <button
                                            type="button"
                                            onClick={() => setSearch("")}
                                            aria-label="Цэвэрлэх"
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-lg leading-none text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                                        >
                                            ×
                                        </button>
                                    )}
                                </div>

                                {dropdownOpen && (
                                    <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-300 dark:border-[#3a4c8f] bg-white dark:bg-[#14224f] shadow-2xl shadow-slate-400/40 dark:shadow-black/40">
                                        <div
                                            id="city-station-listbox"
                                            role="listbox"
                                            className="max-h-72 overflow-y-auto"
                                        >
                                            {filteredStations.length === 0 && (
                                                <p className="p-3 text-sm text-slate-600 dark:text-slate-400">
                                                    Станц олдсонгүй.
                                                </p>
                                            )}

                                            {filteredStations.map(
                                                (item, index) => {
                                                    const id = String(
                                                        item.stants_dugaar
                                                    );
                                                    const selected =
                                                        id === stationId;

                                                    return (
                                                        <button
                                                            type="button"
                                                            role="option"
                                                            aria-selected={
                                                                selected
                                                            }
                                                            key={id}
                                                            onMouseEnter={() =>
                                                                setActiveIndex(
                                                                    index
                                                                )
                                                            }
                                                            onClick={() =>
                                                                selectStation(
                                                                    item
                                                                )
                                                            }
                                                            className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-amber-50 dark:hover:bg-[#26376f] ${
                                                                selected ||
                                                                index ===
                                                                    activeIndex
                                                                    ? "bg-amber-50 dark:bg-[#26376f]"
                                                                    : ""
                                                            }`}
                                                        >
                                                            <span>
                                                                📍 {item.ner}
                                                            </span>
                                                            <span className="text-xs text-slate-600 dark:text-slate-400">
                                                                {item.aimag ??
                                                                    ""}
                                                            </span>
                                                        </button>
                                                    );
                                                }
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => scrollStrip(-1)}
                                    aria-label="Өмнөх станцууд"
                                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-[#2a3b7d] bg-slate-50 dark:bg-[#0d1736] text-xs transition hover:border-amber-500 dark:hover:border-amber-300 sm:flex"
                                >
                                    ◀
                                </button>

                                <div
                                    ref={stripRef}
                                    className="flex min-w-0 flex-1 snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                                >
                                    {stations.map((item) => {
                                        const id = String(item.stants_dugaar);
                                        const info = stripWeather[id];
                                        const selected = id === stationId;

                                        return (
                                            <button
                                                type="button"
                                                key={id}
                                                onClick={() =>
                                                    selectStation(item)
                                                }
                                                aria-pressed={selected}
                                                className={`flex min-w-[92px] shrink-0 snap-start flex-col items-center rounded-xl border px-3 py-2 text-xs transition ${
                                                    selected
                                                        ? "border-amber-500 dark:border-amber-300 bg-amber-50 dark:bg-[#26376f]"
                                                        : "border-slate-200 dark:border-[#2a3b7d] bg-slate-50 dark:bg-[#0d1736] hover:border-slate-400"
                                                }`}
                                            >
                                                <span className="max-w-[84px] truncate text-slate-700 dark:text-slate-300">
                                                    {item.ner}
                                                </span>
                                                <span className="text-xl">
                                                    {
                                                        getWeatherInfo(
                                                            info?.cond
                                                        ).icon
                                                    }
                                                </span>
                                                <strong className="text-sm text-slate-900 dark:text-white">
                                                    {info?.temp === null ||
                                                    info?.temp === undefined
                                                        ? "--°"
                                                        : `${Math.round(
                                                              info.temp
                                                          )}°`}
                                                </strong>
                                            </button>
                                        );
                                    })}
                                </div>

                                <button
                                    type="button"
                                    onClick={() => scrollStrip(1)}
                                    aria-label="Дараагийн станцууд"
                                    className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-200 dark:border-[#2a3b7d] bg-slate-50 dark:bg-[#0d1736] text-xs transition hover:border-amber-500 dark:hover:border-amber-300 sm:flex"
                                >
                                    ▶
                                </button>
                            </div>
                        </div>
                    </section>

                    <div className="weather-grid">
                        {/* LEFT */}

                        <section className="weather-left">
                            {/* CURRENT WEATHER */}

                            <section className="weather-card current-card">
                                <div className="current-header">
                                    <div>
                                        <p className="eyebrow">
                                            Одоогийн цаг агаар
                                        </p>

                                        <h1>
                                            {station?.ner ??
                                                (loading
                                                    ? "Ачааллаж байна..."
                                                    : "-")}
                                        </h1>

                                        <p className="station-subtitle">
                                            {station?.aimag ?? "-"}
                                            {" · "}
                                            Станц{" "}
                                            {station?.stants_dugaar ??
                                                stationId}
                                            {station?.undur
                                                ? ` · ${roundValue(
                                                      station.undur
                                                  )} м`
                                                : ""}
                                        </p>
                                    </div>

                                    <div className="main-weather-icon">
                                        {currentWeatherInfo.icon}
                                    </div>
                                </div>

                                <div className="temperature-area">
                                    <div className="temperature">
                                        {roundValue(
                                            displayCurrent?.temperatur_c
                                        )}
                                        <span>°</span>
                                    </div>

                                    <div className="temperature-info">
                                        <p>
                                            Мэдрэгдэх{" "}
                                            {roundValue(
                                                displayCurrent?.medregdeh_c
                                            )}
                                            °
                                        </p>

                                        <strong>
                                            {displayCurrent?.tsag_agaar_nohtsol ??
                                                todayForecast?.nohtsol ??
                                                "Цаг агаар"}
                                        </strong>

                                        {currentHourly && (
                                            <small>
                                                Мэдээлэл:{" "}
                                                {currentHourly.date.toLocaleTimeString(
                                                    "mn-MN",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
                                                        hour12: false,
                                                    }
                                                )}
                                            </small>
                                        )}
                                    </div>
                                </div>

                                <div className="high-low">
                                    <div>
                                        ↑ Дээд{" "}
                                        <strong>
                                            {roundValue(
                                                todayForecast?.temperatur_max_c
                                            )}
                                            °
                                        </strong>
                                    </div>

                                    <div>
                                        ↓ Доод{" "}
                                        <strong>
                                            {roundValue(
                                                todayForecast?.temperatur_min_c
                                            )}
                                            °
                                        </strong>
                                    </div>
                                </div>
                            </section>

                            {/* NEXT 24 HOURS */}

                            <section className="weather-card hourly-card">
                                <div className="section-header">
                                    <div>
                                        <h2>24 цагийн цаг агаарын мэдээлэл</h2>
                                        <p>
                                            {now
                                                ? `${pad(
                                                      now.getHours()
                                                  )}:00 цагаас эхлэн, цаг тутмаар`
                                                : "Одоогийн цагаас эхлэн"}
                                        </p>
                                    </div>

                                    <span>{availableHours} / 24 цаг</span>
                                </div>

                                {hourlyLoading || !now ? (
                                    <div className="hourly-loading">
                                        {Array.from({ length: 8 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="hourly-skeleton"
                                                />
                                            )
                                        )}
                                    </div>
                                ) : availableHours === 0 ? (
                                    <div className="empty-data">
                                        <p>Цагийн мэдээлэл олдсонгүй</p>
                                        <small>
                                            {hourlyAll.length === 0
                                                ? "Backend болон DB дээр цагийн мэдээлэл шалгана уу."
                                                : "Одоогийн цагаас хойших цагийн мэдээлэл DB-д алга."}
                                        </small>
                                    </div>
                                ) : (
                                    <div className="hourly-scroll">
                                        <div className="hourly-list">
                                            {hourlySlots.map((slot, index) => {
                                                const item = slot.item;
                                                const night = isNightAt(
                                                    slot.time,
                                                    forecasts
                                                );

                                                const { label, icon } =
                                                    getWeatherInfo(
                                                        item?.tsag_agaar_nohtsol,
                                                        night
                                                    );

                                                const dateKey = toDateKey(
                                                    slot.time
                                                );

                                                const dayTag =
                                                    dateKey === todayKey
                                                        ? "Өнөөдөр"
                                                        : dateKey ===
                                                            tomorrowKey
                                                          ? "Маргааш"
                                                          : formatDate(
                                                                dateKey
                                                            );

                                                return (
                                                    <div
                                                        key={slot.time.getTime()}
                                                        className={`hourly-item ${
                                                            index === 0
                                                                ? "current-hour"
                                                                : ""
                                                        } ${
                                                            item
                                                                ? ""
                                                                : "is-empty"
                                                        }`}
                                                    >
                                                        <span className="hour">
                                                            {pad(
                                                                slot.time.getHours()
                                                            )}
                                                            :00
                                                        </span>

                                                        <small className="hourly-date">
                                                            {dayTag}
                                                        </small>

                                                        <span className="hourly-icon">
                                                            {item
                                                                ? icon
                                                                : "—"}
                                                        </span>

                                                        <strong>
                                                            {roundValue(
                                                                item?.temperatur_c
                                                            )}
                                                            °
                                                        </strong>

                                                        <small>
                                                            Чийг{" "}
                                                            {roundValue(
                                                                item?.chigleg_huvi
                                                            )}
                                                            %
                                                        </small>

                                                        <small>
                                                            {item
                                                                ? item.tsag_agaar_nohtsol ??
                                                                  label
                                                                : "Мэдээлэл алга"}
                                                        </small>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 7 DAY FORECAST */}

                            <section className="weather-card forecast-card">
                                <div className="forecast-header">
                                    <div>
                                        <p className="eyebrow">
                                            ИРЭЭДҮЙН МЭДЭЭ
                                        </p>

                                        <h2 className="card-title">
                                            7 хоногийн урьдчилсан мэдээ
                                        </h2>
                                    </div>

                                    <div className="forecast-legend">
                                        <span>
                                            <i className="legend-dot legend-max-dot" />
                                            Дээд
                                        </span>

                                        <span>
                                            <i className="legend-dot legend-min-dot" />
                                            Доод
                                        </span>
                                    </div>
                                </div>

                                {loading ? (
                                    <div className="forecast-loading">
                                        {Array.from({ length: 7 }).map(
                                            (_, index) => (
                                                <div
                                                    key={index}
                                                    className="forecast-loading-item"
                                                />
                                            )
                                        )}
                                    </div>
                                ) : forecasts.length === 0 ? (
                                    <div className="empty-data">
                                        <p>Урьдчилсан мэдээ олдсонгүй</p>
                                    </div>
                                ) : (
                                    <div className="forecast-scroll">
                                        <div
                                            className="forecast-content"
                                            style={{
                                                gridTemplateColumns: `repeat(${forecasts.length}, minmax(120px, 1fr))`,
                                            }}
                                        >
                                            {forecasts.map(
                                                (forecast, index) => {
                                                    const date = String(
                                                        forecast.ognoo
                                                    );

                                                    const rain = num(
                                                        forecast.hur_tunadas_magadlalt_huvi
                                                    );

                                                    const { label, icon } =
                                                        getWeatherInfo(
                                                            forecast.nohtsol
                                                        );

                                                    const isToday =
                                                        date === todayKey;

                                                    return (
                                                        <div
                                                            key={`${date}-${
                                                                forecast.id ??
                                                                index
                                                            }`}
                                                            className={`forecast-day ${
                                                                isToday
                                                                    ? "today"
                                                                    : ""
                                                            }`}
                                                        >
                                                            <strong className="forecast-weekday">
                                                                {isToday
                                                                    ? "Өнөөдөр"
                                                                    : date ===
                                                                        tomorrowKey
                                                                      ? "Маргааш"
                                                                      : getWeekday(
                                                                            date
                                                                        )}
                                                            </strong>

                                                            <span className="forecast-date">
                                                                {formatDate(
                                                                    date
                                                                )}
                                                            </span>

                                                            <span className="forecast-icon">
                                                                {icon}
                                                            </span>

                                                            <span className="forecast-condition">
                                                                {label}
                                                            </span>

                                                            <span
                                                                className={`rain ${
                                                                    rain > 0
                                                                        ? "has-rain"
                                                                        : ""
                                                                }`}
                                                            >
                                                                {Number.isFinite(
                                                                    rain
                                                                )
                                                                    ? `💧 ${Math.round(
                                                                          rain
                                                                      )}%`
                                                                    : "—"}
                                                            </span>

                                                            <div className="forecast-temperature">
                                                                <strong className="forecast-max">
                                                                    {roundValue(
                                                                        forecast.temperatur_max_c
                                                                    )}
                                                                    °
                                                                </strong>

                                                                <span className="forecast-temp-divider">
                                                                    /
                                                                </span>

                                                                <span className="forecast-min">
                                                                    {roundValue(
                                                                        forecast.temperatur_min_c
                                                                    )}
                                                                    °
                                                                </span>
                                                            </div>
                                                        </div>
                                                    );
                                                }
                                            )}
                                        </div>

                                        {/* TEMPERATURE GRAPH */}

                                        <div className="forecast-graph">
                                            <svg
                                                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                                                className="weather-graph"
                                                preserveAspectRatio="none"
                                                role="img"
                                                aria-label="7 хоногийн температурын график"
                                            >
                                                {graphTicks.map(
                                                    (tick, index) => {
                                                        const y = graphY(tick);

                                                        return (
                                                            <g
                                                                key={`tick-${index}`}
                                                            >
                                                                <line
                                                                    x1={
                                                                        graphPaddingX
                                                                    }
                                                                    y1={y}
                                                                    x2={
                                                                        graphWidth -
                                                                        graphPaddingX
                                                                    }
                                                                    y2={y}
                                                                    className="graph-grid-line"
                                                                />

                                                                <text
                                                                    x="12"
                                                                    y={y + 4}
                                                                    className="graph-axis-label"
                                                                >
                                                                    {tick}°
                                                                </text>
                                                            </g>
                                                        );
                                                    }
                                                )}

                                                {forecasts.map((_, index) => (
                                                    <line
                                                        key={`vertical-${index}`}
                                                        x1={graphX(index)}
                                                        y1={graphTop}
                                                        x2={graphX(index)}
                                                        y2={graphBottom}
                                                        className="graph-vertical-line"
                                                    />
                                                ))}

                                                {renderArea(maxes, "max")}
                                                {renderArea(mins, "min")}

                                                <polyline
                                                    points={graphLine(maxes)}
                                                    className="graph-max-line"
                                                    fill="none"
                                                />

                                                <polyline
                                                    points={graphLine(mins)}
                                                    className="graph-min-line"
                                                    fill="none"
                                                />

                                                {renderPoints(
                                                    maxes,
                                                    "max",
                                                    -12
                                                )}

                                                {renderPoints(
                                                    mins,
                                                    "min",
                                                    24
                                                )}
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </section>

                        {/* RIGHT SIDEBAR */}

                        <aside className="weather-sidebar">
                            {/* MAP (нүүр хуудастай ижил) */}

                            <section
                                className={`${CARD} sidebar-map flex flex-col`}
                            >
                                <SectionTitle
                                    eyebrow="Газрын зураг"
                                    title="Одоогийн цаг агаар"
                                />

                                <div className="relative min-h-[340px] flex-1 overflow-hidden rounded-xl border border-slate-200 dark:border-[#2a3b7d] bg-slate-50 dark:bg-[#0d1736] lg:min-h-[420px]">
                                    <div className="absolute inset-0">
                                        <MongoliaMap activeLayer="Одоогийн цаг агаар" />
                                    </div>
                                </div>
                            </section>

                            {/* SUMMARY */}

                            <section className="weather-card">
                                <h2 className="card-title">
                                    Цаг агаарын мэдээлэл
                                </h2>

                                <div className="summary-list">
                                    {summaryRows.map((row, index) => (
                                        <div
                                            key={row.label}
                                            className={`summary-row ${
                                                index ===
                                                summaryRows.length - 1
                                                    ? "last"
                                                    : ""
                                            }`}
                                        >
                                            <div className="summary-label">
                                                <span>{row.icon}</span>

                                                <div>
                                                    <small>{row.label}</small>
                                                    <strong>{row.title}</strong>
                                                </div>
                                            </div>

                                            <strong className="summary-value">
                                                {row.value}
                                            </strong>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* DETAILS */}

                            <section className="weather-card">
                                <h2 className="card-title">Дэлгэрэнгүй</h2>

                                <div className="detail-grid">
                                    {detailTiles.map((tile) => (
                                        <div
                                            key={tile.label}
                                            className="detail-tile"
                                        >
                                            <span>{tile.icon}</span>
                                            <small>{tile.label}</small>
                                            <strong>{tile.value}</strong>
                                            <p>{tile.note}</p>
                                            {tile.extra}
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </aside>
                    </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}