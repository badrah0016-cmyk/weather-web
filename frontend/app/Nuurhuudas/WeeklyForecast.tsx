
"use client";

import { useEffect, useMemo, useState } from "react";
import "./WeeklyForecast.css";

type ForecastItem = {
    ognoo?: string;
    ajiglasan_ognoo?: string;
    uridchilsan_ognoo?: string;
    date?: string;
    forecast_date?: string;

    temp_min?: number | string;
    temp_max?: number | string;
    min_temp?: number | string;
    max_temp?: number | string;
    min_temperature?: number | string;
    max_temperature?: number | string;
    temperature_min?: number | string;
    temperature_max?: number | string;
    temperature?: number | string;
    temp?: number | string;

    nohtsol?: string;
    condition?: string;
    weather_condition?: string;

    precipitation_probability?: number | string;
    precip_probability?: number | string;
    precipitation?: number | string;
    hur_tunasad?: number | string;

    sunrise?: string;
    sunset?: string;
};

type DayForecast = {
    date: Date;
    min: number | null;
    max: number | null;
    condition: string;
    precipitation: number | null;
    items: ForecastItem[];
};

type Props = {
    stationId?: string | number;
    stationName?: string;
};

const API_BASE_URL = "/backend";
const TIME_ZONE = "Asia/Ulaanbaatar";

function readValue(
    item: ForecastItem,
    keys: (keyof ForecastItem)[]
): number | string | null {
    for (const key of keys) {
        const value = item[key];

        if (value !== undefined && value !== null && value !== "") {
            return value;
        }
    }

    return null;
}

function toNumber(value: number | string | null): number | null {
    if (value === null) return null;

    const result = Number(value);
    return Number.isFinite(result) ? result : null;
}

function readDate(item: ForecastItem): Date | null {
    const value = readValue(item, [
        "ognoo",
        "uridchilsan_ognoo",
        "date",
        "forecast_date",
        "ajiglasan_ognoo",
    ]);

    if (value === null) return null;

    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? null : date;
}

function dateKey(date: Date): string {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(date);

    const part = (type: string) =>
        parts.find((item) => item.type === type)?.value ?? "";

    return `${part("year")}-${part("month")}-${part("day")}`;
}

function dayLabel(date: Date, index: number): string {
    if (index === 0) return "Өнөөдөр";

    if (index === 1) return "Маргааш";

    return new Intl.DateTimeFormat("mn-MN", {
        timeZone: TIME_ZONE,
        weekday: "long",
    }).format(date);
}

function shortDate(date: Date): string {
    return new Intl.DateTimeFormat("mn-MN", {
        timeZone: TIME_ZONE,
        month: "short",
        day: "numeric",
    }).format(date);
}

function weatherIcon(condition: string): string {
    const text = condition.toLowerCase();

    if (text.includes("цас") || text.includes("snow")) return "❄️";
    if (
        text.includes("бороо") ||
        text.includes("rain") ||
        text.includes("хур")
    ) return "🌧️";
    if (
        text.includes("аянга") ||
        text.includes("thunder")
    ) return "⛈️";
    if (
        text.includes("манан") ||
        text.includes("fog")
    ) return "🌫️";
    if (
        text.includes("үүл") ||
        text.includes("cloud")
    ) return "☁️";

    return "☀️";
}

function normalizeForecast(rows: ForecastItem[]): DayForecast[] {
    const grouped = new Map<string, ForecastItem[]>();

    for (const item of rows) {
        const date = readDate(item);
        if (!date) continue;

        const key = dateKey(date);
        const group = grouped.get(key) ?? [];
        group.push(item);
        grouped.set(key, group);
    }

    return Array.from(grouped.entries())
        .map(([key, items]) => {
            const date = readDate(items[0])!;

            const minValues = items
                .map((item) =>
                    toNumber(
                        readValue(item, [
                            "temp_min",
                            "min_temp",
                            "min_temperature",
                            "temperature_min",
                        ])
                    )
                )
                .filter((value): value is number => value !== null);

            const maxValues = items
                .map((item) =>
                    toNumber(
                        readValue(item, [
                            "temp_max",
                            "max_temp",
                            "max_temperature",
                            "temperature_max",
                        ])
                    )
                )
                .filter((value): value is number => value !== null);

            // Хэрэв тухайн өдрийн нэг л температурын утга ирвэл
            // түүнээс түр min/max тооцож харуулна.
            const temperatures = items
                .map((item) =>
                    toNumber(
                        readValue(item, ["temperature", "temp"])
                    )
                )
                .filter((value): value is number => value !== null);

            const allMin = minValues.length
                ? Math.min(...minValues)
                : temperatures.length
                  ? Math.min(...temperatures)
                  : null;

            const allMax = maxValues.length
                ? Math.max(...maxValues)
                : temperatures.length
                  ? Math.max(...temperatures)
                  : null;

            const condition =
                items
                    .map((item) =>
                        readValue(item, [
                            "nohtsol",
                            "condition",
                            "weather_condition",
                        ])
                    )
                    .find((value) => value !== null) ?? "Төлөв тодорхойгүй";

            const precipitationValues = items
                .map((item) =>
                    toNumber(
                        readValue(item, [
                            "precipitation_probability",
                            "precip_probability",
                            "precipitation",
                            "hur_tunasad",
                        ])
                    )
                )
                .filter((value): value is number => value !== null);

            return {
                date,
                min: allMin,
                max: allMax,
                condition: String(condition),
                precipitation: precipitationValues.length
                    ? Math.max(...precipitationValues)
                    : null,
                items,
            };
        })
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .filter((day) => day.date.getTime() >= new Date(
            `${keyDateToday()}T00:00:00`
        ).getTime())
        .slice(0, 7);
}

