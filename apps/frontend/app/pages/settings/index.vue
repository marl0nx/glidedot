<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useShortcuts, type ShortcutMap } from '~/composables/useShortcuts'
import { useAuth } from '~/composables/useAuth'
import { useApi } from '~/composables/useApi'
import DiscordWebhookPreview from '~/components/settings/DiscordWebhookPreview.vue'

definePageMeta({
  layout: 'default'
})

const appConfig = useAppConfig()
const toast = useToast()
const { shortcuts, loadShortcuts, saveShortcuts, formatShortcut, defaultShortcuts } = useShortcuts()
const { user } = useAuth()
const { fetchApi } = useApi()

const enableShortcuts = ref(true)

const isAlertsLoading = ref(false)

const alertConfig = ref({
  provider: 'none' as 'none' | 'discord' | 'slack' | 'ntfy' | 'custom' | 'telegram' | 'gotify',
  url: '',
  events: [] as string[],
  pingUserId: '',
  avatarUrl: ''
})

const originalAlertConfig = ref({
  provider: 'none' as 'none' | 'discord' | 'slack' | 'ntfy' | 'custom' | 'telegram' | 'gotify',
  url: '',
  events: [] as string[],
  pingUserId: '',
  avatarUrl: ''
})

const hasUnsavedChanges = computed(() => {
  return JSON.stringify(alertConfig.value) !== JSON.stringify(originalAlertConfig.value)
})

const discard = () => {
  alertConfig.value = JSON.parse(JSON.stringify(originalAlertConfig.value))
}

const toggleEvent = (val: string, checked: boolean) => {
  if (checked && !alertConfig.value.events.includes(val)) {
    alertConfig.value.events.push(val)
  } else if (!checked) {
    alertConfig.value.events = alertConfig.value.events.filter((e) => e !== val)
  }
}

const providerOptions = [
  { label: 'None (Disabled)', value: 'none' },
  { label: 'Discord Webhook', value: 'discord' },
  { label: 'Slack Webhook', value: 'slack' },
  { label: 'ntfy.sh', value: 'ntfy' },
  { label: 'Telegram Bot', value: 'telegram' },
  { label: 'Gotify', value: 'gotify' },
  { label: 'Custom Webhook', value: 'custom' }
]

const availableEvents = computed(() => {
  const events = [
    { value: 'translation.rejected', label: 'Translation Rejected', description: 'When your translation is rejected by a reviewer (sent immediately)' },
    { value: 'translation.approved', label: 'Translation Approved', description: 'When your translation is approved and goes live (sent immediately)' },
    { value: 'quota.low', label: 'Quota Low', description: 'When your translation suggestion quota drops below 50 (throttled to at most once per 24 hours)' },
  ]
  if (user.value?.isAdmin || user.value?.isReviewer) {
    events.push({ value: 'pending.reviews', label: 'Pending Reviews', description: 'When a new translation draft needs approval (throttled to at most once per 2 hours to prevent spam)' })
  }
  if (user.value?.isAdmin) {
    events.push({ value: 'backup.failed', label: 'Backup Failed', description: 'When an automated S3 backup fails (sent immediately on backup failure)' })
  }
  return events
})

const saveAlerts = async () => {
  isAlertsLoading.value = true
  try {
    await fetchApi('/users/me', {
      method: 'PATCH',
      body: { alertConfig: alertConfig.value }
    })
    toast.add({ title: 'Success', description: 'Alert settings updated', color: 'success' })
    originalAlertConfig.value = JSON.parse(JSON.stringify(alertConfig.value))
  } catch {
    toast.add({ title: 'Error', description: 'Failed to update alert settings', color: 'error' })
  } finally {
    isAlertsLoading.value = false
  }
}

const isTestingAlert = ref(false)
const testAlert = async (eventName: string = 'test.alert') => {
  isTestingAlert.value = true
  try {
    await fetchApi('/users/me/test-alert', {
      method: 'POST',
      body: { alertConfig: alertConfig.value, testEvent: eventName }
    })
    toast.add({ title: 'Success', description: 'Test notification sent!', color: 'success' })
  } catch {
    toast.add({ title: 'Error', description: 'Failed to send test notification. Check your URL.', color: 'error' })
  } finally {
    isTestingAlert.value = false
  }
}

const testDropdownItems = computed(() => {
  return [
    [{
      label: 'Generic Test',
      icon: 'i-lucide-bell',
      onSelect: () => testAlert('test.alert')
    }],
    availableEvents.value.map(event => ({
      label: event.label,
      icon: 'i-lucide-activity',
      onSelect: () => testAlert(event.value)
    }))
  ]
})

const saveProfileSettings = async (val: boolean) => {
  if (!user.value) return
  try {
    await fetchApi('/users/me', {
      method: 'PATCH',
      body: { enableSuggestions: val }
    })
    user.value.enableSuggestions = val
    toast.add({ title: 'Success', description: 'Profile settings updated', color: 'success' })
  } catch {
    toast.add({ title: 'Error', description: 'Failed to update profile', color: 'error' })
  }
}

