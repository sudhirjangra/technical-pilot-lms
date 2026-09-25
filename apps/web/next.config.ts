import { NextConfig } from 'next';

const publicApiUrl = process.env.NEXT_PUBLIC_API_URL;

const nextConfig = {
  reactStrictMode: false,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'www.google.com',
      },
      {
        protocol: 'https',
        hostname: 'googleusercontent.com',
      },
    ],
  },
  experimental: {
    authInterrupts: true,
    serverActions: {
      bodySizeLimit: '30mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://player.vdocipher.com https://checkout.razorpay.com https://*.razorpay.com https://razorpay.com https://*.rzp.io https://cdn.razorpay.com https://www.google.com https://www.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "worker-src 'self' blob:",
              "img-src 'self' data: blob: https: https://*.razorpay.com https://*.rzp.io https://cdn.razorpay.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              `connect-src 'self' https://api.razorpay.com https://*.razorpay.com https://razorpay.com https://*.rzp.io https://lumberjack.razorpay.com https://lumberjack-cx.razorpay.com https://*.vdocipher.com https://*.s3.amazonaws.com https://*.s3.ap-southeast-1.amazonaws.com https://*.s3-accelerate.amazonaws.com https://*.supabase.co https://*.google.com https://www.google.com https://technical-pilot-lms.onrender.com${publicApiUrl ? ` ${new URL(publicApiUrl).origin}` : ''}`,
              "frame-src 'self' https: data: blob:",
            ].join('; '),
          },
        ],
      },
    ];
  },
} satisfies NextConfig;

export default nextConfig;
