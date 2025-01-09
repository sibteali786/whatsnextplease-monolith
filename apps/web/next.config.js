/** @type {import('next').NextConfig} */
const nextConfig = {
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
  webpack: (config, {isServer}) => {
    if (isServer) {
      // Exclude 'thread-stream' from server bundle
      config.externals.push({
        "thread-stream": "commonjs thread-stream",
      });
    }
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": ".",
    };
    return config;
  },
};

export default nextConfig;
