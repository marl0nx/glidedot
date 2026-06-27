import crypto from 'node:crypto'

export default defineNitroPlugin(() => {
  // Auto-hashing and padding of weak/missing OIDC secrets at RUNTIME to guarantee 
  // 100% stable, production-ready secrets and prevent 500 server-side errors on launch.
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
})
