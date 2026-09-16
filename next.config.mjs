import withPWA from 'next-pwa';

/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {},
  experimental: {
    serverActions: {
      bodySizeLimit: "200mb",
    },
    // Cache client-side navigation: pages are reused without a server round-trip
    // for up to 30s (dynamic) or 5min (static) after the first visit
    staleTimes: {
      dynamic: 30,
      static: 300,
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
      {
        protocol: "https",
        hostname: "i.scdn.co",
      },
      {
        protocol: "https",
        hostname: "open.spotify.com",
      },
    ],
  },
};

export default withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development', // Disable in dev, enable in production
  importScripts: ['/sw-push-handler.js'],
  buildExcludes: [/app-build-manifest\.json$/],
  publicExcludes: ['!robots.txt', '!sitemap.xml'],
  /*
   * Le repli hors ligne.
   *
   * L'app etait installable et se declarait PWA, mais aucune regle ne
   * couvrait les navigations : une page demandee sans reseau tombait sur
   * l'erreur du navigateur. /offline est pre-rendue au build, donc mise
   * en cache a l'installation du service worker — elle lit ensuite la
   * bibliotheque et le journal depuis IndexedDB.
   */
  fallbacks: {
    document: '/offline',
  },
  runtimeCaching: [
    {
      /*
       * Les navigations, en reseau d'abord.
       *
       * Trois secondes d'attente maximum : au sous-sol, une requete qui
       * n'aboutit pas met une minute a expirer, et l'app reste blanche
       * tout ce temps alors que la reponse est deja en cache.
       */
      urlPattern: ({ request }) => request.mode === 'navigate',
      handler: 'NetworkFirst',
      options: {
        cacheName: 'pages',
        networkTimeoutSeconds: 3,
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 7, // 7 jours
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      /*
       * L'instantane hors ligne : bibliotheque + journal, en une reponse.
       *
       * La copie en cache sert de secours immediat pendant que le reseau
       * repond — et de seule source quand il ne repond pas.
       */
      urlPattern: /\/api\/offline\/snapshot$/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'offline-snapshot',
        networkTimeoutSeconds: 5,
        expiration: {
          maxEntries: 1,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 jours : mieux vaut vieux que rien
        },
        cacheableResponse: {
          statuses: [200],
        },
      },
    },
    {
      /*
       * Les pochettes servies par Supabase Storage.
       *
       * La regle `supabase-api` ci-dessous les couvrait avec un TTL de
       * cinq minutes : une bibliotheque consultee hors ligne s'affichait
       * sans aucune pochette des le lendemain. Les fichiers du Storage
       * sont immuables, ils meritent leur propre regle.
       */
      urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/v1\/object\/public\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'supabase-storage',
        expiration: {
          maxEntries: 300,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'supabase-api',
        networkTimeoutSeconds: 10,
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 5, // 5 minutes
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/i\.scdn\.co\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'spotify-images',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /^https:\/\/fonts\.(?:gstatic|googleapis)\.com\/.*/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'google-fonts',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:eot|otf|ttc|ttf|woff|woff2|font\.css)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-font-assets',
        expiration: {
          maxEntries: 10,
          maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
        },
      },
    },
    {
      urlPattern: /\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-image-assets',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\/_next\/image\?url=.+$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'next-image',
        expiration: {
          maxEntries: 100,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:js)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-js-assets',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
    {
      urlPattern: /\.(?:css|less)$/i,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'static-style-assets',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
      },
    },
  ],
})(nextConfig);
