import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { mercurDashboardPlugin } from '@mercurjs/dashboard-sdk'
import path from 'path'

export default defineConfig({
  base: '/dashboard/',
  plugins: [
    react(),
    mercurDashboardPlugin({
      medusaConfigPath: '../../apps/api/medusa-config.ts',
      name: 'בוקשוק - ניהול',
      logo: '/bookshook-logo.png',
    }),
  ],
  resolve: {
    alias: [
      {
        find: '@mercurjs/admin/index.css',
        replacement: path.resolve(__dirname, '../../packages/admin/src/index.css'),
      },
      {
        find: '@mercurjs/admin',
        replacement: path.resolve(__dirname, '../../packages/admin/src/index.ts'),
      },
      // packages/admin internal path aliases (from packages/admin/tsconfig.json)
      { find: '@components', replacement: path.resolve(__dirname, '../../packages/admin/src/components') },
      { find: '@hooks', replacement: path.resolve(__dirname, '../../packages/admin/src/hooks') },
      { find: '@lib', replacement: path.resolve(__dirname, '../../packages/admin/src/lib') },
      { find: '@pages', replacement: path.resolve(__dirname, '../../packages/admin/src/pages') },
      { find: '@providers', replacement: path.resolve(__dirname, '../../packages/admin/src/providers') },
      { find: '@assets', replacement: path.resolve(__dirname, '../../packages/admin/src/assets') },
      { find: /^@\/(.*)/, replacement: path.resolve(__dirname, '../../packages/admin/src/$1') },
    ],
  },
})
