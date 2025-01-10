/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: [
      "thread-stream",
      "pino",
      "pino-worker",
      "pino-file",
      "pino-pretty",
    ],
  },
  transpilePackages: ["geist", "lucide-react"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
        port: "",
        pathname: "/u/**",
      },
    ],
  },
  webpack: (config) => {
    // Add path alias
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": ".",
    };

    return config;
  },
};

export default nextConfig;
