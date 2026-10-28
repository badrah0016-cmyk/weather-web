"use client";

import AgaarHeader from "../AgaarHeader";
import Footer from "../../hesguud/Footer";
import "./eruul_mend.css";

const pollutants = [
  {
    symbol: "PM2.5",
    title: "Нарийн ширхэгт тоосонцор",
    source: "Нүүрс, мод шатаах, автомашины утаа, үйлдвэрийн ялгаралтаас үүснэ.",
    effect: "Уушгины гүнд нэвтэрч, зүрх судасны тогтолцоонд сөргөөр нөлөөлж болно.",
    symptoms: "Ханиалгах, амьсгал давчдах, нүд болон хоолой хорсох.",
  },
  {
    symbol: "PM10",
    title: "Том ширхэгт тоосонцор",
    source: "Зам, хөрсний тоос, барилгын ажил, шаталтын утаанаас үүсдэг.",
    effect: "Амьсгалын замыг цочроож, багтрааны шинж тэмдгийг сэдрээж болно.",
    symptoms: "Найтаах, ханиалгах, хамар битүүрэх, нүд загатнах.",
  },
  {
    symbol: "CO",
    title: "Нүүрстөрөгчийн дутуу исэл",
    source: "Нүүрс, мод, түлш дутуу шатахад үүсдэг өнгөгүй, үнэргүй хорт хий.",
    effect: "Цусны хүчилтөрөгч зөөвөрлөх чадварыг бууруулна.",
    symptoms: "Толгой өвдөх, толгой эргэх, дотор муухайрах, сулрах, ухаан алдах.",
  },
  {
    symbol: "NO₂",
    title: "Азотын давхар исэл",
    source: "Автомашин, халаалтын төхөөрөмж болон үйлдвэрийн шаталтаас ялгарна.",
    effect: "Амьсгалын замыг цочроож, астма болон уушгины өвчнийг хүндрүүлж болно.",
    symptoms: "Ханиалгах, амьсгал давчдах, амьсгалын зам цочрох.",
  },
  {
    symbol: "SO₂",
    title: "Хүхрийн давхар исэл",
    source: "Хүхэр агуулсан түлш шатаах, үйлдвэрийн үйл ажиллагаанаас үүснэ.",
    effect: "Амьсгалын замыг цочроож, багтраа сэдрээж болно.",
    symptoms: "Хоолой хорсох, ханиалгах, амьсгал давчдах.",
  },
  {
    symbol: "O₃",
    title: "Газрын гадаргын озон",
    source: "Нарны гэрэлд автомашин, үйлдвэрийн зарим хий химийн урвалд ороход үүсдэг.",
    effect: "Уушгины үйл ажиллагаанд нөлөөлж, амьсгалын зовиур үүсгэж болно.",
    symptoms: "Цээж хөндүүрлэх, ханиалгах, амьсгал давчдах.",
  },
];

const prevention = [
  { icon: "📊", title: "Агаарын чанарыг өдөр бүр шалгах", text: "Улаанбаатарын агаарын чанар болон урьдчилсан мэдээг Цаг уур, орчны шинжилгээний газрын албан ёсны сайтаас шалгаарай." },
  { icon: "🏃", title: "Гадаах хөдөлгөөнийг тохируулах", text: "Бохирдол их үед гүйх, эрчимтэй дасгал хийх, удаан хугацаагаар гадаа байхыг багасгана. Хүүхэд, жирэмсэн хүн, өндөр настан болон зүрх, уушгины өвчтэй хүмүүс онцгой анхаарна." },
  { icon: "🏠", title: "Гэрийн агаарыг цэвэршүүлэх", text: "Бохирдол их үед цонх, хаалгыг хааж, боломжтой бол HEPA шүүлтүүртэй агаар цэвэршүүлэгч хэрэглэнэ. Дотор агаарын бохирдлын эх үүсвэрийг багасгана." },
  { icon: "😷", title: "Гадаа гарахдаа хамгаалах", text: "Нүүрэнд сайн таарсан N95 эсвэл түүнтэй дүйцэхүйц амны хаалт нарийн тоосонцрын өртөлтийг бууруулахад тусална. Энгийн эмнэлгийн маск бүрэн хамгаалахгүй." },
  { icon: "🔥", title: "Халаалтын аюулгүй байдлыг хангах", text: "Зуух, яндан, халаалтын төхөөрөмжийг тогтмол шалгуулна. Боломжтой бол нүүрстөрөгчийн дутуу ислийн (CO) мэдрэгч байрлуулна." },
];

