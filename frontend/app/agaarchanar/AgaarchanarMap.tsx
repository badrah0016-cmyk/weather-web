
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";

// =====================================================
// ТӨРӨЛ
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
  undur?: number | string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lon?: number | string | null;
  lng?: number | string | null;
};

export type AirQualityRow = {
  id?: number | string | null;
  station_sid?: number | string | null;
  stationSid?: number | string | null;
  sid?: number | string | null;
  stants_dugaar?: number | string | null;
  stantsDugaar?: number | string | null;
  aqi?: number | string | null;
  AQI?: number | string | null;
  pm25?: number | string | null;
  pm2_5?: number | string | null;
  "pm2.5"?: number | string | null;
  pm10?: number | string | null;
  no2?: number | string | null;
  so2?: number | string | null;
  co?: number | string | null;
  o3?: number | string | null;
  angilal?: string | null;
  angilal_mn?: string | null;
  eruul_mend_zuvlumj?: string | null;
  ajiglasan_ognoo?: string | null;
  ognoo?: string | null;
  shinechilsen_ognoo?: string | null;
  hemjsen_ognoo?: string | null;
  measured_at?: string | null;
  measuredAt?: string | null;
  [key: string]: unknown;
};

type Props = {
  stations: Station[];
  airRows: AirQualityRow[];
  selectedStation: string | number | null;
  onSelectStation: (id: string | number) => void;
};

type AqiCategory = {
  label: string;
  color: string;
};

type StationAirStatus = {
  value: number | null;
  category: AqiCategory;
  source: "AQI" | "MNS_ESTIMATE" | "NONE";
  displayName: string;
};

// =====================================================
// МОНГОЛЫН ЖИШИГ ХЯЗГААР
//
// Эдгээр нь 24 цагийн жишиг концентраци.
// Өгөгдлийн дундажлах хугацаа болон нэгжийг
// API-ийн баримттай тулгаж баталгаажуулна.
// =====================================================

const PM25_STANDARD_24H = 50;
const PM10_STANDARD_24H = 100;

// =====================================================
// ID НЭГДСЭН ХЭЛБЭРТ ОРУУЛАХ
// =====================================================

function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const id = String(value).trim();
  return id ? id : null;
}

function getStationId(station: Station): string | null {
  return (
    normalizeId(station.station_sid) ??
    normalizeId(station.stationSid) ??
    normalizeId(station.sid) ??
    normalizeId(station.stants_dugaar) ??
    normalizeId(station.stantsDugaar) ??
    normalizeId(station.id)
  );
}

function getRowStationId(row: AirQualityRow): string | null {
  return (
    normalizeId(row.station_sid) ??
    normalizeId(row.stationSid) ??
    normalizeId(row.sid) ??
    normalizeId(row.stants_dugaar) ??
    normalizeId(row.stantsDugaar)
  );
}

// =====================================================
// КООРДИНАТ
// =====================================================

function parseCoordinate(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getCoordinates(station: Station) {
  const lat = parseCoordinate(
    station.urgurug ?? station.latitude ?? station.lat,
  );

  const lng = parseCoordinate(
    station.urtrag ??
      station.longitude ??
      station.lng ??
      station.lon,
  );

  if (
    lat === null ||
    lng === null ||
    lat < 41 ||
    lat > 53 ||
    lng < 87 ||
    lng > 120
  ) {
    return null;
  }

  return { lat, lng };
}

// =====================================================
// ОГНОО
// =====================================================

function parseMeasurementDate(value: unknown): number {
  if (typeof value !== "string" && !(value instanceof Date)) {
    return 0;
  }

  if (!value) return 0;

  const raw = String(value).trim();
  let normalized = raw;

  // MySQL-ийн цагийн бүсгүй огноог Монголын UTC+08
  // цаг гэж үзнэ.
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

  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getDateValue(row: AirQualityRow): number {
  const values = [
    row.hemjsen_ognoo,
    row.ajiglasan_ognoo,
    row.ognoo,
    row.measured_at,
    row.measuredAt,
    row.shinechilsen_ognoo,
  ];

  for (const value of values) {
    const timestamp = parseMeasurementDate(value);
    if (timestamp > 0) return timestamp;
  }

  return 0;
}

function getDateLabel(row?: AirQualityRow): string {
  if (!row) return "Мэдээлэл алга";

  const value =
    row.hemjsen_ognoo ??
    row.ajiglasan_ognoo ??
    row.ognoo ??
    row.measured_at ??
    row.measuredAt ??
    row.shinechilsen_ognoo;

  if (!value) return "Огноо тодорхойгүй";

  const timestamp = parseMeasurementDate(value);

  if (!timestamp) return String(value);

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ulaanbaatar",
  }).format(timestamp);
}

