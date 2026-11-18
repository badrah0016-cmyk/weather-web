// MNS4585:2025 — Агаарын чанарын индекс (АЧИ)
export type PollutantId = "pm25" | "pm10" | "so2" | "no2" | "co" | "o3";
export type Row = Record<string, unknown>;

type Band = [cLow: number, cHigh: number, iLow: number, iHigh: number];

const INDEX_BANDS: [number, number][] = [
  [0, 50], [51, 100], [101, 200], [201, 300], [301, 400], [401, 500],
];

function bands(limits: [number, number][]): Band[] {
  return limits.map(([lo, hi], i) => [lo, hi, INDEX_BANDS[i][0], INDEX_BANDS[i][1]]);
}

export type PollutantConfig = {
  id: PollutantId;
  label: string;
  name: string;
  keys: string[];
  unit: string;
  hours: number;      // дундажлах цонх (цаг)
  scale: number;      // API-ийн утгыг хүснэгтийн нэгж рүү хөрвүүлэх хуваагч
  bands: Band[];
};

export const POLLUTANTS: PollutantConfig[] = [
  {
    id: "pm25", label: "PM2.5", name: "PM2.5 тоосонцор", keys: ["pm25"],
    unit: "µg/m³", hours: 24, scale: 1,
    bands: bands([[0, 35], [36, 50], [51, 150], [151, 250], [251, 350], [351, 500]]),
  },
  {
    id: "pm10", label: "PM10", name: "PM10 тоосонцор", keys: ["pm10"],
    unit: "µg/m³", hours: 24, scale: 1,
    bands: bands([[0, 50], [51, 100], [101, 300], [301, 420], [421, 500], [501, 600]]),
  },
  {
    id: "so2", label: "SO₂", name: "Хүхрийн давхар исэл", keys: ["so2"],
    unit: "µg/m³", hours: 1, scale: 1,
    bands: bands([[0, 100], [101, 300], [301, 800], [801, 1600], [1601, 2100], [2101, 2620]]),
  },
  {
    id: "no2", label: "NO₂", name: "Азотын давхар исэл", keys: ["no2"],
    unit: "µg/m³", hours: 1, scale: 1,
    bands: bands([[0, 100], [101, 200], [201, 700], [701, 2000], [2001, 3500], [3501, 3840]]),
  },
  {
    // Хүснэгтийн CO нь mg/m³ (хүлцэх агууламж 30 mg/m³). API µg/m³ өгдөг бол scale: 1000 болго.
    id: "co", label: "CO", name: "Нүүрстөрөгчийн дутуу исэл", keys: ["co"],
    unit: "mg/m³", hours: 8, scale: 1,
    bands: bands([[0, 5], [5.1, 10], [11, 15], [16, 30], [31, 40], [41, 50]]),
  },
  {
    id: "o3", label: "O₃", name: "Озон", keys: ["o3"],
    unit: "µg/m³", hours: 8, scale: 1,
    bands: bands([[0, 50], [51, 100], [101, 265], [266, 800]]),
  },
];

export const POLLUTANT_BY_ID = Object.fromEntries(
  POLLUTANTS.map((p) => [p.id, p]),
) as Record<PollutantId, PollutantConfig>;

// ---------- Ангилал ----------
export type AqiCategory = { label: string; color: string };

export function getAqiCategory(v: number | null): AqiCategory {
  if (v === null || !Number.isFinite(v) || v < 0)
    return { label: "Хэмжилт тодорхойгүй", color: "#64748b" };
  if (v <= 50) return { label: "Цэвэр", color: "#16e900" };
  if (v <= 100) return { label: "Хэвийн", color: "#fff000" };
  if (v <= 200) return { label: "Бага бохирдолтой", color: "#ff9200" };
  if (v <= 300) return { label: "Бохирдолтой", color: "#ff1010" };
  if (v <= 400) return { label: "Их бохирдолтой", color: "#963c9f" };
  return { label: "Маш их бохирдолтой", color: "#800020" };
}

// ---------- Мөр уншигч ----------
const norm = (k: string) => k.toLowerCase().replace(/[^a-z0-9]/g, "");

export function normalizeId(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s || null;
}

export function getRowId(row: Row): string | null {
  return (
    normalizeId(row.stants_dugaar) ?? normalizeId(row.stantsDugaar) ??
    normalizeId(row.station_sid) ?? normalizeId(row.stationSid) ??
    normalizeId(row.sid)
  );
}

