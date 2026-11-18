
import Link from "next/link";
import "./AgaarFooter.css";

export default function AgaarFooter() {
    return (
        <footer className="aq-footer">
            <div className="aq-footer-container">

                <div className="aq-footer-main">

                    {/* BRAND */}
                    <div className="aq-footer-brand">
                        <div className="aq-footer-logo">
                            🌿
                        </div>

                        <h2>WEATHER MN</h2>

                        <p>
                            Монгол орны цаг агаар болон
                            агаарын чанарын мэдээллийн систем.
                        </p>
                    </div>

                    {/* WEATHER */}
                    <div className="aq-footer-column">
                        <h3>Цаг агаар</h3>
                        <Link href="/">Нүүр хуудас</Link>
                        <Link href="/">Одоогийн цаг агаар</Link>
                    </div>

                    {/* AIR QUALITY */}
                    <div className="aq-footer-column">
                        <h3>Агаарын чанар</h3>
                        <Link href="/agaarchanar">Агаарын чанар</Link>
                        <Link href="/agaarchanar/compare">Харьцуулалт</Link>
                        <Link href="/agaarchanar/eruul_mend">Эрүүл мэнд</Link>
                    </div>

                    {/* INFORMATION */}
                    <div className="aq-footer-column">
                        <h3>Мэдээлэл</h3>
                        <Link href="/sermjluuleg">Сэрэмжлүүлэг</Link>
                        <Link href="/">Бидний тухай</Link>
                    </div>

                </div>

                <div className="aq-footer-bottom">
                    <p>
                        © {new Date().getFullYear()} WEATHER MN.
                        Бүх эрх хуулиар хамгаалагдсан.
                    </p>

                    <span>
                        🌱 Цэвэр агаар — Эрүүл амьдрал
                    </span>
                </div>

            </div>
        </footer>
    );
}
