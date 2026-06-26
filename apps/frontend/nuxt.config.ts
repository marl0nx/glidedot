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
      '@comark/nuxt'
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