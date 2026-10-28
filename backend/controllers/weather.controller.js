import {
    getWeather as getWeatherService
} from "../services/weather.service.js";


// =====================================================
// НЭГТГЭСЭН ЦАГ АГААРЫН МЭДЭЭЛЭЛ
// =====================================================

export async function getWeather(req, res) {

    try {

        const stantsDugaar =
            req.query.stants_dugaar;


        if (!stantsDugaar) {

            return res.status(400).json({

                success: false,

                message:
                    "stants_dugaar параметр шаардлагатай"

            });

        }


        const data =
            await getWeatherService(
                stantsDugaar
            );


        if (!data) {

            return res.status(404).json({

                success: false,

                message:
                    "Тухайн станц олдсонгүй",

                stants_dugaar:
                    stantsDugaar

            });

        }


        res.json({

            success: true,

            database: "weather__db",

            stants_dugaar:
                stantsDugaar,

            data:
                data

        });

    } catch (error) {

        console.error(
            "❌ Нэгтгэсэн цаг агаар авах алдаа:"
        );

        console.error(error);


        res.status(500).json({

            success: false,

            message:
                "Цаг агаарын мэдээлэл авахад алдаа гарлаа",

            error:
                error.message

        });

    }

}