// =====================================================
// ТООН УТГА
// =====================================================

function getNumber(
  row: AirQualityRow | undefined,
  keys: string[],
): number | null {
  if (!row) return null;

  for (const key of keys) {
    const value = row[key];

    if (value === null || value === undefined || value === "") {
      continue;
    }

    const number =
      typeof value === "number"
        ? value
        : Number(String(value).trim().replace(",", "."));

    if (Number.isFinite(number)) return number;
  }

  return null;
}

function getValidMeasurement(
  row: AirQualityRow | undefined,
  keys: string[],
): number | null {
  const value = getNumber(row, keys);

  if (value === null || value < 0) return null;

  return value;
}

// =====================================================
// МОНГОЛЫН ЖИШИГТ ХАРЬЦУУЛСАН ТҮР ИНДЕКС
//
// Харьцуулсан үзүүлэлт =
// хэмжсэн агууламж / жишиг агууламж * 100
//
// PM2.5 ба PM10-аас гарсан үзүүлэлтийн
// хамгийн ихийг харуулна.
// =====================================================

function calculateMongolianEstimate(
  row: AirQualityRow,
): number | null {
  const pm25 = getValidMeasurement(row, ["pm25", "pm2_5", "pm2.5"]);
  const pm10 = getValidMeasurement(row, ["pm10"]);

  const indices: number[] = [];

  if (pm25 !== null) {
    indices.push((pm25 / PM25_STANDARD_24H) * 100);
  }

  if (pm10 !== null) {
    indices.push((pm10 / PM10_STANDARD_24H) * 100);
  }

  if (indices.length === 0) return null;

  return Math.round(Math.max(...indices));
}

// =====================================================
// ӨНГӨ БА АНГИЛАЛ
//
// Энэ нь газрын зургийн дүрслэлийн шатлал.
// Албан ёсны AQI ангилал гэж ойлгож болохгүй.
// =====================================================

function getCategory(value: number | null): AqiCategory {
  if (value === null || !Number.isFinite(value) || value < 0) {
    return {
      label: "Хэмжилт тодорхойгүй",
      color: "#64748b",
    };
  }

  if (value <= 100) {
    return { label: "Жишиг хязгаарт", color: "#16a34a" };
  }

  if (value <= 200) {
    return { label: "Жишгээс өндөр", color: "#eab308" };
  }

  if (value <= 300) {
    return { label: "Өндөр", color: "#f97316" };
  }

  if (value <= 400) {
    return { label: "Маш өндөр", color: "#dc2626" };
  }

  if (value <= 500) {
    return { label: "Ноцтой өндөр", color: "#9333ea" };
  }

  return { label: "Онцгой өндөр", color: "#7f1d1d" };
}

// =====================================================
// СТАНЦЫН ТӨЛӨВ
// =====================================================

function getStationAirStatus(
  row?: AirQualityRow,
): StationAirStatus {
  const unknown: StationAirStatus = {
    value: null,
    category: getCategory(null),
    source: "NONE",
    displayName: "Индекс тодорхойгүй",
  };

  if (!row) return unknown;

  // API-ийн AQI 0-ээс их байвал API утгыг ашиглана.
  const apiAqi = getNumber(row, ["aqi", "AQI"]);

  if (apiAqi !== null && apiAqi > 0) {
    return {
      value: Math.round(apiAqi),
      category: getCategory(apiAqi),
      source: "AQI",
      displayName: "API AQI",
    };
  }

  // AQI байхгүй эсвэл 0 үед жишиг хязгаарт харьцуулна.
  const estimate = calculateMongolianEstimate(row);

  if (estimate !== null) {
    return {
      value: estimate,
      category: getCategory(estimate),
      source: "MNS_ESTIMATE",
      displayName: "Жишигтэй харьцуулсан үзүүлэлт",
    };
  }

  return unknown;
}

// =====================================================
// УТГА ХАРУУЛАХ
// =====================================================

