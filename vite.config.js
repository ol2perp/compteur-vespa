import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: process.env.GITHUB_PAGES ? '/compteur-vespa/' : '/',
  build: { target: 'es2020' },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['compteur.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Compteur Vespa',
        short_name: 'Compteur',
        start_url: '.',
        display: 'fullscreen',
        orientation: 'landscape',
        background_color: '#5a6b78',
        theme_color: '#5a6b78',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        maximumFileSizeToCacheInBytes: 5242880,
      },
    }),
  ],
})