export function parseTime(value: unknown): number {
  if (!value) return 0;
  const raw = String(value).trim();
  let s = raw;
  const m = raw.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/);
  if (m) s = `${m[1]}T${m[2]}+08:00`; // цагийн бүсгүй бол УБ (UTC+8)
  const t = new Date(s).getTime();
  return Number.isFinite(t) ? t : 0;
}

const TIME_KEYS = [
  "hemjsen_ognoo", "hemjilt_ognoo", "ajiglasan_ognoo", "ognoo",
  "measured_at", "measuredAt", "datetime", "timestamp", "date",
];

export function rowTime(row: Row): number {
  let latest = 0;
  for (const k of TIME_KEYS) latest = Math.max(latest, parseTime(row[k]));
  // хэмжилтийн огноо огт байхгүй бол л шинэчилсэн огноог ашиглана
  return latest || parseTime(row.shinechilsen_ognoo);
}

function readNumber(row: Row, keys: string[]): number | null {
  const wanted = keys.map(norm);
  for (const [k, v] of Object.entries(row)) {
    if (v === null || v === undefined || v === "") continue;
    if (!wanted.includes(norm(k))) continue;
    const n = typeof v === "number" ? v : Number(String(v).trim().replace(",", "."));
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

// ---------- Тооцоолол ----------
export function calcSubIndex(c: number, b: Band[]): number {
  for (const [cLo, cHi, iLo, iHi] of b) {
    if (c <= cHi) {
      const x = Math.max(c, cLo);
      return Math.round(iLo + ((iHi - iLo) * (x - cLo)) / (cHi - cLo));
    }
  }
  return b[b.length - 1][3];
}

export type PollutantResult = {
  concentration: number | null;
  index: number | null;
  approx: boolean; // true = дундаж хийх хангалттай түүвэргүй, сүүлийн хэмжилтийг авсан
};

export type StationAqi = {
  aqi: number | null;
  dominant: PollutantId | null;
  items: Record<PollutantId, PollutantResult>;
  time: number;
};

export function groupRowsByStation(rows: Row[]): Map<string, Row[]> {
  const map = new Map<string, Row[]>();
  for (const row of rows) {
    const id = getRowId(row);
    if (!id) continue;
    const list = map.get(id);
    if (list) list.push(row);
    else map.set(id, [row]);
  }
  return map;
}

function pollutantResult(rows: Row[], cfg: PollutantConfig, latestT: number): PollutantResult {
  const withTime = rows
    .map((r) => ({ t: rowTime(r), v: readNumber(r, cfg.keys) }))
    .filter((x): x is { t: number; v: number } => x.v !== null)
    .sort((a, b) => b.t - a.t);

  if (withTime.length === 0) return { concentration: null, index: null, approx: false };

  const from = latestT - cfg.hours * 3_600_000;
  const win = withTime.filter((x) => x.t > from && x.t <= latestT);
  const need = Math.ceil(cfg.hours * 0.75); // стандартын 75% түүврийн дүрэм

  let conc: number;
  let approx = false;
  if (cfg.hours > 1 && win.length >= need) {
    conc = win.reduce((s, x) => s + x.v, 0) / win.length;
  } else {
    conc = withTime[0].v;
    approx = cfg.hours > 1;
  }

  conc /= cfg.scale;
  return { concentration: conc, index: calcSubIndex(conc, cfg.bands), approx };
}

export function computeStation(rows: Row[] | undefined): StationAqi {
  const items = {} as Record<PollutantId, PollutantResult>;
  const empty: StationAqi = { aqi: null, dominant: null, items, time: 0 };

  for (const p of POLLUTANTS) items[p.id] = { concentration: null, index: null, approx: false };
  if (!rows || rows.length === 0) return empty;

  const latestT = Math.max(...rows.map(rowTime));
  let aqi: number | null = null;
  let dominant: PollutantId | null = null;

  for (const p of POLLUTANTS) {
    const r = pollutantResult(rows, p, latestT);
    items[p.id] = r;
    if (r.index !== null && (aqi === null || r.index > aqi)) {
      aqi = r.index;
      dominant = p.id;
    }
  }
  return { aqi, dominant, items, time: latestT };
}


// ---------- Газрын зураг / картын үзүүлэлт ----------
export type Metric = "aqi" | PollutantId;

export function metricValue(
  res: StationAqi | undefined,
  metric: Metric,
): { value: number | null; index: number | null } {
  if (!res) return { value: null, index: null };

  if (metric === "aqi") return { value: res.aqi, index: res.aqi };

  const item = res.items[metric];
  return { value: item.concentration, index: item.index };
}