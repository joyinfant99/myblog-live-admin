import type { MetadataRoute } from 'next';

// Makes the admin installable: "Add to Home Screen" on iPhone, "Install app" on Android and desktop Chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Joy Infant Admin',
    short_name: 'Admin',
    description: 'Posts, releases, private notes and a status dashboard for my apps.',
    id: '/',
    start_url: '/dashboard',
    scope: '/',
    display: 'standalone',
    background_color: '#191918',
    theme_color: '#191918',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    // Long-press the home-screen icon (Android) for these.
    shortcuts: [
      { name: 'Dashboard', short_name: 'Dashboard', url: '/dashboard', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'New note', short_name: 'Note', url: '/notes/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
      { name: 'New post', short_name: 'Post', url: '/posts/new', icons: [{ src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }] },
    ],
  } as MetadataRoute.Manifest;
}
