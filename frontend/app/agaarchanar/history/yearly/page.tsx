
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import AgaarHeader from "../../AgaarHeader";
import Footer from "../../../hesguud/Footer";

const API_BASE_URL = "/backend/weather_db";

type Station = {
  stants_dugaar: number | string;
  ner?: string;
  aimag?: string;
};

type HistoryItem = {
  id?: number | string;
  stants_dugaar?: number | string;
  ner?: string;
  aqi?: number | string | null;
  angilal_mn?: string | null;
  pm25?: number | string | null;
  pm10?: number | string | null;
  no2?: number | string | null;
  so2?: number | string | null;
  co?: number | string | null;
  o3?: number | string | null;
  ajiglasan_ognoo?: string;
  ognoo?: string;
  createdAt?: string;
};

function getRows(data: unknown): HistoryItem[] {
  if (Array.isArray(data)) return data as HistoryItem[];

  if (data && typeof data === "object") {
    const result = data as Record<string, unknown>;

    for (const key of ["data", "items", "results", "history", "rows"]) {
      if (Array.isArray(result[key])) {
        return result[key] as HistoryItem[];
      }
    }
  }

  return [];
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  const number = Number(value);

  return Number.isFinite(number) ? String(number) : String(value);
}

function displayDate(value?: string): string {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ulaanbaatar",
  }).format(date);
}

