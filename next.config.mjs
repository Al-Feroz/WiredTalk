/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        domains: [process.env.SERVER_ORIGIN]
    }
};

export default nextConfig;
