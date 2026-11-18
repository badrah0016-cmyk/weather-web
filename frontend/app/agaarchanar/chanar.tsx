
"use client";

import {
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
} from "react";

import AgaarHeader from "./AgaarHeader";
import "./chanar.css";

const API_BASE_URL = "/backend/weather_db";

type Station = {
  stants_dugaar: number | string;
  ner: string;
  aimag?: string | null;
};

type AirQuality = {
  stants_dugaar?: number | string;
  ner?: string;
  aqi?: number | string | null;
  angilal?: string | null;
  angilal_mn?: string | null;
  pm25?: number | string | null;
  pm10?: number | string | null;
  no2?: number | string | null;
  so2?: number | string | null;
  co?: number | string | null;
  o3?: number | string | null;
  ajiglasan_ognoo?: string | null;
};

type AQIInfo = {
  label: string;
  color: string;
  description: string;
  advice: string;
};

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function formatNumber(value: unknown, unit = ""): string {
  const number = toNumber(value);

  if (number === null) return "Мэдээлэлгүй";

  return `${number.toLocaleString("mn-MN", {
    maximumFractionDigits: 1,
  })}${unit}`;
}

// AQI ангилал болон өнгө
function getAQIInfo(value: unknown): AQIInfo {
  const aqi = toNumber(value);

  if (aqi === null || aqi < 0) {
    return {
      label: "Мэдээлэлгүй",
      color: "#64748b",
      description:
        "Агаарын чанарын индексийн мэдээлэл алга.",
      advice:
        "Хэмжилтийн мэдээлэл шинэчлэгдэхийг хүлээнэ үү.",
    };
  }

  if (aqi <= 50) {
    return {
      label: "Цэвэр",
      color: "#16e900",
      description:
        "Агаарын чанар сайн, эрүүл мэндэд сөрөг нөлөө бага.",
      advice:
        "Гадаа чөлөөтэй үйл ажиллагаа явуулж болно.",
    };
  }

  if (aqi <= 100) {
    return {
      label: "Хэвийн",
      color: "#fff000",
      description:
        "Агаарын чанар хэвийн түвшинд байна.",
      advice:
        "Өдөр тутмын үйл ажиллагаагаа хэвийн үргэлжлүүлж болно.",
    };
  }

  if (aqi <= 200) {
    return {
      label: "Бага бохирдолтой",
      color: "#ff9200",
      description:
        "Агаарын бохирдол нэмэгдсэн байна.",
      advice:
        "Мэдрэмтгий бүлгийн хүмүүс гадаах идэвхтэй үйл ажиллагаагаа багасгаарай.",
    };
  }

  if (aqi <= 300) {
    return {
      label: "Бохирдолтой",
      color: "#ff1010",
      description:
        "Агаарын бохирдол өндөр түвшинд байна.",
      advice:
        "Гадаах идэвхтэй үйл ажиллагааг багасгаж, шаардлагагүй бол гадаа удаан байхаас зайлсхий.",
    };
  }

  if (aqi <= 400) {
    return {
      label: "Их бохирдолтой",
      color: "#963c9f",
      description:
        "Агаарын бохирдол маш өндөр байна.",
      advice:
        "Гадаа байх хугацааг хязгаарлаж, цонхоо хааж, албан ёсны зөвлөмжийг дагаарай.",
    };
  }

  return {
    label: "Маш их бохирдолтой",
    color: "#800020",
    description:
      "Агаарын бохирдол маш өндөр түвшинд хүрсэн байна.",
    advice:
      "Гадаах үйл ажиллагааг аль болох хязгаарлаж, албан ёсны эрүүл мэндийн зөвлөмжийг дагаарай.",
  };
}