export default function HourlyHistoryPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [stationId, setStationId] = useState("");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loadingStations, setLoadingStations] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [error, setError] = useState("");

  const loadStations = useCallback(async () => {
    setLoadingStations(true);

    try {
      const response = await fetch(`${API_BASE_URL}/stantsuud`);

      if (!response.ok) {
        throw new Error("Станцын мэдээлэл татаж чадсангүй.");
      }

      const data: unknown = await response.json();
      const list = getRows(data) as Station[];

      setStations(list);

      if (list.length > 0) {
        const ub = list.find((station) =>
          `${station.ner ?? ""} ${station.aimag ?? ""}`
            .toLowerCase()
            .includes("улаанбаатар")
        );

        setStationId(String(ub?.stants_dugaar ?? list[0].stants_dugaar));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Станцын мэдээлэл татахад алдаа гарлаа."
      );
    } finally {
      setLoadingStations(false);
    }
  }, []);

  const loadHistory = useCallback(async () => {
    if (!stationId) return;

    setLoadingHistory(true);
    setError("");

    try {
      const params = new URLSearchParams({
        stants_dugaar: stationId,
        days: "1",
        type: "hourly",
      });

      const response = await fetch(
        `${API_BASE_URL}/agaar_chanar/history?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          "Түүхэн мэдээлэл татаж чадсангүй. Backend API замаа шалгана уу."
        );
      }

      const data: unknown = await response.json();
      const rows = getRows(data);

      rows.sort((a, b) => {
        const dateA = new Date(
          a.ajiglasan_ognoo ?? a.ognoo ?? a.createdAt ?? ""
        ).getTime();

        const dateB = new Date(
          b.ajiglasan_ognoo ?? b.ognoo ?? b.createdAt ?? ""
        ).getTime();

        return dateB - dateA;
      });

      setHistory(rows);
    } catch (err) {
      setHistory([]);
      setError(
        err instanceof Error
          ? err.message
          : "Түүхэн мэдээлэл татахад алдаа гарлаа."
      );
    } finally {
      setLoadingHistory(false);
    }
  }, [stationId]);

  useEffect(() => {
    void loadStations();
  }, [loadStations]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const selectedStation = stations.find(
    (station) => String(station.stants_dugaar) === stationId
  );

  const latest = history[0];

  return (
    <>
      <AgaarHeader />

      <main className="hourly-page">
        <div className="hourly-container">
          <Link className="back-link" href="/agaarchanar/chanar">
            ← Агаарын чанар руу буцах
          </Link>

          <section className="hourly-hero">
            <span className="eyebrow">АГААРЫН ЧАНАР · ТҮҮХЭН МЭДЭЭ</span>
            <h1>Цагийн өөрчлөлт</h1>
            <p>
              Сонгосон станцын цаг тутмын агаарын чанарын үзүүлэлтүүдийг
              хараарай.
            </p>
          </section>

          <section className="hourly-filter">
            <label htmlFor="station-select">Хэмжилтийн станц</label>

            <select
              id="station-select"
              value={stationId}
              onChange={(event) => setStationId(event.target.value)}
              disabled={loadingStations || stations.length === 0}
            >
              {loadingStations && <option>Станц ачаалж байна...</option>}

              {!loadingStations && stations.length === 0 && (
                <option value="">Станц олдсонгүй</option>
              )}

              {stations.map((station) => (
                <option
                  key={station.stants_dugaar}
                  value={String(station.stants_dugaar)}
                >
                  {station.ner ?? `Станц ${station.stants_dugaar}`}
                  {station.aimag ? ` — ${station.aimag}` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={!stationId || loadingHistory}
            >
              {loadingHistory ? "Уншиж байна..." : "Шинэчлэх"}
            </button>
          </section>

          <section className="hourly-summary">
            <article className="summary-card">
              <span>Сонгосон станц</span>
              <strong>{selectedStation?.ner ?? "—"}</strong>
              <small>{selectedStation?.aimag ?? "Байршил тодорхойгүй"}</small>
            </article>

            <article className="summary-card">
              <span>Хэмжилтийн тоо</span>
              <strong>{history.length}</strong>
              <small>API-аас ирсэн бичлэг</small>
            </article>

            <article className="summary-card">
              <span>Сүүлийн AQI</span>
              <strong>{displayValue(latest?.aqi)}</strong>
              <small>{latest?.angilal_mn ?? "Ангилал тодорхойгүй"}</small>
            </article>
          </section>

          {error && (
            <div className="hourly-error" role="alert">
              <strong>Мэдээлэл авахад алдаа гарлаа</strong>
              <p>{error}</p>
              <small>
                Backend дээр
                {" "}
                <code>/agaar_chanar/history</code>
                {" "}
                endpoint байгаа эсэхийг шалгана уу.
              </small>
            </div>
          )}

          <section className="hourly-table-card">
            <div className="table-heading">
              <div>
                <h2>Цаг тутмын хэмжилт</h2>
                <p>
                  {selectedStation?.ner ?? "Станц сонгоно уу"} · Сүүлийн
                  24 цагийн мэдээлэл
                </p>
              </div>

              <span className="record-count">{history.length} бичлэг</span>
            </div>

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Огноо, цаг</th>
                    <th>AQI</th>
                    <th>PM2.5</th>
                    <th>PM10</th>
                    <th>NO₂</th>
                    <th>SO₂</th>
                    <th>CO</th>
                    <th>O₃</th>
                  </tr>
                </thead>

                <tbody>
                  {loadingHistory ? (
                    <tr>
                      <td colSpan={8} className="empty-cell">
                        Түүхэн мэдээлэл ачаалж байна...
                      </td>
                    </tr>
                  ) : history.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="empty-cell">
                        {error
                          ? "Өгөгдөл татаж чадсангүй."
                          : "Одоогоор түүхэн мэдээлэл алга."}
                      </td>
                    </tr>
                  ) : (
                    history.map((item, index) => (
                      <tr
                        key={
                          item.id ??
                          `${item.ajiglasan_ognoo ?? item.ognoo}-${index}`
                        }
                      >
                        <td>
                          {displayDate(
                            item.ajiglasan_ognoo ??
                              item.ognoo ??
                              item.createdAt
                          )}
                        </td>
                        <td>
                          <strong>{displayValue(item.aqi)}</strong>
                        </td>
                        <td>{displayValue(item.pm25)}</td>
                        <td>{displayValue(item.pm10)}</td>
                        <td>{displayValue(item.no2)}</td>
                        <td>{displayValue(item.so2)}</td>
                        <td>{displayValue(item.co)}</td>
                        <td>{displayValue(item.o3)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="hourly-note">
              Тайлбар: Бодит хэмжилтийн цаг болон нэгж нь backend-аас ирж
              буй өгөгдлөөс хамаарна. “—” нь тухайн утга ирээгүйг илэрхийлнэ.
            </p>
          </section>

          <nav className="history-nav" aria-label="Түүхэн мэдээллийн төрлүүд">
            <Link className="active" href="/agaarchanar/history/hourly">
              Цагийн өөрчлөлт
            </Link>
            <Link href="/agaarchanar/history/daily">Өдрийн өөрчлөлт</Link>
            <Link href="/agaarchanar/history/monthly">Сарын статистик</Link>
            <Link href="/agaarchanar/history/yearly">Жилийн статистик</Link>
          </nav>
        </div>
      </main>

      <Footer />

      <style jsx>{`
        .hourly-page {
          min-height: 70vh;
          padding: 32px 20px 56px;
          background: #f3f7fb;
          color: #172b4d;
        }

        .hourly-container {
          max-width: 1240px;
          margin: 0 auto;
        }

        .back-link {
          color: #087f8c;
          text-decoration: none;
          font-weight: 600;
        }

        .hourly-hero {
          margin: 24px 0;
          padding: 34px;
          border-radius: 22px;
          color: white;
          background: linear-gradient(120deg, #075985, #0f9b8e);
        }

        .eyebrow {
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
          opacity: 0.9;
        }

        .hourly-hero h1 {
          margin: 12px 0;
          font-size: clamp(28px, 4vw, 40px);
        }

        .hourly-hero p {
          margin: 0;
          line-height: 1.7;
        }

        .hourly-filter {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          margin-bottom: 22px;
          padding: 20px;
          border: 1px solid #e0e8f0;
          border-radius: 16px;
          background: white;
        }

        .hourly-filter label {
          font-weight: 700;
        }

        .hourly-filter select {
          flex: 1;
          min-width: 220px;
          padding: 12px;
          border: 1px solid #cbd5e1;
          border-radius: 10px;
          background: white;
          color: #172b4d;
        }

        .hourly-filter button {
          padding: 12px 20px;
          border: 0;
          border-radius: 10px;
          background: #087f8c;
          color: white;
          font-weight: 700;
          cursor: pointer;
        }

        .hourly-filter button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .hourly-summary {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 16px;
          margin-bottom: 22px;
        }

        .summary-card {
          display: flex;
          min-width: 0;
          flex-direction: column;
          gap: 9px;
          padding: 22px;
          border: 1px solid #e0e8f0;
          border-radius: 16px;
          background: white;
        }

        .summary-card span,
        .summary-card small {
          color: #64748b;
        }

        .summary-card strong {
          overflow-wrap: anywhere;
          font-size: 24px;
        }

        .hourly-error {
          margin-bottom: 20px;
          padding: 18px;
          border: 1px solid #fecaca;
          border-radius: 12px;
          background: #fff1f2;
          color: #991b1b;
        }

        .hourly-error p {
          margin: 8px 0;
        }

        .hourly-table-card {
          overflow: hidden;
          border: 1px solid #e0e8f0;
          border-radius: 18px;
          background: white;
        }

        .table-heading {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 22px;
        }

        .table-heading h2 {
          margin: 0 0 8px;
          font-size: 22px;
        }

        .table-heading p {
          margin: 0;
          color: #64748b;
        }

        .record-count {
          padding: 8px 12px;
          border-radius: 20px;
          background: #e0f2fe;
          color: #075985;
          font-size: 13px;
          font-weight: 700;
        }

        .table-scroll {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          white-space: nowrap;
          font-size: 14px;
        }

        th,
        td {
          padding: 15px 16px;
          border-top: 1px solid #e8eef5;
          text-align: left;
        }

        th {
          background: #f8fafc;
          color: #475569;
          font-size: 12px;
        }

        tbody tr:hover {
          background: #f0fdfa;
        }

        .empty-cell {
          padding: 36px;
          color: #64748b;
          text-align: center;
        }

        .hourly-note {
          margin: 0;
          padding: 16px 22px;
          border-top: 1px solid #e8eef5;
          color: #64748b;
          font-size: 13px;
          line-height: 1.7;
        }

        .history-nav {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 24px;
        }

        .history-nav a {
          padding: 11px 15px;
          border: 1px solid #dbe5ef;
          border-radius: 10px;
          background: white;
          color: #334155;
          text-decoration: none;
          font-weight: 600;
        }

        .history-nav a.active {
          border-color: #087f8c;
          background: #087f8c;
          color: white;
        }

        @media (max-width: 700px) {
          .hourly-page {
            padding: 20px 12px 36px;
          }

          .hourly-hero {
            padding: 24px 20px;
          }

          .hourly-summary {
            grid-template-columns: 1fr;
          }

          .hourly-filter {
            align-items: stretch;
            flex-direction: column;
          }

          .hourly-filter select {
            min-width: 0;
            width: 100%;
          }

          .hourly-filter button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
