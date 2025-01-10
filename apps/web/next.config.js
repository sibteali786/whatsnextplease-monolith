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
	webpack: (config, { isServer }) => {
	  if (isServer) {
		// Handle server-side modules
		config.externals = [...config.externals, 
		  'thread-stream'
		];
	  }
	  
	  // Add path alias
	  config.resolve.alias = {
		...config.resolve.alias,
		'@': '.',
	  };
  
	  return config;
	},
  };
  
  export default nextConfig;