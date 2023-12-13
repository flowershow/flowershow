export default {
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.infrastructureLogging = {
      level: "error",
    };
    // config.optimization.minimize = false;
    return config;
  },
};
