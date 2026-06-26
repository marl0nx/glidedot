<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useApi } from '~/composables/useApi'

const props = defineProps<{
  projectId: number
}>()

const toast = useToast()
const { fetchApi } = useApi()

const isLoading = ref(false)
const syncs = ref<any[]>([])
const connections = ref<any[]>([])

const providers = [
  { label: 'GitHub', value: 'github' },
  { label: 'GitLab', value: 'gitlab' },
  { label: 'Forgejo / Gitea', value: 'forgejo' }
]

const providerMap = {
  github: { icon: 'i-simple-icons-github', color: 'text-white' },
  gitlab: { icon: 'i-simple-icons-gitlab', color: 'text-[#FC6D26]' },
  forgejo: { icon: 'i-simple-icons-forgejo', color: 'text-[#FB8F2B]' }
}

const fetchData = async () => {
  if (!props.projectId) return
  isLoading.value = true
  try {
    const [sData, cData] = await Promise.all([
      fetchApi(`/git/projects/${props.projectId}/syncs`),
      fetchApi('/git/connections')
    ])
    syncs.value = sData
    connections.value = cData
  } catch {
    toast.add({ title: 'Error', description: 'Failed to load sync configurations', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const isConfiguring = ref(false)
const selectedProvider = ref('github')
const selectedRepo = ref('')
const selectedBranch = ref('')
const filePathTemplate = ref('locales/{{lang}}.json')

const repos = ref<any[]>([])
const branches = ref<any[]>([])
const isLoadingRepos = ref(false)
const isLoadingBranches = ref(false)

const isProviderConnected = computed(() => connections.value.some(c => c.provider === selectedProvider.value))

const groupedRepos = computed(() => {
  if (!repos.value || repos.value.length === 0) return []
  
  const groups: Record<string, any[]> = {}
  repos.value.forEach(r => {
    const parts = r.name.split('/')
    const org = parts.length > 1 ? parts.slice(0, -1).join('/') : 'Other'
    const name = parts[parts.length - 1]
    if (!groups[org]) groups[org] = []
    groups[org].push({ label: name, value: r.name })
  })

  const sortedOrgs = Object.keys(groups).sort((a, b) => a.localeCompare(b))
  const result: any[] = []
  
  sortedOrgs.forEach(org => {
    result.push({ label: `── ${org} ──`, value: `__header_${org}`, disabled: true })
    groups[org].sort((a, b) => a.label.localeCompare(b.label)).forEach(repo => {
      result.push(repo)
    })
  })
  
  return result
})

const loadRepos = async () => {
  repos.value = []
  branches.value = []
  selectedRepo.value = ''
  selectedBranch.value = ''
  if (isProviderConnected.value) {
    isLoadingRepos.value = true
    try {
      repos.value = await fetchApi(`/git/repos?provider=${selectedProvider.value}`)
    } catch {
      toast.add({ title: 'Error', description: `Failed to load ${selectedProvider.value} repos. Token might be invalid.`, color: 'error' })
    } finally {
      isLoadingRepos.value = false
    }
  }
}

watch(selectedProvider, loadRepos)

watch(selectedRepo, async () => {
  branches.value = []
  selectedBranch.value = ''
  if (selectedRepo.value) {
    isLoadingBranches.value = true
    try {
      branches.value = await fetchApi(`/git/branches?provider=${selectedProvider.value}&repo=${encodeURIComponent(selectedRepo.value)}`)
    } catch {
      toast.add({ title: 'Error', description: `Failed to load branches.`, color: 'error' })
    } finally {
      isLoadingBranches.value = false
    }
  }
})

const openConfig = () => {
  isConfiguring.value = true
  selectedProvider.value = 'github'
  loadRepos()
}

const saveSync = async () => {
  try {
    await fetchApi(`/git/projects/${props.projectId}/syncs`, {
      method: 'POST',
      body: {
        provider: selectedProvider.value,
        repoName: selectedRepo.value,
        branch: selectedBranch.value,
        filePath: filePathTemplate.value
      }
    })
    toast.add({ title: 'Success', description: 'Sync configuration saved', color: 'success' })
    isConfiguring.value = false
    fetchData()
  } catch {
    toast.add({ title: 'Error', description: 'Failed to save configuration', color: 'error' })
  }
}

const deleteSync = async (id: number) => {
  try {
    await fetchApi(`/git/projects/${props.projectId}/syncs/${id}`, { method: 'DELETE' })
    toast.add({ title: 'Deleted', description: 'Sync configuration removed', color: 'success' })
    fetchData()
  } catch {
    toast.add({ title: 'Error', description: 'Failed to remove configuration', color: 'error' })
  }
}

onMounted(() => {
  fetchData()
})
</script>

<template>
  <div class="space-y-4">
    <div class="flex justify-between items-center mb-2">
      <div>
        <h3 class="font-medium text-white">Git Sync Configuration</h3>
        <p class="text-sm text-neutral-400">Configure repositories to push translations to.</p>
      </div>
      <u-button v-if="!isConfiguring" label="Add Sync" icon="i-lucide-plus" color="neutral" variant="soft" size="xs" @click="openConfig" />
    </div>

    <div v-if="!isConfiguring" class="space-y-3">
      <div v-if="syncs.length === 0" class="p-4 text-center border border-dashed border-neutral-700 rounded-lg bg-neutral-900/50">
        <p class="text-sm text-neutral-500">No Git Syncs configured for this project.</p>
      </div>

      <div v-for="sync in syncs" :key="sync.id" class="bg-neutral-900 border border-neutral-800 rounded-lg p-3 flex justify-between items-center gap-4">
        <div class="flex items-center gap-3">
          <u-icon :name="providerMap[sync.provider as keyof typeof providerMap].icon" class="w-6 h-6" :class="providerMap[sync.provider as keyof typeof providerMap].color" />
          <div>
            <h4 class="font-medium text-white text-sm">{{ sync.repoName }}</h4>
            <div class="flex gap-3 mt-1 text-xs text-neutral-400">
              <span class="flex items-center gap-1"><u-icon name="i-lucide-git-branch" class="w-3 h-3" /> {{ sync.branch }}</span>
              <span class="flex items-center gap-1"><u-icon name="i-lucide-file-code" class="w-3 h-3" /> {{ sync.filePath }}</span>
            </div>
          </div>
        </div>
        <u-button icon="i-lucide-trash" color="error" variant="ghost" size="xs" @click="deleteSync(sync.id)" />
      </div>
    </div>

    <!-- Configuration Form -->
    <div v-else class="space-y-4 bg-neutral-900 p-4 border border-neutral-800 rounded-lg">
      <div class="flex justify-between items-center mb-2">
        <h4 class="text-sm font-medium">New Git Sync</h4>
        <u-button icon="i-lucide-x" color="neutral" variant="ghost" size="xs" @click="isConfiguring = false" />
      </div>

      <u-form-field label="Git Provider">
        <u-select v-model="selectedProvider" :items="providers" class="w-full" />
      </u-form-field>

      <div v-if="!isProviderConnected" class="p-3 bg-warning-500/10 border border-warning-500/20 rounded-md flex flex-col gap-2">
        <p class="text-warning-500 text-xs">You haven't linked a {{ selectedProvider }} account yet.</p>
        <u-button label="Go to Account Settings" to="/settings/account" target="_blank" color="warning" variant="soft" size="xs" />
      </div>

      <template v-else>
        <u-form-field label="Repository">
          <u-select v-model="selectedRepo" :items="groupedRepos" placeholder="Select Repository" class="w-full" :loading="isLoadingRepos" :disabled="isLoadingRepos || repos.length === 0" />
        </u-form-field>

        <u-form-field label="Target Branch">
          <u-select v-model="selectedBranch" :items="branches.map(b => ({label: b.name, value: b.name}))" placeholder="Select Branch" class="w-full" :loading="isLoadingBranches" :disabled="!selectedRepo || isLoadingBranches || branches.length === 0" />
        </u-form-field>

        <u-form-field label="File Path Pattern" description="Use {{lang}} for the language code.">
          <u-input v-model="filePathTemplate" placeholder="locales/{{lang}}.json" class="w-full" />
        </u-form-field>

        <div class="flex justify-end pt-2">
          <u-button label="Save Configuration" color="neutral" size="sm" :disabled="!selectedRepo || !selectedBranch || !filePathTemplate" @click="saveSync" />
        </div>
      </template>
    </div>
  </div>
</template>
