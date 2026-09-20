import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { chatProxyPlugin } from './server/chatProxy.ts'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const ai = {
    apiKey: env.AI_API_KEY ?? '',
    baseUrl: env.AI_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4',
    model: env.AI_MODEL ?? 'glm-4-flash',
  }

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
        manifest: {
          name: 'FitCoach',
          short_name: 'FitCoach',
          description: '你的私人健身教练 · 移动端优先的健身 PWA',
          lang: 'zh-CN',
          theme_color: '#10b981',
          background_color: '#f8fafc',
          display: 'standalone',
          orientation: 'portrait',
          start_url: '/',
          scope: '/',
          icons: [
            { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
            {
              src: 'icons/icon-maskable-512.png',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,png,svg,ico,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /\.(?:wasm|task)$/,
              handler: 'CacheFirst',
              options: {
                cacheName: 'fitcoach-models',
                expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 30 },
              },
            },
          ],
        },
      }),
      chatProxyPlugin(ai),
    ],
  }
})