function keyDateToday(): string {
    return dateKey(new Date());
}

function TemperatureChart({ days }: { days: DayForecast[] }) {
    const valid = days.filter(
        (day) => day.min !== null && day.max !== null
    );

    if (valid.length === 0) {
        return (
            <p className="weekly-forecast__chart-empty">
                Температурын график байгуулахад өгөгдөл хүрэлцэхгүй байна.
            </p>
        );
    }

    const width = 700;
    const height = 230;
    const left = 36;
    const right = 20;
    const top = 24;
    const bottom = 38;

    const values = valid.flatMap((day) => [day.min!, day.max!]);
    const lowest = Math.min(...values);
    const highest = Math.max(...values);
    const range = Math.max(highest - lowest, 4);
    const minScale = lowest - range * 0.15;
    const maxScale = highest + range * 0.15;

    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;

    const x = (index: number) =>
        valid.length === 1
            ? left + plotWidth / 2
            : left + (index * plotWidth) / (valid.length - 1);

    const y = (value: number) =>
        top + ((maxScale - value) / (maxScale - minScale)) * plotHeight;

    const maxPoints = valid
        .map((day, index) => `${x(index)},${y(day.max!)}`)
        .join(" ");

    const minPoints = valid
        .map((day, index) => `${x(index)},${y(day.min!)}`)
        .join(" ");

    return (
        <div className="weekly-forecast__chart-wrap">
            <div className="weekly-forecast__chart-legend">
                <span>
                    <i className="weekly-forecast__legend-dot weekly-forecast__legend-dot--max" />
                    Их температур
                </span>
                <span>
                    <i className="weekly-forecast__legend-dot weekly-forecast__legend-dot--min" />
                    Бага температур
                </span>
            </div>

            <svg
                className="weekly-forecast__chart"
                viewBox={`0 0 ${width} ${height}`}
                role="img"
                aria-label="Долоо хоногийн их болон бага температурын график"
            >
                {[0, 1, 2, 3].map((line) => {
                    const gridY = top + (plotHeight * line) / 3;
                    const value =
                        maxScale - ((maxScale - minScale) * line) / 3;

                    return (
                        <g key={line}>
                            <line
                                x1={left}
                                y1={gridY}
                                x2={width - right}
                                y2={gridY}
                                className="weekly-forecast__grid-line"
                            />
                            <text
                                x={left - 8}
                                y={gridY + 4}
                                textAnchor="end"
                                className="weekly-forecast__axis-label"
                            >
                                {Math.round(value)}°
                            </text>
                        </g>
                    );
                })}

                <polyline
                    points={maxPoints}
                    className="weekly-forecast__line weekly-forecast__line--max"
                />

                <polyline
                    points={minPoints}
                    className="weekly-forecast__line weekly-forecast__line--min"
                />

                {valid.map((day, index) => (
                    <g key={dateKey(day.date)}>
                        <circle
                            cx={x(index)}
                            cy={y(day.max!)}
                            r="4.5"
                            className="weekly-forecast__point weekly-forecast__point--max"
                        />
                        <circle
                            cx={x(index)}
                            cy={y(day.min!)}
                            r="4.5"
                            className="weekly-forecast__point weekly-forecast__point--min"
                        />
                        <text
                            x={x(index)}
                            y={height - 12}
                            textAnchor="middle"
                            className="weekly-forecast__axis-label"
                        >
                            {new Intl.DateTimeFormat("mn-MN", {
                                timeZone: TIME_ZONE,
                                weekday: "short",
                            }).format(day.date)}
                        </text>
                    </g>
                ))}
            </svg>
        </div>
    );
}

