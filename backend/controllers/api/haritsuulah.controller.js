import {
    haritsuulahTsagAgaar
} from "../../services/api/haritsuulah.service.js";


export async function haritsuulahController(req, res) {

    try {

        const {
            stations
        } = req.query;


        // ==========================================
        // stations байгаа эсэх
        // ==========================================

        if (!stations) {

            return res.status(400).json({

                success: false,

                message:
                    "stations параметр шаардлагатай. Жишээ: ?stations=549,610"

            });

        }


        // ==========================================
        // СТАНЦЫН ДУГААРУУДЫГ ЗАДЛАХ
        // ==========================================

        const stationList =
            stations
                .split(",")
                .map(id => id.trim())
                .filter(id => id !== "");


        // ==========================================
        // 2–3 СТАНЦ ШАЛГАХ
        // ==========================================

        if (
            stationList.length < 2 ||
            stationList.length > 3
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "2 эсвэл 3 станц сонгоно уу"

            });

        }


        // ==========================================
        // ЗӨВХӨН ТОО ЭСЭХ
        // ==========================================

        const buruuStation =
            stationList.some(
                id => !/^\d+$/.test(id)
            );


        if (buruuStation) {

            return res.status(400).json({

                success: false,

                message:
                    "Станцын дугаар зөвхөн тоо байна"

            });

        }


        // ==========================================
        // STRING → NUMBER
        // ==========================================

        const stationNumbers =
            stationList.map(
                id => Number(id)
            );


        // ==========================================
        // DATABASE-ЭЭС МЭДЭЭЛЭЛ АВАХ
        // ==========================================

        const data =
            await haritsuulahTsagAgaar(
                stationNumbers
            );


        // ==========================================
        // ХАРИУ
        // ==========================================

        return res.status(200).json({

            success: true,

            count: data.length,

            stations: stationNumbers,

            data: data

        });


    } catch (error) {

        console.error(
            "❌ Цаг агаар харьцуулах алдаа:"
        );

        console.error(error);


        return res.status(500).json({

            success: false,

            message:
                "Цаг агаар харьцуулахад алдаа гарлаа",

            error:
                error.message

        });

    }

}