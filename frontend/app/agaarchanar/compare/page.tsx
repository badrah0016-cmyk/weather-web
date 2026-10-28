
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  Legend,
} from "recharts";
import * as XLSX from "xlsx";

import AgaarHeader from "../AgaarHeader";
import Footer from "../../hesguud/Footer";
import "./compare.css";

const API_BASE = "/backend/weather_db";
const MAX_SERIES = 8;
const ALL_STATIONS = "__all__";

const COLORS = [
  "#0d9ba5",
  "#7c6fe0",
  "#e3a04b",
  "#3b9b70",
  "#d86f83",
  "#4776c5",
  "#bb6bd9",
  "#85952c",
];

type PollutionKey = "aqi" | "pm25" | "pm10" | "no2" | "so2" | "co" | "o3";
type Grouping = "hour" | "day" | "month" | "all";
type Period = "today" | "7d" | "1m" | "6m" | "12m" | "custom";

type Station = {
  sid?: string | number;
  station_sid?: string | number;
  stants_dugaar?: string | number;
  ner?: string;
  station_name?: string;
};

type Measurement = {
  station_sid?: string | number;
  stants_dugaar?: string | number;
  sid?: string | number;
  aqi?: number | string | null;
  pm25?: number | string | null;
  pm2_5?: number | string | null;
  pm10?: number | string | null;
  no2?: number | string | null;
  so2?: number | string | null;
  co?: number | string | null;
  o3?: number | string | null;
  hemjsen_ognoo?: string | null;
  shinechilsen_ognoo?: string | null;
  ognoo?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  hadgalsan_ognoo?: string | null;
  station_name?: string | null;
  ner?: string | null;
};

type Metric = {
  value: PollutionKey;
  label: string;
  unit: string;
};

type DetailRow = {
  id: string;
  stationId: string;
  stationNumber: string;
  station: string;
  date: string;
  time: string;
  values: Record<PollutionKey, number>;
};

type ChartSeries = {
  key: string;
  name: string;
  color: string;
};

type Breakpoint = {
  low: number;
  high: number;
  aqiLow: number;
  aqiHigh: number;
};

const METRICS: Metric[] = [
  { value: "aqi", label: "AQI", unit: "индекс" },
  { value: "pm25", label: "PM2.5", unit: "µg/m³" },
  { value: "pm10", label: "PM10", unit: "µg/m³" },
  { value: "no2", label: "NO₂", unit: "µg/m³" },
  { value: "so2", label: "SO₂", unit: "µg/m³" },
  { value: "co", label: "CO", unit: "mg/m³" },
  { value: "o3", label: "O₃", unit: "µg/m³" },
];



const PERIODS: { value: Period; label: string }[] = [
  { value: "today", label: "Өнөөдөр" },
  { value: "7d", label: "7 хоног" },
  { value: "1m", label: "1 сар" },
  { value: "6m", label: "6 сар" },
  { value: "12m", label: "12 сар" },
  { value: "custom", label: "Өөрөө сонгох" },
];

const GROUPS: { value: Grouping; label: string }[] = [
  { value: "hour", label: "Цаг бүр" },
  { value: "day", label: "Өдөр бүр" },
  { value: "month", label: "Сар бүр" },
  { value: "all", label: "Нийт дүн" },
];

