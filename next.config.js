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
      {
        source: "/@:path*",
        destination: "https://my.flowershow.app/@:path*",
        permanent: true,
        has: [
          {
            type: "host",
            value: "flowershow.app",
          },
        ],
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
