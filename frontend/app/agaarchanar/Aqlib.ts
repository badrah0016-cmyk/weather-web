// =====================================================
// Нийтлэг төрөл, тооцоолол (page.tsx болон AgaarchanarMap.tsx хоёр хуваалцана)
// =====================================================

export type Station = {
  station_sid?: number | string | null;
  stationSid?: number | string | null;
  sid?: number | string | null;
  stants_dugaar?: number | string | null;
  stantsDugaar?: number | string | null;
  id?: number | string | null;
  ner?: string | null;
  ner_en?: string | null;
  aimag?: string | null;
  urgurug?: number | string | null;
  urtrag?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  lng?: number | string | null;
};

export type AirQualityRow = {
  station_sid?: number | string | null;
  stationSid?: number | string | null;
  sid?: number | string | null;
  stants_dugaar?: number | string | null;
  stantsDugaar?: number | string | null;
  aqi?: number | string | null;
  AQI?: number | string | null;
  [key: string]: unknown;
};

export type PollutantKey =
  | "aqi" | "pm25" | "pm10" | "so2" | "no2" | "co" | "co2" | "o3";

export type PollutantOption = {
  key: PollutantKey;
  label: string;
  name: string;
  unit: string;
  keys: string[];
  /** Жишиг хязгаар. null бол ангилалгүй (зөвхөн утга харуулна). */
  limit: number | null;
  description: string;
};

export const POLLUTANTS: PollutantOption[] = [
  { key: "aqi", label: "AQI", name: "Агаарын чанарын нэгдсэн индекс", unit: "", keys: ["aqi", "AQI"], limit: null, description: "" },
  { key: "pm25", label: "PM2.5", name: "Нарийн ширхэгт тоосонцор", unit: "µg/m³", keys: ["pm25", "PM25", "pm2_5", "pm2.5", "pm_2_5"], limit: 50, description: "Уушгины гүнд нэвтэрч болох нарийн ширхэгт тоосонцор." },
  { key: "pm10", label: "PM10", name: "Том ширхэгт тоосонцор", unit: "µg/m³", keys: ["pm10", "PM10", "pm_10"], limit: 100, description: "Тоос, шороо болон бусад ширхэгт бодис." },
  // ЖИШИГ ХЯЗГААР (limit): PM2.5 / PM10-оос бусдыг албан ёсны стандарттай тулгаж баталгаажуулна уу.
  { key: "so2", label: "SO₂", name: "Хүхрийн давхар исэл", unit: "µg/m³", keys: ["so2", "SO2"], limit: 20, description: "Хүхэр агуулсан түлшний шаталтаас үүсэж болно." },
  { key: "no2", label: "NO₂", name: "Азотын давхар исэл", unit: "µg/m³", keys: ["no2", "NO2"], limit: 40, description: "Тээврийн хэрэгсэл болон шаталтаас үүсэж болно." },
  { key: "co", label: "CO", name: "Нүүрстөрөгчийн дан исэл", unit: "mg/m³", keys: ["co", "CO"], limit: 4, description: "Бүрэн бус шаталтын үед үүсдэг хий." },
  { key: "co2", label: "CO₂", name: "Нүүрсхүчлийн хий", unit: "ppm", keys: ["co2", "CO2"], limit: null, description: "API-д байвал л харуулна." },
  { key: "o3", label: "O₃", name: "Газрын түвшний озон", unit: "µg/m³", keys: ["o3", "O3", "O₃"], limit: 100, description: "Нарны гэрлийн нөлөөгөөр бусад бодисоос үүсэж болно." },
];

export const getPollutant = (key: PollutantKey) =>
  POLLUTANTS.find((p) => p.key === key) ?? POLLUTANTS[0];

// =====================================================
// ЗУРГААН АНГИЛАЛ (индекс 0–500)
// =====================================================

export type Category = {
  max: number;
  range: string;
  label: string;
  color: string;
  text: string; // тэмдэгтийн өнгө
  advice: string;
};

