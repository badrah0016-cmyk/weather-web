import {
    getAllGolUsHydrology,
    getGolUsHydrologyById as getGolUsHydrologyByIdService
} from "../services/gol-us-hydrology.service.js";


// =====================================================
// БҮХ ГОЛ УСНЫ МЭДЭЭЛЭЛ
//
// GET
// /weather__db/gol_us_hydrology
// =====================================================

export async function getGolUsHydrology(
    req,
    res
) {

    try {

        const data =
            await getAllGolUsHydrology();

        res.json({

            success: true,

            database: "weather_db",

            table: "gol_us_hydrology",

            count:
                data.length,

            data:
                data

        });

    } catch (error) {

        console.error(
            "❌ Гол усны мэдээлэл авах алдаа:"
        );

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Гол усны мэдээлэл авахад алдаа гарлаа",

            error:
                error.message

        });

    }

}


// =====================================================
// НЭГ ГОЛЫН МЭДЭЭЛЭЛ
//
// GET
// /weather__db/gol_us_hydrology/:id
// =====================================================

export async function getGolUsHydrologyById(
    req,
    res
) {

    try {

        const id =
            req.params.id;


        // =================================================
        // ID ШАЛГАХ
        // =================================================

        if (!id) {

            return res.status(400).json({

                success: false,

                message:
                    "id параметр шаардлагатай"

            });

        }


        // =================================================
        // SERVICE
        // =================================================

        const data =
            await getGolUsHydrologyByIdService(
                id
            );


        // =================================================
        // МЭДЭЭЛЭЛ БАЙХГҮЙ
        // =================================================

        if (data.length === 0) {

            return res.status(404).json({

                success: false,

                message:
                    "Тухайн голын мэдээлэл олдсонгүй",

                id:
                    id

            });

        }


        // =================================================
        // RESPONSE
        // =================================================

        res.json({

            success: true,

            database: "weather_db",

            table: "gol_us_hydrology",

            id:
                id,

            data:
                data[0]

        });

    } catch (error) {

        console.error(
            "❌ Нэг голын мэдээлэл авах алдаа:"
        );

        console.error(error);

        res.status(500).json({

            success: false,

            message:
                "Голын мэдээлэл авахад алдаа гарлаа",

            error:
                error.message

        });

    }

}