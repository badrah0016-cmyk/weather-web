
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
  source: "CALCULATED" | "NONE";
};

type Breakpoint = {
  low: number;
  high: number;
  indexLow: number;
  indexHigh: number;
};

// =====================================================
// ID
// =====================================================

function normalizeId(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  const id = String(value).trim();

  return id || null;
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
    station.urgurug ?? station.latitude ?? station.lat
  );

  const lng = parseCoordinate(
    station.urtrag ??
      station.longitude ??
      station.lng ??
      station.lon
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
  if (!value) return 0;

  const raw = String(value).trim();
  let normalized = raw;

  // MySQL datetime: 2026-11-17 14:30:00
  const mysqlMatch = raw.match(
    /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)$/
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
  if (!row) return "Хэмжилтийн мэдээлэл алга";

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
// ӨГӨГДЛИЙН ТАЛБАР ХАЙХ
// =====================================================

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findRowValue(
  row: AirQualityRow | undefined,
  aliases: string[]
): unknown {
  if (!row) return null;

  const normalizedAliases = aliases.map(normalizeKey);

  for (const [key, value] of Object.entries(row)) {
    if (value === null || value === undefined || value === "") {
      continue;
    }

    if (normalizedAliases.includes(normalizeKey(key))) {
      return value;
    }
  }

  return null;
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number =
    typeof value === "number"
      ? value
      : Number(String(value).trim().replace(",", "."));

  if (!Number.isFinite(number) || number < 0) {
    return null;
  }

  return number;
}

// =====================================================
// PM2.5 / PM10 УТГАА АВАХ
// =====================================================

function getPM25(row?: AirQualityRow): number | null {
  return toNumber(
    findRowValue(row, [
      "pm25",
      "pm2_5",
      "pm2.5",
      "pm_25",
      "pm25_value",
    ])
  );
}

function getPM10(row?: AirQualityRow): number | null {
  return toNumber(
    findRowValue(row, [
      "pm10",
      "pm10_value",
    ])
  );
}

// =====================================================
// AQI АНГИЛАЛ
// ӨМНӨХ CHANARPAGE-ТЭЙ ИЖИЛ
// =====================================================

function getCategory(value: number | null): AqiCategory {
  if (
    value === null ||
    !Number.isFinite(value) ||
    value < 0
  ) {
    return {
      label: "Хэмжилт тодорхойгүй",
      color: "#64748b",
    };
  }

  if (value <= 50) {
    return {
      label: "Цэвэр",
      color: "#16e900",
    };
  }

  if (value <= 100) {
    return {
      label: "Хэвийн",
      color: "#fff000",
    };
  }

  if (value <= 200) {
    return {
      label: "Бага бохирдолтой",
      color: "#ff9200",
    };
  }

  if (value <= 300) {
    return {
      label: "Бохирдолтой",
      color: "#ff1010",
    };
  }

  if (value <= 400) {
    return {
      label: "Их бохирдолтой",
      color: "#963c9f",
    };
  }

  return {
    label: "Маш их бохирдолтой",
    color: "#800020",
  };
}

// =====================================================
// AQI BREAKPOINT
// =====================================================

const PM25_BREAKPOINTS: Breakpoint[] = [
  { low: 0, high: 9.0, indexLow: 0, indexHigh: 50 },
  { low: 9.1, high: 35.4, indexLow: 51, indexHigh: 100 },
  { low: 35.5, high: 55.4, indexLow: 101, indexHigh: 150 },
  { low: 55.5, high: 125.4, indexLow: 151, indexHigh: 200 },
  { low: 125.5, high: 225.4, indexLow: 201, indexHigh: 300 },
  { low: 225.5, high: 325.4, indexLow: 301, indexHigh: 500 },
];

const PM10_BREAKPOINTS: Breakpoint[] = [
  { low: 0, high: 54, indexLow: 0, indexHigh: 50 },
  { low: 55, high: 154, indexLow: 51, indexHigh: 100 },
  { low: 155, high: 254, indexLow: 101, indexHigh: 150 },
  { low: 255, high: 354, indexLow: 151, indexHigh: 200 },
  { low: 355, high: 424, indexLow: 201, indexHigh: 300 },
  { low: 425, high: 604, indexLow: 301, indexHigh: 500 },
];

function calculateSubIndex(
  concentration: number | null,
  breakpoints: Breakpoint[],
  precision: number
): number | null {
  if (concentration === null || concentration < 0) {
    return null;
  }

  const factor = Math.pow(10, precision);

  const rounded =
    Math.floor(concentration * factor) / factor;

  const breakpoint = breakpoints.find(
    (item) =>
      rounded >= item.low &&
      rounded <= item.high
  );

  if (!breakpoint) {
    if (rounded > breakpoints[breakpoints.length - 1].high) {
      return 500;
    }

    return null;
  }

  const index =
    ((breakpoint.indexHigh - breakpoint.indexLow) /
      (breakpoint.high - breakpoint.low)) *
      (rounded - breakpoint.low) +
    breakpoint.indexLow;

  return Math.round(index);
}

// =====================================================
// AQI ӨӨРӨӨ ТООЦОХ
// =====================================================

function calculateAQI(
  row?: AirQualityRow
): number | null {
  if (!row) return null;

  const pm25 = getPM25(row);
  const pm10 = getPM10(row);

  const pm25Index = calculateSubIndex(
    pm25,
    PM25_BREAKPOINTS,
    1
  );

  const pm10Index = calculateSubIndex(
    pm10,
    PM10_BREAKPOINTS,
    0
  );

  const indexes = [pm25Index, pm10Index].filter(
    (value): value is number => value !== null
  );

  if (indexes.length === 0) return null;

  return Math.max(...indexes);
}

// =====================================================
// СТАНЦЫН AQI
// =====================================================

function getStationAirStatus(
  row?: AirQualityRow
): StationAirStatus {
  if (!row) {
    return {
      value: null,
      category: getCategory(null),
      source: "NONE",
    };
  }

  const calculatedAqi = calculateAQI(row);

  if (calculatedAqi === null) {
    return {
      value: null,
      category: getCategory(null),
      source: "NONE",
    };
  }

  return {
    value: calculatedAqi,
    category: getCategory(calculatedAqi),
    source: "CALCULATED",
  };
}

// =====================================================
// УТГА ХАРУУЛАХ
// =====================================================

function formatValue(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "—";
  }

  return new Intl.NumberFormat("mn-MN", {
    maximumFractionDigits: 0,
  }).format(value);
}

