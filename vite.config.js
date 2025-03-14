import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'Wandeldagboek',
        short_name: 'Wandeldagboek',
        description: 'Een PWA voor het vastleggen van wandelingen en natuurobservaties',
        theme_color: '#2563eb',
        background_color: '#f3f4f6',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  server: {
    hmr: {
      overlay: true, // Toon HMR-fouten als overlay in de browser
    },
    watch: {
      usePolling: false, // Zet op true als bestandswijzigingen niet worden gedetecteerd
    },
    open: true, // Open automatisch de browser bij het starten van de server
  },
  build: {
    sourcemap: true, // Genereer sourcemaps voor debugging
    minify: 'terser', // Gebruik terser voor betere minificatie
    target: 'esnext', // Moderne browsers
    chunkSizeWarningLimit: 800, // Verhoog de waarschuwingslimiet voor chunk grootte
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'],
          'vendor-map': ['leaflet'],
          'vendor-ui': ['react-icons'],
          // Feature chunks
          'feature-auth': [
            './src/context/AuthContext.jsx',
            './src/pages/LoginPage.jsx',
            './src/pages/RegisterPage.jsx'
          ],
          'feature-walks': [
            './src/pages/WalksPage.jsx',
            './src/components/WalkCard.jsx'
          ],
          'feature-active-walk': [
            './src/pages/ActiveWalkPage.jsx',
            './src/pages/WalkSummaryPage.jsx'
          ]
        }
      }
    }
  }
})
