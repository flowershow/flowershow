/**
 * @type {import('next').NextConfig}
 */
module.exports = {
  async redirects() {
    return [
      {
        source: "/enterprise",
        destination: "/portal",
        permanent: true,
      },
    ];
  },
  experimental: {
    serverActions: {
      allowedOrigins: ["cloud.localhost:3000"],
    },
  },
  images: {
    remotePatterns: [
      { hostname: "*.datahub.io" },
      { hostname: "*.flowershow.app" },
      { hostname: "localhost" },
    ],
  },
};
