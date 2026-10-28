import {
    getLocations
} from "../../services/api/locations.service.js";

export async function getLocationsController(req, res) {

    try {

        const {
            aimag
        } = req.query;

        const data =
            await getLocations(aimag);

        return res.status(200).json({

            success: true,

            count: data.length,

            data: data

        });

    } catch (error) {

        console.error(
            "❌ Байршлын мэдээлэл авах алдаа:"
        );

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Байршлын мэдээлэл авахад алдаа гарлаа",

            error:
                error.message

        });

    }

}