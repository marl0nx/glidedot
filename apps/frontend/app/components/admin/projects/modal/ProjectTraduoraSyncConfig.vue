<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '~/composables/useApi'

const props = defineProps<{
  projectId: number
}>()

const emit = defineEmits<{
  (e: 'dirty', value: boolean): void
}>()

const toast = useToast()
const { fetchApi } = useApi()

const url = ref('')
const clientId = ref('')
const clientSecret = ref('')
const selectedProjectId = ref('')
const hasClientSecret = ref(false)
const isSaving = ref(false)
const isLoading = ref(false)

const originalUrl = ref('')
const originalClientId = ref('')
const originalSelectedProjectId = ref('')

const loadConfig = async () => {
  if (!props.projectId) return
  isLoading.value = true
  try {
    const config = await fetchApi<any>(`/localization/projects/${props.projectId}/sync/traduora-config`)
    url.value = config.traduoraUrl || ''
    clientId.value = config.traduoraClientId || ''
    hasClientSecret.value = config.hasClientSecret || false
    selectedProjectId.value = config.traduoraProjectId || ''

    originalUrl.value = url.value
    originalClientId.value = clientId.value
    originalSelectedProjectId.value = selectedProjectId.value
  } catch (err: any) {
    if (err?._toastShown) return
    toast.add({ title: 'Error', description: 'Failed to load Traduora configuration.', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const isDirty = computed(() => {
  return url.value !== originalUrl.value ||
         clientId.value !== originalClientId.value ||
         clientSecret.value !== '' ||
         selectedProjectId.value !== originalSelectedProjectId.value
})

watch(isDirty, (newVal) => {
  emit('dirty', newVal)
}, { immediate: true })

const isFormValid = computed(() => {
  return !!(
    url.value.trim() &&
    clientId.value.trim() &&
    (clientSecret.value.trim() || hasClientSecret.value) &&
    selectedProjectId.value.trim()
  )
})

const saveConfig = async (): Promise<boolean> => {
  if (!isFormValid.value) {
    toast.add({
      title: 'Validation Error',
      description: 'All Traduora configuration fields (Server URL, Client ID, Client Secret, and Project ID) must be filled out.',
      color: 'error'
    })
    return false
  }
  isSaving.value = true
  try {
    await fetchApi(`/localization/projects/${props.projectId}/sync/traduora-config`, {
      method: 'POST',
      body: {
        traduoraUrl: url.value,
        traduoraClientId: clientId.value,
        traduoraClientSecret: clientSecret.value || undefined,
        traduoraProjectId: selectedProjectId.value
      }
    })
    toast.add({ title: 'Success', description: 'Traduora configuration saved successfully.', color: 'success' })
    if (clientSecret.value) {
      hasClientSecret.value = true
      clientSecret.value = ''
    }
    originalUrl.value = url.value
    originalClientId.value = clientId.value
    originalSelectedProjectId.value = selectedProjectId.value
    return true
  } catch (err: any) {
    if (!err._toastShown) {
      const errorMsg = err.data?.message || err.message || 'Failed to save configuration.'
      toast.add({ title: 'Error', description: errorMsg, color: 'error' })
    }
    return false
  } finally {
    isSaving.value = false
  }
}

const reset = () => {
  url.value = originalUrl.value
  clientId.value = originalClientId.value
  clientSecret.value = ''
  selectedProjectId.value = originalSelectedProjectId.value
}

defineExpose({ reset, saveConfig })

onMounted(() => {
  loadConfig()
})
</script>

<template>
  <div class="space-y-4">
    <div>
      <h3 class="font-medium text-white">Traduora Sync Configuration</h3>
      <p class="text-sm text-neutral-400">Enter the credentials for your Traduora instance for this project here.</p>
    </div>

    <div v-if="isLoading" class="p-4 text-center">
      <u-icon name="i-lucide-loader-2" class="w-6 h-6 animate-spin text-neutral-500" />
    </div>

    <div v-else class="space-y-4 bg-neutral-900 p-4 border border-neutral-800 rounded-lg">
      <u-form-field label="Traduora Server URL">
        <u-input v-model="url" placeholder="https://translate.your-domain.com" class="w-full" />
      </u-form-field>

      <u-form-field label="Traduora Client ID">
        <u-input v-model="clientId" placeholder="OAuth2 Client ID" class="w-full" />
      </u-form-field>

      <u-form-field 
        label="Traduora Client Secret" 
        :description="hasClientSecret ? 'A Client Secret is already saved. Enter a new one to overwrite it.' : ''"
      >
        <u-input v-model="clientSecret" type="password" placeholder="OAuth2 Client Secret" class="w-full" />
      </u-form-field>

      <u-form-field label="Traduora Project ID">
        <u-input 
          v-model="selectedProjectId" 
          placeholder="Associated project ID from Traduora (UUID)" 
          class="w-full" 
        />
      </u-form-field>
    </div>
  </div>
</template>
