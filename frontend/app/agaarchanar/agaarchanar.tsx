"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import AgaarHeader from "./AgaarHeader";
import AgaarFooter from "./AgaarFooter";
import type { Station, AirQualityRow } from "./AgaarchanarMap";
import {
  POLLUTANT_BY_ID,
  computeStation,
  getAqiCategory,
  metricValue,
  type Metric,
  type PollutantId,
  type StationAqi,
} from "./aqi";
import { getAimag } from "./aimag";
import "./agaarchanar.css";

const API_BASE_URL = "/backend";

const AgaarchanarMap = dynamic(() => import("./AgaarchanarMap"), {
  ssr: false,
  loading: () => (
    <div className="aq-map-loading">
      <span className="aq-spinner" />
      Газрын зураг ачаалж байна...
    </div>
  ),
});

type UnknownRecord = Record<string, unknown>;

type Pollutant = {
  id: PollutantId;
  label: string;
  name: string;
  keys: string[];
  description: string;
};

type AQIInfo = {
  label: string;
  color: string;
  description: string;
  advice: string;
};

const TIME_ZONE = "Asia/Ulaanbaatar";

const pollutants: Pollutant[] = [
  {
    id: "pm25",
    label: "PM2.5",
    name: "Нарийн ширхэгт тоосонцор",
    keys: ["pm25", "PM25", "pm2_5", "pm2.5", "pm_2_5"],
    description:
      "Уушгины гүнд нэвтэрч болох нарийн ширхэгт тоосонцор.",
  },
  {
    id: "pm10",
    label: "PM10",
    name: "Том ширхэгт тоосонцор",
    keys: ["pm10", "PM10", "pm_10"],
    description: "Тоос, шороо болон бусад ширхэгт бодис.",
  },
  {
    id: "no2",
    label: "NO₂",
    name: "Азотын давхар исэл",
    keys: ["no2", "NO2"],
    description: "Тээврийн хэрэгсэл болон шаталтаас үүсэж болно.",
  },
  {
    id: "so2",
    label: "SO₂",
    name: "Хүхрийн давхар исэл",
    keys: ["so2", "SO2"],
    description: "Хүхэр агуулсан түлшний шаталтаас үүсэж болно.",
  },
  {
    id: "co",
    label: "CO",
    name: "Нүүрстөрөгчийн дутуу исэл",
    keys: ["co", "CO"],
    description: "Бүрэн бус шаталтын үед үүсдэг хий.",
  },
  {
    id: "o3",
    label: "O₃",
    name: "Газрын түвшний озон",
    keys: ["o3", "O3", "O₃"],
    description: "Нарны гэрлийн нөлөөгөөр бусад бодисоос үүсэж болно.",
  },
];

const visualScale: Record<string, number> = {
  "PM2.5": 75,
  PM10: 150,
  "NO₂": 200,
  "SO₂": 200,
  CO: 10,
  "O₃": 200,
};

// =====================================================
// ОБЪЕКТ БОЛОВСРУУЛАЛТ
// =====================================================

function asRecord(value: unknown): UnknownRecord {
  if (value && typeof value === "object") {
    return value as UnknownRecord;
  }

  return {};
}

function sortByName(list: Station[]): Station[] {
  return [...list].sort((a, b) =>
    String(asRecord(a).ner ?? "").localeCompare(
      String(asRecord(b).ner ?? ""),
      "mn",
    ),
  );
}

// =====================================================
// СТАНЦЫН ID
// =====================================================

function getStationId(
  station: Station,
): string | number | null {
  const item = asRecord(station);

  const value =
    item.station_sid ??
    item.stationSid ??
    item.sid ??
    item.stants_dugaar;

  return typeof value === "string" || typeof value === "number"
    ? value
    : null;
}

function getRowStationId(
  row: AirQualityRow,
): string | number | null {
  const item = asRecord(row);

  const value =
    item.station_sid ??
    item.stationSid ??
    item.sid ??
    item.stants_dugaar;

  return typeof value === "string" || typeof value === "number"
    ? value
    : null;
}

// =====================================================
// ОГНОО БОЛОВСРУУЛАЛТ
// =====================================================