const PM25_BREAKPOINTS: Breakpoint[] = [
  { low: 0, high: 9, aqiLow: 0, aqiHigh: 50 },
  { low: 9.1, high: 35.4, aqiLow: 51, aqiHigh: 100 },
  { low: 35.5, high: 55.4, aqiLow: 101, aqiHigh: 150 },
  { low: 55.5, high: 125.4, aqiLow: 151, aqiHigh: 200 },
  { low: 125.5, high: 225.4, aqiLow: 201, aqiHigh: 300 },
  { low: 225.5, high: 325.4, aqiLow: 301, aqiHigh: 500 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { low: 0, high: 54, aqiLow: 0, aqiHigh: 50 },
  { low: 55, high: 154, aqiLow: 51, aqiHigh: 100 },
  { low: 155, high: 254, aqiLow: 101, aqiHigh: 150 },
  { low: 255, high: 354, aqiLow: 151, aqiHigh: 200 },
  { low: 355, high: 424, aqiLow: 201, aqiHigh: 300 },
  { low: 425, high: 604, aqiLow: 301, aqiHigh: 500 },
];

function getToday(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ulaanbaatar",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));

  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateString: string, days: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days));

  return [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function subtractMonths(dateString: string, months: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const target = new Date(Date.UTC(year, month - 1 - months, 1));

  const lastDay = new Date(
    Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)
  ).getUTCDate();

  target.setUTCDate(Math.min(day, lastDay));

  return [
    target.getUTCFullYear(),
    String(target.getUTCMonth() + 1).padStart(2, "0"),
    String(target.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

function toNum(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getStationId(station: Station): string {
  const id = station.sid ?? station.station_sid ?? station.stants_dugaar;

  return id === null || id === undefined ? "" : String(id).trim();
}

function getMeasurementStationId(row: Measurement): string {
  const id = row.station_sid ?? row.stants_dugaar ?? row.sid;

  return id === null || id === undefined ? "" : String(id).trim();
}

function getRawDateTime(row: Measurement): string {
  const raw =
    row.hemjsen_ognoo ??
    row.ognoo ??
    row.shinechilsen_ognoo ??
    row.created_at ??
    row.updated_at ??
    row.hadgalsan_ognoo ??
    "";

  return String(raw).trim().replace("T", " ").replace(/Z$/, "");
}

function getDate(row: Measurement): string {
  return getRawDateTime(row).match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? "";
}

function getTime(row: Measurement): string {
  const raw = getRawDateTime(row);

  return (
    raw.match(/^\d{4}-\d{2}-\d{2}\s+(\d{2}:\d{2}(?::\d{2})?)/)?.[1] ??
    "00:00"
  );
}

function belongsToStation(row: Measurement, sid: string): boolean {
  const rawId = getMeasurementStationId(row);

  // Станцын ID байхгүй өгөгдлийг буруу станцад холбохгүй.
  return rawId !== "" && rawId === sid;
}

function calculateSubIndex(
  concentration: number | null,
  breakpoints: Breakpoint[],
  decimal: boolean
): number | null {
  if (concentration === null || concentration < 0) return null;

  const value = decimal
    ? Math.floor(concentration * 10) / 10
    : Math.floor(concentration);

  const breakpoint = breakpoints.find(
    (item) => value >= item.low && value <= item.high
  );

  if (!breakpoint) return null;

  const result =
    ((breakpoint.aqiHigh - breakpoint.aqiLow) /
      (breakpoint.high - breakpoint.low)) *
      (value - breakpoint.low) +
    breakpoint.aqiLow;

  return Math.round(result);
}

function calculateAQI(row: Measurement): number {
  const apiAQI = toNum(row.aqi);

  if (apiAQI !== null && apiAQI > 0) return apiAQI;

  const pm25 = toNum(row.pm25 ?? row.pm2_5);
  const pm10 = toNum(row.pm10);

  const indexes = [
    calculateSubIndex(pm25, PM25_BREAKPOINTS, true),
    calculateSubIndex(pm10, PM10_BREAKPOINTS, false),
  ].filter((value): value is number => value !== null);

  return indexes.length ? Math.max(...indexes) : 0;
}

function getMetricValue(row: Measurement, key: PollutionKey): number {
  if (key === "aqi") return calculateAQI(row);

  const value =
    key === "pm25"
      ? toNum(row.pm25 ?? row.pm2_5)
      : toNum(row[key]);

  return value ?? 0;
}

function hasMeasurement(row: Measurement): boolean {
  return (
    toNum(row.aqi) !== null ||
    toNum(row.pm25 ?? row.pm2_5) !== null ||
    toNum(row.pm10) !== null ||
    toNum(row.no2) !== null ||
    toNum(row.so2) !== null ||
    toNum(row.co) !== null ||
    toNum(row.o3) !== null
  );
}

async function fetchJson(url: string) {
  const response = await fetch(url, { cache: "no-store" });
  const json = await response.json().catch(() => null);

  if (!response.ok || json?.success === false) {
    throw new Error(
      json?.message ?? `API хүсэлт амжилтгүй боллоо (${response.status}).`
    );
  }

  return json;
}

async function fetchHistory(sid: string): Promise<Measurement[]> {
  const json = await fetchJson(
    `${API_BASE}/agaar_chanar/history/${encodeURIComponent(sid)}`
  );

  if (Array.isArray(json?.data)) return json.data as Measurement[];
  if (Array.isArray(json)) return json as Measurement[];

  return [];
}

function getBucket(row: DetailRow, grouping: Grouping): string {
  if (grouping === "all") return "all";
  if (grouping === "month") return row.date.slice(0, 7);
  if (grouping === "day") return row.date;

  return `${row.date} ${row.time.slice(0, 2) || "00"}`;
}

function getBucketLabel(bucket: string): string {
  if (bucket === "all") return "Нийт";

  return bucket.replace(/-/g, ".");
}

export default function ComparePage() {
  const today = useMemo(() => getToday(), []);
  const thisYear = Number(today.slice(0, 4));
  const thisMonth = Number(today.slice(5, 7));

  const years = useMemo(
    () => Array.from({ length: 12 }, (_, i) => thisYear - i),
    [thisYear]
  );

  const [stations, setStations] = useState<Station[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [stationSearch, setStationSearch] = useState("");

  const [period, setPeriod] = useState<Period>("1m");
  const [selectedYear, setSelectedYear] = useState(thisYear);
  const [selectedMonth, setSelectedMonth] = useState(thisMonth);
  const [startDate, setStartDate] = useState(subtractMonths(today, 1));
  const [endDate, setEndDate] = useState(today);

  const [grouping, setGrouping] = useState<Grouping>("day");
  const [chartType, setChartType] = useState<"bar" | "line">("line");

  const [cache, setCache] = useState<Record<string, Measurement[]>>({});
  const [loadingStations, setLoadingStations] = useState(true);
  const [loading, setLoading] = useState(false);
  const [stationError, setStationError] = useState("");
  const [fetchError, setFetchError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const dateRange = useMemo(() => {
    if (period === "today") return { from: today, to: today };
    if (period === "7d") return { from: shiftDate(today, -6), to: today };
    if (period === "1m") return { from: subtractMonths(today, 1), to: today };
    if (period === "6m") return { from: subtractMonths(today, 6), to: today };
    if (period === "12m") return { from: subtractMonths(today, 12), to: today };

    return { from: startDate, to: endDate };
  }, [period, today, startDate, endDate]);

  useEffect(() => {
    let active = true;

    async function loadStations() {
      setLoadingStations(true);
      setStationError("");

      try {
        const json = await fetchJson(`${API_BASE}/agaar_chanar`);

        const raw = Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json)
            ? json
            : [];

        const map = new Map<string, Station>();

        for (const item of raw) {
          if (!item || typeof item !== "object") continue;

          const station = item as Station;
          const id = getStationId(station);

          if (id) map.set(id, station);
        }

        if (!active) return;

        const unique = Array.from(map.values());

        setStations(unique);
        setSelected([]);

        if (!unique.length) {
          setStationError("API-аас станцын мэдээлэл ирсэнгүй.");
        }
      } catch (error: unknown) {
        if (!active) return;

        setStations([]);
        setSelected([]);

        setStationError(
          error instanceof Error
            ? error.message
            : "Станцын мэдээллийг татаж чадсангүй."
        );
      } finally {
        if (active) setLoadingStations(false);
      }
    }

    void loadStations();

    return () => {
      active = false;
    };
  }, []);

  const stationName = useCallback(
    (id: string) => {
      const station = stations.find((item) => getStationId(item) === id);

      return station?.ner ?? station?.station_name ?? `Станц ${id}`;
    },
    [stations]
  );

  // "Бүх станц" сонгогдсон бол бүх станцын ID-г ашиглана.
  const neededSids = useMemo(
    () =>
      selected.includes(ALL_STATIONS)
        ? stations.map(getStationId).filter(Boolean)
        : selected,
    [selected, stations]
  );

  useEffect(() => {
    let active = true;

    async function loadHistory() {
      const missing = neededSids.filter((sid) => !(sid in cache));

      if (!missing.length) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setFetchError("");

      const results = await Promise.allSettled(
        missing.map((sid) => fetchHistory(sid))
      );

      if (!active) return;

      const next = { ...cache };
      const errors: string[] = [];

      results.forEach((result, index) => {
        const sid = missing[index];

        if (result.status === "fulfilled") {
          next[sid] = result.value;
        } else {
          errors.push(
            `${stationName(sid)} станцын хэмжилтийг татаж чадсангүй.`
          );
        }
      });

      setCache(next);
      setFetchError(errors.join(" "));
      setLoading(false);
    }

    void loadHistory();

    return () => {
      active = false;
    };
  }, [neededSids, cache, reloadKey, stationName]);

  function reload() {
    setFetchError("");
    setCache({});
    setReloadKey((value) => value + 1);
  }

  const stationEntries = useMemo(
    () =>
      stations.map((station) => ({
        id: getStationId(station),
        name:
          station.ner ??
          station.station_name ??
          `Станц ${getStationId(station)}`,
        sub: `Станцын дугаар: ${getStationId(station)}`,
      })),
    [stations]
  );

  const filteredStations = useMemo(() => {
    const query = stationSearch.trim().toLocaleLowerCase("mn");

    if (!query) return stationEntries;

    return stationEntries.filter(
      (entry) =>
        entry.name.toLocaleLowerCase("mn").includes(query) ||
        entry.id.toLocaleLowerCase("mn").includes(query)
    );
  }, [stationEntries, stationSearch]);

  function toggleStation(id: string) {
    setSelected((current) => {
      // Бүх станцын горимоос нэг станц сонговол дан сонголт руу шилжинэ.
      if (current.includes(ALL_STATIONS)) {
        return [id];
      }

      if (current.includes(id)) {
        return current.filter((value) => value !== id);
      }

      if (current.length >= MAX_SERIES) return current;

      return [...current, id];
    });
  }

  function toggleAllStations() {
    setSelected((current) =>
      current.includes(ALL_STATIONS) ? [] : [ALL_STATIONS]
    );
  }

  const detailRows = useMemo<DetailRow[]>(() => {
    const rows: DetailRow[] = [];

    for (const sid of neededSids) {
      const measurements = cache[sid] ?? [];

      for (const measurement of measurements) {
        if (!belongsToStation(measurement, sid)) continue;

        const date = getDate(measurement);

        if (!date || date < dateRange.from || date > dateRange.to) continue;
        if (!hasMeasurement(measurement)) continue;

        const station = stations.find((item) => getStationId(item) === sid);
        const values = {} as Record<PollutionKey, number>;

        for (const item of METRICS) {
          values[item.value] = getMetricValue(measurement, item.value);
        }

        rows.push({
          id: `${sid}-${getRawDateTime(measurement)}-${rows.length}`,
          stationId: sid,
          stationNumber: sid,
          station:
            station?.ner ?? station?.station_name ?? `Станц ${sid}`,
          date,
          time: getTime(measurement),
          values,
        });
      }
    }

    return rows.sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
    );
  }, [cache, neededSids, stations, dateRange]);

  // Хэмжилтийн хүснэгтэд бүх бохирдуулагчийг үргэлж харуулна.
  const visibleMetrics = METRICS;

  // Станц бүр тусдаа өнгөтэй байна. Нэг график = нэг бохирдуулагч.
  const chartSeries = useMemo<ChartSeries[]>(
    () =>
      neededSids.map((id, index) => ({
        key: `s${index}`,
        name: stationName(id),
        color: COLORS[index % COLORS.length],
      })),
    [neededSids, stationName]
  );

  const chartDataByMetric = useMemo<Record<PollutionKey, Record<string, string | number>[]>>(() => {
    const result = {} as Record<PollutionKey, Record<string, string | number>[]>;

    for (const metricItem of METRICS) {
      const buckets = new Map<string, Record<string, string | number>>();
      const grouped = new Map<
        string,
        { stationId: string; bucket: string; sum: number; count: number }
      >();

      for (const row of detailRows) {
        const bucket = getBucket(row, grouping);
        const key = `${row.stationId}__${bucket}`;
        const current = grouped.get(key) ?? {
          stationId: row.stationId,
          bucket,
          sum: 0,
          count: 0,
        };

        current.sum += row.values[metricItem.value];
        current.count += 1;
        grouped.set(key, current);
      }

      for (const item of grouped.values()) {
        const index = neededSids.indexOf(item.stationId);
        if (index < 0) continue;

        const output = buckets.get(item.bucket) ?? {
          bucket: item.bucket,
          label: getBucketLabel(item.bucket),
        };

        output[`s${index}`] = item.count ? item.sum / item.count : 0;
        buckets.set(item.bucket, output);
      }

      result[metricItem.value] = Array.from(buckets.values()).sort((a, b) =>
        String(a.bucket).localeCompare(String(b.bucket))
      );
    }

    return result;
  }, [detailRows, grouping, neededSids]);

  function downloadExcel() {
  if (!detailRows.length) return;

  const data = detailRows.map((row) => {
    const record: Record<string, string | number> = {
      "Станцын дугаар": row.stationNumber,
      "Станцын нэр": row.station,
      "Огноо": row.date,
      "Цаг": row.time,
    };

    for (const item of visibleMetrics) {
      record[`${item.label} (${item.unit})`] = row.values[item.value];
    }

    return record;
  });

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, "Агаарын чанар");

  // Багануудын өргөнийг тохируулах
  worksheet["!cols"] = [
    { wch: 18 },
    { wch: 28 },
    { wch: 14 },
    { wch: 12 },
    ...visibleMetrics.map(() => ({ wch: 18 })),
  ];

  const fileName =
    `agaar-chanar-${dateRange.from}-${dateRange.to}.xlsx`;

  XLSX.writeFile(workbook, fileName);
}

  const tick = { fill: "var(--cmp-muted)", fontSize: 11 };
  const chartMargin = { top: 10, right: 8, left: 0, bottom: 4 };
  const tooltipStyle = {
    backgroundColor: "var(--cmp-card, #ffffff)",
    border: "1px solid var(--cmp-border, #dbe3ea)",
    borderRadius: "10px",
    color: "var(--cmp-text, #172033)",
    fontSize: 12,
  };

  const formatValue = (value: unknown) =>
    typeof value === "number" ? value.toFixed(2) : String(value ?? "0");

  return (
    <div className="aq-compare-page">
      <AgaarHeader />

      <main className="aq-compare-main">
        <section className="aq-compare-hero">
          <div>
            <h1>Агаарын чанарын харьцуулалт</h1>
            <p>
              Станцуудын бодит хэмжилт, хугацааны өөрчлөлт болон бохирдуулагч
              үзүүлэлтүүдийг график, хүснэгтээр харьцуулна.
            </p>
          </div>
        </section>

        <section className="aq-compare-panel">
          <div className="aq-compare-panel-title">
            <h2>Хайлт ба тохиргоо</h2>

            <span className="aq-compare-count">
              {selected.includes(ALL_STATIONS)
                ? `Бүх ${stations.length} станц`
                : `${selected.length}/${MAX_SERIES} станц`}
            </span>
          </div>

          <div className="aq-compare-grid">
            <div className="aq-compare-field">
              <label htmlFor="cmp-station-search">Станц хайх</label>

              <input
                id="cmp-station-search"
                type="search"
                value={stationSearch}
                placeholder="Станцын нэр эсвэл дугаар..."
                onChange={(event) => setStationSearch(event.target.value)}
              />

              <label>Станц сонгох</label>

              {loadingStations ? (
                <p className="aq-compare-muted">Станцуудыг ачаалж байна…</p>
              ) : (
                <div className="aq-compare-station-list">
                  {/* ШИНЭ: БҮХ СТАНЦ СОНГОХ */}
                  <label
                    className={`aq-compare-station-option${
                      selected.includes(ALL_STATIONS) ? " on" : ""
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(ALL_STATIONS)}
                      onChange={toggleAllStations}
                    />

                    <i
                      style={{
                        background: selected.includes(ALL_STATIONS)
                          ? COLORS[0]
                          : "transparent",
                      }}
                    />

                    <span>
                      <strong>Бүх станц</strong>
                      <small>Бүх станцын хэмжилтийг харуулах</small>
                    </span>
                  </label>

                  {filteredStations.map((entry) => {
                    const checked = selected.includes(entry.id);
                    const index = selected.indexOf(entry.id);
                    const disabled =
                      !checked &&
                      !selected.includes(ALL_STATIONS) &&
                      selected.length >= MAX_SERIES;

                    return (
                      <label
                        key={entry.id}
                        className={`aq-compare-station-option${
                          checked ? " on" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleStation(entry.id)}
                        />

                        <i
                          style={{
                            background: checked
                              ? COLORS[(index < 0 ? 0 : index) % COLORS.length]
                              : "transparent",
                          }}
                        />

                        <span>
                          <strong>{entry.name}</strong>
                          <small>{entry.sub}</small>
                        </span>
                      </label>
                    );
                  })}

                  {!filteredStations.length && (
                    <p className="aq-compare-muted">
                      Тохирох станц олдсонгүй.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="aq-compare-field">
              <label>Хугацаа сонгох</label>

              <div className="aq-compare-chips">
                {PERIODS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={period === item.value ? "active" : ""}
                    onClick={() => setPeriod(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {period === "custom" && (
                <div className="aq-compare-two">
                  <div>
                    <label htmlFor="cmp-start-date">Эхлэх огноо</label>
                    <input
                      id="cmp-start-date"
                      type="date"
                      value={startDate}
                      max={endDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </div>

                  <div>
                    <label htmlFor="cmp-end-date">Дуусах огноо</label>
                    <input
                      id="cmp-end-date"
                      type="date"
                      value={endDate}
                      min={startDate}
                      max={today}
                      onChange={(event) => setEndDate(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <div className="aq-compare-two">
                <div>
                  <label htmlFor="cmp-year">Он сонгох</label>

                  <select
                    id="cmp-year"
                    value={selectedYear}
                    onChange={(event) => {
                      const year = Number(event.target.value);

                      setSelectedYear(year);
                      setPeriod("custom");
                      setStartDate(`${year}-01-01`);
                      setEndDate(
                        year === thisYear ? today : `${year}-12-31`
                      );
                    }}
                  >
                    {years.map((year) => (
                      <option key={year} value={year}>
                        {year} он
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="cmp-month">Сар сонгох</label>

                  <select
                    id="cmp-month"
                    value={selectedMonth}
                    onChange={(event) => {
                      const month = Number(event.target.value);

                      setSelectedMonth(month);

                      const year = selectedYear;
                      const prefix = `${year}-${String(month).padStart(2, "0")}`;
                      const first = `${prefix}-01`;
                      const lastDay = new Date(year, month, 0).getDate();
                      const last = `${prefix}-${String(lastDay).padStart(2, "0")}`;

                      setStartDate(first);
                      setEndDate(last > today ? today : last);
                      setPeriod("custom");
                    }}
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(
                      (month) => (
                        <option key={month} value={month}>
                          {month} сар
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <label>Графикийн нэгтгэл</label>

              <div className="aq-compare-chips">
                {GROUPS.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={grouping === item.value ? "active" : ""}
                    onClick={() => setGrouping(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              <p className="aq-compare-help">
                Хугацаа: {dateRange.from} — {dateRange.to}
              </p>
            </div>
          </div>
        </section>

        {(stationError || fetchError) && (
          <div className="aq-compare-alert" role="alert">
            {stationError || fetchError}
          </div>
        )}

        <section className="aq-compare-results">
          <div className="aq-compare-section-heading">
            <div>
              <h2>Харьцуулалтын график</h2>

              <p>Бохирдуулагч бүрийн тусдаа график · {detailRows.length} мөр</p>
            </div>

            <div className="aq-compare-actions">
              <div className="aq-compare-seg" role="group" aria-label="Графикийн төрөл">
                <button type="button" className={chartType === "bar" ? "active" : ""} onClick={() => setChartType("bar")}>Багана</button>
                <button type="button" className={chartType === "line" ? "active" : ""} onClick={() => setChartType("line")}>Шугам</button>
              </div>
              <button
                type="button"
                className="aq-compare-secondary"
                onClick={reload}
                disabled={loading}
              >
                Харах
              </button>
              <button
                type="button"
                className="aq-compare-secondary"
                onClick={downloadExcel}
                disabled={!detailRows.length}
              >
                Excel татах
              </button>
            </div>
          </div>

          {/* ХҮСНЭГТ — ГРАФИКИЙН ДЭЭР */}
          <article className="aq-compare-panel">
            <div className="aq-compare-panel-title">
              <div>
                <h2>Бодит хэмжилтийн дэлгэрэнгүй хүснэгт</h2>

                <p className="aq-compare-muted">
                  {dateRange.from} — {dateRange.to} · {detailRows.length} мөр
                </p>
              </div>
            </div>

            <div className="aq-compare-table-wrap">
              <table className="aq-compare-table aq-compare-detail-table">
                <thead>
                  <tr>
                    <th>Станцын дугаар</th>
                    <th>Станцын нэр</th>
                    <th>Огноо</th>
                    <th>Цаг</th>

                    {visibleMetrics.map((item) => (
                      <th key={item.value}>
                        {item.label}
                        <br />
                        <small>{item.unit}</small>
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {detailRows.slice(0, 1000).map((row) => (
                    <tr key={row.id}>
                      <td>{row.stationNumber}</td>
                      <td>{row.station}</td>
                      <td>{row.date}</td>
                      <td>{row.time}</td>

                      {visibleMetrics.map((item) => (
                        <td key={item.value}>{row.values[item.value]}</td>
                      ))}
                    </tr>
                  ))}

                  {!detailRows.length && (
                    <tr>
                      <td
                        colSpan={4 + visibleMetrics.length}
                        className="aq-compare-muted"
                      >
                        {loading
                          ? "Мэдээлэл ачаалж байна…"
                          : !selected.length
                            ? "Хүснэгт харахын тулд станц сонгоно уу."
                            : "Сонгосон хугацаанд бодит хэмжилт олдсонгүй."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {detailRows.length > 1000 && (
                <p className="aq-compare-muted">
                  Хүснэгтэд эхний 1000 мөр харагдана. Excel татахад бүх мөр орно.
                </p>
              )}
            </div>
          </article>

          {/* БОХИРДУУЛАГЧ БҮР ТУСДАА ГРАФИК + ХАЖУУД НЬ ҮР ДҮНГИЙН ХҮСНЭГТ */}
          <div className="aq-compare-pollutant-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 18 }}>
            {METRICS.map((pollutant) => {
              const pollutantChartData = chartDataByMetric[pollutant.value];
              const stationSummary = neededSids.map((sid, index) => {
                const values = detailRows
                  .filter((row) => row.stationId === sid)
                  .map((row) => row.values[pollutant.value])
                  .filter((value) => Number.isFinite(value));
                const sum = values.reduce((total, value) => total + value, 0);

                return {
                  id: sid,
                  name: stationName(sid),
                  color: COLORS[index % COLORS.length],
                  count: values.length,
                  avg: values.length ? sum / values.length : null,
                  min: values.length ? Math.min(...values) : null,
                  max: values.length ? Math.max(...values) : null,
                };
              });

              return (
                <article className="aq-compare-panel aq-compare-pollutant-card" key={pollutant.value} style={{ minWidth: 0 }}>
                  <div className="aq-compare-panel-title">
                    <div>
                      <h2>{pollutant.label}</h2>
                      <p className="aq-compare-muted">
                        Нэгж: {pollutant.unit} · {dateRange.from} — {dateRange.to}
                      </p>
                    </div>
                    <span className="aq-compare-count">{stationSummary.length} станц</span>
                  </div>

                  {loading ? (
                    <div className="aq-compare-empty">Хэмжилтийн мэдээлэл ачаалж байна…</div>
                  ) : !neededSids.length ? (
                    <div className="aq-compare-empty">График харахын тулд нэг буюу хэд хэдэн станц сонгоно уу.</div>
                  ) : !pollutantChartData.length ? (
                    <div className="aq-compare-empty">Сонгосон хугацаанд {pollutant.label} хэмжилт олдсонгүй.</div>
                  ) : (
                    <div className="aq-compare-pollutant-layout" style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.7fr) minmax(280px, 1fr)", gap: 16, alignItems: "start" }}>
                      <div className="aq-compare-chart aq-compare-pollutant-chart" style={{ width: "100%", height: 340, minWidth: 0 }}>
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                          {chartType === "bar" ? (
                            <BarChart data={pollutantChartData} margin={chartMargin}>
                              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--cmp-grid)" />
                              <XAxis dataKey="label" minTickGap={14} tickLine={false} axisLine={false} tick={tick} />
                              <YAxis width={50} domain={["auto", "auto"]} tickLine={false} axisLine={false} tick={tick} />
                              <Tooltip contentStyle={tooltipStyle} formatter={formatValue} />
                              <Legend />
                              {chartSeries.map((series) => (
                                <Bar key={series.key} dataKey={series.key} name={series.name} fill={series.color} radius={[4, 4, 0, 0]} maxBarSize={36} />
                              ))}
                            </BarChart>
                          ) : (
                            <LineChart data={pollutantChartData} margin={chartMargin}>
                              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="var(--cmp-grid)" />
                              <XAxis dataKey="label" minTickGap={14} tickLine={false} axisLine={false} tick={tick} />
                              <YAxis width={50} domain={["auto", "auto"]} tickLine={false} axisLine={false} tick={tick} />
                              <Tooltip contentStyle={tooltipStyle} formatter={formatValue} />
                              <Legend />
                              {chartSeries.map((series) => (
                                <Line key={series.key} type="monotone" dataKey={series.key} name={series.name} stroke={series.color} strokeWidth={2.5} dot={pollutantChartData.length < 40} connectNulls={false} />
                              ))}
                            </LineChart>
                          )}
                        </ResponsiveContainer>
                      </div>

                      <div className="aq-compare-pollutant-summary" style={{ minWidth: 0, overflowX: "auto" }}>
                        <h3>Станцын үр дүн</h3>
                        <div className="aq-compare-table-wrap">
                          <table className="aq-compare-table">
                            <thead>
                              <tr><th>Станц</th><th>Дундаж</th><th>Бага</th><th>Их</th><th>Хэмжилт</th></tr>
                            </thead>
                            <tbody>
                              {stationSummary.map((item) => (
                                <tr key={item.id}>
                                  <td>
                                    <span className="aq-compare-station-color" style={{ background: item.color }} />
                                    {item.name}
                                  </td>
                                  <td>{item.avg === null ? "—" : item.avg.toFixed(2)}</td>
                                  <td>{item.min === null ? "—" : item.min.toFixed(2)}</td>
                                  <td>{item.max === null ? "—" : item.max.toFixed(2)}</td>
                                  <td>{item.count}</td>
                                </tr>
                              ))}
                              {!stationSummary.length && (
                                <tr><td colSpan={5} className="aq-compare-muted">Станц сонгоно уу.</td></tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                        <p className="aq-compare-muted">Хэмжилтийн тоо нь сонгосон хугацааны мөрийн тоо.</p>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}
