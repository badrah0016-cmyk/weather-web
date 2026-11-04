
import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
    // Turbopack-ийн үндсэн хавтас
    turbopack: {
        root: path.resolve(process.cwd()),
    },

    // Frontend-ийн API хүсэлтийг backend рүү дамжуулах
    async rewrites() {
        return [
            {
                source: "/backend/:path*",
                destination: `${process.env.BACKEND_URL || "http://localhost:4000"}/:path*`,
            },
        ];
    },
};

export default nextConfig;
