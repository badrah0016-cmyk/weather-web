"use client";

import { useRouter } from "next/navigation";
import "./Footer.css";

export default function Footer() {
    const router = useRouter();

    return (
        <footer className="weather-footer">

            <div className="weather-footer-container">

                {/* BRAND */}

                <div className="weather-footer-brand">

                    <button
                        className="weather-footer-logo"
                        onClick={() => router.push("/")}
                    >
                        <span className="weather-footer-logo-icon">
                            ☁️
                        </span>

                        <span>
                            Weather
                            <strong>MN</strong>
                        </span>
                    </button>

                    <p>
                        Монгол орны цаг агаарын
                        мэдээллийг нэг дороос
                        хурдан, ойлгомжтой хүргэнэ.
                    </p>

                </div>

                {/* WEATHER */}

                <div className="weather-footer-column">

                    <h3>
                        Цаг агаар
                    </h3>

                    <button
                        onClick={() =>
                            router.push("/city/549")
                        }
                    >
                        Цаг агаар
                    </button>

                    <button
                        onClick={() =>
                            router.push("/hourly/549")
                        }
                    >
                        Цагийн мэдээлэл
                    </button>

                    <button
                        onClick={() =>
                            router.push("/forecast/549")
                        }
                    >
                        7 хоногийн мэдээ
                    </button>

                </div>

                {/* INFORMATION */}

                <div className="weather-footer-column">

                    <h3>
                        Мэдээлэл
                    </h3>

                    <button
                        onClick={() =>
                            router.push("/alerts")
                        }
                    >
                        Анхааруулга
                    </button>

                    <button
                        onClick={() =>
                            router.push("/air-quality/549")
                        }
                    >
                        Агаарын чанар
                    </button>

                </div>

                {/* ABOUT */}

                <div className="weather-footer-column weather-footer-about">

                    <h3>
                        Weather MN
                    </h3>

                    <p>
                        Монгол Улсын цаг агаарын
                        станцуудын мэдээлэлд үндэслэн
                        цаг агаарын мэдээллийг
                        хэрэглэгчдэд хүргэнэ.
                    </p>

                </div>

            </div>

            {/* BOTTOM */}

            <div className="weather-footer-bottom">

                <div className="weather-footer-bottom-container">

                    <span>
                        © 2026 Weather MN
                    </span>

                    <span>
                        Бүх эрх хуулиар хамгаалагдсан.
                    </span>

                </div>

            </div>

        </footer>
    );
}