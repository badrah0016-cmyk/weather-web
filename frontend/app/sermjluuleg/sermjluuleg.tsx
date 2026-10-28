
"use client";

import "./seremjluuleg.css";

interface SeremjluulegProps {
    title?: string;
    description?: string;
    type?: "danger" | "warning" | "info";
    location?: string;
    time?: string;
}

export default function Seremjluuleg({
    title = "Цаг агаарын сэрэмжлүүлэг",
    description = "Одоогоор цаг агаарын онцгой сэрэмжлүүлэг байхгүй байна.",
    type = "info",
    location = "Монгол Улс",
    time = "Одоогоор",
}: SeremjluulegProps) {
    return (
        <section className={`seremjluuleg ${type}`}>

            <div className="seremjluuleg-header">
                <div className="seremjluuleg-icon">
                    🚨
                </div>

                <div>
                    <span className="seremjluuleg-label">
                        СЭРЭМЖЛҮҮЛЭГ
                    </span>

                    <h2>{title}</h2>
                </div>
            </div>

            <div className="seremjluuleg-body">
                <p>{description}</p>

                <div className="seremjluuleg-info">
                    <span>📍 {location}</span>
                    <span>🕐 {time}</span>
                </div>
            </div>

        </section>
    );
}

