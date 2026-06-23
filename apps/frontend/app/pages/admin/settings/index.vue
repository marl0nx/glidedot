<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useSettings } from '~/composables/useSettings'
import { useToast } from '#imports'
import UnsavedChangesAlert from '~/components/UnsavedChangesAlert.vue'

const { settings, loadSettings, saveSettings } = useSettings()
const toast = useToast()
const isLoading = ref(false)

const formData = ref({
  logRetentionDays: 0, // 0 means disabled
  deeplApiKey: '',
  maintenanceMode: false
})

const originalData = ref({
  logRetentionDays: 0,
  deeplApiKey: '',
  maintenanceMode: false
})

const retentionOptions = [
  { label: 'Disabled (Keep forever)', value: 0 },
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
  { label: 'Custom...', value: -1 }
]

const selectedOption = ref(0)
const customDays = ref(0)

onMounted(async () => {
  await loadSettings(true)
  const val = Number(settings.value.logRetentionDays) || 0
  if ([0, 7, 30, 90].includes(val)) {
    selectedOption.value = val
    customDays.value = val
    formData.value.logRetentionDays = val
  } else {
    selectedOption.value = -1
    customDays.value = val
    formData.value.logRetentionDays = val
  }
  
  formData.value.deeplApiKey = settings.value.deeplApiKey || ''
  formData.value.maintenanceMode = String(settings.value.maintenanceMode) === 'true'

  originalData.value = { ...formData.value }
})

const hasUnsavedChanges = computed(() => {
  return formData.value.logRetentionDays !== originalData.value.logRetentionDays ||
         formData.value.deeplApiKey !== originalData.value.deeplApiKey ||
         formData.value.maintenanceMode !== originalData.value.maintenanceMode
})

const discard = () => {
  formData.value = { ...originalData.value }
  const val = formData.value.logRetentionDays
  if ([0, 7, 30, 90].includes(val)) {
    selectedOption.value = val
    customDays.value = val
  } else {
    selectedOption.value = -1
    customDays.value = val
  }
}

watch(() => settings.value.maintenanceMode, (newVal) => {
  formData.value.maintenanceMode = String(newVal) === 'true'
})

watch(selectedOption, (val) => {
  if (val !== -1) {
    formData.value.logRetentionDays = val
  } else {
    formData.value.logRetentionDays = customDays.value
  }
})

watch(customDays, (val) => {
  if (selectedOption.value === -1) {
    formData.value.logRetentionDays = val || 0
  }
})

const save = async () => {
  isLoading.value = true
  const success = await saveSettings({
    logRetentionDays: String(formData.value.logRetentionDays),
    deeplApiKey: formData.value.deeplApiKey,
    maintenanceMode: String(formData.value.maintenanceMode)
  })
  isLoading.value = false
  if (success) {
    originalData.value = { ...formData.value }
    toast.add({ title: 'Settings saved', color: 'success' })
  } else {
    toast.add({ title: 'Failed to save settings', color: 'error' })
  }
}
</script>

<template>
  <div class="flex flex-col gap-6 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
      <div class="flex flex-col gap-1">
        <h1 class="text-xl font-bold">General Settings</h1>
        <p class="text-sm text-neutral-400">Configure global instance parameters and data retention.</p>
      </div>
      <u-button icon="i-lucide-save" label="Save Changes" color="neutral" variant="subtle" :loading="isLoading" @click="save" />
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <u-card>
        <template #header>
          <div class="flex items-center gap-2">
            <u-icon name="i-lucide-database-zap" class="w-5 h-5 text-primary-500" />
            <h3 class="font-medium">Data Retention</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <u-form-field label="Insight Retention" description="Automatically delete activity logs (insights) older than X days.">
            <div class="flex items-center gap-4 w-full mt-2">
              <u-select v-model="selectedOption" :items="retentionOptions" class="w-48" />
              <div v-if="selectedOption === -1" class="flex items-center gap-2">
                <u-input v-model.number="customDays" type="number" :min="1" placeholder="e.g. 14" class="w-24" />
                <span class="text-sm text-neutral-400">days</span>
              </div>
            </div>
            <div class="mt-2 text-xs font-medium" :class="formData.logRetentionDays === 0 ? 'text-primary-500' : 'text-warning-500'">
              {{ formData.logRetentionDays === 0 ? 'Disabled (Logs are never deleted)' : `Logs will be permanently deleted after ${formData.logRetentionDays} days` }}
            </div>
          </u-form-field>
        </div>
      </u-card>
      <u-card>
        <template #header>
          <div class="flex items-center gap-2">
            <u-icon name="i-lucide-languages" class="w-5 h-5 text-primary-500" />
            <h3 class="font-medium">Machine Translation</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <u-form-field label="DeepL API Key" description="Provide your DeepL API Key to enable automated translations via DeepL. If no key is provided, Google Translate will be used as the default fallback.">
            <u-input v-model="formData.deeplApiKey" type="password" placeholder="DeepL Auth Key" class="w-full" icon="i-lucide-key" />
          </u-form-field>
        </div>
      </u-card>

      <u-card>
        <template #header>
          <div class="flex items-center gap-2">
            <u-icon name="i-lucide-shield-alert" class="w-5 h-5 text-primary-500" />
            <h3 class="font-medium">System Health</h3>
          </div>
        </template>
        
        <div class="space-y-4">
          <u-form-field label="Maintenance Mode" description="Lock down the system. Only administrators will be able to access Glide while this is active.">
            <div class="flex items-center gap-2 mt-2">
              <u-switch v-model="formData.maintenanceMode" color="warning" />
              <span class="text-sm font-medium" :class="formData.maintenanceMode ? 'text-warning-500' : 'text-neutral-400'">
                {{ formData.maintenanceMode ? 'Maintenance Mode Active' : 'System operates normally' }}
              </span>
            </div>
          </u-form-field>
        </div>
      </u-card>
    </div>

    <unsaved-changes-alert 
      :has-unsaved-changes="hasUnsavedChanges" 
      :loading="isLoading" 
      @save="save" 
      @discard="discard" 
    />
  </div>
</template>
