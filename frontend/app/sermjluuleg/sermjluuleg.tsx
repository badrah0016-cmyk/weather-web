
"use client";

import { useEffect, useMemo, useState } from "react";
import "./seremjluuleg.css";

interface AlertItem {
  id?: number | string;

  garchig?: string;
  tailbar?: string;
  hundrel?: string;
  turul?: string;
  idevhtei?: boolean | number | string;

  aimag?: string;
  nuluuluh_bus?: string;
  hamaarah_bus?: string;
  bairshil?: string;
  location?: string;
  region?: string;
  area?: string;
  gazar?: string;

  severity?: string;
  title?: string;
  description?: string;

  shinechilsen_ognoo?: string;
  ehleh_ognoo?: string;
  ognoo?: string;

  [key: string]: unknown;
}

interface Props {
  selectedAimag?: string | null;
}

const API_URL = "/backend/weather_db/tsag_agaar_sanuulga?active=true";

/* Текст болгон хувиргах */
function getText(value: unknown): string {
  if (value === null || value === undefined) return "";

  if (typeof value === "string") return value.trim();

  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;

    return getText(
      obj.name ??
      obj.ner ??
      obj.value ??
      obj.title
    );
  }

  return "";
}

/* Аймгийн нэрийг ижил хэлбэрт оруулах */
function normalizeArea(value: string): string {
  return value
    .toLocaleLowerCase("mn-MN")
    .replace(/монгол улс/g, "")
    .replace(/аймаг/g, "")
    .replace(/нийслэл/g, "")
    .replace(/хот/g, "")
    .replace(/\s+/g, "")
    .trim();
}

/* Аймгийн нэрийг карт дээр харуулах */
function formatArea(value: string): string {
  const area = value.trim();

  if (!area) {
    return "НӨЛӨӨЛӨХ БҮС ТОДОРХОЙГҮЙ";
  }

  const normalized = normalizeArea(area);

  if (
    normalized === "улаанбаатар" ||
    normalized === "ub"
  ) {
    return "УЛААНБААТАР ХОТ";
  }

  if (area.toLocaleLowerCase("mn-MN").includes("хот")) {
    return area.toLocaleUpperCase("mn-MN");
  }

  if (area.toLocaleLowerCase("mn-MN").includes("аймаг")) {
    return area.toLocaleUpperCase("mn-MN");
  }

  return `${area.toLocaleUpperCase("mn-MN")} АЙМАГ`;
}

/* Нөлөөлөх бүсийн мэдээллийг API өгөгдлөөс авах */
function getAlertArea(alert: AlertItem): string {
  const possibleFields: unknown[] = [
    alert.nuluuluh_bus,
    alert.hamaarah_bus,
    alert.aimag,
    alert.region,
    alert.area,
    alert.gazar,
    alert.bairshil,
    alert.location,

    alert["nuluuluhBus"],
    alert["hamaarahBus"],
    alert["nuluuluh_busiin_ner"],
    alert["affected_area"],
    alert["affected_region"],
    alert["affectedArea"],
    alert["affectedRegion"],
  ];

  for (const field of possibleFields) {
    const value = getText(field);

    if (value) return value;
  }

  return "";
}