export default function WeeklyForecast({
    stationId = 549,
    stationName = "Улаанбаатар",
}: Props) {
    const [rows, setRows] = useState<ForecastItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        const controller = new AbortController();

        async function loadForecast() {
            setLoading(true);
            setError("");

            try {
                const response = await fetch(
                    `${API_BASE_URL}/weather_db/uridchilsan_medee?stants_dugaar=${encodeURIComponent(String(stationId))}`,
                    {
                        cache: "no-store",
                        signal: controller.signal,
                    }
                );

                if (!response.ok) {
                    throw new Error(
                        `Урьдчилсан мэдээ авахад алдаа гарлаа (${response.status}).`
                    );
                }

                const result = await response.json();

                if (result?.success === false) {
                    throw new Error(
                        result.message || "Урьдчилсан мэдээ олдсонгүй."
                    );
                }

                const data =
                    result?.data ??
                    result?.forecast ??
                    result?.rows ??
                    result;

                if (!Array.isArray(data)) {
                    throw new Error(
                        "API-аас урьдчилсан мэдээний жагсаалт ирсэнгүй."
                    );
                }

                setRows(data as ForecastItem[]);
            } catch (err) {
                if (
                    err instanceof Error &&
                    err.name === "AbortError"
                ) {
                    return;
                }

                setError(
                    err instanceof Error
                        ? err.message
                        : "Урьдчилсан мэдээ авахад алдаа гарлаа."
                );
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        loadForecast();

        return () => controller.abort();
    }, [stationId]);

    const days = useMemo(() => normalizeForecast(rows), [rows]);

    return (
        <section
            className="weekly-forecast"
            aria-labelledby="weekly-forecast-title"
        >
            <div className="weekly-forecast__header">
                <div>
                    <p className="weekly-forecast__eyebrow">
                        7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ
                    </p>
                    <h2 id="weekly-forecast-title">
                        Ирэх 7 хоногийн цаг агаар
                    </h2>
                    <p className="weekly-forecast__description">
                        📍 {stationName} · Өдрийн их, бага температур
                    </p>
                </div>

                <span className="weekly-forecast__badge">
                    {days.length} өдөр
                </span>
            </div>

            {loading && (
                <div className="weekly-forecast__message">
                    7 хоногийн мэдээ ачаалж байна...
                </div>
            )}

            {!loading && error && (
                <div className="weekly-forecast__error" role="alert">
                    <strong>Мэдээ авах боломжгүй байна.</strong>
                    <p>{error}</p>
                </div>
            )}

            {!loading && !error && days.length === 0 && (
                <div className="weekly-forecast__message">
                    Урьдчилсан мэдээ олдсонгүй. API болон өгөгдлийн санг шалгана уу.
                </div>
            )}

            {!loading && !error && days.length > 0 && (
                <>
                    <div className="weekly-forecast__days">
                        {days.map((day, index) => (
                            <article
                                className={
                                    "weekly-forecast__day" +
                                    (index === 0
                                        ? " weekly-forecast__day--today"
                                        : "")
                                }
                                key={dateKey(day.date)}
                            >
                                <div className="weekly-forecast__day-heading">
                                    <strong>{dayLabel(day.date, index)}</strong>
                                    <span>{shortDate(day.date)}</span>
                                </div>

                                <span className="weekly-forecast__icon">
                                    {weatherIcon(day.condition)}
                                </span>

                                <p className="weekly-forecast__condition">
                                    {day.condition}
                                </p>

                                <div className="weekly-forecast__temperatures">
                                    <strong>
                                        {day.max === null
                                            ? "—"
                                            : `${day.max}°`}
                                    </strong>
                                    <span>
                                        {day.min === null
                                            ? "—"
                                            : `${day.min}°`}
                                    </span>
                                </div>

                                {day.precipitation !== null && (
                                    <p className="weekly-forecast__precipitation">
                                        🌧️ {day.precipitation}
                                    </p>
                                )}
                            </article>
                        ))}
                    </div>

                    <div className="weekly-forecast__chart-panel">
                        <div className="weekly-forecast__chart-heading">
                            <div>
                                <h3>Температурын график</h3>
                                <p>Өдөр бүрийн хамгийн их ба бага хэм</p>
                            </div>
                            <span>°C</span>
                        </div>

                        <TemperatureChart days={days} />
                    </div>
                </>
            )}
        </section>
    );
}
