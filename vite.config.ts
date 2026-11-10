import fs from 'fs';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      port: 3000,
      strictPort: true,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
    },
    plugins: [
      react(),
      {
        name: 'html-robots-transform',
        transformIndexHtml(html) {
          const target = env.VITE_APP_TARGET || process.env.VITE_APP_TARGET;
          if (target === 'admin' || target === 'employee') {
            return html.replace(
              /<meta\s+name="robots"\s+content="[^"]*">/i,
              '<meta name="robots" content="noindex, nofollow">'
            );
          }
          return html;
        }
      },
      {
        name: 'generate-subdomain-robots-txt',
        closeBundle() {
          const target = env.VITE_APP_TARGET || process.env.VITE_APP_TARGET;
          if (target === 'admin' || target === 'employee') {
            const outDir = target === 'admin' ? 'dist-admin' : 'dist-employee';
            const robotsPath = path.resolve(__dirname, outDir, 'robots.txt');
            const content = `# Disallow all search engine indexing for internal ${target} portal\nUser-agent: *\nDisallow: /\n`;
            try {
              if (fs.existsSync(path.resolve(__dirname, outDir))) {
                fs.writeFileSync(robotsPath, content, 'utf8');
                console.log(`[Vite] Generated private noindex robots.txt in ${outDir}/robots.txt`);
              }
            } catch (err) {
              console.warn('[Vite] Could not write robots.txt:', err);
            }
          }
        }
      },
      {
        name: 'generate-version-json',
        closeBundle() {
          const target = env.VITE_APP_TARGET || process.env.VITE_APP_TARGET || 'public';
          const outDir = target === 'admin' ? 'dist-admin' : target === 'employee' ? 'dist-employee' : 'dist-public';
          const versionPath = path.resolve(__dirname, outDir, 'version.json');
          const versionData = {
            version: 'v1.0.0',
            buildDate: '2026.11.10',
            buildTime: Date.now()
          };
          try {
            if (fs.existsSync(path.resolve(__dirname, outDir))) {
              fs.writeFileSync(versionPath, JSON.stringify(versionData, null, 2) + '\n', 'utf8');
              console.log(`[Vite] Generated ${outDir}/version.json`);
            }
          } catch (err) {
            console.warn('[Vite] Could not write version.json:', err);
          }
        }
      },
      VitePWA({
        // For admin portal: self-destruct the service worker so old cached JS can't persist.
        // Admins are always online, no need for offline caching.
        selfDestroying: (env.VITE_APP_TARGET || process.env.VITE_APP_TARGET) === 'admin',
        filename: (env.VITE_APP_TARGET || process.env.VITE_APP_TARGET) === 'admin' ? 'sw-v2.js' : 'sw.js',
        registerType: 'autoUpdate',
        devOptions: {
          enabled: false
        },
        includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
        manifest: {
          name: 'HR Security Portal',
          short_name: 'HR Portal',
          description: 'Security Personnel & HR Management System',
          theme_color: '#1e3a8a',
          background_color: '#f3f4f6',
          display: 'standalone',
          scope: '/',
          start_url: '/',
          orientation: 'portrait',
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
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
          skipWaiting: true,
          clientsClaim: true,
          globIgnores: [
            '**/version.json',
            ...((env.VITE_APP_TARGET || process.env.VITE_APP_TARGET) === 'public'
              ? ['**/Admin*.js', '**/admin*.js']
              : [])
          ],
          navigateFallbackDenylist: [
            /^\/version\.json$/,
            /^\/robots\.txt$/,
            /^\/sitemap\.xml$/,
            /^\/llms\.txt$/,
            /^\/google8aaac7081881f131\.html$/,
            /^\/UDF_Brochure\.pdf$/,
            /^\/__\/.*$/
          ],
        }
      })
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: (env.VITE_APP_TARGET || process.env.VITE_APP_TARGET) === 'admin' 
        ? 'dist-admin' 
        : (env.VITE_APP_TARGET || process.env.VITE_APP_TARGET) === 'employee' 
          ? 'dist-employee' 
          : (env.VITE_APP_TARGET || process.env.VITE_APP_TARGET) === 'public'
            ? 'dist-public'
            : 'dist',
      rollupOptions: {
        output: {
          manualChunks: {
            'firebase-core': ['firebase/app', 'firebase/auth'],
            'firebase-services': ['firebase/firestore', 'firebase/storage', 'firebase/functions'],
            'vendor-ui': ['lucide-react'],
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-excel': ['xlsx'],
            'vendor-pdf': ['pdf-lib', 'pdfjs-dist'],
          }
        }
      },
      chunkSizeWarningLimit: 600,
    }
  };
});