export const CATEGORIES: Category[] = [
  { max: 50, range: "0–50", label: "Цэвэр", color: "#16a34a", text: "#052e16", advice: "Гадаа чөлөөтэй үйл ажиллагаа явуулж болно." },
  { max: 100, range: "51–100", label: "Хэвийн", color: "#eab308", text: "#1c1917", advice: "Өдөр тутмын үйл ажиллагаагаа хэвийн үргэлжлүүлж болно." },
  { max: 200, range: "101–200", label: "Бага бохирдолтой", color: "#f97316", text: "#1c1917", advice: "Мэдрэмтгий хүмүүс гадаах идэвхтэй үйл ажиллагаагаа багасгаарай." },
  { max: 300, range: "201–300", label: "Бохирдолтой", color: "#dc2626", text: "#ffffff", advice: "Гадаа удаан байхаас зайлсхийж, идэвхтэй үйл ажиллагааг багасгаарай." },
  { max: 400, range: "301–400", label: "Их бохирдолтой", color: "#a855f7", text: "#ffffff", advice: "Гадаа байх хугацааг хязгаарлаж, цонхоо хаагаарай." },
  { max: Infinity, range: "401–500", label: "Маш их бохирдолтой", color: "#7f1d1d", text: "#ffffff", advice: "Гадаах үйл ажиллагааг аль болох хязгаарлаж, албан ёсны зөвлөмжийг дагаарай." },
];

export const UNKNOWN_CATEGORY: Category = {
  max: -1, range: "—", label: "Ангилалгүй", color: "#64748b", text: "#ffffff", advice: "Хэмжилтийн мэдээлэл шинэчлэгдэхийг хүлээнэ үү.",
};

/** Индекс = AQI бол утга өөрөө, бусад бодис = хэмжсэн / жишиг × 100 */
export function getIndex(key: PollutantKey, value: number | null): number | null {
  if (value === null) return null;
  if (key === "aqi") return value;
  const limit = getPollutant(key).limit;
  return limit ? Math.round((value / limit) * 100) : null;
}

export function getCategory(index: number | null): Category {
  if (index === null || !Number.isFinite(index)) return UNKNOWN_CATEGORY;
  return CATEGORIES.find((c) => index <= c.max) ?? CATEGORIES[CATEGORIES.length - 1];
}

// =====================================================
// ID, ТООН УТГА
// =====================================================

export function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const id = String(value).trim();
  return id || null;
}

const ID_KEYS = ["station_sid", "stationSid", "sid", "stants_dugaar", "stantsDugaar", "id"];

export function getStationId(item: object): string | null {
  const record = item as Record<string, unknown>;
  for (const key of ID_KEYS) {
    const id = normalizeId(record[key]);
    if (id) return id;
  }
  return null;
}

export function getRowStationId(row: AirQualityRow): string | null {
  // мөрийн өөрийн id нь станцын id биш тул "id" түлхүүрийг ашиглахгүй
  for (const key of ID_KEYS.slice(0, 5)) {
    const id = normalizeId(row[key]);
    if (id) return id;
  }
  return null;
}

