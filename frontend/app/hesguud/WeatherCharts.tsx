
"use client";

import "./WeatherCharts.css";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

// Түр турших өгөгдөл.
// Дараагийн алхамд backend API-тай холбоно.
const sampleData = [
  { time: "06:00", temperature: -5, precipitation: 0, wind: 3 },
  { time: "09:00", temperature: -2, precipitation: 0.2, wind: 4 },
  { time: "12:00", temperature: 3, precipitation: 0, wind: 5 },
  { time: "15:00", temperature: 5, precipitation: 1.2, wind: 7 },
  { time: "18:00", temperature: 1, precipitation: 0.4, wind: 4 },
  { time: "21:00", temperature: -3, precipitation: 0, wind: 2 },
];

export default function WeatherCharts() {
  return (
    <section className="weather-charts">
      <div className="weather-charts__heading">
        <h2>Цаг агаарын үзүүлэлтүүд</h2>
        <p>Температур, хур тунадас, салхины өөрчлөлт</p>
      </div>

      <div className="weather-charts__grid">
        <article className="weather-chart-card">
          <h3>Температур (°C)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis unit="°C" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="temperature"
                name="Температур"
                stroke="#2563eb"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>

        <article className="weather-chart-card">
          <h3>Хур тунадас (мм)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis unit=" мм" />
              <Tooltip />
              <Bar
                dataKey="precipitation"
                name="Хур тунадас"
                fill="#0891b2"
                radius={[5, 5, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </article>

        <article className="weather-chart-card weather-chart-card--wide">
          <h3>Салхины хурд (м/с)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={sampleData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis unit=" м/с" />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="wind"
                name="Салхины хурд"
                stroke="#16a34a"
                strokeWidth={3}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </article>
      </div>
    </section>
  );
}
