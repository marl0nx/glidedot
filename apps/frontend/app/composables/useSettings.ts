import { ref } from 'vue'
import { useApi } from './useApi'

const globalSettings = ref<Record<string, string>>({})
const isLoading = ref(false)

export function useSettings() {
  const { fetchApi } = useApi()

  const loadSettings = async (isAdmin = false) => {
    // If we only have public settings and we need admin, we must fetch again.
    // If we already have settings and don't need admin, skip.
    if (!isAdmin && Object.keys(globalSettings.value).length > 0) return
    
    isLoading.value = true
    try {
      const endpoint = isAdmin ? '/admin/settings' : '/admin/settings/public'
      const data = await fetchApi(endpoint) as Record<string, any>
      globalSettings.value = { ...globalSettings.value, ...data }
    } catch (e) {
      console.error('Failed to load settings', e)
    } finally {
      isLoading.value = false
    }
  }

  const saveSettings = async (settingsToSave: Record<string, string>) => {
    try {
      await fetchApi('/admin/settings', {
        method: 'POST',
        body: settingsToSave
      })
      // Update local state
      globalSettings.value = { ...globalSettings.value, ...settingsToSave }
      return true
    } catch (e) {
      console.error('Failed to save settings', e)
      return false
    }
  }

  return {
    settings: globalSettings,
    loadSettings,
    saveSettings
  }
}
