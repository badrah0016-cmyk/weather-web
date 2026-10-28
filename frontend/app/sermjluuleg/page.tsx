
"use client";

import Header from "../hesguud/Header";
import Footer from "../hesguud/Footer";
import "./sermjluuleg.css";

export default function SermjluulegPage() {
    return (
        <div className="sermjluuleg-page">

            <Header />

            <main className="sermjluuleg-container">

                <div className="sermjluuleg-title">
                    <h1>🚨 Цаг агаарын сэрэмжлүүлэг</h1>
                    <p>
                        Монгол орны цаг агаарын аюултай болон онцгой
                        үзэгдлийн талаарх мэдээлэл
                    </p>
                </div>

                {/* СЭРЭМЖЛҮҮЛЭГ */}
                <section className="alert-list">

                    <div className="alert-card alert-danger">

                        <div className="alert-icon">
                            🌨️
                        </div>

                        <div className="alert-content">
                            <div className="alert-top">
                                <span className="alert-type">
                                    ЦАГ АГААРЫН СЭРЭМЖЛҮҮЛЭГ
                                </span>

                                <span className="alert-level">
                                    Анхаарах
                                </span>
                            </div>

                            <h2>
                                Хүчтэй салхи, цасан шуурга
                            </h2>

                            <p>
                                Зарим нутгаар цас орж, салхины хурд
                                нэмэгдэх төлөвтэй байна.
                            </p>

                            <div className="alert-info">
                                <span>📍 Зарим нутгаар</span>
                                <span>🕐 Өнөөдөр</span>
                            </div>
                        </div>

                    </div>


                    <div className="alert-card alert-warning">

                        <div className="alert-icon">
                            ❄️
                        </div>

                        <div className="alert-content">
                            <div className="alert-top">
                                <span className="alert-type">
                                    ЦАГ АГААРЫН СЭРЭМЖЛҮҮЛЭГ
                                </span>

                                <span className="alert-level">
                                    Сэрэмжлүүлэх
                                </span>
                            </div>

                            <h2>
                                Хүйтний эрч чангарах
                            </h2>

                            <p>
                                Шөнөдөө агаарын температур огцом буурч,
                                хүйтрэх төлөвтэй байна.
                            </p>

                            <div className="alert-info">
                                <span>📍 Хойд болон зүүн нутгаар</span>
                                <span>🕐 Өнөө шөнө</span>
                            </div>
                        </div>

                    </div>


                    <div className="alert-card alert-info-card">

                        <div className="alert-icon">
                            🌧️
                        </div>

                        <div className="alert-content">
                            <div className="alert-top">
                                <span className="alert-type">
                                    МЭДЭЭЛЭЛ
                                </span>

                                <span className="alert-level">
                                    Мэдээлэл
                                </span>
                            </div>

                            <h2>
                                Хур тунадас
                            </h2>

                            <p>
                                Зарим газраар бороо, нойтон цас орох
                                магадлалтай байна.
                            </p>

                            <div className="alert-info">
                                <span>📍 Төвийн бүс</span>
                                <span>🕐 Ойрын хугацаанд</span>
                            </div>
                        </div>

                    </div>

                </section>

                {/* МЭДЭЭЛЭЛ БАЙХГҮЙ ҮЕД */}
                <div className="no-alert">
                    <span>✓</span>
                    <div>
                        <h3>Одоогоор онцгой сэрэмжлүүлэг байхгүй</h3>
                        <p>
                            Цаг агаарын нөхцөл байдлыг тогтмол шалгаж байна.
                        </p>
                    </div>
                </div>

            </main>

            <Footer />

        </div>
    );
}

