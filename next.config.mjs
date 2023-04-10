// TODO MarkdownDB plugin?

export default {
  eslint: {
    ignoreDuringBuilds: true,
  },
  webpack: (config) => {
    config.infrastructureLogging = {
      level: "error",
    };
    return config;
  },
  async redirects() {
    return [
      {
        source: "/enterprise",
        destination: "/toolkit",
        permanent: true,
      },
    ];
  },
};
