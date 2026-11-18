"use client";

import { useEffect, useMemo, useState } from "react";
import "./seremjluuleg.css";

interface AlertItem {
    id?: string | number;

    // API-аас ирж болох гарчиг, тайлбар
    title?: unknown;
    description?: unknown;
    garchig?: unknown;
    tailbar?: unknown;
    hundrel?: unknown;
    turul?: unknown;
    severity?: unknown;
    idevhtei?: boolean | number | string | null;

    // Станц болон байршлын талбарууд
    stants_dugaar?: string | number | null;
    stantsDugaar?: string | number | null;
    station_id?: string | number | null;
    stationId?: string | number | null;
    station_name?: unknown;
    ner?: unknown;
    aimag?: unknown;
    sum?: unknown;
    bairshil?: unknown;
    location?: unknown;
    location_name?: unknown;

    // Нөлөөлөх бүсийн өөр нэршлүүд
    nuluuluh_bus?: unknown;
    hamaarah_bus?: unknown;
    region?: unknown;
    area?: unknown;
    gazar?: unknown;
    nuluuluhBus?: unknown;
    hamaarahBus?: unknown;
    nuluuluh_busiin_ner?: unknown;
    affected_area?: unknown;
    affected_region?: unknown;
    affectedArea?: unknown;
    affectedRegion?: unknown;

    // Огнооны талбарууд
    ehleh_ognoo?: unknown;
    duusah_ognoo?: unknown;
    shinechilsen_ognoo?: unknown;
    ognoo?: unknown;

    [key: string]: unknown;
}

interface Props {
  selectedAimag?: string | null;
}

type AlertType = "danger" | "warning" | "info";
type Filter = "all" | AlertType;

const API_URL = "/backend/weather_db/tsag_agaar_sanuulga?active=true";

/* Түвшин бүрийн тайлбар */
const TYPE_META: Record<
  AlertType,
  { label: string; hint: string; advice: string[] }
> = {
  danger: {
    label: "Аюултай",
    hint: "Хүн, мал, өмч хөрөнгөд шууд эрсдэл учруулж болзошгүй",
    advice: [
      "Шаардлагагүй бол гадуур явахаас зайлсхийнэ.",
      "Малаа хоргодуулж, тэжээл усаа нөөцөлнө.",
      "Албан ёсны мэдээг байнга хянаж, тусламжийн албатай холбоотой байна.",
    ],
  },
  warning: {
    label: "Анхааруулга",
    hint: "Өдөр тутмын үйл ажиллагаанд саад болох магадлалтай",
    advice: [
      "Явах замын нөхцөл байдлыг урьдчилан шалгана.",
      "Дулаан хувцас, хоол ус бэлтгэнэ.",
      "Гадаа байгаа эд зүйлсээ бэхэлж хамгаална.",
    ],
  },
  info: {
    label: "Мэдээлэл",
    hint: "Урьдчилан мэдэж байх шаардлагатай ерөнхий мэдээлэл",
    advice: ["Цаг агаарын мэдээг тогтмол дагаж, төлөвлөгөөгөө тохируулна."],
  },
};

/* Текст болгон хувиргах */
function getText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);

  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    return getText(obj.name ?? obj.ner ?? obj.value ?? obj.title);
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

  if (!area) return "Нөлөөлөх бүс тодорхойгүй";

  const normalized = normalizeArea(area);
  const lower = area.toLocaleLowerCase("mn-MN");

  if (normalized === "улаанбаатар" || normalized === "ub") {
    return "Улаанбаатар хот";
  }

  if (lower.includes("хот") || lower.includes("аймаг")) return area;

  return `${area} аймаг`;
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

  if (value === undefined || value === null) return true;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;

  const normalized = value.toLocaleLowerCase("mn-MN").trim();
  return ["1", "true", "yes", "тийм", "идэвхтэй"].includes(normalized);
}

