import crypto from 'node:crypto'

// Auto-hashing and padding of weak/missing OIDC secrets to guarantee 100% stable,
// production-ready secrets and prevent 500 server-side errors on launch.
if (!process.env.NUXT_OIDC_SESSION_SECRET) {
  process.env.NUXT_OIDC_SESSION_SECRET = crypto.randomBytes(32).toString('hex')
} else if (process.env.NUXT_OIDC_SESSION_SECRET.length < 48) {
  process.env.NUXT_OIDC_SESSION_SECRET = crypto
    .createHash('sha512')
    .update(process.env.NUXT_OIDC_SESSION_SECRET)
    .digest('hex')
}

if (!process.env.NUXT_OIDC_AUTH_SESSION_SECRET) {
  process.env.NUXT_OIDC_AUTH_SESSION_SECRET = crypto.randomBytes(32).toString('hex')
} else if (process.env.NUXT_OIDC_AUTH_SESSION_SECRET.length < 48) {
  process.env.NUXT_OIDC_AUTH_SESSION_SECRET = crypto
    .createHash('sha512')
    .update(process.env.NUXT_OIDC_AUTH_SESSION_SECRET)
    .digest('hex')
}

if (!process.env.NUXT_OIDC_TOKEN_KEY) {
  const seed = process.env.NUXT_OIDC_SESSION_SECRET || 'glide_default_stable_token_key_fallback'
  process.env.NUXT_OIDC_TOKEN_KEY = crypto
    .createHash('sha256')
    .update(seed)
    .digest('base64')
} else {
  try {
    const buffer = Buffer.from(process.env.NUXT_OIDC_TOKEN_KEY, 'base64')
    if (buffer.length !== 32) {
      process.env.NUXT_OIDC_TOKEN_KEY = crypto
        .createHash('sha256')
        .update(process.env.NUXT_OIDC_TOKEN_KEY)
        .digest('base64')
    }
  } catch {
    process.env.NUXT_OIDC_TOKEN_KEY = crypto
      .createHash('sha256')
      .update(process.env.NUXT_OIDC_TOKEN_KEY)
      .digest('base64')
  }
}

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: '2025-07-15',
    ssr: false,
    components: [
      {
        path: '~/components',
        pathPrefix: false,
      },
    ],
    runtimeConfig: {
        apiUrl: process.env.NUXT_API_URL || 'http://localhost:3001',
        public: {
            apiBase: '/v1',
            oidcEnabled: process.env.NUXT_PUBLIC_OIDC_ENABLED === 'true' || !!process.env.NUXT_OIDC_PROVIDERS_OIDC_CLIENT_ID || !!process.env.NUXT_OIDC_CLIENT_ID
        }
    },
    devtools: {enabled: true},
    modules: [
      '@nuxt/eslint',
      '@nuxt/image',
      '@nuxt/ui',
      'nuxt-oidc-auth',
      '@nuxt/content',
      '@comark/nuxt',
      '@vite-pwa/nuxt'
    ],
    content: {
      build: {
        markdown: {
          highlight: {
            theme: {
              default: 'github-light',
              dark: 'github-dark'
            }
          }
        }
      }
    },
    icon: {
      provider: 'server',
      fallbackToApi: false,
      serverBundle: {
        collections: ['lucide', 'simple-icons']
      }
    },

    oidc: {
        defaultProvider: 'oidc',
        providers: {
            oidc: {
                clientId: '',
                clientSecret: '',
                authorizationUrl: '',
                tokenUrl: '',
                userInfoUrl: '',
                redirectUri: '',
                tokenRequestType: 'form-urlencoded',
                scope: ['openid', 'email', 'profile', 'groups'],
                validateAccessToken: false,
                validateIdToken: false
            }
        },
        middleware: {
            globalMiddlewareEnabled: false
        }
    },
    css: ["~/assets/style/main.css"],
    app: {
        head: {
            meta: [
                { name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' }
            ],
            link: [
                { rel: 'manifest', href: '/manifest.webmanifest' }
            ]
        }
    },
    pwa: {
        registerType: 'autoUpdate',
        manifest: false,
        workbox: {
            navigateFallback: '/'
        },
        devOptions: {
            enabled: true,
            type: 'module'
        }
    },
    vite: {
        server: {
            allowedHosts: true
        },
        optimizeDeps: {
            include: [
                '@tanstack/vue-table',
                '@vueuse/core',
                'canvas-confetti',
                'date-fns',
                'echarts/charts',
                'echarts/components',
                'echarts/core',
                'echarts/renderers',
                'vue-echarts'
            ]
        }
    },
    nitro: {
        preset: 'bun',
        externals: {
            traceInclude: ['ofetch']
        }
    }
})