import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Check if SSL certificates exist
const sslKeyPath = path.resolve(process.cwd(), 'ssl.key')
const sslCertPath = path.resolve(process.cwd(), 'ssl.crt')
const hasSSL = fs.existsSync(sslKeyPath) && fs.existsSync(sslCertPath)

// HTTPS configuration (only if SSL files exist)
const httpsConfig = hasSSL ? {
  key: fs.readFileSync(sslKeyPath),
  cert: fs.readFileSync(sslCertPath),
} : undefined

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production'
  
  return {
    plugins: [react()],
    // GitHub Pages base path
    base: isProduction ? '/lizenzmanager/' : '/',
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            router: ['react-router-dom'],
            supabase: ['@supabase/supabase-js'],
            oidc: ['oidc-client-ts', 'jose']
          }
        }
      }
    },
    server: {
      ...(httpsConfig && { https: httpsConfig }),
      host: '0.0.0.0', // Erlaubt externe Verbindungen
      port: 5173,
    },
    preview: {
      ...(httpsConfig && { https: httpsConfig }),
      host: '0.0.0.0',
      port: 4173,
    },
  }
})
