import { ref } from 'vue'

const activeRequests = ref(0)
const isApiLoading = ref(false)

export interface ApiResponse<T = any> {
  success: boolean
  statusCode: number
  shortCode: string
  message: string
  data: T
  errorDetails?: any
}

export const useApi = () => {
  const config = useRuntimeConfig()
  const apiKey = useCookie('glide_api_key')
  const toast = useToast()

  const fetchApi = async <T = unknown>(url: string, options: Parameters<typeof $fetch>[1] = {}): Promise<T> => {
    const headers: Record<string, string> = { ...options.headers as Record<string, string> }
    
    if (apiKey.value) {
      headers['Authorization'] = `Bearer ${apiKey.value}`
    }

    activeRequests.value++
    isApiLoading.value = true

    try {
      const response = await $fetch<any>(url, {
        baseURL: config.public.apiBase,
        ...options,
        headers
      })

      // If the response is wrapped in our ApiResponse shape, unwrap it
      if (
        response &&
        typeof response === 'object' &&
        'success' in response &&
        'statusCode' in response &&
        'shortCode' in response &&
        'data' in response
      ) {
        const apiResponse = response as ApiResponse<T>
        if (!apiResponse.success) {
          // Logically failed despite 2xx status code
          toast.add({
            title: apiResponse.shortCode || 'Error',
            description: apiResponse.message || 'An error occurred.',
            color: 'error'
          })
          throw new Error(apiResponse.message || 'API request failed')
        }
        return apiResponse.data
      }

      // If not wrapped, return the response as-is (backwards compatibility / raw binary/string response)
      return response as T
    } catch (err: any) {
      // If it's a fetch error, see if we have a wrapped JSON error payload
      const errorData = err.data || err.response?._data
      if (
        errorData &&
        typeof errorData === 'object' &&
        'success' in errorData &&
        'message' in errorData
      ) {
        const apiResponse = errorData as ApiResponse
        // Trigger a global toast error
        toast.add({
          title: apiResponse.shortCode || 'Error',
          description: apiResponse.message || 'An error occurred.',
          color: 'error'
        })
      }

      // Re-throw error so standard callers can handle/catch it
      throw err
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