const aqiRows = [
  ["0–50", "Цэвэр", "Ердийн үйл ажиллагаагаа үргэлжлүүлнэ."],
  ["51–100", "Хэвийн", "Мэдрэг хүмүүс шинж тэмдгээ ажиглана."],
  ["101–200", "Бага бохирдолтой", "Мэдрэг бүлгийнхэн гадаах ачааллаа багасгана."],
  ["201–300", "Бохирдол нэмэгдсэн", "Гадаа удаан байх, хүнд дасгал хийхээс зайлсхийнэ."],
  ["301–400", "Их бохирдолтой", "Гадаах үйл ажиллагааг эрс багасгана."],
  ["401–500", "Маш их бохирдолтой", "Гадаах өртөлтийг аль болох багасгаж, албан ёсны сэрэмжлүүлгийг дагана."],
];

export default function EruulMendPage() {
  return (
    <>
      <AgaarHeader />
      <main className="aq-health-page aq-health-article-page">
        <section className="aq-health-hero">
          <div>
            <div className="aq-health-eyebrow">АГААРЫН ЧАНАР · ЭРҮҮЛ МЭНД</div>
            <h1>Агаарын чанар, эрүүл мэнд, зөвлөгөөний мэдээлэл</h1>
            <p className="aq-health-subtitle">
              Агаарын бохирдол гэж юу болох, ямар бохирдуулагч бодисууд байдаг,
              хүний биед хэрхэн нөлөөлдөг, хордлогын үед ямар арга хэмжээ авах,
              цаашид хэрхэн урьдчилан сэргийлэх талаар ойлгомжтой мэдээлэл.
            </p>
          </div>
         <a
  className="aq-health-refresh-button aq-health-official-link"
  href="http://localhost:3100/agaarchanar#overview"
  rel="noreferrer"
>
  Агаарын чанарыг шалгах ↗
</a>
        </section>

        <section className="aq-health-section">
          <div className="aq-health-section-heading">
            <h2>1. Агаарт ямар төрлийн бохирдуулагч бодис байдаг вэ?</h2>
            <p>Гол бохирдуулагч бүрийн эх үүсвэр, эрүүл мэндэд үзүүлэх нөлөө, нийтлэг шинж тэмдгийг харьцуулан уншаарай.</p>
          </div>
          <div className="aq-health-pollutant-grid">
            {pollutants.map((item) => (
              <article className="aq-health-pollutant-card aq-health-article-card" key={item.symbol}>
                <div className="aq-health-pollutant-symbol">{item.symbol}</div>
                <h3>{item.title}</h3>
                <p><strong>Эх үүсвэр:</strong> {item.source}</p>
                <p><strong>Нөлөө:</strong> {item.effect}</p>
                <p className="aq-health-article-symptoms"><strong>Шинж тэмдэг:</strong> {item.symptoms}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="aq-health-section">
          <div className="aq-health-section-heading">
            <h2>2. Агаарын бохирдлоос ямар шинж тэмдэг илэрдэг вэ?</h2>
            <p>Шинж тэмдгийн хүндрэлийг анхаарч, шаардлагатай үед эмнэлгийн тусламж аваарай.</p>
          </div>
          <div className="aq-health-tips-grid aq-health-symptom-grid">
            <article className="aq-health-tip-card"><div className="aq-health-tip-icon">🟢</div><div><h3>Хөнгөн шинж тэмдэг</h3><ul><li>Нүд хорсох, улайх, нулимс гоожих</li><li>Хамар битүүрэх, нус гоожих</li><li>Хоолой сэрвэгнэх, хуурай ханиалгах</li><li>Толгой өвдөх, ядрах</li></ul></div></article>
            <article className="aq-health-tip-card"><div className="aq-health-tip-icon">🟠</div><div><h3>Дунд зэргийн шинж тэмдэг</h3><ul><li>Амьсгал давчдах, шүгэлдэж амьсгалах</li><li>Цээж бачуурах</li><li>Удаан хугацаагаар ханиалгах</li><li>Астма, архаг бронхитын шинж сэдрэх</li></ul></div></article>
          </div>
          <article className="aq-health-disclaimer aq-health-danger-note">
            <strong>🔴 Аюултай шинж тэмдэг — яаралтай тусламж авна</strong>
            Амьсгал маш их давчдах, цээж хүчтэй өвдөх, ухаан балартах эсвэл алдах, таталт өгөх,
            гэнэт будилах, сэрээхэд хэцүү болох шинж илэрвэл Монголд 103 дугаарт залгаарай.
            Богино хугацаанд өртөхөд ч шинж тэмдэг илэрч болох бөгөөд удаан хугацааны өртөлт нь
            уушги, зүрх судасны өвчний эрсдэлийг нэмэгдүүлж болно.
          </article>
        </section>

        <section className="aq-health-section">
          <div className="aq-health-section-heading">
            <h2>3. Хордлогын үед анхны тусламж хэрхэн үзүүлэх вэ?</h2>
            <p>Ердийн тоосонцрын цочрол болон нүүрстөрөгчийн дутуу ислийн (CO) хордлого ижил биш.</p>
          </div>
          <div className="aq-health-tips-grid">
            <article className="aq-health-tip-card"><div className="aq-health-tip-icon">1</div><div><h3>Бохирдсон орчноос холдох</h3><p>Боломжтой бол цэвэр агаартай, аюулгүй газар очно. Гэрт нүүрсний утаа эсвэл CO хий хуримтлагдсан байж болзошгүй бол дотогш буцаж орохгүй.</p></div></article>
            <article className="aq-health-tip-card"><div className="aq-health-tip-icon">2</div><div><h3>Биеийн ачааллыг багасгах</h3><p>Амарч, амьсгалаа ажиглана. Амьсгал давчдах үед алхах, гүйх зэрэг ачаалал өгөхгүй.</p></div></article>
            <article className="aq-health-tip-card"><div className="aq-health-tip-icon">3</div><div><h3>Шинж тэмдгийг үнэлэх</h3><p>Амьсгал давчдах, цээж өвдөх, толгой эргэх, будилах эсвэл ухаан алдах шинж илэрвэл 103 дугаарт яаралтай залгана.</p></div></article>
            <article className="aq-health-tip-card"><div className="aq-health-tip-icon">4</div><div><h3>Эмнэлгийн тусламж авах</h3><p>CO хордлогыг сэжиглэвэл шинж тэмдэг намдсан байсан ч яаралтай эмнэлэгт үзүүлнэ. Эмчилгээг эмнэлгийн мэргэжилтэн шийднэ.</p></div></article>
          </div>
          <article className="aq-health-disclaimer aq-health-danger-note">
            <strong>Анхааруулга</strong>
            CO хордлогын үед энгийн хурууны хүчилтөрөгч хэмжигч хэвийн зааж болох тул түүнд найдаж болохгүй.
            Ухаангүй хүнд амаар ус, эм өгөхгүй. Өөрөө аврах гэж бохирдсон орчинд дахин орох нь аюултай.
          </article>
        </section>

        <section className="aq-health-section">
          <div className="aq-health-section-heading">
            <h2>4. Агаарын бохирдлоос хэрхэн урьдчилан сэргийлэх вэ?</h2>
            <p>Өдөр тутмын дадал болон гэрийн орчны аюулгүй байдлаа сайжруулах нь өртөлтийг бууруулахад тусална.</p>
          </div>
          <div className="aq-health-tips-grid">
            {prevention.map((item) => (
              <article className="aq-health-tip-card" key={item.title}>
                <div className="aq-health-tip-icon">{item.icon}</div>
                <div><h3>{item.title}</h3><p>{item.text}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="aq-health-section">
          <div className="aq-health-section-heading">
            <h2>5. Агаарын чанарын индексийг хэрхэн ойлгох вэ?</h2>
            <p>Индекс нь тухайн үеийн агаарын бохирдлын түвшинг ойлгож, авах арга хэмжээг сонгоход тусална.</p>
          </div>
          <div className="aq-health-history-card aq-health-aqi-table-card">
            <div className="aq-health-table-wrapper">
              <table>
                <thead><tr><th>Индекс</th><th>Түвшин</th><th>Зөвлөмж</th></tr></thead>
                <tbody>{aqiRows.map(([range, level, advice]) => <tr key={range}><td><strong>{range}</strong></td><td>{level}</td><td>{advice}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
          <p className="aq-health-small-note">Тайлбар: Индексийн ангилал, тооцоолол нь ашиглаж буй системээс хамаарч ялгаатай байж болно. Тухайн платформын тайлбар болон албан ёсны зөвлөмжийг дагана.</p>
        </section>

        <section className="aq-health-section">
          <div className="aq-health-section-heading">
            <h2>6. Найдвартай мэдээллийг хаанаас авах вэ?</h2>
            <p>Агаарын чанар болон эрүүл мэндийн зөвлөмжийг албан ёсны эх сурвалжаас нягтлаарай.</p>
          </div>
          <div className="aq-health-tips-grid aq-health-source-grid">
            <a className="aq-health-tip-card aq-health-source-card" href="https://www.who.int/health-topics/air-pollution" target="_blank" rel="noreferrer"><div className="aq-health-tip-icon">🌐</div><div><h3>Дэлхийн эрүүл мэндийн байгууллага (WHO)</h3><p>Агаарын бохирдлын төрөл, эрүүл мэндэд үзүүлэх нөлөө, агаарын чанарын удирдамж.</p><span>WHO — Агаарын бохирдол ↗</span></div></a>
            <a className="aq-health-tip-card aq-health-source-card" href="https://ubaq.weather.gov.mn/" target="_blank" rel="noreferrer"><div className="aq-health-tip-icon">🌦️</div><div><h3>Цаг уур, орчны шинжилгээний газар</h3><p>Улаанбаатарын агаарын бохирдлын мэдээлэл, урьдчилсан мэдээ, бохирдуулагч бодисын тайлбар.</p><span>Агаарын чанарын мэдээлэл ↗</span></div></a>
            <a className="aq-health-tip-card aq-health-source-card" href="https://www.cdc.gov/wildfires/risk-factors/" target="_blank" rel="noreferrer"><div className="aq-health-tip-icon">🩺</div><div><h3>Өвчний хяналт, сэргийлэлтийн төв (CDC)</h3><p>Утаанд өртөх үеийн шинж тэмдэг, өндөр эрсдэлтэй бүлэг болон хамгаалах арга.</p><span>CDC — Эрүүл мэндийн зөвлөмж ↗</span></div></a>
          </div>
        </section>

        <aside className="aq-health-disclaimer">
          <strong>Эрүүл мэндийн санамж</strong>
          Энэ хуудасны мэдээлэл нь ерөнхий мэдлэг, урьдчилан сэргийлэх зорилготой бөгөөд эмчийн үзлэг,
          оношилгоо, эмчилгээг орлохгүй. Хүнд эсвэл гэнэт илэрсэн шинж тэмдэгтэй бол яаралтай тусламж авна.
        </aside>
      </main>
      <Footer />
    </>
  );
}
