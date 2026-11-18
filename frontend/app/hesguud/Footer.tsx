
"use client";

import { useRouter } from "next/navigation";
import "./Footer.css";

export default function Footer() {
    const router = useRouter();

    const goTo = (path: string) => {
        router.push(path);
    };

    return (
        <footer className="weather-footer">

            <div className="weather-footer-container">

                {/* BRAND */}
                <div className="weather-footer-brand">

                    <button
                        className="weather-footer-logo"
                        onClick={() => goTo("/")}
                        aria-label="Weather MN нүүр хуудас"
                    >
                        <span className="weather-footer-logo-icon">
                            ☁️
                        </span>

                        <span className="weather-footer-logo-text">
                            Weather<strong>MN</strong>
                        </span>
                    </button>

                    <p>
                        Монгол орны цаг агаарын мэдээллийг
                        нэг дороос хурдан, найдвартай,
                        ойлгомжтой хүргэнэ.
                    </p>

                    <div className="weather-footer-status">
                        <span className="weather-footer-status-dot"></span>
                        <span>Цаг агаарын мэдээллийн систем</span>
                    </div>

                </div>

             

                {/* INFORMATION */}
                <div className="weather-footer-column">

                    <h3>Мэдээлэл</h3>

                    <button onClick={() => goTo("/sermjluuleg")}>
                        Цаг агаарын сэрэмжлүүлэг
                    </button>

                    <button onClick={() => goTo("/agaarchanar")}>
                        Агаарын чанар
                    </button>

                    <button onClick={() => goTo("/agaarchanar/eruul_mend")}>
                        Эрүүл мэндийн зөвлөмж
                    </button>

                    <button onClick={() => goTo("/agaarchanar/compare")}>
                        Агаарын чанарын харьцуулалт
                    </button>

                </div>

                {/* ABOUT */}
                <div className="weather-footer-column weather-footer-about">

                    <h3>Weather MN</h3>

                    <p>
                        Монгол Улсын цаг уурын станцууд болон
                        цаг агаарын мэдээллийн эх сурвалжид
                        үндэслэн хэрэглэгчдэд мэдээлэл хүргэнэ.
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
                        Монгол орны цаг агаарын мэдээллийн веб систем
                    </span>

                    <span>
                        Бүх эрх хуулиар хамгаалагдсан.
                    </span>

                </div>

            </div>

        </footer>
    );
}
