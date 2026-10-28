import axios from "axios";

const WEATHER_API_URL = process.env.WEATHER_API_URL;
const WEATHER_API_KEY = process.env.WEATHER_API_KEY;


// =====================================
// Станцууд авах
// =====================================
export async function getStations() {

    const response = await axios.get(
        `${WEATHER_API_URL}/weather/stations`,
        {
            headers: {
                "X-API-Key": WEATHER_API_KEY
            }
        }
    );

    return response.data;
}


// =====================================
// Weather Summary авах
// =====================================
export async function getWeatherSummary(stationId) {

    const response = await axios.get(
        `${WEATHER_API_URL}/weather/summary`,
        {
            params: {
                station: stationId
            },
            headers: {
                "X-API-Key": WEATHER_API_KEY
            }
        }
    );

    return response.data;
}