function parseDateValue(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (typeof value !== "string") {
    return null;
  }

  const raw = value.trim();

  if (!raw) {
    return null;
  }

  let normalized = raw;

  // MySQL: YYYY-MM-DD HH:mm:ss
  // Цагийн бүсгүй огноог Монголын UTC+08:00 гэж үзнэ.
  const mysqlMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/,
  );

  if (mysqlMatch) {
    normalized = `${mysqlMatch[1]}T${mysqlMatch[2]}+08:00`;
  } else if (
    /^\d{4}-\d{2}-\d{2}T/.test(raw) &&
    !/(Z|[+-]\d{2}:\d{2}|[+-]\d{4})$/i.test(raw)
  ) {
    normalized = `${raw}+08:00`;
  }

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getMeasurementDate(
  row?: AirQualityRow | null,
): string | null {
  if (!row) return null;

  const item = asRecord(row);

  const dateKeys = [
    "hemjsen_ognoo",
    "hemjilt_ognoo",
    "hemjilsen_ognoo",
    "ajiglasan_ognoo",
    "ajiglasanOgnoo",
    "ognoo",
    "measured_at",
    "measuredAt",
    "measurement_date",
    "measurementDate",
    "datetime",
    "timestamp",
    "date",
    "shinechilsen_ognoo",
    "shinechilsenOgnoo",
    "created_at",
    "createdAt",
  ];

  for (const key of dateKeys) {
    const value = item[key];

    if (parseDateValue(value)) {
      return String(value);
    }
  }

  return null;
}

function getDateValue(
  row?: AirQualityRow | null,
): number {
  const value = getMeasurementDate(row);

  if (!value) return 0;

  return parseDateValue(value)?.getTime() ?? 0;
}

