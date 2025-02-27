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
    remotePatterns: [{ hostname: "*" }],
  },
};
