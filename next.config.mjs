/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // The 'eslint' key has been REMOVED as it's no longer supported in Next.js 16.
  // To ignore ESLint errors during builds, use the --no-lint flag with your build command.
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  },
  // Add this empty turbopack config
  turbopack: {},

  webpack: (config, { isServer }) => {
    // Fix for pino-pretty and other Node.js modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
        stream: false,
        url: false,
        zlib: false,
        http: false,
        https: false,
        assert: false,
        os: false,
        path: false,
        'pino-pretty': false,
      }
    }

    // Ignore warnings about these modules
    config.externals = config.externals || [];
    config.externals.push('pino-pretty', 'lokijs', 'encoding')

    return config
  },
}

export default nextConfig