function formatValue(value: number | null, unit = ""): string {
  if (value === null || !Number.isFinite(value)) return "—";

  const formatted = new Intl.NumberFormat("mn-MN", {
    maximumFractionDigits: 2,
  }).format(value);

  return unit ? `${formatted} ${unit}` : formatted;
}

function getStatusValue(status: StationAirStatus): string {
  if (status.value === null) return "—";

  return formatValue(
    status.value,
    status.source === "MNS_ESTIMATE" ? "%" : "",
  );
}

// =====================================================
// МОНГОЛЫН ХИЛИЙН GEOJSON
// =====================================================

function MongoliaBounds({
  geoJson,
}: {
  geoJson: GeoJsonObject | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!geoJson) return;

    const layer = L.geoJSON(geoJson);
    const bounds = layer.getBounds();

    if (bounds.isValid()) {
      map.fitBounds(bounds, {
        padding: [20, 20],
        maxZoom: 6,
        animate: false,
      });
    }
  }, [geoJson, map]);

  return null;
}

// =====================================================
// MAP RESIZE
// =====================================================

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      map.invalidateSize({ pan: false });
    });

    return () => cancelAnimationFrame(frame);
  }, [map]);

  return null;
}

// =====================================================
// СОНГОСОН СТАНЦ РУУ ШИЛЖИХ
// =====================================================

function SelectedStationView({
  station,
}: {
  station: Station | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (!station) return;

    const coordinates = getCoordinates(station);
    if (!coordinates) return;

    map.flyTo(
      [coordinates.lat, coordinates.lng],
      Math.max(map.getZoom(), 6),
      { duration: 0.45 },
    );
  }, [station, map]);

  return null;
}

// =====================================================
// ҮНДСЭН ГАЗРЫН ЗУРАГ
// =====================================================

