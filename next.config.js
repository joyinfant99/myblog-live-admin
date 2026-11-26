/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  images: { unoptimized: true },
  // A real server-side redirect (with a Location header) for the root, instead of a page that redirects with scripts.
  // The service worker (and its offline page) must always be re-checked, or a fix could take hours to reach phones.
  async headers() {
    return [
      { source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
      { source: '/offline.html', headers: [{ key: 'Cache-Control', value: 'public, max-age=0, must-revalidate' }] },
    ];
  },
  // The Home Cinema app lives on the homelab behind the blog API. This keeps its address on admin.joyinfant.com (the browser never
  // sees blog-api). Access is checked by the API with the cookie that /admin/cinema/session sets for joyinfant.com.
  async rewrites() {
    const api = (process.env.NEXT_PUBLIC_API_URL || 'https://blog-api.joyinfant.com').replace(/\/$/, '');
    return [
      { source: '/cinema', destination: `${api}/cinema` },
      { source: '/cinema/:path*', destination: `${api}/cinema/:path*` },
    ];
  },
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }];
  },
};