function readNumber(row: AirQualityRow | undefined | null, keys: string[]): number | null {
  if (!row) return null;
  for (const key of keys) {
    const value = row[key];
    if (value === null || value === undefined || value === "") continue;
    const n = typeof value === "number" ? value : Number(String(value).trim().replace(",", "."));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

/**
 * Сонгосон бодисын бодит хэмжилт. Байхгүй бол null (дэлгэц дээр "—").
 * AQI: API-ийн aqi > 0 бол түүнийг, үгүй бол PM2.5/PM10-оос тооцно.
 */
export function getMeasurement(row: AirQualityRow | undefined | null, key: PollutantKey): number | null {
  if (!row) return null;

  if (key === "aqi") {
    const api = readNumber(row, ["aqi", "AQI"]);
    if (api !== null && api > 0) return Math.round(api);

    const parts = (["pm25", "pm10"] as const)
      .map((k) => getIndex(k, readNumber(row, getPollutant(k).keys)))
      .filter((v): v is number => v !== null);

    return parts.length ? Math.max(...parts) : null;
  }

  return readNumber(row, getPollutant(key).keys);
}

export function formatValue(value: number | null, unit = ""): string {
  if (value === null || !Number.isFinite(value)) return "—";
  const text = new Intl.NumberFormat("mn-MN", { maximumFractionDigits: 2 }).format(value);
  return unit ? `${text} ${unit}` : text;
}

// =====================================================
// КООРДИНАТ
// =====================================================

function toCoord(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export function getCoordinates(station: Station) {
  const lat = toCoord(station.urgurug ?? station.latitude ?? station.lat);
  const lng = toCoord(station.urtrag ?? station.longitude ?? station.lng ?? station.lon);

  if (lat === null || lng === null || lat < 41 || lat > 53 || lng < 87 || lng > 120) return null;
  return { lat, lng };
}

// =====================================================
// ОГНОО (цагийн бүсгүй огноог UTC+08 гэж үзнэ)
// =====================================================

export const TIME_ZONE = "Asia/Ulaanbaatar";

const DATE_KEYS = [
  "hemjsen_ognoo", "hemjilt_ognoo", "hemjilsen_ognoo", "ajiglasan_ognoo",
  "ognoo", "measured_at", "measuredAt", "measurement_date", "datetime",
  "timestamp", "date", "shinechilsen_ognoo", "created_at", "createdAt",
];

export function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") return new Date(value);
  if (typeof value !== "string") return null;

  const raw = value.trim();
  let text = raw;
  const mysql = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/);

  if (mysql) text = `${mysql[1]}T${mysql[2]}+08:00`;
  else if (/^\d{4}-\d{2}-\d{2}T/.test(raw) && !/(Z|[+-]\d{2}:\d{2}|[+-]\d{4})$/i.test(raw)) text = `${raw}+08:00`;

  const date = new Date(text);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getRowDate(row?: AirQualityRow | null): string | null {
  if (!row) return null;
  for (const key of DATE_KEYS) {
    if (parseDate(row[key])) return String(row[key]);
  }
  return null;
}

export function getDateValue(row?: AirQualityRow | null): number {
  return parseDate(getRowDate(row))?.getTime() ?? 0;
}

export function formatDate(value?: unknown): string {
  if (value === null || value === undefined || value === "") return "Огнооны мэдээлэл байхгүй";
  const date = parseDate(value);
  if (!date) return "Огнооны формат буруу";

  return new Intl.DateTimeFormat("mn-MN", {
    timeZone: TIME_ZONE, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(date);
}

/** Станц бүрийн хамгийн сүүлийн мөр */
export function latestByStation(rows: AirQualityRow[]): Map<string, AirQualityRow> {
  const latest = new Map<string, AirQualityRow>();
  for (const row of rows) {
    const id = getRowStationId(row);
    if (id === null) continue;
    const prev = latest.get(id);
    if (!prev || getDateValue(row) >= getDateValue(prev)) latest.set(id, row);
  }
  return latest;
}

// =====================================================
// БАЙРШИЛ (аймаг / хот)
// =====================================================

export const aimagOf = (station: Station) => (station.aimag ?? "").trim();

export const lower = (text: string) => text.toLocaleLowerCase("mn-MN");

export function unwrapArray<T>(json: unknown): T[] {
  if (Array.isArray(json)) return json as T[];
  if (!json || typeof json !== "object") return [];
  const object = json as Record<string, unknown>;

  for (const key of ["data", "rows", "result", "stations", "items"]) {
    const value = object[key];
    if (Array.isArray(value)) return value as T[];
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      for (const k of ["rows", "items", "stations"]) {
        if (Array.isArray(nested[k])) return nested[k] as T[];
      }
    }
  }
  return [];
}