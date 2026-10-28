import {
    getAllStantsuud,
    getStantsuudById as getStantsuudByIdService
} from "../services/stantsuud.service.js";


// =====================================================
// БҮХ СТАНЦ АВАХ
// GET /weather__db/stantsuud
// =====================================================

export async function getStantsuud(req, res) {
    try {
        const data = await getAllStantsuud();

        return res.status(200).json({
            success: true,
            count: data.length,
            data: data
        });

    } catch (error) {
        console.error("❌ Бүх станц авах алдаа:");
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Станцуудын мэдээлэл авахад алдаа гарлаа",
            error: error.message
        });
    }
}


// =====================================================
// НЭГ СТАНЦ АВАХ
// GET /weather__db/stantsuud/:stants_dugaar
// =====================================================

export async function getStantsuudById(req, res) {
    try {
        const { stants_dugaar } = req.params;


        // =================================================
        // VALIDATION
        // =================================================

        if (!stants_dugaar) {
            return res.status(400).json({
                success: false,
                message: "stants_dugaar шаардлагатай"
            });
        }


        // =================================================
        // SERVICE ДУУДАХ
        // =================================================

        const data =
            await getStantsuudByIdService(
                stants_dugaar
            );


        // =================================================
        // СТАНЦ ОЛДСОН ЭСЭХ
        // =================================================

        if (!data || data.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Тухайн станц олдсонгүй",
                stants_dugaar: stants_dugaar
            });
        }


        // =================================================
        // RESPONSE
        // =================================================

        return res.status(200).json({
            success: true,
            data: data[0]
        });

    } catch (error) {
        console.error("❌ Нэг станц авах алдаа:");
        console.error(error);

        return res.status(500).json({
            success: false,
            message: "Станцын мэдээлэл авахад алдаа гарлаа",
            error: error.message
        });
    }
}

