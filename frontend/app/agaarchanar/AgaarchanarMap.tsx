"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GeoJSON, MapContainer, Marker, TileLayer, Tooltip, useMap, useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import {
  POLLUTANTS, POLLUTANT_BY_ID, computeStation, getAqiCategory,
  groupRowsByStation, metricValue, normalizeId,
  type Metric, type StationAqi,
} from "./aqi";
import { UB, getAimag } from "./aimag";

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
  id?: number | string | null;
  station_sid?: number | string | null;
  stationSid?: number | string | null;
  sid?: number | string | null;
  stants_dugaar?: number | string | null;
  stantsDugaar?: number | string | null;
  [key: string]: unknown;
};

type Props = {
  stations: Station[];
  airRows: AirQualityRow[];
  selectedStation: string | number | null;
  onSelectStation: (id: string | number) => void;
  metric: Metric;
  onMetricChange: (metric: Metric) => void;
  aimag: string;
  onAimagChange: (aimag: string) => void;
};

type MapItem = {
  station: Station;
  id: string;
  lat: number;
  lng: number;
  value: number;
  index: number | null;
  isUb: boolean;
};

// Энэ томруулалтаас дээш УБ-ын станцууд тус тусдаа харагдана
const UB_ZOOM = 9;

function getStationId(s: Station): string | null {
  return (
    normalizeId(s.stants_dugaar) ?? normalizeId(s.stantsDugaar) ??
    normalizeId(s.station_sid) ?? normalizeId(s.stationSid) ??
    normalizeId(s.sid) ?? normalizeId(s.id)
  );
}

function getCoordinates(s: Station) {
  const toNum = (v: unknown) => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const lat = toNum(s.urgurug ?? s.latitude ?? s.lat);
  const lng = toNum(s.urtrag ?? s.longitude ?? s.lng ?? s.lon);
  if (lat === null || lng === null || lat < 41 || lat > 53 || lng < 87 || lng > 120) return null;
  return { lat, lng };
}

