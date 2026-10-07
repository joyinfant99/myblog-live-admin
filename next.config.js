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
  async redirects() {
    return [{ source: '/', destination: '/dashboard', permanent: false }];
  },
};
