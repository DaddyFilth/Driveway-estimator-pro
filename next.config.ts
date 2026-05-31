import type { NextConfig } from 'next';
 
const nextConfig: NextConfig = {
  async rewrites() {
    return {
      fallback: [
        {
          source: '/:path*',
          destination: 'https://my-legacy-site.com/:path*',
        },
      ],
    };
  },
};
 
export default nextConfig;
