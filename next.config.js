/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // A real server-side redirect (with a Location header) for the root, instead of a page that redirects with scripts.
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }];
  },
};