async function fetchJSON(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Серверийн алдаа: ${response.status}`);
  }

  return response.json();
}

function extractRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    for (const key of ["data", "rows", "result", "stations"]) {
      if (Array.isArray(object[key])) {
        return object[key] as T[];
      }
    }
  }

  return [];
}

function extractAir(data: unknown): AirQuality | null {
  if (Array.isArray(data)) {
    return (data[0] as AirQuality) ?? null;
  }

  if (data && typeof data === "object") {
    const object = data as Record<string, unknown>;

    if (Array.isArray(object.data)) {
      return (object.data[0] as AirQuality) ?? null;
    }

    if (object.data && typeof object.data === "object") {
      return object.data as AirQuality;
    }

    if (Array.isArray(object.rows)) {
      return (object.rows[0] as AirQuality) ?? null;
    }

    return object as AirQuality;
  }

  return null;
}

// Огноо форматлах
function formatObservedDate(value: string | null | undefined): string {
  if (!value) return "Мэдээлэлгүй";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Мэдээлэлгүй";
  }

  return date.toLocaleString("mn-MN", {
    timeZone: "Asia/Ulaanbaatar",
  });
}

const pollutants = [
  {
    key: "pm25",
    name: "PM2.5",
    description: "Нарийн ширхэгт тоосонцор",
    unit: "µg/m³",
    icon: "🌫️",
  },
  {
    key: "pm10",
    name: "PM10",
    description: "Бүдүүн ширхэгт тоосонцор",
    unit: "µg/m³",
    icon: "💨",
  },
  {
    key: "no2",
    name: "NO₂",
    description: "Азотын давхар исэл",
    unit: "µg/m³",
    icon: "🏭",
  },
  {
    key: "so2",
    name: "SO₂",
    description: "Хүхрийн давхар исэл",
    unit: "µg/m³",
    icon: "🌋",
  },
  {
    key: "co",
    name: "CO",
    description: "Нүүрстөрөгчийн дутуу исэл",
    unit: "mg/m³",
    icon: "🚗",
  },
  {
    key: "o3",
    name: "O₃",
    description: "Газрын гадаргын озон",
    unit: "µg/m³",
    icon: "☀️",
  },
] as const;

const aqiGuide = [
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
    text: "Гадаах үйл ажиллагааг хязгаарлаж, эрүүл мэндээ хамгаална.",
  },
] as const;

export default function ChanarPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStation, setSelectedStation] = useState("");
  const [air, setAir] = useState<AirQuality | null>(null);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingAir, setLoadingAir] = useState(false);
  const [error, setError] = useState("");

  // Станцын мэдээлэл татах
  const loadStations = useCallback(async () => {
    setLoadingStations(true);
    setError("");

    try {
      const result = await fetchJSON(
        `${API_BASE_URL}/stantsuud`
      );

      const rows = extractRows<Station>(result);

      setStations(rows);

      if (rows.length > 0) {
        setSelectedStation((current) => {
          if (
            current &&
            rows.some(
              (station) =>
                String(station.stants_dugaar) === current
            )
          ) {
            return current;
          }

          const ulaanbaatar = rows.find((station) =>
            /улаанбаатар/i.test(station.ner)
          );

          return String(
            (ulaanbaatar ?? rows[0]).stants_dugaar
          );
        });
      } else {
        setError("Станцын мэдээлэл олдсонгүй.");
      }
    } catch (err) {
      console.error("Станц татахад алдаа:", err);

      setError(
        "Станцын мэдээлэл татаж чадсангүй. Backend болон API хаягаа шалгана уу."
      );
    } finally {
      setLoadingStations(false);
    }
  }, []);

  // Сонгосон станцын агаарын чанар татах
  const loadAirQuality = useCallback(
    async (stationId: string) => {
      if (!stationId) {
        setAir(null);
        return;
      }

      setLoadingAir(true);
      setError("");

      try {
        const result = await fetchJSON(
          `${API_BASE_URL}/agaar_chanar/${encodeURIComponent(
            stationId
          )}`
        );

        const airData = extractAir(result);

        if (!airData) {
          setAir(null);
          setError(
            "Сонгосон станцын агаарын чанарын мэдээлэл олдсонгүй."
          );
          return;
        }

        setAir(airData);
      } catch (err) {
        console.error("Агаарын чанар татахад алдаа:", err);

        setAir(null);

        setError(
          "Агаарын чанарын мэдээлэл татаж чадсангүй. Backend route болон өгөгдлийн сангийн холболтоо шалгана уу."
        );
      } finally {
        setLoadingAir(false);
      }
    },
    []
  );

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

  useEffect(() => {
    if (selectedStation) {
      void loadAirQuality(selectedStation);
    }
  }, [selectedStation, loadAirQuality]);

  const selectedStationInfo = stations.find(
    (station) =>
      String(station.stants_dugaar) === selectedStation
  );

  const aqiInfo = getAQIInfo(air?.aqi);

  const observedDate = formatObservedDate(
    air?.ajiglasan_ognoo
  );

  return (
    <div className="chanar-page">
      <AgaarHeader />

      <main className="chanar-main">
        {/* Нүүр хэсэг */}
        <section className="chanar-hero" id="overview">
          <div className="chanar-hero-content">
            <span className="chanar-eyebrow">
              🌍 МОНГОЛ УЛСЫН АГААРЫН ЧАНАР
            </span>

            <h1>Агаарын чанарын мэдээлэл</h1>

            <p>
              Өөрийн байршлын агаарын бохирдлын индекс болон
              бохирдуулагч бодисын мэдээллийг шалгаарай.
            </p>

            <label
              className="chanar-station-label"
              htmlFor="chanar-station"
            >
              📍 Хэмжилтийн станц сонгох
            </label>

            <select
              id="chanar-station"
              className="chanar-station-select"
              value={selectedStation}
              disabled={
                loadingStations || stations.length === 0
              }
              onChange={(event) =>
                setSelectedStation(event.target.value)
              }
            >
              {loadingStations && (
                <option value="">
                  Станц ачаалж байна...
                </option>
              )}

              {!loadingStations && stations.length === 0 && (
                <option value="">
                  Станц олдсонгүй
                </option>
              )}

              {stations.map((station) => (
                <option
                  key={station.stants_dugaar}
                  value={String(station.stants_dugaar)}
                >
                  {station.ner}
                  {station.aimag
                    ? ` — ${station.aimag}`
                    : ""}
                </option>
              ))}
            </select>

            {selectedStationInfo && (
              <p className="chanar-selected-location">
                Сонгосон станц: {selectedStationInfo.ner}
              </p>
            )}
          </div>

          <div
            className="chanar-hero-decoration"
            aria-hidden="true"
          >
            <span>🌿</span>
            <span>💨</span>
            <span>🌎</span>
          </div>
        </section>

        {/* Алдааны мэдээлэл */}
        {error && (
          <div className="chanar-error" role="alert">
            <span>{error}</span>

            <button
              type="button"
              onClick={() => {
                if (stations.length === 0) {
                  void loadStations();
                } else {
                  void loadAirQuality(selectedStation);
                }
              }}
            >
              Дахин оролдох
            </button>
          </div>
        )}

        {/* AQI индекс */}
        <section className="chanar-aqi-section">
          <div className="chanar-section-heading">
            <div>
              <span className="chanar-section-kicker">
                ОДООГИЙН ҮЗҮҮЛЭЛТ
              </span>

              <h2>Агаарын чанарын индекс</h2>
            </div>

            <button
              type="button"
              className="chanar-refresh-button"
              disabled={loadingAir || !selectedStation}
              onClick={() =>
                void loadAirQuality(selectedStation)
              }
            >
              ↻ Шинэчлэх
            </button>
          </div>

          <div
            className="chanar-aqi-card"
            style={
              {
                "--aqi-color": aqiInfo.color,
              } as CSSProperties
            }
          >
            <div className="chanar-aqi-number-wrap">
              <span className="chanar-card-caption">
                AQI ИНДЕКС
              </span>

              {loadingAir ? (
                <div className="chanar-loading">
                  Ачаалж байна...
                </div>
              ) : (
                <div className="chanar-aqi-number">
                  {formatNumber(air?.aqi)}
                </div>
              )}

              <span className="chanar-aqi-status">
                {loadingAir
                  ? "Мэдээлэл татаж байна"
                  : aqiInfo.label}
              </span>
            </div>

            <div className="chanar-aqi-description">
              <div className="chanar-aqi-icon">🌱</div>

              <h3>{aqiInfo.label}</h3>

              <p>{aqiInfo.description}</p>

              <div className="chanar-health-advice">
                <strong>Зөвлөмж</strong>
                <p>{aqiInfo.advice}</p>
              </div>
            </div>
          </div>

          <p className="chanar-updated">
            Сүүлд ажигласан: {observedDate}
          </p>
        </section>

        {/* Бохирдуулагч бодисууд */}
        <section
          className="chanar-pollutants-section"
          id="pollutants"
        >
          <div className="chanar-section-heading">
            <div>
              <span className="chanar-section-kicker">
                БОХИРДУУЛАГЧ БОДИСУУД
              </span>

              <h2>Агаар дахь бодисын үзүүлэлт</h2>
            </div>
          </div>

          <div className="chanar-pollutants-grid">
            {pollutants.map((pollutant) => (
              <article
                className="chanar-pollutant-card"
                key={pollutant.key}
              >
                <div className="chanar-pollutant-top">
                  <span className="chanar-pollutant-icon">
                    {pollutant.icon}
                  </span>

                  <span className="chanar-pollutant-name">
                    {pollutant.name}
                  </span>
                </div>

                <div className="chanar-pollutant-value">
                  {loadingAir
                    ? "..."
                    : formatNumber(
                        air?.[pollutant.key],
                        air?.[pollutant.key] == null
                          ? ""
                          : ` ${pollutant.unit}`
                      )}
                </div>

                <p className="chanar-pollutant-description">
                  {pollutant.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* AQI тайлбар */}
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
            {aqiGuide.map((item) => (
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

                  <span>{item.range} AQI</span>

                  <p>{item.text}</p>
                </div>
              </article>
            ))}
          </div>

          <p className="chanar-disclaimer">
            Тайлбар: Үзүүлэлтүүд нь API болон өгөгдлийн сангаас
            ирсэн мэдээлэлд тулгуурлана. Хэмжих нэгж болон AQI
            тооцоолол нь ашиглаж буй эх сурвалжаас хамаарч өөр
            байж болно.
          </p>
        </section>
      </main>

     
    </div>
  );
}