export default function AgaarchanarMap({
  stations,
  airRows,
  selectedStation,
  onSelectStation,
}: Props) {
  const [geoJson, setGeoJson] = useState<GeoJsonObject | null>(null);
  const [geoJsonError, setGeoJsonError] = useState("");

  // Монголын хил ачаалах
  useEffect(() => {
    const controller = new AbortController();

    async function loadBoundary() {
      try {
        const response = await fetch("/mongolia.geojson", {
          signal: controller.signal,
          cache: "force-cache",
        });

        if (!response.ok) {
          throw new Error("GeoJSON файл олдсонгүй");
        }

        const data = (await response.json()) as GeoJsonObject;

        setGeoJson(data);
        setGeoJsonError("");
      } catch (error) {
        if (controller.signal.aborted) return;

        console.error("Монголын хил ачааллах алдаа:", error);

        setGeoJsonError(
          "Монголын хил ачаалсангүй. public/mongolia.geojson файлыг шалгана уу.",
        );
      }
    }

    void loadBoundary();

    return () => controller.abort();
  }, []);

  // Станц тус бүрийн хамгийн сүүлийн хэмжилт
  const airByStation = useMemo(() => {
    const latest = new Map<string, AirQualityRow>();

    for (const row of airRows) {
      const id = getRowStationId(row);
      if (id === null) continue;

      const previous = latest.get(id);

      if (!previous || getDateValue(row) >= getDateValue(previous)) {
        latest.set(id, row);
      }
    }

    return latest;
  }, [airRows]);

  // Зөв координаттай станцууд
  const validStations = useMemo(
    () =>
      stations.filter(
        (station) =>
          getStationId(station) !== null &&
          getCoordinates(station) !== null,
      ),
    [stations],
  );

  // Сонгосон станц
  const selectedStationData = useMemo(
    () =>
      validStations.find(
        (station) =>
          getStationId(station) === normalizeId(selectedStation),
      ) ?? null,
    [validStations, selectedStation],
  );

  // Цэг дээр дарахад parent буюу үндсэн хуудсанд ID дамжуулна.
 function handleStationClick(id: string | number) {
    const normalizedId = normalizeId(id);

    console.log("1. Дарсан ID:", id);
    console.log("2. Хэвийн болгосон ID:", normalizedId);

    if (normalizedId === null) {
        console.error("Станцын ID буруу байна:", id);
        return;
    }

    console.log("3. Нүүр хуудас руу дамжуулж байна:", normalizedId);
    onSelectStation(normalizedId);
}

  return (
    <div className="aq-map-container">
      <div className="aq-map-topline">
        <span className="aq-map-status-dot" />
        <span>Монгол Улс</span>
        <span className="aq-map-topline-separator">·</span>
        <span>{validStations.length} станц</span>
        <span className="aq-map-topline-separator">·</span>
        <span>{airRows.length} хэмжилтийн мөр</span>
      </div>

      <MapContainer
        center={[46.8, 103.8]}
        zoom={5}
        minZoom={4}
        maxZoom={10}
        scrollWheelZoom
        zoomControl
        preferCanvas
        style={{
          width: "100%",
          height: "100%",
          minHeight: 450,
          background: "#eaf2f8",
        }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {geoJson && (
          <>
            <GeoJSON
              data={geoJson}
              style={{
                color: "#0f766e",
                weight: 2,
                opacity: 0.95,
                fillColor: "#14b8a6",
                fillOpacity: 0.08,
              }}
            />
            <MongoliaBounds geoJson={geoJson} />
          </>
        )}

        <MapResizeHandler />
        <SelectedStationView station={selectedStationData} />

        {validStations.map((station) => {
          const id = getStationId(station);
          const coordinates = getCoordinates(station);

          if (id === null || !coordinates) return null;

          const row = airByStation.get(id);
          const status = getStationAirStatus(row);

          const pm25 = getValidMeasurement(row, [
            "pm25",
            "pm2_5",
            "pm2.5",
          ]);

          const pm10 = getValidMeasurement(row, ["pm10"]);

          const isSelected =
            selectedStation !== null &&
            id === normalizeId(selectedStation);

          const stationName =
            station.ner || station.ner_en || `Станц ${id}`;

          return (
            <CircleMarker
              key={id}
              center={[coordinates.lat, coordinates.lng]}
              radius={isSelected ? 10 : 7}
              pathOptions={{
                color: isSelected ? "#0f172a" : "#ffffff",
                weight: isSelected ? 3 : 2,
                fillColor: status.category.color,
                fillOpacity: 1,
              }}
              eventHandlers={{
                click: () => handleStationClick(id),
              }}
            >
              <Tooltip direction="top" offset={[0, -8]}>
                <div className="aq-map-tooltip">
                  <strong>{stationName}</strong>

                  <div>
                    {status.source === "AQI"
                      ? "API-аас ирсэн AQI"
                      : status.source === "MNS_ESTIMATE"
                        ? "Жишигтэй харьцуулсан үзүүлэлт"
                        : "Индекс"}
                    :{" "}
                    <strong>{getStatusValue(status)}</strong>
                  </div>

                  {status.source === "MNS_ESTIMATE" && (
                    <small>
                      Албан ёсны AQI гэж баталгаажаагүй
                    </small>
                  )}

                  <div
                    style={{
                      color: status.category.color,
                      fontWeight: 700,
                    }}
                  >
                    {status.category.label}
                  </div>

                  <div>PM2.5: {formatValue(pm25, "µg/m³")}</div>
                  <div>PM10: {formatValue(pm10, "µg/m³")}</div>

                  <small>{getDateLabel(row)}</small>

                  <small>Станцын дугаар: {id}</small>
                </div>
              </Tooltip>
            </CircleMarker>
          );
        })}
      </MapContainer>

      {geoJsonError && (
        <p className="aq-map-error" role="status">
          {geoJsonError}
        </p>
      )}

      {selectedStationData && (
        <div className="aq-map-selected-summary">
          <strong>
            {selectedStationData.ner ?? `Станц ${getStationId(selectedStationData)}`}
          </strong>
          <span>
            Сонгосон станцын мэдээлэл үндсэн хэсэгт шинэчлэгдэнэ.
          </span>
        </div>
      )}

      <div className="aq-map-legend">
        <span>
          <i style={{ background: "#16a34a" }} />
          Жишиг хязгаарт
        </span>
        <span>
          <i style={{ background: "#eab308" }} />
          Жишгээс өндөр
        </span>
        <span>
          <i style={{ background: "#f97316" }} />
          Өндөр
        </span>
        <span>
          <i style={{ background: "#dc2626" }} />
          Маш өндөр
        </span>
        <span>
          <i style={{ background: "#9333ea" }} />
          Ноцтой өндөр
        </span>
        <span>
          <i style={{ background: "#7f1d1d" }} />
          Онцгой өндөр
        </span>
        <span>
          <i style={{ background: "#64748b" }} />
          Хэмжилт тодорхойгүй
        </span>
      </div>
    </div>
  );
}
