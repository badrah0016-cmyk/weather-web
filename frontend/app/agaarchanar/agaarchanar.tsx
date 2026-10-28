"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import AgaarHeader from "./AgaarHeader";
import type { Station, AirQualityRow } from "./AgaarchanarMap";
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
  label: string;
  name: string;
  keys: string[];
  unit: string;
  description: string;
};

type AQIInfo = {
  label: string;
  color: string;
  description: string;
  advice: string;
};

const TIME_ZONE = "Asia/Ulaanbaatar";

/**
 * Жишиг хүлцэх агууламж.
 *
 * Эдгээр нь PM2.5, PM10-ын 24 цагийн хүлцэх утгын
 * жишээ юм. Монголын хүчинтэй AQI аргачлалын бүх
 * шаардлага, хугацаа, нэгжийг баталгаажуулсны дараа
 * үйлдвэрлэлийн хэрэглээнд эцэслэн тохируулна.
 */
const MONGOLIAN_AQI_LIMITS = {
  pm25: 50,
  pm10: 100,
} as const;

const pollutants: Pollutant[] = [
  {
    label: "PM2.5",
    name: "Нарийн ширхэгт тоосонцор",
    keys: ["pm25", "PM25", "pm2_5", "pm2.5", "pm_2_5"],
    unit: "µg/m³",
    description:
      "Уушгины гүнд нэвтэрч болох нарийн ширхэгт тоосонцор.",
  },
  {
    label: "PM10",
    name: "Том ширхэгт тоосонцор",
    keys: ["pm10", "PM10", "pm_10"],
    unit: "µg/m³",
    description: "Тоос, шороо болон бусад ширхэгт бодис.",
  },
  {
    label: "NO₂",
    name: "Азотын давхар исэл",
    keys: ["no2", "NO2"],
    unit: "API-ийн нэгжийг шалгана уу",
    description: "Тээврийн хэрэгсэл болон шаталтаас үүсэж болно.",
  },
  {
    label: "SO₂",
    name: "Хүхрийн давхар исэл",
    keys: ["so2", "SO2"],
    unit: "API-ийн нэгжийг шалгана уу",
    description: "Хүхэр агуулсан түлшний шаталтаас үүсэж болно.",
  },
  {
    label: "CO",
    name: "Нүүрстөрөгчийн дутуу исэл",
    keys: ["co", "CO"],
    unit: "API-ийн нэгжийг шалгана уу",
    description: "Бүрэн бус шаталтын үед үүсдэг хий.",
  },
  {
    label: "O₃",
    name: "Газрын түвшний озон",
    keys: ["o3", "O3", "O₃"],
    unit: "API-ийн нэгжийг шалгана уу",
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
// AQI ТООЦООЛОЛ
// МОНГОЛЫН АРГАЧЛАЛЫН ЗАРЧИМД ТУЛГУУРЛАСАН
// =====================================================

/**
 * Дэд индексийн жишиг тооцоо:
 *
 * Дэд индекс = хэмжсэн агууламж / хүлцэх агууламж × 100
 *
 * Анхаарах:
 * - PM2.5, PM10-ын агууламж µg/m³ байх ёстой.
 * - Хүлцэх агууламж болон хэмжилтийн хугацаа тохирсон байх ёстой.
 * - Энд PM2.5, PM10 л тооцогдоно.
 * - Энэ функц дангаараа Монголын албан ёсны бүх AQI
 *   дүрэм, ангилал, хэмжилтийн хугацааг орлохгүй.
 */
function calculateSubIndex(
  concentration: number | null,
  limit: number,
): number | null {
  if (
    concentration === null ||
    !Number.isFinite(concentration) ||
    concentration < 0 ||
    !Number.isFinite(limit) ||
    limit <= 0
  ) {
    return null;
  }

  return Math.round((concentration / limit) * 100);
}

/**
 * PM2.5 болон PM10-ын дэд индексийг тус тус тооцно.
 * Нийт үзүүлэлтээр хамгийн өндөр дэд индексийг авна.
 *
 * API-ийн aqi талбарыг энд ашиглахгүй. API-аас ирсэн
 * aqi нь ямар аргачлалаар тооцогдсоныг баталгаажуулаагүй.
 */
function getCalculatedAqi(
  row?: AirQualityRow | null,
): number | null {
  if (!row) return null;

  const pm25 = getNumber(row, [
    "pm25",
    "PM25",
    "pm2_5",
    "pm2.5",
    "pm_2_5",
  ]);

  const pm10 = getNumber(row, [
    "pm10",
    "PM10",
    "pm_10",
  ]);

  const pm25Index = calculateSubIndex(
    pm25,
    MONGOLIAN_AQI_LIMITS.pm25,
  );

  const pm10Index = calculateSubIndex(
    pm10,
    MONGOLIAN_AQI_LIMITS.pm10,
  );

  const indexes = [pm25Index, pm10Index].filter(
    (value): value is number => value !== null,
  );

  if (indexes.length === 0) {
    return null;
  }

  return Math.max(...indexes);
}

/**
 * Нэг л эх үүсвэрээс индекс авна.
 * API-ийн aqi-г өөр аргачлалын үр дүн байж болох тул
 * тооцоолсон утгатай хольж ашиглахгүй.
 */
function getValidatedAqi(
  row?: AirQualityRow | null,
): number | null {
  return getCalculatedAqi(row);
}

// =====================================================
// AQI АНГИЛАЛ, ӨНГӨ, ЗӨВЛӨМЖ
// =====================================================

/**
 * Доорх ангиллууд нь дэлгэцийн түр дүрслэлийн ангилал.
 * Монголын хүчинтэй албан ёсны ангиллын босготой тулгаж
 * баталгаажуулах хүртэл албан ёсны ангилал гэж үзэхгүй.
 */
function getCategory(aqi: number | null): string {
  if (aqi === null) return "Индекс тодорхойгүй";
  if (aqi <= 50) return "Сайн";
  if (aqi <= 100) return "Дунд зэрэг";
  if (aqi <= 150) return "Мэдрэмтгий бүлэгт муу";
  if (aqi <= 200) return "Муу";
  if (aqi <= 300) return "Маш муу";

  return "Аюултай";
}

function getAqiColor(aqi: number | null): string {
  if (aqi === null) return "#64748b";
  if (aqi <= 50) return "#16a34a";
  if (aqi <= 100) return "#eab308";
  if (aqi <= 150) return "#f97316";
  if (aqi <= 200) return "#dc2626";
  if (aqi <= 300) return "#9333ea";

  return "#7f1d1d";
}

function getAQIInfo(aqi: number | null): AQIInfo {
  if (aqi === null) {
    return {
      label: "Мэдээлэлгүй",
      color: "#64748b",
      description:
        "Индекс тооцоолоход шаардлагатай PM2.5, PM10 хэмжилт алга.",
      advice:
        "Хэмжилтийн мэдээлэл шинэчлэгдэхийг хүлээнэ үү.",
    };
  }

  if (aqi <= 50) {
    return {
      label: "Сайн",
      color: "#16a34a",
      description:
        "Тооцоолсон индекс бага байна. Энэ нь бүх бохирдуулагч аюулгүй гэсэн баталгаа биш.",
      advice:
        "Мэдрэмтгий хүмүүс өөрийн биеийн байдлыг анхаарч, албан ёсны зөвлөмжийг дагаарай.",
    };
  }

  if (aqi <= 100) {
    return {
      label: "Дунд зэрэг",
      color: "#eab308",
      description:
        "Тооцоолсон индекс нэмэгдсэн байна.",
      advice:
        "Мэдрэмтгий хүмүүс шинж тэмдэг илэрвэл гадаах ачааллаа багасгана уу.",
    };
  }

  if (aqi <= 150) {
    return {
      label: "Мэдрэмтгий бүлэгт муу",
      color: "#f97316",
      description:
        "Тооцоолсон индекс мэдэгдэхүйц нэмэгдсэн байна.",
      advice:
        "Хүүхэд, өндөр настан болон мэдрэмтгий хүмүүс гадаах ачааллаа багасгаж, албан ёсны зөвлөмжийг дагаарай.",
    };
  }

  if (aqi <= 200) {
    return {
      label: "Муу",
      color: "#dc2626",
      description:
        "Тооцоолсон индекс өндөр байна.",
      advice:
        "Гадаах идэвхтэй үйл ажиллагааг багасгаж, албан ёсны эрүүл мэндийн зөвлөмжийг дагаарай.",
    };
  }

  if (aqi <= 300) {
    return {
      label: "Маш муу",
      color: "#9333ea",
      description:
        "Тооцоолсон индекс маш өндөр байна.",
      advice:
        "Гадаа байх хугацааг хязгаарлаж, албан ёсны зөвлөмжийг дагаарай.",
    };
  }

  return {
    label: "Аюултай",
    color: "#7f1d1d",
    description:
      "Тооцоолсон индекс маш өндөр байна.",
    advice:
      "Гадаах үйл ажиллагааг хязгаарлаж, албан ёсны эрүүл мэндийн зөвлөмжийг дагаарай.",
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

        const ulaanbaatar = stationList.find((station) => {
          const item = asRecord(station);
          const name = String(item.ner ?? "")
            .toLocaleLowerCase("mn-MN");
          const aimag = String(item.aimag ?? "")
            .toLocaleLowerCase("mn-MN");

          return (
            name.includes("улаанбаатар") ||
            aimag.includes("улаанбаатар")
          );
        });

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

  const selectedAir = selectedStationData
    ? latestByStation.get(
        String(getStationId(selectedStationData)),
      )
    : undefined;

  const aqi = getValidatedAqi(selectedAir);
  const category = getCategory(aqi);
  const aqiColor = getAqiColor(aqi);
  const aqiInfo = getAQIInfo(aqi);
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
          item.aimag ?? "",
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
        const value = getValidatedAqi(row);

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
  }, [stations, latestByStation]);

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
              Станцын хэмжилт, тооцоолсон индекс болон
              бохирдуулагч бодисын мэдээлэл.
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

        {/* СТАНЦ ХАЙХ */}
        <section
          className="aq-search-card"
          aria-label="Станц хайх"
        >
          <div className="aq-section-heading">
            <div>
              <h2>Станц хайх</h2>
              <p>
                Аймаг, станцын нэр эсвэл дугаараар хайна уу.
              </p>
            </div>

            <span className="aq-map-badge">
              {stations.length} СТАНЦ
            </span>
          </div>

          <div className="aq-search-input-wrap">
            <span
              className="aq-search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              className="aq-station-search"
              type="search"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Жишээ: Улаанбаатар, Орхон, 12401..."
              aria-label="Станц хайх"
              autoComplete="off"
            />

            {search && (
              <button
                className="aq-clear-search"
                type="button"
                aria-label="Хайлтыг арилгах"
                onClick={() => setSearch("")}
              >
                ×
              </button>
            )}
          </div>

          {search.trim() ? (
            <div className="aq-station-list">
              {filteredStations.map((station) => {
                const id = getStationId(station);

                if (id === null) return null;

                const item = asRecord(station);
                const active =
                  String(id) === String(selectedStation);

                return (
                  <button
                    className={`aq-station-option ${
                      active ? "selected" : ""
                    }`}
                    type="button"
                    key={String(id)}
                    onClick={() => {
                      setSelectedStation(id);
                      setSearch("");
                    }}
                  >
                    <span
                      className="aq-station-pin"
                      aria-hidden="true"
                    >
                      ●
                    </span>

                    <span className="aq-station-option-text">
                      <strong>
                        {String(item.ner ?? "Нэргүй станц")}
                      </strong>
                      <small>
                        {String(
                          item.aimag ??
                            "Байршил тодорхойгүй",
                        )}
                      </small>
                    </span>

                    <span
                      className="aq-option-arrow"
                      aria-hidden="true"
                    >
                      ›
                    </span>
                  </button>
                );
              })}

              {filteredStations.length === 0 && (
                <p className="aq-no-results">
                  Хайлтад тохирох станц олдсонгүй.
                </p>
              )}
            </div>
          ) : (
            <p className="aq-search-hint">
              Газрын зураг дээрх тэмдэглэгээг дарж станц сонгоно уу.
            </p>
          )}
        </section>

        {/* СТАНЦ СОНГОХ */}
        <section className="aq-search-card">
          <div className="aq-section-heading">
            <div>
              <h2>Станц сонгох</h2>
              <p>
                Жагсаалтаас хэмжилтийн станцаа сонгоно уу.
              </p>
            </div>
          </div>

          <select
            className="aq-station-search"
            aria-label="Хэмжилтийн станц сонгох"
            value={
              selectedStation === null
                ? ""
                : String(selectedStation)
            }
            disabled={loading || stations.length === 0}
            onChange={(event) => {
              const station = stations.find(
                (item) =>
                  String(getStationId(item)) ===
                  event.target.value,
              );

              setSelectedStation(
                station ? getStationId(station) : null,
              );
            }}
          >
            {stations.length === 0 && (
              <option value="">
                {loading
                  ? "Станц ачаалж байна..."
                  : "Станц олдсонгүй"}
              </option>
            )}

            {stations.map((station) => {
              const id = getStationId(station);

              if (id === null) return null;

              const item = asRecord(station);

              return (
                <option
                  key={String(id)}
                  value={String(id)}
                >
                  {String(item.ner ?? "Нэргүй станц")}
                  {item.aimag
                    ? ` — ${String(item.aimag)}`
                    : ""}
                </option>
              );
            })}
          </select>
        </section>

        {/* ГАЗРЫН ЗУРАГ БА СОНГОСОН СТАНЦ */}
        <div className="aq-layout-top" id="map">
          <section className="aq-map-card">
            <div className="aq-card-heading">
              <div>
                <h2>Станцуудын газрын зураг</h2>
                <p>
                  Газрын зураг дээрх өнгө нь боломжтой AQI утгыг
                  харуулна.
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
                onSelectStation={(id) => {
                  setSelectedStation(String(id));
                }}
              />
            )}
          </section>

          <aside className="aq-details-column">
            <section className="aq-selected-station-card">
              <div className="aq-card-heading">
                <div>
                  <h2>Сонгосон станц</h2>
                  <p>Хамгийн сүүлд бүртгэгдсэн хэмжилт</p>
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

                      <small>
                        {String(
                          asRecord(selectedStationData).aimag ??
                            "Монгол Улс",
                        )}
                      </small>
                    </div>
                  </div>

                  <div className="aq-aqi-panel">
                    <div>
                      <span className="aq-aqi-label">
                        Тооцоолсон агаарын чанарын индекс
                      </span>

                      <div
                        className="aq-aqi-number"
                        style={{ color: aqiColor }}
                      >
                        {aqi ?? "—"}
                      </div>

                      <span
                        className="aq-aqi-category"
                        style={{
                          color: aqiColor,
                          borderColor: aqiColor,
                          background: `${aqiColor}12`,
                        }}
                      >
                        {category}
                      </span>
                    </div>

                    <span
                      className="aq-aqi-indicator"
                      style={{ background: aqiColor }}
                    />
                  </div>

                  <div
                    className="aq-aqi-description"
                    style={{
                      borderLeft: `4px solid ${aqiInfo.color}`,
                      padding: "12px 16px",
                      margin: "12px 0",
                      borderRadius: "8px",
                      background: `${aqiInfo.color}12`,
                    }}
                  >
                    <strong style={{ color: aqiInfo.color }}>
                      {aqiInfo.label}
                    </strong>

                    <p>{aqiInfo.description}</p>

                    <div>
                      <strong>Эрүүл мэндийн зөвлөмж</strong>
                      <p>{aqiInfo.advice}</p>
                    </div>
                  </div>

                  <div className="aq-station-meta">
                    <div>
                      <span>Станцын дугаар</span>
                      <strong>
                        {getStationId(selectedStationData) ?? "—"}
                      </strong>
                    </div>

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

                  {!selectedAir && (
                    <p className="aq-no-results">
                      Энэ станцын хэмжилтийн мэдээлэл алга.
                    </p>
                  )}

                  <button
                    type="button"
                    className="aq-change-station"
                    onClick={() => {
                      setSearch("");

                      document
                        .querySelector(".aq-search-card")
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                    }}
                  >
                    Өөр станц сонгох
                  </button>
                </>
              )}
            </section>
          </aside>
        </div>

        {/* СТАТИСТИК БА БОХИРДУУЛАГЧ БОДИС */}
        <section className="aq-statistics-section">
          <div className="aq-section-heading">
            <div>
              <h2>Агаарын чанарын тойм</h2>
              <p>
                Тооцоолж болох PM2.5, PM10 утгатай станцуудын
                үзүүлэлт.
              </p>
            </div>

            <span className="aq-map-badge">
              SUMMARY
            </span>
          </div>

          <div className="aq-pollutant-detail">
            <div className="aq-pollutant-table-title">
              <div>
                <h3>Бохирдуулагч бодисын дэлгэрэнгүй</h3>

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
                        {pollutant.unit}
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
                      <span>Хэмжилтийн утга</span>

                      <strong>
                        {value === null
                          ? "Мэдээлэл алга"
                          : "Бүртгэгдсэн"}
                      </strong>
                    </div>
                  </article>
                );
              })}
            </div>

            <p className="aq-pollutant-scale-note">
              Хэмжүүрийн зурвас нь утгыг дүрслэх зориулалттай.
              Энэ нь эрүүл мэндийн эрсдэлийн албан ёсны ангилал биш.
            </p>
          </div>

          <div className="aq-stat-grid">
            <article className="aq-stat-card aq-stat-aqi">
              <span className="aq-stat-icon" aria-hidden="true">
                ◉
              </span>

              <span className="aq-stat-label">
                Дундаж тооцоолсон индекс
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

            <article className="aq-stat-card">
              <span className="aq-stat-icon" aria-hidden="true">
                ✓
              </span>

              <span className="aq-stat-label">
                Бага индекс
              </span>

              <strong>{statistics.good}</strong>

              <span className="aq-stat-status">
                Тооцоолсон индекс 0–50
              </span>
            </article>

            <article className="aq-stat-card">
              <span className="aq-stat-icon" aria-hidden="true">
                !
              </span>

              <span className="aq-stat-label">
                Индекс 100-аас их
              </span>

              <strong>{statistics.high}</strong>

              <span className="aq-stat-status">
                Нэмэгдсэн индекс бүхий станц
              </span>
            </article>

            <article className="aq-stat-card">
              <span className="aq-stat-icon" aria-hidden="true">
                ↑
              </span>

              <span className="aq-stat-label">
                Хамгийн өндөр индекс
              </span>

              <strong>{statistics.worst?.aqi ?? "—"}</strong>

              <span className="aq-stat-station-name">
                {statistics.worst
                  ? String(
                      asRecord(
                        statistics.worst.station,
                      ).ner ?? "Мэдээлэл алга",
                    )
                  : "Мэдээлэл алга"}
              </span>
            </article>

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
            <strong>Тооцооллын тайлбар:</strong> API-аас ирсэн
            AQI утгыг өөр аргачлалын үр дүн байж болзошгүй тул
            шууд ашиглахгүй. PM2.5 болон PM10-ын хэмжилтээс
            жишиг хүлцэх агууламжид харьцуулан индекс тооцно.
            Хэмжилтийн хугацаа, нэгж болон стандартын босгыг
            баталгаажуулаагүй тул уг индексийг Монголын албан
            ёсны AQI гэж хараахан баталгаажуулах боломжгүй.
          </p>
        </section>

        {/* ИНДЕКСИЙН ТҮР ТАЙЛБАР */}
        <section
          className="chanar-guide-section"
          id="health"
        >
          <span className="chanar-section-kicker">
            AQI ТАЙЛБАР
          </span>

          <h2>Индексийг хэрхэн ойлгох вэ?</h2>

          <p>
            Доорх өнгө, ангилал нь одоогийн дэлгэцийн түр
            дүрслэл юм. Монголын хүчинтэй албан ёсны ангиллын
            босготой тулгаж баталгаажуулсны дараа эцэслэн хэрэглэнэ.
          </p>

          <div className="chanar-guide-grid">
            {[
              {
                range: "0–50",
                label: "Сайн",
                color: "#16a34a",
                text: "Тооцоолсон индекс бага.",
              },
              {
                range: "51–100",
                label: "Дунд зэрэг",
                color: "#ca8a04",
                text: "Индекс нэмэгдэж болзошгүй.",
              },
              {
                range: "101–150",
                label: "Мэдрэмтгий бүлэгт муу",
                color: "#ea580c",
                text: "Мэдрэмтгий хүмүүс болгоомжлоно.",
              },
              {
                range: "151–200",
                label: "Муу",
                color: "#dc2626",
                text: "Гадаах ачааллыг багасгана.",
              },
              {
                range: "201–300",
                label: "Маш муу",
                color: "#9333ea",
                text: "Албан ёсны зөвлөмжийг дагана.",
              },
              {
                range: "301+",
                label: "Аюултай",
                color: "#7f1d1d",
                text: "Эрүүл мэндийн зөвлөмжийг дагана.",
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
    </main>
  );
}