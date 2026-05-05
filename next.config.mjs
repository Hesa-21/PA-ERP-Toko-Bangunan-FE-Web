/** @type {import('next').NextConfig} */
const nextConfig = {
  // eslint config removed from next.config.mjs: Next.js 16+ no longer supports
  // the `eslint` option here. Use an .eslintrc.* configuration file and the
  // `next lint` script. If you intentionally want to skip linting in CI/CI
  // (not recommended), call `next lint --no-error-on-unmatched-pattern`
  // or adjust your workflow instead.
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  async redirects() {
    return [
      {
        source: "/sign-in",
        destination: "/auth/sign-in",
        permanent: true,
      },
    ];
  },
}

export default nextConfig
