import {
    searchLocations
} from "../../services/api/search.service.js";

export async function searchLocationsController(req, res) {

    try {

        const {
            q
        } = req.query;

        if (!q || q.trim() === "") {

            return res.status(400).json({

                success: false,

                message:
                    "Хайх утгаа q параметрээр оруулна уу"

            });

        }

        const keyword = q.trim();

        const data =
            await searchLocations(keyword);

        return res.status(200).json({

            success: true,

            count: data.length,

            keyword: keyword,

            data: data

        });

    } catch (error) {

        console.error(
            "❌ Хайлт хийх алдаа:"
        );

        console.error(error);

        return res.status(500).json({

            success: false,

            message:
                "Хайлт хийхэд алдаа гарлаа",

            error:
                error.message

        });

    }

}