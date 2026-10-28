import "dotenv/config";


// ==========================================
// APPLICATION CONFIGURATION
// ==========================================

const config = {

    // =========================
    // SERVER
    // =========================

    server: {

        port:
            Number(
                process.env.PORT
            ) || 4000

    },


    // =========================
    // FRONTEND
    // =========================

    frontend: {

        url:
            process.env.FRONTEND_URL ||
            "http://localhost:3100"

    },


    // =========================
    // CORS
    // =========================

    cors: {

        origin:
            process.env.FRONTEND_URL ||
            "http://localhost:3100",

        methods: [

            "GET",

            "POST",

            "PUT",

            "PATCH",

            "DELETE",

            "OPTIONS"

        ],

        allowedHeaders: [

            "Content-Type",

            "Authorization"

        ]

    },


    // =========================
    // DATABASE
    // =========================

    database: {

        name:
            process.env.DB_NAME ||
            "weather_db",

        host:
            process.env.DB_HOST ||
            "localhost",

        port:
            Number(
                process.env.DB_PORT
            ) || 3306,

        user:
            process.env.DB_USER ||
            "root"

    }

};


// ==========================================
// EXPORT
// ==========================================

export default config;