import "dotenv/config";
import mariadb from "mariadb";

const holbolt = mariadb.createPool({
    host: "localhost",
    port: 3306,
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "weather__db",
    connectionLimit: 1
});

async function mysqlHolboltShalgah() {
    let holboltShalgah = null;

    try {
        holboltShalgah = await holbolt.getConnection();

        console.log("✅ MySQL холболт амжилттай!");

        const hariu = await holboltShalgah.query(
            "SELECT DATABASE() AS database_name"
        );

        console.log("📦 Database:", hariu[0].database_name);

    } catch (aldaa) {

        console.error("❌ MySQL холболтын алдаа:");
        console.error(aldaa);

    } finally {

        if (holboltShalgah) {
            holboltShalgah.release();
        }

        await holbolt.end();
    }
}

mysqlHolboltShalgah();