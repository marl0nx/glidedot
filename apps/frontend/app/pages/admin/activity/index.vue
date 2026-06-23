<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import ContributorGraph from '~/components/admin/activity/graphs/ContributorGraph.vue'

definePageMeta({
  layout: 'default'
})

const { fetchApi } = useApi()
const toast = useToast()

interface ActivityLog {
  id: number
  user: string
  action: string
  projectName: string
  details: string
  createdAt: string
  avatarUrl?: string
  username?: string
}

const logs = ref<ActivityLog[]>([])
const isLoading = ref(true)
const totalLogs = ref(0)
const searchQuery = ref('')

const currentPage = ref(1)
const pageSize = ref(15)

const selectedTab = ref(0)
const tabs = [
  { label: 'Activity Feed', slot: 'feed', icon: 'i-lucide-list' },
  { label: 'Leaderboard', slot: 'leaderboard', icon: 'i-lucide-trophy' },
  { label: 'Contributor Network', slot: 'graphs', icon: 'i-lucide-network' }
]

const leaderboardStats = ref<any[]>([])
const isLoadingLeaderboard = ref(false)

const timeframes = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 Days', value: '7d' },
  { label: 'Last 14 Days', value: '14d' },
  { label: 'Last 30 Days', value: '30d' },
  { label: 'Last 60 Days', value: '60d' },
  { label: 'Last 90 Days', value: '90d' },
  { label: 'Last 180 Days', value: '180d' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' }
]
const leaderboardTimeframe = ref('30d')

const fetchLeaderboard = async () => {
  isLoadingLeaderboard.value = true
  try {
    const data = await fetchApi(`/admin/activity-logs/leaderboard?timeframe=${leaderboardTimeframe.value}`) as { data: any[] }
    leaderboardStats.value = data.data
  } catch {
    toast.add({ title: 'Failed to load leaderboard', color: 'error' })
  } finally {
    isLoadingLeaderboard.value = false
  }
}

const leaderboardSearch = ref('')

const filteredLeaderboardStats = computed(() => {
  if (!leaderboardSearch.value) return leaderboardStats.value
  const query = leaderboardSearch.value.toLowerCase()
  return leaderboardStats.value.filter(stat => 
    stat.username?.toLowerCase().includes(query)
  )
})

watch(leaderboardTimeframe, () => {
  fetchLeaderboard()
})