const isSuggestionsEnabled = computed({
  get: () => user.value?.enableSuggestions ?? true,
  set: (val: boolean) => saveProfileSettings(val)
})

const saveSettings = () => {
  localStorage.setItem('glide_enable_shortcuts', enableShortcuts.value ? 'true' : 'false')
  toast.add({ title: 'Success', description: 'Settings saved', color: 'success' })
}

const recordingShortcut = ref<keyof typeof shortcuts.value | null>(null)

const startRecording = (name: keyof typeof shortcuts.value) => {
  recordingShortcut.value = name
}

const handleKeydown = (e: KeyboardEvent) => {
  if (!recordingShortcut.value) return
  
  e.preventDefault()
  if (['Meta', 'Control', 'Shift', 'Alt'].includes(e.key)) return
  
  shortcuts.value[recordingShortcut.value] = {
    key: e.key,
    metaKey: e.metaKey,
    ctrlKey: e.ctrlKey,
    shiftKey: e.shiftKey,
    altKey: e.altKey
  }
  
  saveShortcuts()
  recordingShortcut.value = null
  toast.add({ title: 'Success', description: 'Shortcut updated', color: 'success' })
}

const resetShortcut = (name: keyof typeof shortcuts.value) => {
  shortcuts.value[name] = JSON.parse(JSON.stringify(defaultShortcuts[name]))
  saveShortcuts()
  toast.add({ title: 'Success', description: 'Shortcut reset', color: 'success' })
}

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  loadShortcuts()
  
  const savedShortcuts = localStorage.getItem('glide_enable_shortcuts')
  if (savedShortcuts) enableShortcuts.value = savedShortcuts === 'true'

  try {
    const meData = await fetchApi('/users/me') as { alertConfig?: any }
    if (meData?.alertConfig) {
      const parsedConfig = JSON.parse(JSON.stringify(meData.alertConfig))
      if (!parsedConfig.events) parsedConfig.events = []
      if (!parsedConfig.pingUserId) parsedConfig.pingUserId = ''
      if (!parsedConfig.avatarUrl) parsedConfig.avatarUrl = ''
      alertConfig.value = parsedConfig
      originalAlertConfig.value = JSON.parse(JSON.stringify(parsedConfig))
    }
  } catch { /* ignore */ }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="flex flex-col gap-6 max-w-4xl mx-auto py-8">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0 mb-4">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-user-cog" class="w-5 h-5 text-primary-500" />
            Settings
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Customize the application and your personal workflow.</p>
      </div>
    </div>


    <u-card :ui="{ body: 'p-6 sm:p-8' }">
      <div class="space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-neutral-200">Translation Preferences</h2>
          <p class="text-sm text-neutral-400 mt-1">Configure your default translation workflow.</p>
          <u-badge v-if="user?.allowSuggestions === false" color="error" variant="subtle" class="mt-2">
            AI suggestions have been disabled by your administrator.
          </u-badge>
        </div>

        <div class="flex flex-row justify-between items-start" :class="user?.allowSuggestions === false && 'opacity-50 pointer-events-none'">
          <div class="space-y-4">
            <h2 class="text-lg font-semibold text-neutral-200">Translation Suggestions</h2>
            <p class="text-sm text-neutral-40">Enable AI-powered translation suggestions while editing.</p>
            <div class="flex flex-row items-center space-x-4">
              <div class="px-3 py-1.5 bg-neutral-900 border border-neutral-800 rounded-md">
                <span class="text-xs font-medium text-neutral-400">
                  Provider: <strong class="text-neutral-200">{{ user?.hasDeepL ? 'DeepL' : 'Google Translate' }}</strong>
                </span>
              </div>
              <u-switch
                  v-model="isSuggestionsEnabled"
              />
            </div>
          </div>
        </div>
      </div>
    </u-card>

    <u-card class="hidden md:block" :ui="{ body: 'p-6 sm:p-8' }">
      <div class="space-y-6">
        <div class="flex flex-row justify-between items-start">
          <div>
            <h2 class="text-lg font-semibold text-neutral-200">Keyboard Shortcuts</h2>
            <p class="text-sm text-neutral-400 mt-1">Enable power-user shortcuts for translating.</p>
          </div>
          <u-toggle v-model="enableShortcuts" @change="saveSettings" />
        </div>

        <div class="bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden transition-opacity" :class="!enableShortcuts && 'opacity-50 pointer-events-none'">
          <div class="grid grid-cols-2 gap-px bg-neutral-800">
            <div v-for="(label, key) in { saveNext: 'Save & Next', next: 'Next Translation', prev: 'Previous Translation', approve: 'Approve Suggestion', copySource: 'Copy Source Text', close: 'Close Window' }" :key="key" class="bg-neutral-900 p-4 flex items-center justify-between group">
              <span class="text-sm font-medium text-neutral-300">{{ label }}</span>
              <div class="flex items-center gap-4">
                <button v-if="recordingShortcut !== key" class="opacity-0 group-hover:opacity-100 text-xs text-neutral-500 hover:text-neutral-300 transition-opacity" @click="resetShortcut(key as keyof ShortcutMap)">Reset</button>
                <button class="flex gap-1 hover:ring-2 ring-primary-500 rounded p-1 transition-all outline-none" :class="recordingShortcut === key && 'ring-2 ring-primary-500 bg-primary-500/20'" @click="startRecording(key as keyof ShortcutMap)">
                  <span v-if="recordingShortcut === key" class="text-xs text-primary-500 font-medium px-2 py-1 animate-pulse">Press any key...</span>
                  <kbd v-for="k in formatShortcut(shortcuts[key as keyof ShortcutMap])" v-else :key="k" class="px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs font-mono">{{ k }}</kbd>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </u-card>

    <u-card :ui="{ body: 'p-6 sm:p-8' }">
      <div class="space-y-6">
        <div>
          <h2 class="text-lg font-semibold text-neutral-200">Alerts & Notifications</h2>
          <p class="text-sm text-neutral-400 mt-1">Configure external webhooks to receive important notifications.</p>
        </div>

        <div class="flex flex-col sm:flex-row gap-4">
          <u-form-field label="Provider" class="w-full sm:w-1/3">
            <u-select v-model="alertConfig.provider" :items="providerOptions" class="w-full" />
          </u-form-field>
          <u-form-field label="Webhook URL / Target" class="flex-1 w-full" v-if="alertConfig.provider !== 'none'">
            <div class="flex flex-col min-[450px]:flex-row items-stretch min-[450px]:items-center gap-2">
              <u-input v-model="alertConfig.url" placeholder="https://..." class="flex-grow min-w-0" />
              <u-dropdown-menu :items="testDropdownItems" :disabled="!alertConfig.url" class="shrink-0">
                <u-button 
                  label="Test Notification" 
                  color="primary" 
                  variant="outline" 
                  icon="i-lucide-chevron-down"
                  trailing
                  class="w-full justify-center"
                  :loading="isTestingAlert" 
                  :disabled="!alertConfig.url"
                />
              </u-dropdown-menu>
            </div>
            <p class="text-xs text-neutral-500 mt-1" v-if="alertConfig.provider === 'ntfy'">For ntfy, use a URL like <code>https://ntfy.sh/my_secret_topic</code></p>
            <p class="text-xs text-neutral-500 mt-1" v-if="alertConfig.provider === 'gotify'">For Gotify, use a URL like <code>https://gotify.example.com/message?token=...</code></p>
            <p class="text-xs text-neutral-500 mt-1" v-if="alertConfig.provider === 'telegram'">For Telegram, use a URL like <code>https://api.telegram.org/bot&lt;bot_token&gt;/sendMessage?chat_id=&lt;chat_id&gt;</code></p>
          </u-form-field>
        </div>

        <div v-if="alertConfig.provider === 'discord'" class="flex flex-col sm:flex-row gap-4">
          <u-form-field label="Ping User ID (Optional)" class="w-full sm:w-1/2" description="Discord User ID to ping on events">
            <u-input v-model="alertConfig.pingUserId" placeholder="e.g. 123456789012345678" class="w-full" />
          </u-form-field>
          <u-form-field label="Avatar URL (Optional)" class="w-full sm:w-1/2" description="Custom image URL for the bot avatar">
            <u-input v-model="alertConfig.avatarUrl" placeholder="https://..." class="w-full" />
          </u-form-field>
        </div>

        <div v-if="alertConfig.provider !== 'none'" class="space-y-3">
          <h4 class="font-medium text-sm text-neutral-300 mb-2">Events to notify:</h4>
          <u-checkbox 
            v-for="event in availableEvents" 
            :key="event.value"
            :model-value="alertConfig.events.includes(event.value)"
            @update:model-value="(checked: boolean | 'indeterminate') => toggleEvent(event.value, checked === true)"
            :label="event.label"
            :description="event.description"
          />
        </div>

        <div v-if="alertConfig.provider === 'discord'" class="mt-8 pt-8 border-t border-neutral-800">
          <h4 class="font-medium text-sm text-neutral-300 mb-4">Live Preview</h4>
          <discord-webhook-preview 
            :ping-user-id="alertConfig.pingUserId" 
            :avatar-url="alertConfig.avatarUrl"
            :events="alertConfig.events" 
          />
        </div>
      </div>
    </u-card>
    <unsaved-changes-alert 
      :has-unsaved-changes="hasUnsavedChanges" 
      :loading="isAlertsLoading" 
      @save="saveAlerts" 
      @discard="discard" 
    />
  </div>
</template>
