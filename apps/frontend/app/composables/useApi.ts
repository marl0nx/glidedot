import { ref } from 'vue'

const activeRequests = ref(0)
const isApiLoading = ref(false)

export const useApi = () => {
  const config = useRuntimeConfig()
  const apiKey = useCookie('glide_api_key')

  const fetchApi = async <T = unknown>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> => {
    const headers: Record<string, string> = { ...options.headers as Record<string, string> }
    
    if (apiKey.value) {
      headers['Authorization'] = `Bearer ${apiKey.value}`
    }

    activeRequests.value++
    isApiLoading.value = true

    try {
      return await $fetch<T>(url, {
        baseURL: config.public.apiBase,
        ...options,
        headers
      })
    } finally {
      activeRequests.value--
      if (activeRequests.value <= 0) {
        activeRequests.value = 0
        isApiLoading.value = false
      }
    }
  }

  return {
    fetchApi,
    apiKey,
    isApiLoading
  }
}

