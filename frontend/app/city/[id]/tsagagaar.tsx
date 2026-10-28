"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import Header from "../../hesguud/Header";
import Footer from "../../hesguud/Footer";

import "./tsagagaar.css";

// =====================================================
// API
// =====================================================

const API_BASE_URL = "/backend";
const enc = encodeURIComponent;

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

// Одоогийн болон цагийн мэдээний нийтлэг талбарууд
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
    ajiglasan_ognoo?: string | null;
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
    id?: number;
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

// =====================================================
// HELPERS
// =====================================================

const weekdays = ["Ня", "Да", "Мя", "Лх", "Пү", "Ба", "Бя"];

const isEmpty = (v: unknown) => v === null || v === undefined || v === "";

const pad = (n: number) => String(n).padStart(2, "0");

function num(value: unknown): number {
    return isEmpty(value) ? NaN : Number(value);
}

function roundValue(value: unknown): string | number {
    if (isEmpty(value)) return "-";
    const n = Number(value);
    return Number.isFinite(n) ? Math.round(n) : "-";
}

function getDateOnly(value: unknown): string {
    if (!value) return "";
    const text = String(value).trim();
    return text.match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? text.substring(0, 10);
}

/** Date -> "YYYY-MM-DD" (local) */
function toDateKey(d: Date): string {
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "HH:MM" -> минут */
function toMinutes(hhmm: string): number | null {
    const m = hhmm.match(/^(\d{2}):(\d{2})$/);
    return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

function getToday(): string {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Ulaanbaatar",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date());
}

function getMongoliaNow(): Date {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ulaanbaatar",
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

function formatDate(date: string): string {
    const p = date.split("-");
    return p.length !== 3 ? date || "-" : `${p[1]}-${p[2]}`;
}

function getWeekday(date: string): string {
    if (!date) return "-";
    const [y, m, d] = date.split("-").map(Number);
    return weekdays[new Date(Date.UTC(y, m - 1, d)).getUTCDay()] ?? "-";
}

function formatTime(value: unknown): string {
    if (isEmpty(value)) return "-";
    const raw = String(value).trim();
    const match = raw.match(/(\d{1,2}):(\d{2})(?::\d{2})?/);
    return match ? `${match[1].padStart(2, "0")}:${match[2]}` : raw;
}

/** "YYYY-MM-DD HH:mm[:ss]" эсвэл "YYYY-MM-DDTHH:mm[:ss]" -> local Date */
function parseLocalDateTime(text: string): Date | null {
    const m = text.match(
        /^(\d{4})-(\d{2})-(\d{2})[T ](\d{1,2}):(\d{2})(?::(\d{2}))?/
    );
    if (!m) return null;
    return new Date(
        Number(m[1]),
        Number(m[2]) - 1,
        Number(m[3]),
        Number(m[4]),
        Number(m[5]),
        Number(m[6] ?? 0),
        0
    );
}

/** Timezone (Z, +hh:mm)-тэй бол шууд, үгүй бол local гэж parse хийнэ */
function parseDateTime(value: unknown): Date | null {
    if (!value) return null;
    const text = String(value).trim();

    if (/Z$/i.test(text) || /[+-]\d{2}:\d{2}$/.test(text)) {
        const d = new Date(text);
        return Number.isNaN(d.getTime()) ? null : d;
    }

    return parseLocalDateTime(text);
}

/** Array эсвэл { data: Array } -> Array */
function toArray<T>(value: any): T[] {
    if (Array.isArray(value)) return value;
    if (Array.isArray(value?.data)) return value.data;
    return [];
}

// =====================================================
// HOURLY DATE TIME
//
// tsag нь:
//  1. 2026-10-08 13:00:00
//  2. 2026-10-08T13:00:00
//  3. 13:00:00  (зөвхөн цаг — огноог ajiglasan_ognoo / hadgalsan_ognoo-оос авна)
// =====================================================

function getHourlyDateTime(item: Hourly): Date | null {
    const tsag = item.tsag ? String(item.tsag).trim() : "";

    const full = parseDateTime(tsag);
    if (full) return full;

    const base =
        parseDateTime(item.ajiglasan_ognoo) ??
        parseDateTime(item.hadgalsan_ognoo);

    const m = tsag.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (m && base) {
        base.setHours(Number(m[1]), Number(m[2]), Number(m[3] ?? 0), 0);
    }

    return base;
}

function getHourBucket(date: Date): Date {
    const bucket = new Date(date);
    bucket.setMinutes(0, 0, 0);
    return bucket;
}

function getHourLabel(item: Hourly): string {
    const date = getHourlyDateTime(item);
    return date ? `${pad(getHourBucket(date).getHours())}:00` : "-";
}

function getHourlyDateLabel(item: Hourly): string {
    const date = getHourlyDateTime(item);
    if (!date) return "";

    const itemDate = toDateKey(date);
    const today = getMongoliaNow();

    if (itemDate === toDateKey(today)) return "Өнөөдөр";

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (itemDate === toDateKey(tomorrow)) return "Маргааш";

    return formatDate(itemDate);
}

function isNightHour(item: Hourly, forecasts: Forecast[]): boolean {
    const date = getHourlyDateTime(item);
    if (!date) return false;

    const itemDate = toDateKey(date);
    const forecast = forecasts.find((f) => getDateOnly(f.ognoo) === itemDate);

    if (forecast?.nar_mandah && forecast?.nar_jargah) {
        const rise = toMinutes(formatTime(forecast.nar_mandah));
        const set = toMinutes(formatTime(forecast.nar_jargah));

        if (rise !== null && set !== null) {
            const minutes = date.getHours() * 60 + date.getMinutes();
            return minutes < rise || minutes >= set;
        }
    }

    const hour = date.getHours();
    return hour < 6 || hour >= 18;
}

// =====================================================
// WEATHER CONDITION + ICON (нэг хүснэгт)
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
    { label: string; icon: string; nightLabel?: string; nightIcon?: string }
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
    const t = (condition ?? "").toLowerCase().trim();
    const has = (w: string) => t.includes(w);

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
// FORECAST SCORE
// =====================================================

function getForecastScore(f: Forecast): number {
    return [
        f.temperatur_min_c,
        f.temperatur_max_c,
        f.nohtsol,
        f.hur_tunadas_magadlalt_huvi,
        f.hur_tunadas_mm,
        f.salhiny_hurd_ms,
        f.nar_mandah,
        f.nar_jargah,
    ].filter((v) => !isEmpty(v)).length;
}

// =====================================================
// GET JSON
// =====================================================

async function getJson(url: string, message: string) {
    try {
        const response = await fetch(url, {
            method: "GET",
            cache: "no-store",
        });

        if (!response.ok) {
            throw new Error(`${message} HTTP ${response.status}`);
        }

        const json = await response.json();
        return json?.data ?? json;
    } catch (error) {
        console.error("❌ API ERROR:", url, error);
        throw error;
    }
}

// =====================================================
// FIND LATEST / CURRENT / NEXT 24H
// =====================================================

function extractHourlyData(response: any): Hourly[] {
    if (Array.isArray(response)) return response;
    if (Array.isArray(response?.hourly)) return response.hourly;
    if (Array.isArray(response?.data)) return response.data;
    if (Array.isArray(response?.data?.hourly)) return response.data.hourly;
    return [];
}

function getLatestWeather(data: CurrentWeather[]): CurrentWeather | null {
    if (!Array.isArray(data) || data.length === 0) return null;

    const time = (item: CurrentWeather) =>
        parseDateTime(
            item.ajiglasan_ognoo ?? item.tsag ?? item.hadgalsan_ognoo
        )?.getTime() ?? 0;

    return [...data].sort((a, b) => time(b) - time(a))[0] ?? null;
}

/** Огноотой цагийн мэдээнүүдийг цагаар нь эрэмбэлж буцаана */
function withDates(data: Hourly[]): { item: Hourly; date: Date }[] {
    if (!Array.isArray(data)) return [];

    return data
        .map((item) => ({ item, date: getHourlyDateTime(item) }))
        .filter((v): v is { item: Hourly; date: Date } => v.date !== null)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** Монголын одоогийн цагт хамгийн ойр бичлэг */
function getCurrentHourlyWeather(data: Hourly[]): Hourly | null {
    const nowTime = getMongoliaNow().getTime();

    return (
        withDates(data).sort(
            (a, b) =>
                Math.abs(a.date.getTime() - nowTime) -
                Math.abs(b.date.getTime() - nowTime)
        )[0]?.item ?? null
    );
}

/** Одоогийн цагаас эхлэх 24 цаг (цаг тутамд нэг бичлэг) */
function filterNext24Hours(data: Hourly[]): Hourly[] {
    const start = getHourBucket(getMongoliaNow());
    const end = new Date(start);
    end.setHours(end.getHours() + 24);

    const bucketMap = new Map<number, Hourly>();

    withDates(data).forEach(({ item, date }) => {
        bucketMap.set(getHourBucket(date).getTime(), item);
    });

    return Array.from(bucketMap.entries())
        .filter(([time]) => time >= start.getTime() && time < end.getTime())
        .sort(([a], [b]) => a - b)
        .slice(0, 24)
        .map(([, item]) => item);
}

// =====================================================
// RAIN
// =====================================================

function getRainProbability(value: unknown): string {
    const n = num(value);
    return Number.isFinite(n) ? `${Math.round(n)}%` : "-";
}

function getRainAmount(value: unknown): string {
    const n = num(value);
    return Number.isFinite(n) ? `${n.toFixed(1)} мм` : "-";
}

// =====================================================
// COMPONENT
// =====================================================

export default function CityPage() {
    const params = useParams();
    const router = useRouter();

    const stationId = String(params?.id ?? "549");

    // ---------------- STATE ----------------

    const [station, setStation] = useState<Station | null>(null);
    const [stations, setStations] = useState<Station[]>([]);
    const [current, setCurrent] = useState<CurrentWeather | null>(null);
    const [currentHourly, setCurrentHourly] = useState<Hourly | null>(null);
    const [forecasts, setForecasts] = useState<Forecast[]>([]);
    const [hourly, setHourly] = useState<Hourly[]>([]);

    const [loading, setLoading] = useState(true);
    const [hourlyLoading, setHourlyLoading] = useState(true);
    const [error, setError] = useState("");

    const [searchText, setSearchText] = useState("");
    const [showStationList, setShowStationList] = useState(false);

    // ---------------- LOAD ALL STATIONS ----------------

    useEffect(() => {
        async function loadStations() {
            try {
                const data = await getJson(
                    STATIONS_ENDPOINT,
                    "Станцуудыг авахад алдаа гарлаа."
                );
                setStations(toArray<Station>(data));
            } catch {
                setStations([]);
            }
        }

        loadStations();
    }, []);

    // ---------------- FILTER STATIONS ----------------

    const filteredStations = useMemo(() => {
        const keyword = searchText.trim().toLowerCase();

        if (!keyword) return stations.slice(0, 10);

        return stations
            .filter((item) =>
                [
                    item.ner,
                    item.ner_en,
                    item.aimag,
                    String(item.stants_dugaar),
                ].some((v) => v?.toLowerCase().includes(keyword))
            )
            .slice(0, 10);
    }, [stations, searchText]);

    // ---------------- LOAD MAIN DATA ----------------

    useEffect(() => {
        async function load() {
            try {
                setLoading(true);
                setError("");

                // STATION
                const stationData = await getJson(
                    STATION_ENDPOINT(stationId),
                    "Станцын мэдээлэл авахад алдаа гарлаа."
                );

                setStation(
                    Array.isArray(stationData)
                        ? stationData[0] ?? null
                        : stationData
                );

                // CURRENT
                const currentResponse = await getJson(
                    CURRENT_ENDPOINT(stationId),
                    "Одоогийн цаг агаар авахад алдаа гарлаа."
                );

                const isList =
                    Array.isArray(currentResponse) ||
                    Array.isArray(currentResponse?.data);

                setCurrent(
                    isList
                        ? getLatestWeather(toArray<CurrentWeather>(currentResponse))
                        : currentResponse
                );

                // FORECAST
                const forecastData = toArray<Forecast>(
                    await getJson(
                        FORECAST_ENDPOINT(stationId),
                        "Урьдчилсан мэдээ авахад алдаа гарлаа."
                    )
                );

                // Өдөр бүрт нэг мэдээ (хамгийн дүүрэн нь)
                const forecastMap = new Map<string, Forecast>();

                forecastData
                    .filter((item) => item && item.ognoo)
                    .map((item) => ({ ...item, ognoo: getDateOnly(item.ognoo) }))
                    .sort((a, b) => String(a.ognoo).localeCompare(String(b.ognoo)))
                    .forEach((item) => {
                        const key = String(item.ognoo);
                        const previous = forecastMap.get(key);

                        if (
                            !previous ||
                            getForecastScore(item) > getForecastScore(previous)
                        ) {
                            forecastMap.set(key, item);
                        }
                    });

                const allForecasts = Array.from(forecastMap.values());
                const today = getToday();
                const future = allForecasts.filter(
                    (item) => String(item.ognoo) >= today
                );

                setForecasts((future.length ? future : allForecasts).slice(0, 7));
            } catch (err) {
                console.error("CITY PAGE ERROR:", err);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Мэдээлэл авахад алдаа гарлаа."
                );
            } finally {
                setLoading(false);
            }
        }

        load();
    }, [stationId]);

    // ---------------- LOAD HOURLY ----------------

    useEffect(() => {
        async function loadHourly() {
            try {
                setHourlyLoading(true);

                const data = extractHourlyData(
                    await getJson(
                        HOURLY_ENDPOINT(stationId),
                        "Цагийн мэдээлэл авахад алдаа гарлаа."
                    )
                );

                setCurrentHourly(getCurrentHourlyWeather(data));
                setHourly(filterNext24Hours(data));
            } catch {
                setHourly([]);
                setCurrentHourly(null);
            } finally {
                setHourlyLoading(false);
            }
        }

        loadHourly();
    }, [stationId]);

    // ---------------- DISPLAY CURRENT ----------------
    // HOURLY CURRENT = PRIMARY, CURRENT API = FALLBACK

    const displayCurrent: CurrentWeather | null = currentHourly ?? current;

    // ---------------- GRAPH ----------------

    const maxes = forecasts.map((f) => num(f.temperatur_max_c));
    const mins = forecasts.map((f) => num(f.temperatur_min_c));

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
            .map((v, i) =>
                Number.isFinite(v) ? `${graphX(i)},${graphY(v)}` : null
            )
            .filter((p): p is string => Boolean(p))
            .join(" ");

    const graphTicks = [
        graphMaxValue,
        Math.round((graphMaxValue + graphMinValue) / 2),
        graphMinValue,
    ];

    const renderArea = (values: number[], kind: "max" | "min") =>
        values.every(Number.isFinite) && (
            <polygon
                points={`${graphPaddingX},${graphBottom} ${graphLine(values)} ${
                    graphWidth - graphPaddingX
                },${graphBottom}`}
                className={`graph-${kind}-area`}
            />
        );

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

    const today = getToday();

    const todayForecast =
        forecasts.find((f) => getDateOnly(f.ognoo) === today) ?? forecasts[0];

    const sunrise = todayForecast?.nar_mandah
        ? formatTime(todayForecast.nar_mandah)
        : "-";
    const sunset = todayForecast?.nar_jargah
        ? formatTime(todayForecast.nar_jargah)
        : "-";

    const currentHourlyDate = currentHourly
        ? getHourlyDateTime(currentHourly)
        : null;

    const currentWeatherInfo = getWeatherInfo(
        displayCurrent?.tsag_agaar_nohtsol
    );

    // ---------------- DETAIL TILES ----------------

    const detailTiles: {
        icon: string;
        label: string;
        value: React.ReactNode;
        note: string;
        extra?: React.ReactNode;
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
        { icon: "🌅", label: "Нар мандах", value: sunrise, note: "Өнөөдөр" },
        { icon: "🌇", label: "Нар жаргах", value: sunset, note: "Өнөөдөр" },
        {
            icon: "🌧️",
            label: "Хур тунадас",
            value: getRainProbability(todayForecast?.hur_tunadas_magadlalt_huvi),
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
        value: React.ReactNode;
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

    // ---------------- SELECT STATION ----------------

    function selectStation(item: Station) {
        setSearchText("");
        setShowStationList(false);
        router.push(`/city/${String(item.stants_dugaar)}`);
    }

    // =================================================
    // RENDER
    // =================================================

    return (
        <div className="weather-page">
            <Header />

            <main className="weather-main">
                <div className="weather-container">
                    {error && <div className="weather-error">⚠️ {error}</div>}

                    {/* STATION SEARCH */}

                    <section className="station-search-card">
                        <div className="station-search-title">
                            <div>
                                <p className="eyebrow">БАЙРШИЛ СОНГОХ</p>
                                <h2>Хот, аймаг сонгох</h2>
                                <p>Хот эсвэл станцын нэрээр хайна уу</p>
                            </div>

                            <div className="selected-station">
                                <span>Одоогийн сонголт</span>
                                <strong>
                                    {station?.ner ?? `Станц ${stationId}`}
                                </strong>
                            </div>
                        </div>

                        <div className="station-search-box">
                            <span className="search-icon">🔍</span>

                            <input
                                type="text"
                                value={searchText}
                                onChange={(e) => {
                                    setSearchText(e.target.value);
                                    setShowStationList(true);
                                }}
                                onFocus={() => setShowStationList(true)}
                                placeholder="Улаанбаатар, Дархан, Эрдэнэт..."
                            />

                            {searchText && (
                                <button
                                    type="button"
                                    className="search-clear"
                                    onClick={() => {
                                        setSearchText("");
                                        setShowStationList(true);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {showStationList && (
                            <div className="station-dropdown">
                                {filteredStations.length === 0 ? (
                                    <div className="station-empty">
                                        Станц олдсонгүй
                                    </div>
                                ) : (
                                    filteredStations.map((item) => {
                                        const id = String(item.stants_dugaar);

                                        return (
                                            <button
                                                key={id}
                                                type="button"
                                                className={`station-dropdown-item ${
                                                    id === stationId
                                                        ? "selected"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    selectStation(item)
                                                }
                                            >
                                                <div className="station-dropdown-icon">
                                                    📍
                                                </div>

                                                <div className="station-dropdown-info">
                                                    <strong>{item.ner}</strong>
                                                    <span>
                                                        {item.aimag ?? "Монгол"}
                                                    </span>
                                                </div>

                                                <div className="station-dropdown-number">
                                                    №{id}
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        )}
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
                                            {station?.stants_dugaar ?? stationId}
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
                                        {roundValue(displayCurrent?.temperatur_c)}
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

                                        {currentHourlyDate && (
                                            <small>
                                                Мэдээлэл:{" "}
                                                {currentHourlyDate.toLocaleTimeString(
                                                    "mn-MN",
                                                    {
                                                        hour: "2-digit",
                                                        minute: "2-digit",
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
                                        <h2>
                                            Өнөөдөр цаг агаарийн цагийн мэдээлэл
                                        </h2>
                                        <p>Одоогийн цагаас эхлэн</p>
                                    </div>

                                    <span>{hourly.length} цаг</span>
                                </div>

                                {hourlyLoading ? (
                                    <div className="hourly-loading">
                                        {Array.from({ length: 8 }).map(
                                            (_, i) => (
                                                <div
                                                    key={i}
                                                    className="hourly-skeleton"
                                                />
                                            )
                                        )}
                                    </div>
                                ) : hourly.length === 0 ? (
                                    <div className="empty-data">
                                        <p>Цагийн мэдээлэл олдсонгүй</p>
                                        <small>
                                            Backend болон DB дээр цагийн
                                            мэдээлэл шалгана уу.
                                        </small>
                                    </div>
                                ) : (
                                    <div className="hourly-scroll">
                                        <div className="hourly-list">
                                            {hourly.map((item, index) => {
                                                const night = isNightHour(
                                                    item,
                                                    forecasts
                                                );

                                                const { label, icon } =
                                                    getWeatherInfo(
                                                        item.tsag_agaar_nohtsol,
                                                        night
                                                    );

                                                const isCurrentHour =
                                                    !!currentHourly &&
                                                    (item.id !== undefined &&
                                                    currentHourly.id !== undefined
                                                        ? String(item.id) ===
                                                          String(currentHourly.id)
                                                        : getHourlyDateTime(
                                                              currentHourly
                                                          )?.getTime() ===
                                                          getHourlyDateTime(
                                                              item
                                                          )?.getTime());

                                                return (
                                                    <div
                                                        key={`${
                                                            item.id ?? index
                                                        }-${
                                                            item.tsag ??
                                                            item.ajiglasan_ognoo ??
                                                            index
                                                        }`}
                                                        className={`hourly-item ${
                                                            isCurrentHour
                                                                ? "current-hour"
                                                                : ""
                                                        }`}
                                                    >
                                                        <span className="hour">
                                                            {getHourLabel(item)}
                                                        </span>

                                                        <small className="hourly-date">
                                                            {getHourlyDateLabel(
                                                                item
                                                            )}
                                                        </small>

                                                        <span className="hourly-icon">
                                                            {icon}
                                                        </span>

                                                        <strong>
                                                            {roundValue(
                                                                item.temperatur_c
                                                            )}
                                                            °
                                                        </strong>

                                                        <small>
                                                            Чийг{" "}
                                                            {roundValue(
                                                                item.chigleg_huvi
                                                            )}
                                                            %
                                                        </small>

                                                        <small>{label}</small>
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
                                            {forecasts.map((forecast, index) => {
                                                const date = getDateOnly(
                                                    forecast.ognoo
                                                );
                                                const rain = num(
                                                    forecast.hur_tunadas_magadlalt_huvi
                                                );
                                                const { label, icon } =
                                                    getWeatherInfo(
                                                        forecast.nohtsol
                                                    );

                                                return (
                                                    <div
                                                        key={`${date}-${
                                                            forecast.id ?? index
                                                        }`}
                                                        className={`forecast-day ${
                                                            index === 0
                                                                ? "today"
                                                                : ""
                                                        }`}
                                                    >
                                                        <strong className="forecast-weekday">
                                                            {index === 0
                                                                ? "Өнөөдөр"
                                                                : getWeekday(
                                                                      date
                                                                  )}
                                                        </strong>

                                                        <span className="forecast-date">
                                                            {formatDate(date)}
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
                                            })}
                                        </div>

                                        {/* GRAPH */}

                                        <div className="forecast-graph">
                                            <svg
                                                viewBox={`0 0 ${graphWidth} ${graphHeight}`}
                                                className="weather-graph"
                                                preserveAspectRatio="none"
                                                role="img"
                                                aria-label="7 хоногийн температурын график"
                                            >
                                                {/* GRID */}
                                                {graphTicks.map((tick, index) => {
                                                    const y = graphY(tick);

                                                    return (
                                                        <g key={`tick-${index}`}>
                                                            <line
                                                                x1={graphPaddingX}
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
                                                })}

                                                {/* VERTICAL GUIDES */}
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
                                                />
                                                <polyline
                                                    points={graphLine(mins)}
                                                    className="graph-min-line"
                                                />

                                                {renderPoints(maxes, "max", -12)}
                                                {renderPoints(mins, "min", 24)}
                                            </svg>
                                        </div>
                                    </div>
                                )}
                            </section>
                        </section>

                        {/* RIGHT SIDEBAR */}

                        <aside className="weather-sidebar">
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
                                                index === summaryRows.length - 1
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