/* Олон аймгийн нэрийг салгах */
function splitAreas(value: string): string[] {
  return value
    .split(/[,;|/]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/* Идэвхтэй эсэх */
function isAlertActive(alert: AlertItem): boolean {
  const value = alert.idevhtei;

  if (value === undefined || value === null) {
    return true;
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = value.toLocaleLowerCase("mn-MN").trim();

  return [
    "1",
    "true",
    "yes",
    "тийм",
    "идэвхтэй",
  ].includes(normalized);
}

/* Сэрэмжлүүлгийн төрөл */
function getAlertType(alert: AlertItem): "danger" | "warning" | "info" {
  const severity = getText(
    alert.severity ?? alert.hundrel ?? alert.turul
  ).toUpperCase();

  if (
    severity.includes("HIGH") ||
    severity.includes("EXTREME") ||
    severity.includes("DANGER") ||
    severity.includes("АЮУЛТАЙ")
  ) {
    return "danger";
  }

  if (
    severity.includes("MODERATE") ||
    severity.includes("MEDIUM") ||
    severity.includes("WARNING") ||
    severity.includes("ДУНД")
  ) {
    return "warning";
  }

  return "info";
}

/* Гарчиг */
function getAlertTitle(alert: AlertItem): string {
  return (
    getText(alert.garchig) ||
    getText(alert.title) ||
    "Цаг агаарын сэрэмжлүүлэг"
  );
}

/* Тайлбар */
function getAlertDescription(alert: AlertItem): string {
  return (
    getText(alert.tailbar) ||
    getText(alert.description) ||
    ""
  );
}

/* Огноо */
function getAlertTime(alert: AlertItem): string {
  const value =
    getText(alert.shinechilsen_ognoo) ||
    getText(alert.ehleh_ognoo) ||
    getText(alert.ognoo);

  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("mn-MN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ulaanbaatar",
  }).format(date);
}

/* API хариуг массив болгох */
function getAlertArray(data: unknown): AlertItem[] {
  if (Array.isArray(data)) {
    return data as AlertItem[];
  }

  if (!data || typeof data !== "object") {
    return [];
  }

  const obj = data as Record<string, unknown>;

  const possibleArrays = [
    obj.data,
    obj.rows,
    obj.alerts,
    obj.result,
  ];

  for (const value of possibleArrays) {
    if (Array.isArray(value)) {
      return value as AlertItem[];
    }
  }

  return [];
}

export default function Seremjluuleg({
  selectedAimag = null,
}: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /* API-аас сэрэмжлүүлэг татах */
  useEffect(() => {
    const controller = new AbortController();

    async function fetchAlerts() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(API_URL, {
          method: "GET",
          cache: "no-store",
          signal: controller.signal,
          headers: {
            Accept: "application/json",
          },
        });

        if (!response.ok) {
          throw new Error(
            `API алдаа: ${response.status}`
          );
        }

        const data: unknown = await response.json();

        const rows = getAlertArray(data);

        console.log("API сэрэмжлүүлэг:", rows);

        setAlerts(rows.filter(isAlertActive));
      } catch (err) {
        if (
          err instanceof Error &&
          err.name === "AbortError"
        ) {
          return;
        }

        console.error("Сэрэмжлүүлэг татах алдаа:", err);

        setError(
          "Сэрэмжлүүлгийн мэдээлэл татахад алдаа гарлаа."
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    fetchAlerts();

    return () => {
      controller.abort();
    };
  }, []);

  /* Сонгосон аймгаар шүүх */
  const visibleAlerts = useMemo(() => {
    if (!selectedAimag) {
      return alerts;
    }

    const selected = normalizeArea(selectedAimag);

    return alerts.filter((alert) => {
      const area = getAlertArea(alert);

      if (!area) return false;

      return splitAreas(area).some(
        (item) => normalizeArea(item) === selected
      );
    });
  }, [alerts, selectedAimag]);

  /* Сэрэмжлүүлгийн карт */
  function renderAlert(alert: AlertItem, index: number) {
    const area = getAlertArea(alert);
    const type = getAlertType(alert);
    const title = getAlertTitle(alert);
    const description = getAlertDescription(alert);
    const time = getAlertTime(alert);

    const severity = getText(
      alert.severity ?? alert.hundrel
    );

    return (
      <article
        className={`alert-card alert-${type}`}
        key={String(alert.id ?? index)}
      >
        <div className="alert-card-header">
          <div className="alert-region-heading">
            <span className="alert-region-icon">
              <svg
                viewBox="0 0 24 24"
                width="22"
                height="22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
              </svg>
            </span>

            <h3 className="alert-region-text">
              {formatArea(area)}
            </h3>
          </div>

          <span className={`alert-severity severity-${type}`}>
            {severity || "Тодорхойгүй"}
          </span>
        </div>

        <div className="alert-card-body">
          <h4 className="alert-title">
            {title}
          </h4>

          {description && (
            <p className="alert-description">
              {description}
            </p>
          )}
        </div>

        <div className="alert-card-footer">
          {time && (
            <span className="alert-meta">
              <span>Шинэчилсэн:</span> {time}
            </span>
          )}

          <span className="alert-active">
            <span className="active-dot" />
            Идэвхтэй
          </span>
        </div>
      </article>
    );
  }

  return (
    <main className="seremjluuleg-page">
      <div className="seremjluuleg-container">

        <header className="seremjluuleg-header">
          <div className="seremjluuleg-header-icon">
            <svg
              viewBox="0 0 24 24"
              width="30"
              height="30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>
          </div>

          <div>
            <h1>Цаг агаарын сэрэмжлүүлэг</h1>

            <p>
              Цаг агаарын аюултай болон болзошгүй
              үзэгдлийн мэдээлэл
            </p>

            {selectedAimag && (
              <span className="selected-aimag">
                Сонгосон аймаг: {formatArea(selectedAimag)}
              </span>
            )}
          </div>
        </header>

        <section className="seremjluuleg-content">
          {loading && (
            <div className="alert-state">
              <div className="alert-loader" />
              <p>Сэрэмжлүүлгийн мэдээлэл ачаалж байна...</p>
            </div>
          )}

          {!loading && error && (
            <div className="alert-state alert-error">
              <h3>Мэдээлэл татахад алдаа гарлаа</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && visibleAlerts.length === 0 && (
            <div className="alert-state alert-empty">
              <div className="empty-icon">✓</div>

              <h3>Идэвхтэй сэрэмжлүүлэг алга</h3>

              <p>
                {selectedAimag
                  ? `${formatArea(selectedAimag)}-т бүртгэгдсэн идэвхтэй сэрэмжлүүлэг одоогоор алга.`
                  : "Одоогоор идэвхтэй сэрэмжлүүлэг бүртгэгдээгүй байна."}
              </p>
            </div>
          )}

          {!loading && !error && visibleAlerts.length > 0 && (
            <>
              <div className="alert-list-heading">
                <h2>Идэвхтэй мэдээнүүд</h2>

                <span className="alert-count">
                  {visibleAlerts.length} мэдээ
                </span>
              </div>

              <div className="alert-list">
                {visibleAlerts.map(renderAlert)}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