function fmtConc(v: number | null) {
  if (v === null || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("mn-MN", { maximumFractionDigits: v < 10 ? 1 : 0 }).format(v);
}

function mean(values: number[]): number | null {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
}

const DARK_TEXT = new Set(["#16e900", "#fff000", "#ff9200"]);

function makeIcon(text: string, color: string, selected: boolean, ub = false) {
  const size = ub ? 48 : selected ? 46 : 38;
  const fg = DARK_TEXT.has(color) ? "#111" : "#fff";

  return L.divIcon({
    className: "aq-aqi-marker-wrap",
    html:
      `<div class="aq-aqi-marker${selected ? " selected" : ""}" style="background:${color};color:${fg}">${text}</div>` +
      (ub ? `<span class="aq-ub-badge">УБ</span><span class="aq-ub-zoom">⌕</span>` : ""),
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// Томруулалтыг React state-д дамжуулна
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMapEvents({
    zoomend: () => onZoom(map.getZoom()),
  });

  useEffect(() => {
    onZoom(map.getZoom());
  }, [map, onZoom]);

  return null;
}

// Аймаг сонгоход тухайн станцууд руу, "Бүгд" үед Монголын хил рүү
function AutoView({
  geoJson, points, aimag,
}: { geoJson: GeoJsonObject | null; points: [number, number][]; aimag: string }) {
  const map = useMap();
  const pointsKey = aimag ? points.map((p) => p.join(",")).join("|") : "";

  useEffect(() => {
    if (aimag && points.length > 0) {
      map.fitBounds(L.latLngBounds(points), {
        padding: [70, 70],
        maxZoom: aimag === UB ? 10 : 8,
        animate: true,
      });
      return;
    }

    if (!geoJson) return;

    const b = L.geoJSON(geoJson).getBounds();
    if (b.isValid()) map.fitBounds(b, { padding: [20, 20], maxZoom: 6, animate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoJson, aimag, pointsKey, map]);

  return null;
}

function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const f = requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    const onResize = () => map.invalidateSize({ pan: false });
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(f);
      window.removeEventListener("resize", onResize);
    };
  }, [map]);

  return null;
}

// Сонгосон станц харагдаж байвал хөдөлгөхгүй, харагдахгүй бол очно
function SelectedStationView({ station }: { station: Station | null }) {
  const map = useMap();

  useEffect(() => {
    if (!station) return;
    const c = getCoordinates(station);
    if (!c) return;

    const latlng = L.latLng(c.lat, c.lng);
    if (!map.getBounds().contains(latlng)) {
      map.flyTo(latlng, Math.max(map.getZoom(), 6), { duration: 0.6 });
    }
  }, [station, map]);

  return null;
}

const AQI_LEGEND = [
  { label: "Цэвэр", range: "0–50", color: "#16e900" },
  { label: "Хэвийн", range: "51–100", color: "#fff000" },
  { label: "Бага бохирдолтой", range: "101–200", color: "#ff9200" },
  { label: "Бохирдолтой", range: "201–300", color: "#ff1010" },
  { label: "Их бохирдолтой", range: "301–400", color: "#963c9f" },
  { label: "Маш их бохирдолтой", range: "401–500", color: "#800020" },
];

export default function AgaarchanarMap({
  stations, airRows, selectedStation, onSelectStation,
  metric, onMetricChange, aimag, onAimagChange,
}: Props) {
  const [geoJson, setGeoJson] = useState<GeoJsonObject | null>(null);
  const [geoJsonError, setGeoJsonError] = useState("");
  const [zoom, setZoom] = useState(5);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/mongolia.geojson", { signal: controller.signal, cache: "force-cache" });
        if (!res.ok) throw new Error("GeoJSON файл олдсонгүй");
        setGeoJson((await res.json()) as GeoJsonObject);
        setGeoJsonError("");
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
        setGeoJsonError("Монголын хил ачаалсангүй. public/mongolia.geojson файлыг шалгана уу.");
      }
    })();

    return () => controller.abort();
  }, []);

  // Станц бүрийн AQI (MNS4585:2025)
  const resultByStation = useMemo(() => {
    const out = new Map<string, StationAqi>();
    for (const [id, rows] of groupRowsByStation(airRows)) out.set(id, computeStation(rows));
    return out;
  }, [airRows]);

  const aimagList = useMemo(
    () => Array.from(new Set(stations.map(getAimag))).sort((a, b) => a.localeCompare(b, "mn")),
    [stations],
  );

  // Сонгосон аймгийн станцууд
  const aimagStations = useMemo(
    () =>
      stations
        .filter((s) => getStationId(s) !== null && (!aimag || getAimag(s) === aimag))
        .sort((a, b) => (a.ner ?? "").localeCompare(b.ner ?? "", "mn")),
    [stations, aimag],
  );

  // Сонгосон үзүүлэлтээр ХЭМЖИЛТТЭЙ станцууд (хэмжилтгүйг огт харуулахгүй)
  const selectable = useMemo(
    () =>
      aimagStations.filter(
        (s) => metricValue(resultByStation.get(getStationId(s)!), metric).value !== null,
      ),
    [aimagStations, resultByStation, metric],
  );

  const items = useMemo<MapItem[]>(
    () =>
      selectable.flatMap((station) => {
        const id = getStationId(station)!;
        const c = getCoordinates(station);
        if (!c) return [];

        const m = metricValue(resultByStation.get(id), metric);
        if (m.value === null) return [];

        return [{
          station, id, lat: c.lat, lng: c.lng,
          value: m.value, index: m.index, isUb: getAimag(station) === UB,
        }];
      }),
    [selectable, resultByStation, metric],
  );

  const points = useMemo(
    () => items.map((i) => [i.lat, i.lng] as [number, number]),
    [items],
  );

  // УБ-ын станцуудыг цөөн томруулалтад нэг тэмдэг болгоно
  const clusterUb = !aimag && zoom < UB_ZOOM;
  const ubItems = items.filter((i) => i.isUb);
  const singleItems = items.filter((i) => !(clusterUb && i.isUb));

  const ubCluster = useMemo(() => {
    if (!clusterUb || ubItems.length === 0) return null;

    const avgValue = mean(ubItems.map((i) => i.value))!;
    const avgIndex = mean(ubItems.flatMap((i) => (i.index === null ? [] : [i.index])));

    return {
      lat: mean(ubItems.map((i) => i.lat))!,
      lng: mean(ubItems.map((i) => i.lng))!,
      avgValue,
      avgIndex,
      count: ubItems.length,
    };
  }, [clusterUb, ubItems]);

  const selectedId = normalizeId(selectedStation);
  const selectedItem = items.find((i) => i.id === selectedId) ?? null;
  const selectedInList = selectable.some((s) => getStationId(s) === selectedId);

  const metricCfg = metric === "aqi" ? null : POLLUTANT_BY_ID[metric];
  const caption = metricCfg
    ? `Тоо — ${metricCfg.label} агууламж (${metricCfg.unit}), өнгө — дэд индексийн ангилал`
    : "Тоо — станцын нэгдсэн AQI, өнгө — ангилал";

  const labelOf = (value: number) =>
    metric === "aqi" ? String(Math.round(value)) : fmtConc(value);

  return (
    <div className="aq-map-container">
      <div className="aq-map-toolbar">
        <label className="aq-map-field">
          <span>Үзүүлэлт</span>
          <select value={metric} onChange={(e) => onMetricChange(e.target.value as Metric)}>
            <option value="aqi">Агаарын чанарын индекс (AQI)</option>
            {POLLUTANTS.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.label})</option>
            ))}
          </select>
        </label>

        <label className="aq-map-field">
          <span>Аймаг</span>
          <select value={aimag} onChange={(e) => onAimagChange(e.target.value)}>
            <option value="">-Бүгд-</option>
            {aimagList.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>

        <label className="aq-map-field">
          <span>Станц</span>
          <select
            value={selectedInList && selectedId ? selectedId : ""}
            onChange={(e) => { if (e.target.value) onSelectStation(e.target.value); }}
          >
            {!selectedInList && <option value="">-Станц сонгох-</option>}
            {selectable.map((s) => {
              const id = getStationId(s)!;
              return <option key={id} value={id}>{s.ner || s.ner_en || `Станц ${id}`}</option>;
            })}
          </select>
        </label>
      </div>

      <div className="aq-map-topline">
        <span className="aq-map-status-dot" />
        <span>{aimag || "Монгол Улс"}</span>
        <span className="aq-map-topline-separator">·</span>
        <span>{items.length} хэмжилттэй станц</span>
        <span className="aq-map-topline-separator">·</span>
        <span>{caption}</span>
        {ubCluster && (
          <>
            <span className="aq-map-topline-separator">·</span>
            <span>УБ — {ubCluster.count} станцын дундаж, дарж томруулна уу</span>
          </>
        )}
      </div>

      <MapContainer
        center={[46.8, 103.8]} zoom={5} minZoom={4} maxZoom={10}
        scrollWheelZoom zoomControl
        style={{ width: "100%", flex: 1, minHeight: 0, background: "#eaf2f8" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {geoJson && (
          <GeoJSON
            data={geoJson}
            style={{ color: "#0f766e", weight: 2, opacity: 0.95, fillColor: "#14b8a6", fillOpacity: 0.08 }}
          />
        )}

        <ZoomWatcher onZoom={setZoom} />
        <AutoView geoJson={geoJson} points={points} aimag={aimag} />
        <MapResizeHandler />
        <SelectedStationView station={selectedItem?.station ?? null} />

        {/* Улаанбаатар — нэг нэгдсэн тэмдэг */}
        {ubCluster && (
          <Marker
            position={[ubCluster.lat, ubCluster.lng]}
            icon={makeIcon(
              labelOf(ubCluster.avgValue),
              getAqiCategory(ubCluster.avgIndex).color,
              ubItems.some((i) => i.id === selectedId),
              true,
            )}
            zIndexOffset={500}
            eventHandlers={{ click: () => onAimagChange(UB) }}
          >
            <Tooltip direction="top" offset={[0, -24]} opacity={1}>
              Улаанбаатар · {labelOf(ubCluster.avgValue)}
            </Tooltip>
          </Marker>
        )}

        {/* Бусад станцууд (УБ томруулсан үед тус тусдаа) */}
        {singleItems.map((item) => {
          const isSelected = item.id === selectedId;
          const name = item.station.ner || item.station.ner_en || `Станц ${item.id}`;

          return (
            <Marker
              key={item.id}
              position={[item.lat, item.lng]}
              icon={makeIcon(labelOf(item.value), getAqiCategory(item.index).color, isSelected)}
              zIndexOffset={isSelected ? 1000 : 0}
              eventHandlers={{ click: () => onSelectStation(item.id) }}
            >
              <Tooltip direction="top" offset={[0, -18]} opacity={1}>
                {name} · {labelOf(item.value)}
              </Tooltip>
            </Marker>
          );
        })}
      </MapContainer>

      {geoJsonError && <p className="aq-map-error" role="status">{geoJsonError}</p>}

      {items.length === 0 && stations.length > 0 && (
        <p className="aq-map-error" role="status">
          Сонгосон үзүүлэлтээр хэмжилттэй станц алга.
        </p>
      )}

      <div className="aq-map-legend">
        {AQI_LEGEND.map((i) => (
          <span key={i.range}><i style={{ background: i.color }} />{i.label} ({i.range})</span>
        ))}
      </div>
    </div>
  );
}