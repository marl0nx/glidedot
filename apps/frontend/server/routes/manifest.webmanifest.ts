import { defineEventHandler, setHeader } from 'h3'
import { joinURL } from 'ufo'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  let logoUrlMinimal = '/icon.svg' // Default fallback

  try {
    const settings = await $fetch<Record<string, string>>(joinURL(config.apiUrl, '/v1/admin/settings/public'))
    if (settings) {
      const minimal = settings.logoUrlMinimal?.trim()
      const main = settings.logoUrl?.trim()
      if (minimal && minimal !== '') {
        logoUrlMinimal = minimal
      } else if (main && main !== '') {
        logoUrlMinimal = main
      }
    }
  } catch (e) {
    console.error('Failed to fetch settings for dynamic manifest:', e)
  }

  // Set the response header to manifest content-type
  setHeader(event, 'content-type', 'application/manifest+json')
  setHeader(event, 'cache-control', 'public, max-age=60')

  return {
    name: 'glide.',
    short_name: 'glide.',
    description: 'Automated localization and translation platform.',
    theme_color: '#0a0a0a',
    background_color: '#0a0a0a',
    display: 'standalone',
    orientation: 'portrait',
    scope: '/',
    start_url: '/',
    icons: [
      {
        src: logoUrlMinimal,
        sizes: '192x192 512x512',
        type: logoUrlMinimal.endsWith('.svg') ? 'image/svg+xml' : 'image/png',
        purpose: 'any maskable'
      }
    ]
  }
})
