"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "./BairshilHaih.css";

// Цаг агаарын станцын мэдээллийн бүтэц
type Station = {
  stants_dugaar: number | string;
  ner: string;
  ner_en?: string | null;
  aimag?: string | null;
};

type Props = {
  onSelect: (station: Station) => void;
  selectedStationId?: number | string;
};

// Backend API
const API_URL = "/backend/weather_db/stantsuud";

export default function BairshilHaih({
  onSelect,
  selectedStationId,
}: Props) {
  const [stations, setStations] = useState<Station[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const listRef = useRef<HTMLDivElement>(null);

  // 1. Станцуудыг backend-ээс татах
  useEffect(() => {
    const controller = new AbortController();

    async function loadStations() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`API алдаа: ${response.status}`);
        }

        const result: unknown = await response.json();

        // API-аас массив эсвэл data/stations талбартай объект ирж болно.
        let rows: unknown[] = [];

        if (Array.isArray(result)) {
          rows = result;
        } else if (result && typeof result === "object") {
          const data = result as {
            data?: unknown;
            stations?: unknown;
          };

          if (Array.isArray(data.data)) {
            rows = data.data;
          } else if (Array.isArray(data.stations)) {
            rows = data.stations;
          }
        }

        setStations(rows as Station[]);
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }

        console.error("Станц татах алдаа:", err);

        setError(
          "Станцын мэдээлэл татаж чадсангүй. Backend болон API замаа шалгана уу."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadStations();

    return () => controller.abort();
  }, []);

  // 2. Станцын нэр, аймаг, дугаар болон англи нэрээр хайх
  const filteredStations = useMemo(() => {
    const keyword = search.trim().toLocaleLowerCase("mn");

    if (!keyword) {
      return stations;
    }

    return stations.filter((station) => {
      const searchableValues = [
        station.ner,
        station.ner_en,
        station.aimag,
        station.stants_dugaar,
      ];

      return searchableValues.some((value) =>
        String(value ?? "")
          .toLocaleLowerCase("mn")
          .includes(keyword)
      );
    });
  }, [stations, search]);

  // 3. Станцын жагсаалтыг зүүн, баруун тийш гүйлгэх
  function scrollStations(direction: number) {
    listRef.current?.scrollBy({
      left: direction * 280,
      behavior: "smooth",
    });
  }

  // 4. Хайлтын утгыг арилгах
  function clearSearch() {
    setSearch("");
    listRef.current?.scrollTo({
      left: 0,
      behavior: "smooth",
    });
  }

  return (
    <section className="station-search-layout">
      {/* ЗҮҮН ТАЛ: ХАЙЛТ */}
      <div className="station-search-column">
        <div className="station-search">
          <div className="station-search__intro">
            <span className="station-search__eyebrow">
              БАЙРШИЛ СОНГОХ
            </span>

            <h2 className="station-search__title">
              Цаг агаар хайх
            </h2>

            <p className="station-search__description">
              Хот, аймаг эсвэл станцын дугаараар хайж, тухайн
              газрын цаг агаарын мэдээллийг хараарай.
            </p>
          </div>

          <label
            className="station-search__label"
            htmlFor="station-search-input"
          >
            Байршил хайх
          </label>

          <div className="station-search__input-wrap">
            <span
              className="station-search__search-icon"
              aria-hidden="true"
            >
              ⌕
            </span>

            <input
              id="station-search-input"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Станц, хот, аймаг..."
              autoComplete="off"
              aria-controls="station-list"
            />

            {search && (
              <button
                type="button"
                className="station-search__clear"
                onClick={clearSearch}
                aria-label="Хайлтыг цэвэрлэх"
              >
                ×
              </button>
            )}
          </div>

          <div className="station-search__summary">
            <span className="station-search__summary-icon">
              <span aria-hidden="true">⌖</span>
            </span>

            <div>
              <strong>
                {loading ? "Ачаалж байна..." : `${stations.length} станц`}
              </strong>

              <p>Монгол орны цаг агаарын станцууд</p>
            </div>
          </div>

          {search.trim() && !loading && !error && (
            <p className="station-search__result-count">
              Хайлтын үр дүн: {filteredStations.length} станц
            </p>
          )}
        </div>
      </div>

      {/* БАРУУН ТАЛ: СТАНЦЫН ЖАГСААЛТ */}
      <div className="station-list-column">
        <div className="station-list-heading">
          <div className="station-list-heading__text">
            <span className="station-list-heading__eyebrow">
              СТАНЦЫН ЖАГСААЛТ
            </span>

            <h2>Цаг агаарын станцууд</h2>

            <p>
              {loading
                ? "Станцын мэдээлэл ачаалж байна..."
                : `${filteredStations.length} станц олдлоо`}
            </p>
          </div>

          <div className="station-list-arrows">
            <button
              type="button"
              onClick={() => scrollStations(-1)}
              aria-label="Өмнөх станцууд"
              disabled={loading || filteredStations.length === 0}
            >
              ‹
            </button>

            <button
              type="button"
              onClick={() => scrollStations(1)}
              aria-label="Дараагийн станцууд"
              disabled={loading || filteredStations.length === 0}
            >
              ›
            </button>
          </div>
        </div>

        {error ? (
          <div className="station-search__error" role="alert">
            <strong>Мэдээлэл татахад алдаа гарлаа</strong>
            <p>{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
            >
              Дахин ачаалах
            </button>
          </div>
        ) : loading ? (
          <div className="station-search__message" role="status">
            <span className="station-search__spinner" />
            Станцуудыг татаж байна...
          </div>
        ) : filteredStations.length === 0 ? (
          <div className="station-search__message">
            <span className="station-search__empty-icon" aria-hidden="true">
              ⌕
            </span>
            <strong>Станц олдсонгүй</strong>
            <p>Өөр нэр, аймаг эсвэл станцын дугаар оруулж үзнэ үү.</p>

            {search && (
              <button
                type="button"
                className="station-search__reset"
                onClick={clearSearch}
              >
                Хайлтыг арилгах
              </button>
            )}
          </div>
        ) : (
          <div
            className="station-list"
            id="station-list"
            ref={listRef}
            aria-label="Цаг агаарын станцууд"
          >
            {filteredStations.map((station) => {
              const active =
                String(station.stants_dugaar) ===
                String(selectedStationId ?? "");

              return (
                <button
                  key={station.stants_dugaar}
                  type="button"
                  className={`station-card${
                    active ? " station-card--active" : ""
                  }`}
                  onClick={() => onSelect(station)}
                  aria-pressed={active}
                >
                  <span className="station-card__top">
                    <span className="station-card__number">
                      №{station.stants_dugaar}
                    </span>

                    {active && (
                      <span className="station-card__selected">
                        <span aria-hidden="true">✓</span>
                        Сонгосон
                      </span>
                    )}
                  </span>

                  <strong className="station-card__name">
                    {station.ner || "Нэргүй станц"}
                  </strong>

                  <span className="station-card__aimag">
                    <span aria-hidden="true">⌖</span>
                    {station.aimag || "Аймгийн мэдээлэл байхгүй"}
                  </span>

                  <span className="station-card__action">
                    {active ? "Сонгогдсон" : "Цаг агаар харах"}
                    <span aria-hidden="true">→</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {!loading && !error && filteredStations.length > 0 && (
          <p className="station-list-hint">
            Станцын картыг сонгоод тухайн газрын цаг агаарын мэдээллийг
            харна уу. Жагсаалтыг сум ашиглан гүйлгэж болно.
          </p>
        )}
      </div>
    </section>
  );
}