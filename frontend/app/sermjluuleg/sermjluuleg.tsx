
"use client";

import { useState } from "react";
import "./seremjluuleg.css";

type AlertType = "danger" | "warning" | "info";

interface AlertItem {
    id: number;
    title: string;
    description: string;
    location: string;
    time: string;
    endTime?: string;
    type: AlertType;
    icon: string;
    advice?: string;
}

interface Props {
    alerts?: AlertItem[];
}

const alertConfig = {
    danger: {
        label: "АЮУЛТАЙ ҮЗЭГДЭЛ",
        level: "Өндөр эрсдэл",
    },
    warning: {
        label: "АНХААРУУЛГА",
        level: "Дунд эрсдэл",
    },
    info: {
        label: "МЭДЭЭЛЭЛ",
        level: "Мэдээлэл",
    },
};

export default function Seremjluuleg({ alerts = [] }: Props) {
    const [expanded, setExpanded] = useState<number | null>(null);

    const dangerCount = alerts.filter(a => a.type === "danger").length;
    const warningCount = alerts.filter(a => a.type === "warning").length;
    const infoCount = alerts.filter(a => a.type === "info").length;

    return (
        <main className="seremjluuleg-page">
            <div className="seremj-container">

                {/* PAGE HEADER */}
                <header className="seremj-header">
                    <div className="seremj-header-text">
                        <span className="seremj-eyebrow">
                            WEATHER ALERT CENTER
                        </span>

                        <h1>Цаг агаарын сэрэмжлүүлэг</h1>

                        <p>
                            Цаг агаарын аюултай болон болзошгүй
                            үзэгдлийн мэдээлэл
                        </p>
                    </div>

                    <div className="seremj-total">
                        <span className="seremj-status-dot" />
                        {alerts.length} идэвхтэй
                    </div>
                </header>

                {/* STATISTICS */}
                <section className="seremj-stats" aria-label="Сэрэмжлүүлгийн тоо">
                    <div className="seremj-stat danger-stat">
                        <div className="seremj-stat-icon">🚨</div>
                        <div>
                            <strong>{dangerCount}</strong>
                            <span>Аюултай</span>
                        </div>
                    </div>

                    <div className="seremj-stat warning-stat">
                        <div className="seremj-stat-icon">⚠️</div>
                        <div>
                            <strong>{warningCount}</strong>
                            <span>Анхааруулга</span>
                        </div>
                    </div>

                    <div className="seremj-stat info-stat">
                        <div className="seremj-stat-icon">ℹ️</div>
                        <div>
                            <strong>{infoCount}</strong>
                            <span>Мэдээлэл</span>
                        </div>
                    </div>
                </section>

                {/* ALERT LIST */}
                <section className="seremj-alert-section">
                    <div className="seremj-section-heading">
                        <div>
                            <h2>Идэвхтэй сэрэмжлүүлгүүд</h2>
                            <p>Нийт {alerts.length} мэдэгдэл</p>
                        </div>
                    </div>

                    {alerts.length > 0 ? (
                        <div className="seremj-list">
                            {alerts.map(alert => {
                                const isOpen = expanded === alert.id;
                                const config = alertConfig[alert.type];

                                return (
                                    <article
                                        key={alert.id}
                                        className={`seremj-card ${alert.type}`}
                                    >
                                        <div className="seremj-card-layout">

                                            <div className="seremj-icon">
                                                {alert.icon}
                                            </div>

                                            <div className="seremj-card-content">

                                                <div className="seremj-card-top">
                                                    <span className="seremj-label">
                                                        {config.label}
                                                    </span>

                                                    <span className="seremj-level">
                                                        {config.level}
                                                    </span>
                                                </div>

                                                <h3>{alert.title}</h3>

                                                <p className="seremj-description">
                                                    {alert.description}
                                                </p>

                                                <div className="seremj-meta">
                                                    <span>
                                                        <span aria-hidden="true">📍</span>
                                                        {alert.location}
                                                    </span>

                                                    <span>
                                                        <span aria-hidden="true">🕒</span>
                                                        {alert.time}
                                                    </span>

                                                    {alert.endTime && (
                                                        <span>
                                                            <span aria-hidden="true">⌛</span>
                                                            Дуусах: {alert.endTime}
                                                        </span>
                                                    )}
                                                </div>

                                                {alert.advice && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            className="seremj-details"
                                                            aria-expanded={isOpen}
                                                            aria-controls={`advice-${alert.id}`}
                                                            onClick={() =>
                                                                setExpanded(
                                                                    isOpen ? null : alert.id
                                                                )
                                                            }
                                                        >
                                                            {isOpen
                                                                ? "Дэлгэрэнгүй хураах"
                                                                : "Дэлгэрэнгүй харах"}
                                                            <span aria-hidden="true">
                                                                {isOpen ? " ↑" : " ↓"}
                                                            </span>
                                                        </button>

                                                        {isOpen && (
                                                            <div
                                                                id={`advice-${alert.id}`}
                                                                className="seremj-advice"
                                                            >
                                                                <strong>
                                                                    Аюулгүй байдлын зөвлөмж
                                                                </strong>
                                                                <p>{alert.advice}</p>
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </article>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="seremj-empty">
                            <div className="seremj-empty-icon">✓</div>
                            <h3>Одоогоор сэрэмжлүүлэггүй байна</h3>
                            <p>
                                Цаг агаарын идэвхтэй сэрэмжлүүлгийн
                                мэдээлэл одоогоор алга байна.
                            </p>
                        </div>
                    )}
                </section>

            </div>
        </main>
    );
}
