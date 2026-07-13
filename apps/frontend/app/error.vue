<script setup lang="ts">
import { ref, computed } from 'vue'
import type { NuxtError } from '#app'

const props = defineProps({
  error: {
    type: Object as () => NuxtError,
    default: () => ({}) as NuxtError
  }
})

const showRaw = ref(false)

const handleError = () => clearError({ redirect: '/' })

const { settings, loadSettings } = useSettings()
await loadSettings()

useHead({
  title: `${props.error?.statusCode || 500} - ${props.error?.statusMessage || 'Error'}`
})

if (import.meta.server) {
  const event = useRequestEvent()
  if (event && props.error?.statusCode) {
    setResponseStatus(event, props.error.statusCode, props.error.statusMessage)
  }
}

// Automatically mask sensitive data such as API keys, secrets, or hexadecimal/base64 keys
const maskSensitiveData = (str: string | undefined | null) => {
  if (!str) return ''
  // Mask 32-64 character HEX strings (potential encryption keys/secrets)
  let masked = str.replace(/\b[0-9a-fA-F]{32,64}\b/g, '[REDACTED_HEX_KEY]')
  
  // Mask 40+ character Base64 keys (potential tokens/token keys)
  masked = masked.replace(/\b[A-Za-z0-9+/]{40,}=*\b/g, '[REDACTED_BASE64_KEY]')

  // Mask sensitive key-value pairs (passwords, secrets, tokens)
  masked = masked.replace(/(password|secret|token|key|private|auth|pass|auth_key|session_secret)\s*[:=]\s*["']?[^"'\s,]+["']?/gi, (match, p1) => {
    return `${p1}: [REDACTED_SENSITIVE_INFO]`
  })

  return masked
}

// Dynamic safe troubleshooting generator
const troubleshooting = computed(() => {
  const code = props.error?.statusCode || 500
  const msg = (props.error?.message || '').toLowerCase()
  const statusMsg = (props.error?.statusMessage || '').toLowerCase()

  // OIDC Errors
  if (msg.includes('oidc') || msg.includes('oauth') || msg.includes('provider') || statusMsg.includes('oidc') || statusMsg.includes('oauth')) {
    return {
      title: 'OIDC / Authentication Issue',
      description: 'There was a problem authenticating via OpenID Connect (OIDC). This usually happens due to misconfigured environment variables or redirect URIs.',
      steps: [
        'Ensure that NUXT_OIDC_SESSION_SECRET and NUXT_OIDC_AUTH_SESSION_SECRET are set and are at least 48 characters long.',
        'Ensure NUXT_OIDC_TOKEN_KEY is set to a valid base64-encoded 256-bit AES key.',
        'Verify that your Redirect URI exactly matches the one registered with your Identity Provider (including http/https and exact paths).',
        'Check that the Client ID and Client Secret are configured correctly.'
      ]
    }
  }

  // Network / Fetch / API base Errors
  if (msg.includes('fetch') || msg.includes('connect') || msg.includes('network') || msg.includes('api') || code === 502 || code === 504) {
    return {
      title: 'API Connection Error',
      description: 'The frontend application could not communicate with the backend API service.',
      steps: [
        'Verify that the backend container (glide-backend) is running and healthy.',
        'Ensure NUXT_PUBLIC_API_BASE is set to the correct URL and is fully accessible from your web browser.',
        'Check for any firewall, CORS, or reverse proxy settings (e.g., Nginx, Traefik) blocking communication.'
      ]
    }
  }

  // Database / Migration Issues
  if (msg.includes('db') || msg.includes('sqlite') || msg.includes('drizzle') || msg.includes('query') || msg.includes('table')) {
    return {
      title: 'Database Error',
      description: 'An error occurred while interacting with the database.',
      steps: [
        'Check that the database volume has write permissions.',
        'Ensure database migrations were applied successfully during startup.',
        'Verify the SQLite database file path (DB_URL) is correct and not locked.'
      ]
    }
  }

  // Default 404
  if (code === 404) {
    return {
      title: 'Page Not Found',
      description: 'The requested page or resource could not be found.',
      steps: [
        'Check that the URL is spelled correctly.',
        'Ensure the project or resource still exists and you have permissions to access it.'
      ]
    }
  }

  // Generic 500 or others
  return {
    title: 'Server Error',
    description: 'An unexpected internal server error occurred.',
    steps: [
      'Check the docker container logs (docker logs glide-frontend) for a detailed stack trace.',
      'Check the backend logs (docker logs glide-backend) to see if the request failed there.'
    ]
  }
})
</script>

