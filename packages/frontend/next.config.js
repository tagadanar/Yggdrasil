/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@yggdrasil/shared-utilities'],
  env: {
    AUTH_SERVICE_URL: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
  },
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      {
        source: '/api/auth/:path*',
        destination: `${process.env.AUTH_SERVICE_URL || 'http://localhost:3001'}/api/auth/:path*`,
      },
      {
        source: '/api/users/:path*',
        destination: `${process.env.USER_SERVICE_URL || 'http://localhost:3002'}/api/users/:path*`,
      },
      {
        source: '/api/news/:path*',
        destination: `${process.env.NEWS_SERVICE_URL || 'http://localhost:3003'}/api/news/:path*`,
      },
      {
        source: '/api/courses/:path*',
        destination: `${process.env.COURSE_SERVICE_URL || 'http://localhost:3004'}/api/courses/:path*`,
      },
      {
        source: '/api/planning/:path*',
        destination: `${process.env.PLANNING_SERVICE_URL || 'http://localhost:3005'}/api/planning/:path*`,
      },
      {
        source: '/api/statistics/:path*',
        destination: `${process.env.STATISTICS_SERVICE_URL || 'http://localhost:3006'}/api/statistics/:path*`,
      },
    ];
  },
}

module.exports = nextConfig;