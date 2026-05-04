/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["xml2js", "axios"],
  },
};

export default nextConfig;
