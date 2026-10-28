"use client";
import { useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
type Station = {
  stants_dugaar: number;
  ner: string;
  ner_en?: string | null;
  aimag?: string | null;
  urgurug?: number | string | null;
  urtrag?: number | string | null;
};
type WeatherRow = Record<string, unknown>;
type Props = {
  activeLayer?: string;
  stations?: Station[];
  temps?: Record<number, number | null>;
  conds?: Record<number, string | null>;
  selected?: number | string;
  onSelect?: (id: number | string) => void;
};
type StationWeather = Station & {
  temperature: number | null;
  condition: string | null;
  measuredAt: string | null;
};
const API = "/backend/weather_db";
const CENTER: [number, number] = [46.8625, 103.8467];
const DETAIL_ZOOM = 6;
function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function getRows(value: unknown): WeatherRow[] {
  if (Array.isArray(value)) {
    return value as WeatherRow[];
  }
  if (!value || typeof value !== "object") {
    return [];
  }
  const object = value as Record<string, unknown>;
  for (const key of ["data", "rows", "result", "weather", "items"]) {
    if (Array.isArray(object[key])) {
      return object[key] as WeatherRow[];
    }
  }
  return [];
}
function getId(row: WeatherRow): number | null {
  return toNumber(
    row.stants_dugaar ??
      row.stantsDugaar ??
      row.station_id ??
      row.stationId ??
      row.station
  );
}
function getTemperature(row: WeatherRow): number | null {
  return toNumber(
    row.temperatur_c ??
      row.temperatur ??
      row.temperature ??
      row.temp ??
      row.air_temperature ??
      row.airTemperature ??
      row["агаарын_температур"] ??
      row.t
  );
}
function getCondition(row: WeatherRow): string | null {
  const value =
    row.tsag_agaar_nohtsol ??
    row.nohtsol ??
    row.condition ??
    row.weather;
  return value == null || value === "" ? null : String(value);
}
function getMeasuredAt(row: WeatherRow): string | null {
  const value =
    row.tsag ??
    row.ajiglasan_ognoo ??
    row.measured_at ??
    row.measuredAt ??
    row.hadgalsan_ognoo;
  return value == null || value === "" ? null : String(value);
}
function temperatureText(value: number | null): string {
  if (value === null) return "—°C";
  const rounded = Math.round(value);
  return `${rounded > 0 ? "+" : ""}${rounded}°C`;
}
function temperatureColor(value: number | null): string {
  if (value === null) return "#64748b";
  if (value <= -20) return "#1d4ed8";
  if (value <= -10) return "#2563eb";
  if (value <= 0) return "#0891b2";
  if (value <= 10) return "#0d9488";
  if (value <= 20) return "#ea580c";
  return "#dc2626";
}
function makeTemperatureIcon(
  temperature: number | null,
  selected: boolean
): L.DivIcon {
  const color = temperatureColor(temperature);
  const label = temperatureText(temperature);
  return L.divIcon({
    className: "weather-temperature-marker",
    html: `
      <div style="
        min-width:48px;
        height:29px;
        padding:0 6px;
        box-sizing:border-box;
        border-radius:8px;
        background:${color};
        color:white;
        border:2px solid white;
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:12px;
        font-weight:800;
        white-space:nowrap;
        box-shadow:0 2px 8px rgba(0,0,0,.25);
        ${selected ? "outline:3px solid #f59e0b;outline-offset:2px;" : ""}
      ">${label}</div>
    `,
    iconSize: [56, 36],
    iconAnchor: [28, 18],
  });
}
function ZoomListener({
  onZoom,
}: {
  onZoom: (zoom: number) => void;
}) {
  const map = useMapEvents({
    zoomend() {
      onZoom(map.getZoom());
    },
  });
  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);
  return null;
}
function InitialMapView() {
  const map = useMap();
  useEffect(() => {
    map.setView(CENTER, 5);
  }, [map]);
  return null;
}
export default function MongoliaMap({
  stations: stationsFromProps,
  temps: tempsFromProps,
  conds,
  selected,
  onSelect,
}: Props) {
  const [apiStations, setApiStations] = useState<Station[]>([]);
  const [apiWeather, setApiWeather] = useState<
    Record<number, {
      temperature: number | null;
      condition: string | null;
      measuredAt: string | null;
    }>
  >({});
  const [zoom, setZoom] = useState(5);
  const [geo, setGeo] = useState<GeoJsonObject | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError("");
        const [stationsRes, weatherRes] = await Promise.all([
          fetch(`${API}/stantsuud`, { cache: "no-store" }),
          fetch(`${API}/tsag_agaar/current/all`, {
            cache: "no-store",
          }),
        ]);
        if (!stationsRes.ok) {
          throw new Error(`Станцын API алдаа: ${stationsRes.status}`);
        }
        if (!weatherRes.ok) {
          throw new Error(`Цаг агаарын API алдаа: ${weatherRes.status}`);
        }
        const [stationsJson, weatherJson] = await Promise.all([
          stationsRes.json(),
          weatherRes.json(),
        ]);
        const stationList: Station[] = getRows(stationsJson)
          .map((row) => ({
            stants_dugaar: Number(
              row.stants_dugaar ?? row.stantsDugaar
            ),
            ner: String(row.ner ?? row.name ?? "Цаг уурын станц"),
            ner_en: row.ner_en == null ? null : String(row.ner_en),
            aimag: row.aimag == null ? null : String(row.aimag).trim(),
            urgurug: toNumber(row.urgurug ?? row.latitude ?? row.lat),
            urtrag: toNumber(row.urtrag ?? row.longitude ?? row.lng),
          }))
          .filter(
            (station) =>
              Number.isFinite(station.stants_dugaar) &&
              toNumber(station.urgurug) !== null &&
              toNumber(station.urtrag) !== null
          );
        const weatherMap: typeof apiWeather = {};
        for (const row of getRows(weatherJson)) {
          const id = getId(row);
          if (id === null) continue;
          weatherMap[id] = {
            temperature: getTemperature(row),
            condition: getCondition(row),
            measuredAt: getMeasuredAt(row),
          };
        }
        if (!cancelled) {
          setApiStations(stationList);
          setApiWeather(weatherMap);
          if (!stationList.length) {
            setError("Станцын мэдээлэл олдсонгүй.");
          } else if (!Object.keys(weatherMap).length) {
            setError("Цаг агаарын мэдээлэл олдсонгүй.");
          }
        }
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error
              ? e.message
              : "Цаг агаарын мэдээлэл авахад алдаа гарлаа."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch("/mongolia.geojson")
      .then((res) => {
        if (!res.ok) throw new Error("mongolia.geojson олдсонгүй");
        return res.json();
      })
      .then((data: GeoJsonObject) => {
        if (!cancelled) setGeo(data);
      })
      .catch((e) => console.warn("Монголын хил ачаалсангүй:", e));
    return () => {
      cancelled = true;
    };
  }, []);
  const stations = useMemo(
    () => stationsFromProps?.length ? stationsFromProps : apiStations,
    [stationsFromProps, apiStations]
  );
  const stationWeather = useMemo<StationWeather[]>(
    () =>
      stations
        .map((station) => {
          const weather = apiWeather[station.stants_dugaar];
          return {
            ...station,
            temperature:
              tempsFromProps?.[station.stants_dugaar] ??
              weather?.temperature ??
              null,
            condition:
              conds?.[station.stants_dugaar] ??
              weather?.condition ??
              null,
            measuredAt: weather?.measuredAt ?? null,
          };
        })
        .filter(
          (station) =>
            toNumber(station.urgurug) !== null &&
            toNumber(station.urtrag) !== null
        ),
    [stations, apiWeather, tempsFromProps, conds]
  );
  // Анхны түвшинд аймаг бүрийн нэг станц.
  // Дундаж тооцохгүй: тухайн аймагт байгаа нэг станцын утгыг авна.
  const provinceStations = useMemo(() => {
    const groups = new Map<string, StationWeather[]>();
    for (const station of stationWeather) {
      const province = (station.aimag || "Бусад").trim();
      const group = groups.get(province) ?? [];
      group.push(station);
      groups.set(province, group);
    }
    return Array.from(groups.values()).map((group) => {
      // Температурын мэдээлэлтэй станцыг эхэлж сонгоно.
      // Аймгийн төвийг найдвартай таних тусгай талбар байхгүй
      // тул одоогоор тухайн аймгийн жагсаалтын эхний станцыг ашиглана.
      return group.find((station) => station.temperature !== null) ?? group[0];
    });
  }, [stationWeather]);
  const showAllStations = zoom >= DETAIL_ZOOM;
  const markers = showAllStations ? stationWeather : provinceStations;
  function selectStation(id: number) {
    onSelect?.(id);
  }
  return (
    <div className="mongolia-map-wrapper">
      <MapContainer
        className="mongolia-map"
        center={CENTER}
        zoom={5}
        minZoom={4}
        maxZoom={12}
        maxBounds={[[40, 85], [54, 122]]}
        maxBoundsViscosity={0.8}
        scrollWheelZoom
        style={{ width: "100%", height: "100%", minHeight: 420 }}
      >
        <InitialMapView />
        <ZoomListener onZoom={setZoom} />
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geo && (
          <GeoJSON
            data={geo}
            style={{
              color: "#2563eb",
              weight: 2,
              fillColor: "#bfdbfe",
              fillOpacity: 0.08,
            }}
          />
        )}
        {markers.map((station) => {
          const id = station.stants_dugaar;
          const isSelected = String(selected) === String(id);
          return (
            <Marker
              key={`${showAllStations ? "station" : "province"}-${id}`}
              position={[Number(station.urgurug), Number(station.urtrag)]}
              icon={makeTemperatureIcon(station.temperature, isSelected)}
              eventHandlers={{
                click: () => selectStation(id),
              }}
            >
              <Popup>
                <div style={{ minWidth: 170, lineHeight: 1.7 }}>
                  <strong>{station.aimag ?? "Аймаг тодорхойгүй"}</strong>
                  <div>{station.ner}</div>
                  <div>Станцын дугаар: {id}</div>
                  <div>
                    Температур: <strong>{temperatureText(station.temperature)}</strong>
                  </div>
                  <div>Нөхцөл: {station.condition ?? "Мэдээлэлгүй"}</div>
                  <div>Хэмжилтийн цаг: {station.measuredAt ?? "Тодорхойгүй"}</div>
                  <button
                    type="button"
                    onClick={() => selectStation(id)}
                    style={{
                      marginTop: 8,
                      padding: "6px 10px",
                      border: 0,
                      borderRadius: 6,
                      background: "#2563eb",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Энэ станцын мэдээллийг харуулах
                  </button>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
      {loading && (
        <p style={{ marginTop: 8, color: "#64748b", fontSize: 13 }}>
          Станцын мэдээлэл ачаалж байна...
        </p>
      )}
      {!loading && error && (
        <p className="weather-map-error" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
      {!loading && stationWeather.length > 0 && (
        <p style={{ marginTop: 8, color: "#64748b", fontSize: 12 }}>
          {showAllStations
            ? "Бүх цаг уурын станцын температур"
            : "Аймаг бүрийн станцын температур"}
          {" · "}Харагдаж буй тэмдэг: {markers.length}
          {" · "}Температуртай станц: {
            stationWeather.filter((s) => s.temperature !== null).length
          }
        </p>
      )}
    </div>
  );
}