// =====================================================
// МОНГОЛЫН ХИЛ
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
      { duration: 0.6 }
    );
  }, [station, map]);

  return null;
}

// =====================================================
// AQI ӨНГӨНИЙ ТАЙЛБАР
// =====================================================

const AQI_LEGEND = [
  {
    label: "Цэвэр",
    range: "0–50",
    color: "#16e900",
  },
  {
    label: "Хэвийн",
    range: "51–100",
    color: "#fff000",
  },
  {
    label: "Бага бохирдолтой",
    range: "101–200",
    color: "#ff9200",
  },
  {
    label: "Бохирдолтой",
    range: "201–300",
    color: "#ff1010",
  },
  {
    label: "Их бохирдолтой",
    range: "301–400",
    color: "#963c9f",
  },
  {
    label: "Маш их бохирдолтой",
    range: "401–500",
    color: "#800020",
  },
];

// =====================================================
// ҮНДСЭН ГАЗРЫН ЗУРАГ
// =====================================================

export default function AgaarchanarMap({
  stations,
  airRows,
  selectedStation,
  onSelectStation,
}: Props) {
  const [geoJson, setGeoJson] =
    useState<GeoJsonObject | null>(null);

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

        console.error(
          "Монголын хил ачааллах алдаа:",
          error
        );

        setGeoJsonError(
          "Монголын хил ачаалсангүй. public/mongolia.geojson файлыг шалгана уу."
        );
      }
    }

    void loadBoundary();

    return () => controller.abort();
  }, []);

  // Станц бүрийн хамгийн сүүлийн хэмжилт
  const airByStation = useMemo(() => {
    const latest = new Map<string, AirQualityRow>();

    for (const row of airRows) {
      const id = getRowStationId(row);

      if (id === null) continue;

      const previous = latest.get(id);

      if (
        !previous ||
        getDateValue(row) >= getDateValue(previous)
      ) {
        latest.set(id, row);
      }
    }

    return latest;
  }, [airRows]);

  // Координаттай станцууд
  const validStations = useMemo(
    () =>
      stations.filter(
        (station) =>
          getStationId(station) !== null &&
          getCoordinates(station) !== null
      ),
    [stations]
  );

  // Сонгосон станц
  const selectedStationData = useMemo(
    () =>
      validStations.find(
        (station) =>
          getStationId(station) === normalizeId(selectedStation)
      ) ?? null,
    [validStations, selectedStation]
  );

  // Сонгосон станцын хэмжилт
  const selectedRow = useMemo(() => {
    const id = normalizeId(selectedStation);

    if (!id) return undefined;

    return airByStation.get(id);
  }, [airByStation, selectedStation]);

  const selectedStatus = useMemo(
    () => getStationAirStatus(selectedRow),
    [selectedRow]
  );

  // Станц сонгох
  function handleStationClick(id: string) {
    if (!id) return;

    onSelectStation(id);
  }

  // AQI шалгах
  useEffect(() => {
    console.table(
      Array.from(airByStation.entries()).map(([id, row]) => {
        const status = getStationAirStatus(row);

        return {
          stationId: id,
          calculatedAQI: status.value,
          category: status.category.label,
          color: status.category.color,
          PM25: getPM25(row),
          PM10: getPM10(row),
          measuredAt: getDateLabel(row),
        };
      })
    );
  }, [airByStation]);

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

          const isSelected =
            selectedStation !== null &&
            id === normalizeId(selectedStation);

          const stationName =
            station.ner || station.ner_en || `Станц ${id}`;

          const aimagName =
            station.aimag || "Аймаг тодорхойгүй";

          return (
            <CircleMarker
              key={id}
              center={[coordinates.lat, coordinates.lng]}
              radius={isSelected ? 11 : 7}
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
              <Tooltip
                direction="top"
                offset={[0, -8]}
                opacity={1}
              >
                <div className="aq-map-tooltip">
                  <strong>{stationName}</strong>

                  <div>{aimagName}</div>

                  <div className="aq-map-tooltip-aqi">
                    Тооцоолсон AQI:{" "}
                    <strong>
                      {status.value === null
                        ? "Мэдээлэл алга"
                        : formatValue(status.value)}
                    </strong>
                  </div>

                  <div
                    style={{
                      color: status.category.color,
                      fontWeight: 700,
                    }}
                  >
                    {status.category.label}
                  </div>

                  <small>
                    {status.source === "CALCULATED"
                      ? "PM2.5 болон PM10-оор тооцоолсон"
                      : "AQI тооцоолох хэмжилт алга"}
                  </small>

                  <small>
                    Хэмжсэн огноо: {getDateLabel(row)}
                  </small>

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

      {/* СОНГОСОН СТАНЦЫН МЭДЭЭЛЭЛ */}
      {selectedStationData && (
        <div className="aq-map-selected-summary">
          <div className="aq-map-selected-heading">
            <div>
              <strong>
                {selectedStationData.ner ??
                  `Станц ${getStationId(selectedStationData)}`}
              </strong>

              <span>
                {selectedStationData.aimag ??
                  "Аймаг тодорхойгүй"}
              </span>
            </div>

            <div
              className="aq-map-selected-status"
              style={{
                color: selectedStatus.category.color,
              }}
            >
              <strong>
                {selectedStatus.value === null
                  ? "—"
                  : formatValue(selectedStatus.value)}
              </strong>

              <span>{selectedStatus.category.label}</span>
            </div>
          </div>

          <small>
            Хэмжсэн огноо: {getDateLabel(selectedRow)}
          </small>

          <small>
            {selectedStatus.source === "CALCULATED"
              ? "AQI: PM2.5 болон PM10 хэмжилтээр өөрөө тооцоолсон"
              : "AQI тооцоолох хэмжилтийн мэдээлэл алга"}
          </small>
        </div>
      )}

      {/* ӨНГӨНИЙ ТАЙЛБАР */}
      <div className="aq-map-legend">
        {AQI_LEGEND.map((item) => (
          <span key={item.range}>
            <i
              style={{
                background: item.color,
              }}
            />
            {item.label} ({item.range})
          </span>
        ))}

        <span>
          <i style={{ background: "#64748b" }} />
          Хэмжилт тодорхойгүй
        </span>
      </div>
    </div>
  );
}