function formatDate(value?: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "Огнооны мэдээлэл байхгүй";
  }

  const date = parseDateValue(value);

  if (!date) {
    return "Огнооны формат буруу";
  }

  return new Intl.DateTimeFormat("mn-MN", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

// =====================================================
// ТООН УТГА
// =====================================================

function getNumber(
  row: AirQualityRow | undefined | null,
  keys: string[],
): number | null {
  if (!row) return null;

  const item = asRecord(row);

  for (const key of keys) {
    const value = item[key];

    if (
      value === null ||
      value === undefined ||
      value === ""
    ) {
      continue;
    }

    const parsed =
      typeof value === "number"
        ? value
        : Number(String(value).replace(",", "."));

    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

function formatValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("mn-MN", {
    maximumFractionDigits: 2,
  }).format(value);
}

// =====================================================
// API RESPONSE-ИЙГ МАССИВ БОЛГОХ
// =====================================================

function unwrapArray<T>(json: unknown): T[] {
  if (Array.isArray(json)) {
    return json as T[];
  }

  if (!json || typeof json !== "object") {
    return [];
  }

  const object = json as UnknownRecord;

  for (const key of [
    "data",
    "rows",
    "result",
    "stations",
    "items",
  ]) {
    const value = object[key];

    if (Array.isArray(value)) {
      return value as T[];
    }

    if (value && typeof value === "object") {
      const nested = value as UnknownRecord;

      for (const nestedKey of [
        "rows",
        "items",
        "stations",
      ]) {
        if (Array.isArray(nested[nestedKey])) {
          return nested[nestedKey] as T[];
        }
      }
    }
  }

  return [];
}

// =====================================================
// AQI ЗӨВЛӨМЖ
// AQI-н тооцоолол, өнгө, ангилал нь ./aqi.ts (MNS4585:2025)
// =====================================================

function getAQIInfo(aqi: number | null): AQIInfo {
  if (aqi === null || !Number.isFinite(aqi) || aqi < 0) {
    return {
      label: "Мэдээлэлгүй",
      color: "#64748b",
      description:
        "Индекс тооцоолоход шаардлагатай хэмжилтийн мэдээлэл алга.",
      advice:
        "Хэмжилтийн мэдээлэл шинэчлэгдэхийг хүлээнэ үү.",
    };
  }

  if (aqi <= 50) {
    return {
      label: "Цэвэр",
      color: "#16e900",
      description: "Агаарын чанар цэвэр түвшинд байна.",
      advice: "Гадаа чөлөөтэй үйл ажиллагаа явуулж болно.",
    };
  }

  if (aqi <= 100) {
    return {
      label: "Хэвийн",
      color: "#fff000",
      description: "Агаарын чанар хэвийн түвшинд байна.",
      advice:
        "Өдөр тутмын үйл ажиллагаагаа хэвийн үргэлжлүүлж болно.",
    };
  }

  if (aqi <= 200) {
    return {
      label: "Бага бохирдолтой",
      color: "#ff9200",
      description: "Агаарын бохирдол нэмэгдсэн байна.",
      advice:
        "Мэдрэмтгий хүмүүс гадаах идэвхтэй үйл ажиллагаагаа багасгаарай.",
    };
  }

  if (aqi <= 300) {
    return {
      label: "Бохирдолтой",
      color: "#ff1010",
      description: "Агаарын бохирдол өндөр түвшинд байна.",
      advice:
        "Гадаах идэвхтэй үйл ажиллагааг багасгаж, шаардлагагүй бол гадаа удаан байхаас зайлсхий.",
    };
  }

  if (aqi <= 400) {
    return {
      label: "Их бохирдолтой",
      color: "#963c9f",
      description: "Агаарын бохирдол маш өндөр байна.",
      advice:
        "Гадаа байх хугацааг хязгаарлаж, цонхоо хааж, албан ёсны зөвлөмжийг дагаарай.",
    };
  }

  return {
    label: "Маш их бохирдолтой",
    color: "#800020",
    description:
      "Агаарын бохирдол маш аюултай түвшинд хүрсэн байна.",
    advice:
      "Гадаах үйл ажиллагааг аль болох хязгаарлаж, албан ёсны эрүүл мэндийн зөвлөмжийг дагаарай.",
  };
}

// =====================================================
// ҮНДСЭН ХУУДАС
// =====================================================

export default function AgaarchanarPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [airRows, setAirRows] = useState<AirQualityRow[]>([]);
  const [selectedStation, setSelectedStation] = useState<
    string | number | null
  >(null);
  const [metric, setMetric] = useState<Metric>("aqi");
  const [aimag, setAimag] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // ---------------------------------------------------
  // API-ААС МЭДЭЭЛЭЛ ТАТАХ
  // ---------------------------------------------------

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        `${API_BASE_URL}/weather_db/agaar_chanar`,
        { cache: "no-store" },
      );

      if (!response.ok) {
        throw new Error(
          `Агаарын чанарын API алдаа: HTTP ${response.status}`,
        );
      }

      const json: unknown = await response.json();
      const rows = unwrapArray<AirQualityRow>(json);

      const stationMap = new Map<string, Station>();

      for (const row of rows) {
        const item = asRecord(row);

        const id =
          item.station_sid ??
          item.stationSid ??
          item.sid ??
          item.stants_dugaar;

        if (
          (typeof id !== "string" && typeof id !== "number") ||
          String(id).trim() === ""
        ) {
          continue;
        }

        const key = String(id);

        if (stationMap.has(key)) continue;

        const station = {
          ...item,
          station_sid: id,
          sid: id,
          stants_dugaar: id,
          ner:
            typeof item.ner === "string" && item.ner.trim()
              ? item.ner
              : `Станц ${id}`,
          ner_en: item.ner_en,
          aimag: item.aimag,
          urgurug: item.urgurug,
          urtrag: item.urtrag,
        } as unknown as Station;

        stationMap.set(key, station);
      }

      const stationList = Array.from(stationMap.values());

      setAirRows(rows);
      setStations(stationList);

      setSelectedStation((current) => {
        if (
          current !== null &&
          stationList.some(
            (station) =>
              String(getStationId(station)) === String(current),
          )
        ) {
          return current;
        }

        const ulaanbaatar = stationList.find(
          (station) => getAimag(station) === "Улаанбаатар",
        );

        const first = ulaanbaatar ?? stationList[0];

        return first ? getStationId(first) : null;
      });

      if (rows.length === 0) {
        setError(
          "API хариу өгсөн боловч хэмжилтийн бичлэг алга.",
        );
      } else if (stationList.length === 0) {
        setError(
          "Станцын ID олдсонгүй. API-аас ирж буй өгөгдлийн талбаруудыг шалгана уу.",
        );
      }
    } catch (err) {
      console.error(
        "Агаарын чанарын мэдээлэл татах алдаа:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Мэдээлэл татахад алдаа гарлаа.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // ---------------------------------------------------
  // СТАНЦ БҮРИЙН ХАМГИЙН СҮҮЛИЙН БИЧЛЭГ
  // ---------------------------------------------------

  const latestByStation = useMemo(() => {
    const latest = new Map<string, AirQualityRow>();

    for (const row of airRows) {
      const id = getRowStationId(row);

      if (id === null) continue;

      const key = String(id);
      const existing = latest.get(key);

      if (
        !existing ||
        getDateValue(row) >= getDateValue(existing)
      ) {
        latest.set(key, row);
      }
    }

    return latest;
  }, [airRows]);

  // ---------------------------------------------------
  // СТАНЦ БҮРИЙН AQI (MNS4585:2025)
  // Бүх мөрийг ашиглан 24/8 цагийн дундаж гаргана.
  // ---------------------------------------------------

  const stationAqi = useMemo(() => {
    const grouped = new Map<string, UnknownRecord[]>();

    for (const row of airRows) {
      const id = getRowStationId(row);

      if (id === null) continue;

      const key = String(id);
      const list = grouped.get(key);

      if (list) list.push(asRecord(row));
      else grouped.set(key, [asRecord(row)]);
    }

    const result = new Map<string, StationAqi>();

    for (const [key, rows] of grouped) {
      result.set(key, computeStation(rows));
    }

    return result;
  }, [airRows]);

  // ---------------------------------------------------
  // СОНГОСОН СТАНЦ
  // ---------------------------------------------------

  const selectedStationData = useMemo(
    () =>
      stations.find((station) => {
        const id = getStationId(station);

        return (
          selectedStation !== null &&
          id !== null &&
          String(id) === String(selectedStation)
        );
      }) ?? null,
    [stations, selectedStation],
  );

  // ---------------------------------------------------
  // СТАНЦ / АЙМАГ / ҮЗҮҮЛЭЛТ СОНГОХ
  // ---------------------------------------------------

  // Станц нь сонгосон үзүүлэлтээр хэмжилттэй эсэх
  const hasData = useCallback(
    (station: Station, m: Metric) =>
      metricValue(stationAqi.get(String(getStationId(station))), m)
        .value !== null,
    [stationAqi],
  );

  // Жагсаалтаас хэмжилттэй станц сонгох (одоогийнхыг боломжтой бол хадгална)
  const chooseStation = useCallback(
    (
      candidates: Station[],
      m: Metric,
      prefer: string | number | null,
    ) => {
      const sorted = sortByName(candidates);

      const keep = sorted.find(
        (s) =>
          String(getStationId(s)) === String(prefer) &&
          hasData(s, m),
      );

      return keep ?? sorted.find((s) => hasData(s, m)) ?? null;
    },
    [hasData],
  );

  // Станц сонгох (аймаг нь станцтай таарахгүй бол аймгийг нь солино)
  const selectStation = useCallback(
    (id: string | number | null) => {
      setSelectedStation(id);

      if (id === null) return;

      const station = stations.find(
        (s) => String(getStationId(s)) === String(id),
      );

      if (!station) return;

      const stationAimag = getAimag(station);

      setAimag((current) =>
        current && current !== stationAimag
          ? stationAimag
          : current,
      );
    },
    [stations],
  );

  // Аймаг солих → тухайн аймгийн станц сонгогдож, карт солигдоно
  const handleAimagChange = useCallback(
    (next: string) => {
      setAimag(next);

      if (!next) return;

      const pool = stations.filter((s) => getAimag(s) === next);

      const target =
        chooseStation(pool, metric, selectedStation) ??
        sortByName(pool)[0] ??
        null;

      if (target) setSelectedStation(getStationId(target));
    },
    [stations, metric, selectedStation, chooseStation],
  );

  // Үзүүлэлт солих → сонгосон станцад хэмжилт байхгүй бол өөр станц сонгоно
  const handleMetricChange = useCallback(
    (next: Metric) => {
      setMetric(next);

      if (selectedStationData && hasData(selectedStationData, next)) {
        return;
      }

      const pool = aimag
        ? stations.filter((s) => getAimag(s) === aimag)
        : stations;

      const target = chooseStation(pool, next, null);

      if (target) setSelectedStation(getStationId(target));
    },
    [
      aimag,
      stations,
      selectedStationData,
      hasData,
      chooseStation,
    ],
  );

  // ---------------------------------------------------
  // КАРТАНД ХАРУУЛАХ УТГА (сонгосон үзүүлэлтээр)
  // ---------------------------------------------------

  const selectedKey = selectedStationData
    ? String(getStationId(selectedStationData))
    : null;

  const selectedAir = selectedKey
    ? latestByStation.get(selectedKey)
    : undefined;

  const selectedResult = selectedKey
    ? stationAqi.get(selectedKey)
    : undefined;

  const aqi = selectedResult?.aqi ?? null;

  const metricCfg =
    metric === "aqi" ? null : POLLUTANT_BY_ID[metric];

  const metricItem = metricCfg
    ? selectedResult?.items[metricCfg.id]
    : null;

  const { value: metricVal, index: panelIndex } = metricValue(
    selectedResult,
    metric,
  );

  const panelCategory = getAqiCategory(panelIndex);
  const panelInfo = getAQIInfo(panelIndex);

  const panelTitle = metricCfg
    ? `${metricCfg.name} (${metricCfg.label})`
    : "Агаарын чанарын индекс (MNS4585:2025)";

  const panelNumber = metricCfg
    ? formatValue(metricVal)
    : aqi ?? "—";

  const windowText = metricCfg
    ? metricCfg.hours === 1
      ? "1 цагийн утга"
      : metricItem?.approx
        ? `Сүүлийн хэмжилт (${metricCfg.hours} цагийн дундаж гаргах мөр дутуу)`
        : `${metricCfg.hours} цагийн дундаж`
    : null;

  const dominantLabel = selectedResult?.dominant
    ? POLLUTANT_BY_ID[selectedResult.dominant].label
    : null;

  const selectedMeasurementDate =
    getMeasurementDate(selectedAir);

  // ---------------------------------------------------
  // СТАНЦ ХАЙХ
  // ---------------------------------------------------

  const filteredStations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("mn-MN");

    if (!query) return [];

    return stations
      .filter((station) => {
        const item = asRecord(station);

        const text = [
          item.ner ?? "",
          item.ner_en ?? "",
          getAimag(station),
          getStationId(station) ?? "",
        ]
          .join(" ")
          .toLocaleLowerCase("mn-MN");

        return text.includes(query);
      })
      .slice(0, 8);
  }, [stations, search]);

  // ---------------------------------------------------
  // СТАТИСТИК
  // ---------------------------------------------------

  const statistics = useMemo(() => {
    const measured = stations
      .map((station) => {
        const id = getStationId(station);

        if (id === null) return null;

        const row = latestByStation.get(String(id));
        const value = stationAqi.get(String(id))?.aqi ?? null;

        if (!row || value === null) return null;

        return { station, row, aqi: value };
      })
      .filter(
        (
          item,
        ): item is {
          station: Station;
          row: AirQualityRow;
          aqi: number;
        } => item !== null,
      );

    const average = measured.length
      ? measured.reduce(
          (sum, item) => sum + item.aqi,
          0,
        ) / measured.length
      : null;

    const worst = measured.reduce<
      (typeof measured)[number] | null
    >(
      (current, item) =>
        !current || item.aqi > current.aqi
          ? item
          : current,
      null,
    );

    const good = measured.filter(
      (item) => item.aqi <= 50,
    ).length;

    const high = measured.filter(
      (item) => item.aqi > 100,
    ).length;

    const newest = [...measured].sort(
      (a, b) => getDateValue(b.row) - getDateValue(a.row),
    )[0];

    return {
      measuredCount: measured.length,
      average,
      worst,
      good,
      high,
      newestDate: newest
        ? getMeasurementDate(newest.row)
        : null,
    };
  }, [stations, latestByStation, stationAqi]);

  // ---------------------------------------------------
  // RENDER
  // ---------------------------------------------------

  return (
    <main className="aq-page">
      <AgaarHeader />

      <div className="aq-content">
        <header className="aq-page-heading">
          <div>
            <span className="aq-eyebrow">
              AIR QUALITY MONITOR
            </span>

            <h1>Монголын агаарын чанар</h1>

            <p>
              Станцын хэмжилт, MNS4585:2025 стандартаар
              тооцоолсон индекс болон бохирдуулагч бодисын
              мэдээлэл.
            </p>
          </div>

          <button
            type="button"
            className="aq-refresh-button"
            onClick={() => void loadData()}
            disabled={loading}
          >
            <span aria-hidden="true">↻</span>
            {loading ? "Ачаалж байна..." : "Шинэчлэх"}
          </button>
        </header>

        {error && (
          <div className="aq-error" role="alert">
            <div>
              <strong>Мэдээллийн анхааруулга</strong>
              <p>{error}</p>
            </div>

            <button
              type="button"
              onClick={() => void loadData()}
              disabled={loading}
            >
              Дахин оролдох
            </button>
          </div>
        )}

        {/* ГАЗРЫН ЗУРАГ БА СОНГОСОН СТАНЦ */}
        <div className="aq-layout-top" id="map">
          <section className="aq-map-card">
            <div className="aq-card-heading">
              <div>
                <h2>Станцуудын газрын зураг</h2>
                <p>
                  Үзүүлэлт, аймгаа сонгоход баруун талын карт
                  солигдоно. Станц дээр дарж сонгоно уу.
                </p>
              </div>

              <span className="aq-map-badge">
                LIVE DATA
              </span>
            </div>

            {loading && stations.length === 0 ? (
              <div className="aq-map-loading">
                <span className="aq-spinner" />
                Станцууд ачаалж байна...
              </div>
            ) : (
              <AgaarchanarMap
                stations={stations}
                airRows={airRows}
                selectedStation={selectedStation}
                onSelectStation={(id) => selectStation(String(id))}
                metric={metric}
                onMetricChange={handleMetricChange}
                aimag={aimag}
                onAimagChange={handleAimagChange}
              />
            )}
          </section>

          <aside className="aq-details-column">
            <section className="aq-selected-station-card">
              <div className="aq-card-heading">
                <div>
                  <h2>Сонгосон станц</h2>
                  <p>
                    {aimag || "Бүх аймаг"} ·{" "}
                    {metricCfg ? metricCfg.label : "AQI"}
                  </p>
                </div>

                <span
                  className="aq-small-icon"
                  aria-hidden="true"
                >
                  ⌖
                </span>
              </div>

              {!selectedStationData ? (
                <div className="aq-empty-state">
                  <span
                    className="aq-empty-icon"
                    aria-hidden="true"
                  >
                    📍
                  </span>

                  <strong>Станц сонгоно уу</strong>

                  <p>
                    Газрын зураг эсвэл хайлтаас станц сонгоорой.
                  </p>
                </div>
              ) : (
                <>
                  <div className="aq-selected-location">
                    <span
                      className="aq-location-symbol"
                      aria-hidden="true"
                    >
                      ⌖
                    </span>

                    <div>
                      <strong>
                        {String(
                          asRecord(selectedStationData).ner ??
                            "Нэргүй станц",
                        )}
                      </strong>

                      <small>{getAimag(selectedStationData)}</small>
                    </div>
                  </div>

                  <div className="aq-aqi-panel">
                    <div>
                      <span className="aq-aqi-label">
                        {panelTitle}
                      </span>

                      <div
                        className="aq-aqi-number"
                        style={{ color: panelCategory.color }}
                      >
                        {panelNumber}
                      </div>

                      {metricCfg && (
                        <span className="aq-aqi-subline">
                          {metricCfg.unit}
                          {panelIndex !== null &&
                            ` · дэд индекс ${panelIndex}`}
                        </span>
                      )}

                      <span
                        className="aq-aqi-category"
                        style={{
                          color: panelCategory.color,
                          borderColor: panelCategory.color,
                          background: `${panelCategory.color}12`,
                        }}
                      >
                        {panelCategory.label}
                      </span>
                    </div>

                    <span
                      className="aq-aqi-indicator"
                      style={{ background: panelCategory.color }}
                    />
                  </div>

                  <div
                    className="aq-aqi-description"
                    style={{
                      borderLeft: `4px solid ${panelInfo.color}`,
                      padding: "12px 16px",
                      margin: "12px 0",
                      borderRadius: "8px",
                      background: `${panelInfo.color}12`,
                    }}
                  >
                    <strong style={{ color: panelInfo.color }}>
                      {panelInfo.label}
                    </strong>

                    <p>{panelInfo.description}</p>

                    <div>
                      <strong>Эрүүл мэндийн зөвлөмж</strong>
                      <p>{panelInfo.advice}</p>
                    </div>
                  </div>

                  <div className="aq-station-meta">
                    <div>
                      <span>Станцын дугаар</span>
                      <strong>
                        {getStationId(selectedStationData) ?? "—"}
                      </strong>
                    </div>

                    {metricCfg ? (
                      <>
                        <div>
                          <span>Дундажлах хугацаа</span>
                          <strong>{windowText}</strong>
                        </div>

                        <div>
                          <span>Станцын нэгдсэн AQI</span>
                          <strong>{aqi ?? "—"}</strong>
                        </div>
                      </>
                    ) : (
                      <div>
                        <span>Тодорхойлогч бодис</span>
                        <strong>{dominantLabel ?? "—"}</strong>
                      </div>
                    )}

                    <div>
                      <span>Хэмжилтийн огноо</span>
                      <strong
                        className="aq-meta-date"
                        title={
                          selectedMeasurementDate
                            ? formatDate(selectedMeasurementDate)
                            : "API-аас огноо ирээгүй"
                        }
                      >
                        {formatDate(selectedMeasurementDate)}
                      </strong>
                    </div>
                  </div>

                  {metricCfg && metricVal === null && (
                    <p className="aq-no-results">
                      Энэ станцад {metricCfg.label} хэмжилт алга.
                    </p>
                  )}

                  {!selectedAir && (
                    <p className="aq-no-results">
                      Энэ станцын хэмжилтийн мэдээлэл алга.
                    </p>
                  )}
                </>
              )}
            </section>
          </aside>
        </div>

       {/* =========================================
    2. БОХИРДУУЛАГЧ БОДИСЫН ДЭЛГЭРЭНГҮЙ
========================================= */}
<section className="aq-pollutant-section">
  <div className="aq-section-heading">
    <div>
      

      <p>
        Сонгосон станцын агаар бохирдуулагч бодисын хэмжилт.
      </p>
    </div>

    <span className="aq-map-badge">
      POLLUTANTS
    </span>
  </div>

  <div className="aq-pollutant-detail">
    <div className="aq-pollutant-table-title">
      <div>
        <h3>Бохирдуулагч бодисын үзүүлэлт</h3>

        <p>
          {selectedStationData
            ? `${String(
                asRecord(selectedStationData).ner ??
                  "Сонгосон станц",
              )} станцын хэмжилт`
            : "Станц сонгоход тухайн станцын утгууд харагдана"}
        </p>
      </div>

      <span>6 ҮЗҮҮЛЭЛТ</span>
    </div>

    <div className="aq-pollutant-grid">
      {pollutants.map((pollutant, index) => {
        const value = getNumber(
          selectedAir,
          pollutant.keys,
        );

        const subIndex =
          selectedResult?.items[pollutant.id]?.index ??
          null;

        const unit =
          POLLUTANT_BY_ID[pollutant.id].unit;

        const maxValue =
          visualScale[pollutant.label] ?? 100;

        const meterWidth =
          value === null
            ? 0
            : Math.min(
                100,
                Math.max(
                  0,
                  (value / maxValue) * 100,
                ),
              );

        return (
          <article
            className={`aq-pollutant-card aq-pollutant-card-${index + 1}`}
            key={pollutant.label}
          >
            <div className="aq-pollutant-card-head">
              <span className="aq-pollutant-symbol">
                {pollutant.label}
              </span>

              <span className="aq-pollutant-unit">
                {unit}
              </span>
            </div>

            <h4>{pollutant.name}</h4>

            <div className="aq-pollutant-card-value">
              {formatValue(value)}
            </div>

            <p>{pollutant.description}</p>

            <div
              className="aq-pollutant-meter"
              role="img"
              aria-label={
                value === null
                  ? `${pollutant.label}: мэдээлэл байхгүй`
                  : `${pollutant.label}: дүрслэлийн хэмжүүр ${Math.round(meterWidth)} хувь`
              }
            >
              <span
                className="aq-pollutant-meter-fill"
                style={{
                  width: `${meterWidth}%`,
                }}
              />
            </div>

            <div className="aq-pollutant-card-footer">
              <span>Дэд индекс</span>

              <strong>
                {subIndex === null
                  ? "Мэдээлэл алга"
                  : subIndex}
              </strong>
            </div>
          </article>
        );
      })}
    </div>

    <p className="aq-pollutant-scale-note">
      Хэмжүүрийн зурвас нь сүүлийн хэмжилтийн утгыг
      дүрслэх зориулалттай. Дэд индекс нь MNS4585:2025
      стандартын хүснэгтээр (PM 24 цаг, CO, O₃ 8 цаг,
      SO₂, NO₂ 1 цагийн дундаж) тооцогдсон.
    </p>
  </div>
</section>

     {/* =========================================
    1. АГААРЫН ЧАНАРЫН ТОЙМ
========================================= */}
<section className="aq-statistics-section">
  <div className="aq-section-heading">
    <div>
      <h2>Агаарын чанарын тойм</h2>
      <p>
        Индекс тооцоолох боломжтой станцуудын үзүүлэлт.
      </p>
    </div>

    <span className="aq-map-badge">
      SUMMARY
    </span>
  </div>

  <div className="aq-stat-grid">
    {/* Дундаж индекс */}
    <article className="aq-stat-card aq-stat-aqi">
      <span className="aq-stat-icon" aria-hidden="true">
        ◉
      </span>

      <span className="aq-stat-label">
        Дундаж индекс
      </span>

      <strong>
        {statistics.average === null
          ? "—"
          : Math.round(statistics.average)}
      </strong>

      <span className="aq-stat-status">
        {statistics.measuredCount} станцын индекс
      </span>
    </article>

    {/* Индекстэй станц */}
    <article className="aq-stat-card">
      <span className="aq-stat-icon" aria-hidden="true">
        ⌖
      </span>

      <span className="aq-stat-label">
        Индекстэй станц
      </span>

      <strong>{statistics.measuredCount}</strong>

      <span className="aq-stat-status">
        Нийт {stations.length} станцаас
      </span>
    </article>

    {/* Цэвэр түвшний станц */}
    <article className="aq-stat-card">
      <span className="aq-stat-icon" aria-hidden="true">
        ✓
      </span>

      <span className="aq-stat-label">
        Цэвэр түвшний станц
      </span>

      <strong>{statistics.good}</strong>

      <span className="aq-stat-status">
        Индекс 0–50
      </span>
    </article>

    {/* Индекс 100-аас их */}
    <article className="aq-stat-card">
      <span className="aq-stat-icon" aria-hidden="true">
        !
      </span>

      <span className="aq-stat-label">
        Индекс 100-аас их
      </span>

      <strong>{statistics.high}</strong>

      <span className="aq-stat-status">
        Бохирдолтой түвшний станц
      </span>
    </article>

    {/* Хамгийн өндөр индекс */}
    <article className="aq-stat-card">
      <span className="aq-stat-icon" aria-hidden="true">
        ↑
      </span>

      <span className="aq-stat-label">
        Хамгийн өндөр индекс
      </span>

      <strong>
        {statistics.worst?.aqi ?? "—"}
      </strong>

      <span className="aq-stat-station-name">
        {statistics.worst
          ? String(
              asRecord(statistics.worst.station).ner ??
                "Мэдээлэл алга",
            )
          : "Мэдээлэл алга"}
      </span>
    </article>

    {/* Хамгийн сүүлийн хэмжилт */}
    <article className="aq-stat-card">
      <span className="aq-stat-icon" aria-hidden="true">
        ◷
      </span>

      <span className="aq-stat-label">
        Хамгийн сүүлийн хэмжилт
      </span>

      <strong className="aq-stat-date">
        {formatDate(statistics.newestDate)}
      </strong>

      <span className="aq-stat-status">
        Хэмжилтийн огноогоор
      </span>
    </article>
  </div>

  <p className="aq-data-note">
    <strong>Тооцооллын тайлбар:</strong> Индексийг
    MNS4585:2025 стандартын breakpoint хүснэгтээр
    бохирдуулагч бодис тус бүрээр шугаман интерполяцаар
    тооцож, хамгийн өндөр дэд индексийг агаарын чанарын
    индекс гэж авна. API-аас ирсэн AQI талбарыг
    ашиглахгүй. 24 болон 8 цагийн дундаж гаргахад
    хангалттай мөр (75%) байхгүй бол сүүлийн хэмжилтээр
    тооцож болно.
  </p>
</section>




        {/* ИНДЕКСИЙН ТАЙЛБАР */}
        <section className="chanar-guide-section" id="health">
          <span className="chanar-section-kicker">
            AQI ТАЙЛБАР
          </span>

          <h2>Индексийг хэрхэн ойлгох вэ?</h2>

          <p>
            Ангилал, өнгө нь MNS4585:2025 стандартын агаарын
            чанарын индексийн ангилалд тулгуурласан.
          </p>

          <div className="chanar-guide-grid">
            {[
              {
                range: "0–50",
                label: "Цэвэр",
                color: "#16e900",
                text: "Агаарын чанар сайн, эрүүл мэндэд сөрөг нөлөөгүй.",
              },
              {
                range: "51–100",
                label: "Хэвийн",
                color: "#fff000",
                text: "Агаарын чанар хэвийн түвшинд байна.",
              },
              {
                range: "101–200",
                label: "Бага бохирдолтой",
                color: "#ff9200",
                text: "Мэдрэмтгий бүлгийн хүмүүс болгоомжтой байна.",
              },
              {
                range: "201–300",
                label: "Бохирдолтой",
                color: "#ff1010",
                text: "Гадаа удаан хугацаагаар байхыг багасгана.",
              },
              {
                range: "301–400",
                label: "Их бохирдолтой",
                color: "#963c9f",
                text: "Эрүүл мэндэд сөрөг нөлөө үзүүлж болзошгүй.",
              },
              {
                range: "401–500",
                label: "Маш их бохирдолтой",
                color: "#800020",
                text: "Гадаа гарахаас зайлсхийж, эрүүл мэндээ хамгаалаарай.",
              },
            ].map((item) => (
              <article
                className="chanar-guide-card"
                key={item.range}
              >
                <span
                  className="chanar-guide-dot"
                  style={{
                    backgroundColor: item.color,
                  }}
                />

                <div>
                  <strong>{item.label}</strong>
                  <span>{item.range} индекс</span>
                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
        
      </div>
         {/* Агаарын чанарын Footer */}
    <AgaarFooter />
      
    </main>

    

  );
  
}