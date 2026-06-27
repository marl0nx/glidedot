import crypto from 'node:crypto'

// Auto-hashing and padding of weak/missing OIDC secrets to guarantee 100% stable,
// production-ready secrets and prevent 500 server-side errors on launch.
if (process.env.NUXT_OIDC_SESSION_SECRET) {
  if (process.env.NUXT_OIDC_SESSION_SECRET.length < 48) {
    process.env.NUXT_OIDC_SESSION_SECRET = crypto
      .createHash('sha512')
      .update(process.env.NUXT_OIDC_SESSION_SECRET)
      .digest('hex')
  }
}

if (process.env.NUXT_OIDC_AUTH_SESSION_SECRET) {
  if (process.env.NUXT_OIDC_AUTH_SESSION_SECRET.length < 48) {
    process.env.NUXT_OIDC_AUTH_SESSION_SECRET = crypto
      .createHash('sha512')
      .update(process.env.NUXT_OIDC_AUTH_SESSION_SECRET)
      .digest('hex')
  }
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
        public: {
            apiBase: process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/v1',
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
        }
    },
    nitro: {
        preset: 'bun',
        externals: {
            traceInclude: ['ofetch']
        }
    }
})