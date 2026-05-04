/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["xml2js", "axios", "child_process"],
  },
};

export default nextConfig;