<template>
  <NuxtLayout name="error">
    <div class="flex flex-col justify-center items-center space-y-6 w-full px-4 py-8">
      <div class="flex items-center justify-center mb-2">
        <div class="font-black tracking-tighter text-white font-sans flex items-baseline transition-all" :style="{ fontSize: (Number(settings?.logoSize || 24) * 2) + 'px' }">
          <template v-if="settings?.logoType === 'image'">
            <img :src="settings.logoUrlMinimal || settings.logoUrl" alt="Logo" class="w-auto max-w-[200px] object-contain shrink-0 transition-all" :style="{ height: (Number(settings?.logoSize || 24) * 2) + 'px' }">
          </template>
          <template v-else>
            {{ settings?.logoText || 'glide' }}<span v-if="settings?.logoShowDot !== 'false'" class="text-primary-500">.</span>
          </template>
        </div>
      </div>

      <div class="flex flex-col md:flex-row gap-6 w-full max-w-4xl justify-center items-stretch">
        <!-- Error Core Info -->
        <div class="flex flex-col items-center justify-between border border-accented rounded-lg p-8 w-full md:max-w-sm bg-neutral-950">
          <div class="flex flex-col items-center text-center w-full my-auto">
            <h1 class="text-7xl font-black text-primary-500 mb-2">{{ error?.statusCode || 500 }}</h1>
            <h2 class="text-xl font-bold mb-3 text-white">{{ error?.statusMessage || 'An error occurred' }}</h2>
            <p class="text-sm text-neutral-400 mb-6 break-words w-full">
              Something went wrong while trying to process this request.
            </p>
          </div>
          <u-button 
            color="neutral" 
            variant="subtle"
            label="Back to Home" 
            icon="i-lucide-arrow-left"
            class="w-full h-10 justify-center text-base" 
            @click="handleError"
          />
        </div>

        <!-- Troubleshooting Card -->
        <div class="flex flex-col border border-accented rounded-lg p-8 w-full md:max-w-lg bg-neutral-900 justify-between">
          <div>
            <div class="flex items-center gap-2 mb-4 border-b border-accented pb-3">
              <u-icon name="i-lucide-terminal" class="w-5 h-5 text-primary-500" />
              <h3 class="text-lg font-bold text-white">{{ troubleshooting.title }}</h3>
            </div>
            <p class="text-sm text-neutral-300 mb-4">{{ troubleshooting.description }}</p>
            
            <ul class="space-y-3 mb-6">
              <li v-for="(step, idx) in troubleshooting.steps" :key="idx" class="flex gap-2.5 items-start text-sm text-neutral-400">
                <span class="flex items-center justify-center w-5 h-5 rounded-full bg-neutral-800 text-primary-400 text-xs font-bold shrink-0 mt-0.5">{{ idx + 1 }}</span>
                <span>{{ step }}</span>
              </li>
            </ul>
          </div>

          <!-- Developer Log Toggler -->
          <div class="border-t border-accented pt-4">
            <button 
              class="flex items-center justify-between w-full text-xs text-neutral-400 hover:text-neutral-200 transition-colors" 
              @click="showRaw = !showRaw"
            >
              <span class="flex items-center gap-1.5 font-mono">
                <u-icon name="i-lucide-code" class="w-4 h-4" />
                Raw Error Details
              </span>
              <u-icon 
                :name="showRaw ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'" 
                class="w-4 h-4" 
              />
            </button>
            <div v-if="showRaw" class="mt-3 bg-neutral-950 border border-neutral-800 rounded p-3 text-xs text-neutral-400 font-mono overflow-auto max-h-40 break-all">
              <p v-if="error?.message"><span class="text-neutral-500">Message:</span> {{ maskSensitiveData(error.message) }}</p>
              <p v-if="error?.stack" class="mt-2 text-[10px] leading-relaxed whitespace-pre-wrap"><span class="text-neutral-500">Stack:</span> {{ maskSensitiveData(error.stack) }}</p>
              <p v-if="!error?.message && !error?.stack" class="text-neutral-600">No additional logs available.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </NuxtLayout>
</template>
