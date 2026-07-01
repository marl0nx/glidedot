<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useApi } from '~/composables/useApi'
import { useAuth } from '~/composables/useAuth'
import { formatDistanceToNow } from 'date-fns'

const route = useRoute()
const projectId = route.params.id as string
const toast = useToast()
const { fetchApi } = useApi()
const { user, isAdmin } = useAuth()

const tabs = [
  {
    label: 'Git Sync',
    icon: 'i-lucide-git-pull-request',
    slot: 'git'
  },
  {
    label: 'Traduora Sync',
    icon: 'i-lucide-refresh-cw',
    slot: 'traduora'
  }
]

// Git Sync States
const isLoading = ref(false)
const syncs = ref<any[]>([])

const providerMap = {
  github: { icon: 'i-simple-icons-github', color: 'text-white' },
  gitlab: { icon: 'i-simple-icons-gitlab', color: 'text-[#FC6D26]' },
  forgejo: { icon: 'i-simple-icons-forgejo', color: 'text-[#FB8F2B]' }
}

const fetchData = async () => {
  isLoading.value = true
  try {
    syncs.value = await fetchApi(`/git/projects/${projectId}/syncs`)
  } catch {
    toast.add({ title: 'Error', description: 'Failed to load sync configurations', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const isPushing = ref<Record<number, boolean>>({})
const confirmModalOpen = ref(false)
const pendingSyncId = ref<number | null>(null)
const lastSyncTimeStr = ref('')
const lastSyncedByName = ref<string | null>(null)
const confirmUsername = ref('')
const showTimeWarning = ref(false)

const isPRWithinHour = (dateStr: string | null | undefined) => {
  if (!dateStr) return false
  const diffMins = (new Date().getTime() - new Date(dateStr).getTime()) / 1000 / 60
  return diffMins >= 0 && diffMins < 60
}

const attemptPush = (sync: any) => {
  pendingSyncId.value = sync.id
  confirmUsername.value = ''
  showTimeWarning.value = false
  
  if (sync.lastSyncedAt) {
    const diffMins = (new Date().getTime() - new Date(sync.lastSyncedAt).getTime()) / 1000 / 60
    if (diffMins < 60) {
      lastSyncTimeStr.value = formatDistanceToNow(new Date(sync.lastSyncedAt), { addSuffix: true })
      lastSyncedByName.value = sync.lastSyncedByName
      showTimeWarning.value = true
    }
  }
  confirmModalOpen.value = true
}

const pushSync = async (id: number) => {
  confirmModalOpen.value = false;
  isPushing.value[id] = true
  try {
    const res = await fetchApi<{ branch: string }>(`/git/projects/${projectId}/syncs/${id}/execute`, { method: 'POST' })
    toast.add({ title: 'PR Created!', description: `Successfully opened a pull request on branch: ${res.branch}`, color: 'success' })
    await fetchData() // refresh to get new lastSyncedAt
  } catch (e: any) {
    toast.add({ title: 'Push Failed', description: e.message || 'An error occurred', color: 'error' })
  } finally {
    isPushing.value[id] = false
  }
}

// Traduora Sync States
const isLoadingTraduora = ref(false)
const isPushingTraduora = ref(false)
const traduoraStatus = ref<{
  configured: boolean
  lastSyncedAt: string | null
  traduoraUrl?: string
  traduoraProjectId?: string
} | null>(null)

const fetchTraduoraStatus = async () => {
  isLoadingTraduora.value = true
  try {
    const status = await fetchApi<any>(`/localization/projects/${projectId}/sync/traduora-status`)
    traduoraStatus.value = status
  } catch (err) {
    toast.add({ title: 'Error', description: 'Failed to load Traduora status.', color: 'error' })
  } finally {
    isLoadingTraduora.value = false
  }
}

const pushTraduoraSync = async () => {
  isPushingTraduora.value = true
  try {
    const res = await fetchApi<{ syncedLocales: string[]; errors?: string[] }>(`/localization/projects/${projectId}/sync/traduora`, {
      method: 'POST'
    })
    if (res && res.syncedLocales) {
      toast.add({
        title: 'Successfully synchronized!',
        description: `Translations for ${res.syncedLocales.join(', ')} successfully pushed to Traduora.`,
        color: 'success'
      })
      await fetchTraduoraStatus() // refresh timestamp
    }
  } catch (err: any) {
    toast.add({
      title: 'Synchronization failed',
      description: err.message || 'An unexpected error occurred.',
      color: 'error'
    })
  } finally {
    isPushingTraduora.value = false
  }
}

onMounted(() => {
  fetchData()
  fetchTraduoraStatus()
})
</script>

<template>
  <div class="flex flex-col gap-4 md:gap-6 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 overflow-x-hidden md:overflow-x-visible">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0 mb-2">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-refresh-cw" class="w-5 h-5 text-primary-500" />
            Sync
        </h1>
        <p class="text-sm text-neutral-400 mt-1">Synchronize your translations with Version Control (Git) or Traduora.</p>
      </div>
    </div>

    <!-- Tabs for Git and Traduora -->
    <u-tabs :items="tabs" :default-index="0" class="w-full" :ui="{ list: 'bg-neutral-900 border border-neutral-800 w-full h-10', trigger: 'h-8 text-sm' }">
      
      <!-- Git Sync Tab -->
      <template #git>
        <div class="py-4 space-y-4">
          <div v-if="syncs.length === 0" class="p-8 text-center border border-dashed border-neutral-700 rounded-xl bg-neutral-900/50">
            <u-icon name="i-lucide-git-merge" class="w-12 h-12 mx-auto text-neutral-600 mb-4" />
            <h3 class="text-lg font-medium text-white mb-2">No Git Syncs configured</h3>
            <p class="text-neutral-400 max-w-sm mx-auto mb-6">Automated Pull Requests must be configured before you can sync translations.</p>
            <u-button v-if="isAdmin" label="Go to Manage Projects" to="/admin/projects" color="primary" />
            <p v-else class="text-sm text-neutral-500">Please ask an administrator to configure Git Sync for this project.</p>
          </div>

          <div v-for="sync in syncs" :key="sync.id" class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 sm:p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div class="flex items-start gap-3 sm:gap-4 min-w-0 w-full md:w-auto">
              <u-icon :name="providerMap[sync.provider as keyof typeof providerMap].icon" class="w-6 h-6 sm:w-8 sm:h-8 mt-1 shrink-0" :class="providerMap[sync.provider as keyof typeof providerMap].color" />
              <div class="min-w-0 flex-1">
                <h3 class="font-bold text-white text-base sm:text-lg truncate">{{ sync.repoName }}</h3>
                <div class="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-neutral-400">
                  <span class="flex items-center gap-1 shrink-0"><u-icon name="i-lucide-git-branch" class="w-4 h-4 text-neutral-500" /> {{ sync.branch }}</span>
                  <span class="flex items-center gap-1 shrink-0"><u-icon name="i-lucide-file-code" class="w-4 h-4 text-neutral-500" /> {{ sync.filePath }}</span>
                  <span v-if="sync.lastSyncedAt" :class="['flex items-center gap-1 shrink-0', isPRWithinHour(sync.lastSyncedAt) ? 'text-warning-400 font-medium' : 'text-neutral-200']">
                    <u-icon name="i-lucide-clock" class="w-4 h-4" /> Last PR: {{ formatDistanceToNow(new Date(sync.lastSyncedAt), { addSuffix: true }) }}
                  </span>
                </div>
              </div>
            </div>
            <div class="flex gap-2 w-full md:w-auto mt-2 md:mt-0 shrink-0">
              <u-button label="Create Pull Request" icon="i-lucide-upload-cloud" color="neutral" class="flex-1 md:flex-none justify-center" :loading="isPushing[sync.id]" @click="attemptPush(sync)" />
            </div>
          </div>
        </div>
      </template>

      <!-- Traduora Sync Tab -->
      <template #traduora>
        <div class="py-4 space-y-6">
          
          <!-- Warning banner if not configured or missing project ID -->
          <div v-if="traduoraStatus && (!traduoraStatus.configured || !traduoraStatus.traduoraProjectId)" class="p-8 text-center border border-dashed border-neutral-700 rounded-xl bg-neutral-900/50">
            <u-icon name="i-lucide-refresh-cw" class="w-12 h-12 mx-auto text-neutral-600 mb-4" />
            <h3 class="text-lg font-medium text-white mb-2">No Traduora Sync configured</h3>
            <p class="text-neutral-400 max-w-sm mx-auto mb-6">Traduora Sync must be configured before you can sync translations.</p>
            <u-button v-if="isAdmin" label="Go to Manage Projects" to="/admin/projects" color="primary" />
            <p v-else class="text-sm text-neutral-500">Please ask an administrator to configure Traduora Sync for this project.</p>
          </div>

          <!-- Sync details if configured -->
          <div v-else-if="traduoraStatus && traduoraStatus.configured && traduoraStatus.traduoraProjectId" class="space-y-6">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <!-- Endpoint Card -->
              <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2">
                <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Traduora URL</span>
                <span class="text-sm font-medium text-white truncate">{{ traduoraStatus.traduoraUrl }}</span>
              </div>
              <!-- Project ID Card -->
              <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2">
                <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Traduora Project ID</span>
                <span class="text-sm font-medium text-white truncate">
                  <span class="font-mono text-xs bg-neutral-800 px-2 py-0.5 rounded text-primary-400">
                    {{ traduoraStatus.traduoraProjectId }}
                  </span>
                </span>
              </div>
              <!-- Last Synced Card -->
              <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-4 flex flex-col gap-2">
                <span class="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Last Synced</span>
                <span class="text-sm font-medium text-white">
                  <span v-if="traduoraStatus.lastSyncedAt" class="flex items-center gap-1.5 text-primary-400">
                    <u-icon name="i-lucide-clock" class="w-4 h-4" />
                    {{ formatDistanceToNow(new Date(traduoraStatus.lastSyncedAt), { addSuffix: true }) }}
                  </span>
                  <span v-else class="text-neutral-500">Never synced</span>
                </span>
              </div>
            </div>

            <!-- Sync Info & Trigger Action -->
            <div class="bg-neutral-900 border border-neutral-800 rounded-xl p-6 space-y-4">
              <div>
                <h3 class="text-base font-semibold text-white">Start Synchronization</h3>
                <p class="text-sm text-neutral-400 mt-1.5 leading-relaxed">
                  This process exports all translation keys and their approved translations for all languages configured in this project, and uploads them directly as a flat JSON to Traduora.
                </p>
              </div>

              <div class="pt-2 flex justify-start">
                <u-button 
                  label="Push to Traduora" 
                  icon="i-lucide-upload-cloud" 
                  color="primary" 
                  size="md"
                  :loading="isPushingTraduora" 
                  @click="pushTraduoraSync" 
                />
              </div>
            </div>
          </div>

          <!-- Loading state during status fetch -->
          <div v-else class="flex justify-center items-center py-12">
            <u-icon name="i-lucide-refresh-cw" class="w-8 h-8 text-primary-500 animate-spin" />
          </div>

        </div>
      </template>
    </u-tabs>

    <!-- Confirm Modal for Git Pull Request -->
    <u-modal v-model:open="confirmModalOpen" title="Create Pull Request">
      <template #body>
        <div class="p-4 space-y-4 text-sm text-neutral-400">
          <p v-if="showTimeWarning">
            A Pull Request was already created <strong class="text-neutral-200">{{ lastSyncTimeStr }}</strong><span v-if="lastSyncedByName"> by <strong class="text-neutral-200">{{ lastSyncedByName }}</strong></span>. Are you sure you want to open another one right now? Please coordinate with your team to avoid spamming the repository.
          </p>
          <p v-else>
            You are about to push translation updates and create a new Pull Request.
          </p>

          <u-form-field :label="`Please type your username '${user?.username}' to confirm:`" required class="pt-2">
            <u-input v-model="confirmUsername" :placeholder="user?.username" class="w-full" @keyup.enter="confirmUsername.trim() === user?.username ? pushSync(pendingSyncId!) : null" />
          </u-form-field>
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <u-button label="Cancel" color="neutral" variant="ghost" @click="confirmModalOpen = false" />
          <u-button 
            label="Create Pull Request" 
            :color="showTimeWarning ? 'error' : 'neutral'" 
            :disabled="confirmUsername.trim() !== user?.username" 
            @click="pushSync(pendingSyncId!)" 
          />
        </div>
      </template>
    </u-modal>
  </div>
</template>
