import cron from "node-cron";

import {
    runScript,
    getCurrentTime
} from "./scheduler.js";


const TIMEZONE =
    "Asia/Ulaanbaatar";


// =====================================================
// 1. ОДООГИЙН ЦАГ АГААР
// =====================================================
// Цаг тутамд ажиллана
// 00 минут дээр:
// 01:00
// 02:00
// 03:00
// ...

cron.schedule(

    "5 12 * * *",

    async () => {

        const now =
            new Date().toLocaleTimeString(
                "mn-MN",
                {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                    timeZone: TIMEZONE
                }
            );


        console.log(
            `🌡️ ${now} → Одоогийн цаг агаар`
        );


        await runScript(

            "odoogiin-tsag-agaar-hadgalah.js",

            "Одоогийн цаг агаар"

        );

    },

    {
        timezone: TIMEZONE
    }

);


// =====================================================
// 2. 7 ХОНОГИЙН УРЬДЧИЛСАН МЭДЭЭ
// =====================================================
// Өдөр бүр 13:26
//
// Open-Meteo-оос 7 хоногийн мэдээг авч
// uridchilsan_medee хүснэгтэд хадгална.

cron.schedule(

    "5 12 * * *",

    async () => {

        await runScript(

            "uridchilsan-medee-hadgalah.js",

            "7 хоногийн урьдчилсан мэдээ"

        );

    },

    {
        timezone: TIMEZONE
    }

);


// =====================================================
// 3. ЦАГ АГААРЫН СЭРЭМЖЛҮҮЛЭГ
// =====================================================
// Өдөр бүр 13:27

cron.schedule(

    "6 12 * * *",

    async () => {

        await runScript(

            "tsag-agaar-sanuulga-hadgalah.js",

            "Цаг агаарын сэрэмжлүүлэг"

        );

    },

    {
        timezone: TIMEZONE
    }

);


// =====================================================
// 4. ГОЛ УС / ГИДРОЛОГИ
// =====================================================
// Өдөр бүр 13:28

cron.schedule(

    "7 12 * * *",

    async () => {

        await runScript(

            "gol-us-hadgalah.js",

            "Гол усны гидрологи"

        );

    },

    {
        timezone: TIMEZONE
    }

);


// =====================================================
// 5. АГААРЫН ЧАНАР
// =====================================================
// Өдөр бүр 13:29

cron.schedule(

    "8 12 * * *",

    async () => {

        await runScript(

            "agaar-chanar-hadgalah.js",

            "Агаарын чанар"

        );

    },

    {
        timezone: TIMEZONE
    }

);


// =====================================================
// CRON START
// =====================================================

const startTime =
    getCurrentTime();


console.log("");

console.log(
    "################################################"
);

console.log(
    "#                                              #"
);

console.log(
    "#       🟢 WEATHER CRON ЭХЭЛЛЭЭ              #"
);

console.log(
    "#                                              #"
);

console.log(
    "################################################"
);

console.log("");


console.log(
    "🟢 Cron төлөв: АЖИЛЛАЖ БАЙНА"
);

console.log(
    `⏰ Эхэлсэн цаг: ${startTime}`
);

console.log(
    `🌏 Timezone: ${TIMEZONE}`
);

console.log(
    "📅 Давтамж: Цаг тутам + Өдөр бүр"
);

console.log("");


console.log(
    "📋 CRON ХУВААРЬ"
);

console.log(
    "----------------------------------------------"
);


console.log(
    "🌡️ 12:05  → Одоогийн цаг агаар"
);

console.log(
    "🔮 12:06 → 7 хоногийн урьдчилсан мэдээ"
);

console.log(
    "⚠️ 12:07 → Цаг агаарын сэрэмжлүүлэг"
);

console.log(
    "🌊 12:08 → Гол ус / гидрологи"
);

console.log(
    "🌫️ 12:09 → Агаарын чанар"
);


console.log(
    "----------------------------------------------"
);

console.log("");


console.log(
    "📌 Одоогийн цаг агаар: ЦАГ ТУТам"
);

console.log(
    "📌 Бусад мэдээлэл: ӨДӨР БҮР"
);

console.log("");


console.log(
    "✅ Бүх Cron job амжилттай бүртгэгдлээ."
);

console.log(
    "⏳ Товлосон цагийг хүлээж байна..."
);

console.log("");