import {
    getUzuulelt
} from "../../services/api/uzuulelt.service.js";


export async function getUzuuleltController(
    req,
    res
) {

    try {

        // ==============================
        // QUERY PARAMETER
        // ==============================

        const {
            station,
            period = "7"
        } = req.query;


        // ==============================
        // STATION ШАЛГАХ
        // ==============================

        if (!station) {

            return res.status(400).json({

                success: false,

                message:
                    "station параметр шаардлагатай"

            });
        }


        // ==============================
        // STATION ЗӨВХӨН ТОО
        // ==============================

        if (!/^\d+$/.test(station)) {

            return res.status(400).json({

                success: false,

                message:
                    "station нь зөвхөн тоо байна"

            });
        }


        // ==============================
        // PERIOD ШАЛГАХ
        // ==============================

        if (
            period !== "today" &&
            period !== "7" &&
            period !== "month"
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "period нь today, 7 эсвэл month байна"

            });
        }


        // ==============================
        // STATION NUMBER
        // ==============================

        const stationNumber =
            Number(station);


        // ==============================
        // SERVICE ДУУДАХ
        // ==============================

        const data =
            await getUzuulelt(
                stationNumber,
                period
            );


        // ==============================
        // DATA БАЙХГҮЙ
        // ==============================

        if (!data) {

            return res.status(404).json({

                success: false,

                message:
                    "Тухайн хугацаанд мэдээлэл олдсонгүй"

            });
        }


        // ==============================
        // RESPONSE
        // ==============================

        return res.status(200).json({

            success: true,

            station:
                stationNumber,

            period:
                period,

            data:
                data

        });


    } catch (error) {

        console.error(
            "❌ Үзүүлэлт авах алдаа:"
        );

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Үзүүлэлт авахад алдаа гарлаа",

            error:
                error.message

        });
    }
}