const fetchLogs = async () => {
  isLoading.value = true
  try {
    const params = new URLSearchParams()
    params.append('page', currentPage.value.toString())
    params.append('limit', pageSize.value.toString())
    if (searchQuery.value) {
      params.append('search', searchQuery.value)
    }
    const data = await fetchApi(`/admin/activity-logs?${params.toString()}`) as { data: ActivityLog[]; total: number }
    logs.value = data.data
    totalLogs.value = data.total
  } catch {
    toast.add({ title: 'Failed to load activity logs', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | undefined
watch(searchQuery, () => {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    currentPage.value = 1
    fetchLogs()
  }, 300)
})

watch(currentPage, () => {
  fetchLogs()
})

onMounted(() => {
  fetchLogs()
  fetchLeaderboard()
})

const columns = [
  { accessorKey: 'id', header: 'ID' },
  { accessorKey: 'user', header: 'User' },
  { accessorKey: 'action', header: 'Action' },
  { accessorKey: 'projectName', header: 'Project' },
  { accessorKey: 'details', header: 'Details' },
  { accessorKey: 'createdAt', header: 'Time' }
]

const formatActionText = (action: string) => {
  return action.split('_').map(word => word.charAt(0) + word.slice(1).toLowerCase()).join(' ')
}

const formatDetails = (action: string, detailsString: string) => {
  if (!detailsString) return '-'
  try {
    const details = JSON.parse(detailsString)
    if (action === 'KEY_CREATED') {
      return `Created key "${details.key}"`
    } else if (action === 'TRANSLATION_UPDATED') {
      const keyName = details.keyName || `Key #${details.keyId}`
      const langCode = details.languageCode || `Lang #${details.languageId}`
      if (details.oldValue !== undefined && details.newValue !== undefined) {
        return `Updated ${keyName} (${langCode}) from "${details.oldValue}" to "${details.newValue}"`
      }
      return `Updated translation for ${keyName} (${langCode})`
    } else if (action === 'LANGUAGE_ADDED') {
      return `Added language ID ${details.languageId}`
    } else if (action === 'LABEL_CREATED') {
      return `Created label "${details.name}"`
    }
    const keys = Object.keys(details)
    if (keys.length > 0) {
      return keys.map(k => `${k}: ${details[k]}`).join(', ')
    }
    return detailsString
  } catch {
    return detailsString
  }
}

const formatLocalTime = (dateString: string) => {
  const date = new Date(dateString.endsWith('Z') ? dateString : dateString + 'Z')
  return {
    date: date.toLocaleDateString(),
    time: date.toLocaleTimeString()
  }
}

const leaderboardColumns = [
  { accessorKey: 'user', header: 'Member' },
  { accessorKey: 'totalActivity', header: 'Total Activity' },
  { accessorKey: 'translationsUpdated', header: 'Translations' },
  { accessorKey: 'keysCreated', header: 'Keys Created' },
  { accessorKey: 'labelsCreated', header: 'Labels Created' },
  { accessorKey: 'languagesAdded', header: 'Languages Added' },
  { accessorKey: 'topLanguages', header: 'Top Languages' }
]
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-row justify-between items-center">
      <div>
        <h1 class="text-xl font-bold">Insights</h1>
        <p class="text-sm text-neutral-400">View a detailed log of all changes or see member statistics.</p>
      </div>
      <u-button icon="i-lucide-refresh-cw" label="Refresh" color="neutral" variant="subtle" :loading="isLoading || isLoadingLeaderboard" @click="fetchLogs(); fetchLeaderboard();" />
    </div>

    <u-tabs :items="tabs" class="w-full">
      <template #feed>
        <u-card :ui="{ body: { padding: 'p-0 sm:p-0' } }" class="mt-4">
      <template #header>
        <div class="flex justify-between items-center">
          <u-input v-model="searchQuery" icon="i-lucide-search" placeholder="Search logs..." class="max-w-sm" />
        </div>
      </template>

      <u-table 
        :data="logs" 
        :columns="columns" 
        :loading="isLoading"
      >
        <template #id-cell="{ row }">
          <span class="text-xs text-neutral-500">#{{ row.original.id }}</span>
        </template>
        <template #user-cell="{ row }">
          <div class="flex items-center gap-2">
            <u-avatar
              :src="row.original.avatarUrl || undefined"
              :icon="!row.original.avatarUrl ? 'i-lucide-user' : undefined"
              :class="!row.original.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''"
              size="xs"
              :ui="{ rounded: 'rounded-full' }"
            />
            <span class="font-medium text-sm">{{ row.original.username || 'System' }}</span>
          </div>
        </template>
        <template #action-cell="{ row }">
          <u-badge color="neutral" variant="subtle">
            {{ formatActionText(row.original.action) }}
          </u-badge>
        </template>
        <template #projectName-cell="{ row }">
          <span v-if="row.original.projectName" class="text-sm font-medium text-neutral-200">
            {{ row.original.projectName }}
          </span>
          <span v-else class="text-sm text-neutral-500 italic">
            System
          </span>
        </template>
        <template #details-cell="{ row }">
          <u-tooltip :text="formatDetails(row.original.action, row.original.details)" :popper="{ placement: 'top' }">
            <span class="text-sm text-neutral-300 block truncate max-w-[300px]">
              {{ formatDetails(row.original.action, row.original.details) }}
            </span>
          </u-tooltip>
        </template>
        <template #createdAt-cell="{ row }">
          <div class="flex flex-col">
            <span class="text-sm text-neutral-200">{{ formatLocalTime(row.original.createdAt).date }}</span>
            <span class="text-xs text-neutral-500">{{ formatLocalTime(row.original.createdAt).time }}</span>
          </div>
        </template>
      </u-table>

      <div v-if="totalLogs > pageSize" class="flex justify-end border-t border-default p-4">
        <u-pagination
            v-model:page="currentPage"
            :total="totalLogs"
            :items-per-page="pageSize"
        />
      </div>
    </u-card>
    </template>

    <template #leaderboard>
    <u-card :ui="{ body: { padding: 'p-0 sm:p-0' } }" class="mt-4">
      <template #header>
        <div class="flex justify-between items-center">
          <u-input v-model="leaderboardSearch" icon="i-lucide-search" placeholder="Search members..." class="max-w-sm" />
          <div class="flex gap-2 items-center">
            <span class="text-sm font-medium text-neutral-400">Timeframe:</span>
            <u-select v-model="leaderboardTimeframe" :items="timeframes" class="w-40" />
          </div>
        </div>
      </template>

      <u-table 
        :data="filteredLeaderboardStats" 
        :columns="leaderboardColumns" 
        :loading="isLoadingLeaderboard"
      >
        <template #user-cell="{ row }">
          <div class="flex items-center gap-2">
            <u-avatar
              :src="row.original.avatarUrl || undefined"
              :icon="!row.original.avatarUrl ? 'i-lucide-user' : undefined"
              :class="!row.original.avatarUrl ? 'bg-neutral-800 text-neutral-400' : ''"
              size="sm"
              :ui="{ rounded: 'rounded-full' }"
            />
            <span class="font-medium">{{ row.original.username || 'Unknown' }}</span>
          </div>
        </template>
        <template #totalActivity-cell="{ row }">
          <span class="font-semibold text-primary-400">{{ row.original.totalActivity }}</span>
        </template>
        <template #translationsUpdated-cell="{ row }">
          <span>{{ row.original.translationsUpdated }}</span>
        </template>
        <template #keysCreated-cell="{ row }">
          <span>{{ row.original.keysCreated }}</span>
        </template>
        <template #labelsCreated-cell="{ row }">
          <span>{{ row.original.labelsCreated }}</span>
        </template>
        <template #languagesAdded-cell="{ row }">
          <span>{{ row.original.languagesAdded }}</span>
        </template>
        <template #topLanguages-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <u-badge v-for="lang in row.original.topLanguages" :key="lang.code" color="neutral" variant="subtle" size="sm">
              {{ lang.code.toUpperCase() }} ({{ lang.count }})
            </u-badge>
            <span v-if="row.original.topLanguages.length === 0" class="text-neutral-500 text-xs italic">No translations yet</span>
          </div>
        </template>
      </u-table>
    </u-card>
    </template>

    <template #graphs>
      <div class="mt-4 flex flex-col gap-6">
        <contributor-graph />
      </div>
    </template>

    </u-tabs>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
