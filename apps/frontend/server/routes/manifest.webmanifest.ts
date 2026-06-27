import { defineEventHandler, setHeader } from 'h3'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const apiBase = config.public.apiBase || process.env.NUXT_PUBLIC_API_BASE || 'http://localhost:3001/v1'
  
  let logoUrlMinimal = '/icon.svg' // Default fallback
  
  try {
    // Fetch public settings from backend API
    const settings = await $fetch<Record<string, string>>(`${apiBase}/admin/settings/public`)
    if (settings && settings.logoUrlMinimal) {
      logoUrlMinimal = settings.logoUrlMinimal
    } else if (settings && settings.logoUrl) {
      logoUrlMinimal = settings.logoUrl
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