/* Сэрэмжлүүлгийн төрөл */
function getAlertType(alert: AlertItem): AlertType {
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

function getAlertTitle(alert: AlertItem): string {
  return getText(alert.garchig) || getText(alert.title) || "Цаг агаарын сэрэмжлүүлэг";
}

function getAlertDescription(alert: AlertItem): string {
  return getText(alert.tailbar) || getText(alert.description) || "";
}

/* Огноог форматлах */
function formatDate(value: string): string {
  if (!value) return "";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

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
  if (Array.isArray(data)) return data as AlertItem[];
  if (!data || typeof data !== "object") return [];

  const obj = data as Record<string, unknown>;

  for (const value of [obj.data, obj.rows, obj.alerts, obj.result]) {
    if (Array.isArray(value)) return value as AlertItem[];
  }

  return [];
}

/* Дүрсүүд */
function ShieldIcon({ size = 22 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true">
      <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11z" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default function Seremjluuleg({ selectedAimag = null }: Props) {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

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
          headers: { Accept: "application/json" },
        });

        if (!response.ok) throw new Error(`API алдаа: ${response.status}`);

        const data: unknown = await response.json();
        setAlerts(getAlertArray(data).filter(isAlertActive));
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;

        console.error("Сэрэмжлүүлэг татах алдаа:", err);
        setError("Сэрэмжлүүлгийн мэдээлэл татахад алдаа гарлаа. Дахин оролдоно уу.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    fetchAlerts();
    return () => controller.abort();
  }, []);

  /* Сонгосон аймгаар шүүх */
  const areaAlerts = useMemo(() => {
    if (!selectedAimag) return alerts;

    const selected = normalizeArea(selectedAimag);

    return alerts.filter((alert) => {
      const area = getAlertArea(alert);
      if (!area) return false;
      return splitAreas(area).some((item) => normalizeArea(item) === selected);
    });
  }, [alerts, selectedAimag]);

  /* Түвшин тус бүрийн тоо */
  const counts = useMemo(() => {
    const result: Record<AlertType, number> = { danger: 0, warning: 0, info: 0 };
    areaAlerts.forEach((a) => {
      result[getAlertType(a)] += 1;
    });
    return result;
  }, [areaAlerts]);

  /* Аюулын түвшнээр эрэмбэлж, шүүх */
  const visibleAlerts = useMemo(() => {
    const order: Record<AlertType, number> = { danger: 0, warning: 1, info: 2 };

    return areaAlerts
      .filter((a) => filter === "all" || getAlertType(a) === filter)
      .sort((a, b) => order[getAlertType(a)] - order[getAlertType(b)]);
  }, [areaAlerts, filter]);

  /* Сэрэмжлүүлгийн карт */
  function renderAlert(alert: AlertItem, index: number) {
    const type = getAlertType(alert);
    const meta = TYPE_META[type];
    const areas = splitAreas(getAlertArea(alert));
    const title = getAlertTitle(alert);
    const description = getAlertDescription(alert);

    const startTime = formatDate(getText(alert.ehleh_ognoo));
    const endTime = formatDate(getText(alert.duusah_ognoo));
    const updated = formatDate(
      getText(alert.shinechilsen_ognoo) || getText(alert.ognoo)
    );

    const rawSeverity = getText(alert.severity ?? alert.hundrel);

    return (
      <article
        className={`alert-card alert-${type}`}
        key={String(alert.id ?? index)}
      >
        <div className="alert-card-header">
          <span className={`alert-severity severity-${type}`}>
            <ShieldIcon size={16} />
            {meta.label}
            {rawSeverity && rawSeverity.toLocaleLowerCase("mn-MN") !== meta.label.toLocaleLowerCase("mn-MN")
              ? ` · ${rawSeverity}`
              : ""}
          </span>

          <span className="alert-active">
            <span className="active-dot" />
            Идэвхтэй
          </span>
        </div>

        <div className="alert-card-body">
          <h3 className="alert-title">{title}</h3>

          <p className="alert-hint">{meta.hint}</p>

          {description ? (
            <p className="alert-description">{description}</p>
          ) : (
            <p className="alert-description alert-muted">
              Нэмэлт тайлбар оруулаагүй байна.
            </p>
          )}
        </div>

        <dl className="alert-details">
          <div className="alert-detail alert-detail-wide">
            <dt>Нөлөөлөх бүс</dt>
            <dd>
              {areas.length > 0 ? (
                <span className="area-chips">
                  {areas.map((item) => (
                    <span className="area-chip" key={item}>
                      {formatArea(item)}
                    </span>
                  ))}
                </span>
              ) : (
                "Тодорхойгүй"
              )}
            </dd>
          </div>

          {startTime && (
            <div className="alert-detail">
              <dt>Эхлэх</dt>
              <dd>{startTime}</dd>
            </div>
          )}

          {endTime && (
            <div className="alert-detail">
              <dt>Дуусах</dt>
              <dd>{endTime}</dd>
            </div>
          )}

          {updated && (
            <div className="alert-detail">
              <dt>Шинэчилсэн</dt>
              <dd>{updated}</dd>
            </div>
          )}
        </dl>

        <div className="alert-advice">
          <h4>Юу хийх вэ?</h4>
          <ul>
            {meta.advice.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </article>
    );
  }

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "Бүгд", count: areaAlerts.length },
    { key: "danger", label: TYPE_META.danger.label, count: counts.danger },
    { key: "warning", label: TYPE_META.warning.label, count: counts.warning },
    { key: "info", label: TYPE_META.info.label, count: counts.info },
  ];

  return (
    <main className="seremjluuleg-page">
      <header className="seremjluuleg-header">
        <div className="seremjluuleg-header-inner">
          <div className="seremjluuleg-header-icon">
            <ShieldIcon size={30} />
          </div>

          <div className="seremjluuleg-header-text">
            <h1>Цаг агаарын сэрэмжлүүлэг</h1>
            <p>Цаг агаарын аюултай болон болзошгүй үзэгдлийн мэдээлэл</p>

            {selectedAimag && (
              <span className="selected-aimag">
                Сонгосон бүс: {formatArea(selectedAimag)}
              </span>
            )}
          </div>

        </div>
      </header>

      <div className="seremjluuleg-container">
        <section className="seremjluuleg-content">
          {loading && (
            <div className="alert-state" role="status">
              <div className="alert-loader" />
              <p>Сэрэмжлүүлгийн мэдээлэл ачаалж байна...</p>
            </div>
          )}

          {!loading && error && (
            <div className="alert-state alert-error" role="alert">
              <h3>Мэдээлэл татахад алдаа гарлаа</h3>
              <p>{error}</p>
            </div>
          )}

          {!loading && !error && areaAlerts.length === 0 && (
            <div className="alert-state alert-empty">
              <div className="empty-icon">✓</div>
              <h3>Идэвхтэй сэрэмжлүүлэг алга</h3>
              <p>
                {selectedAimag
                  ? `${formatArea(selectedAimag)}-д одоогоор идэвхтэй сэрэмжлүүлэг бүртгэгдээгүй байна.`
                  : "Одоогоор идэвхтэй сэрэмжлүүлэг бүртгэгдээгүй байна."}
              </p>
            </div>
          )}

          {!loading && !error && areaAlerts.length > 0 && (
            <>
              <div className="alert-summary">
                <div className="summary-item summary-danger">
                  <strong>{counts.danger}</strong>
                  <span>Аюултай</span>
                </div>
                <div className="summary-item summary-warning">
                  <strong>{counts.warning}</strong>
                  <span>Анхааруулга</span>
                </div>
                <div className="summary-item summary-info">
                  <strong>{counts.info}</strong>
                  <span>Мэдээлэл</span>
                </div>
              </div>

              <div className="alert-list-heading">
                <h2>Идэвхтэй мэдээнүүд</h2>
                <span className="alert-count">{visibleAlerts.length} мэдээ</span>
              </div>

              <div className="alert-filters" role="tablist" aria-label="Түвшнээр шүүх">
                {filters.map((f) => (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={filter === f.key}
                    className={`filter-chip ${filter === f.key ? "is-active" : ""}`}
                    onClick={() => setFilter(f.key)}
                  >
                    {f.label}
                    <span className="filter-count">{f.count}</span>
                  </button>
                ))}
              </div>

              {visibleAlerts.length === 0 ? (
                <div className="alert-state alert-empty">
                  <p>Энэ түвшинд сэрэмжлүүлэг алга байна.</p>
                </div>
              ) : (
                <div className="alert-list">{visibleAlerts.map(renderAlert)}</div>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}