<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { getPaginationRowModel } from '@tanstack/vue-table'
import AutomationGraph from '~/components/admin/insights/graphs/AutomationGraph.vue'

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
  { label: 'Activity Feed', slot: 'feed', icon: 'i-lucide-activity' },
  { label: 'Member Contributions', slot: 'leaderboard', icon: 'i-lucide-users' },
  { label: 'Automation Efficiency', slot: 'graphs', icon: 'i-lucide-bot' }
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
    toast.add({ title: 'Error', description: 'Failed to load leaderboard', color: 'error' })
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
    toast.add({ title: 'Error', description: 'Failed to load activity logs', color: 'error' })
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

watch([currentPage, pageSize], () => {
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
  { accessorKey: 'lastActivity', header: 'Last Activity' },
  { accessorKey: 'totalActivity', header: 'Total Activity' },
  { accessorKey: 'translationsUpdated', header: 'Translations' },
  { accessorKey: 'averageTranslationSpeedMs', header: 'Avg Speed' },
  { accessorKey: 'keysCreated', header: 'Keys Created' },
  { accessorKey: 'labelsCreated', header: 'Labels Created' },
  { accessorKey: 'languagesAdded', header: 'Languages Added' },
  { accessorKey: 'topLanguages', header: 'Top Languages' }
]

const formatSpeed = (ms?: number) => {
  if (!ms) return '---'
  return (ms / 1000).toFixed(1) + 's'
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h1 class="text-white font-medium flex items-center gap-2 text-lg">
            <u-icon name="i-lucide-bar-chart-2" class="w-5 h-5 text-primary-500" />
            Insights
        </h1>
        <p class="text-sm text-neutral-400 mt-1">View a detailed log of all changes or see member statistics.</p>
      </div>
      <div class="w-full md:w-auto shrink-0">
        <u-button icon="i-lucide-refresh-cw" label="Refresh" color="neutral" variant="subtle" :loading="isLoading || isLoadingLeaderboard" @click="fetchLogs(); fetchLeaderboard();" />
      </div>
    </div>

    <u-tabs :items="tabs" class="w-full">
      <template #feed>
        <div class="flex flex-col gap-4 mt-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                  <u-icon name="i-lucide-activity" class="w-5 h-5 text-primary-500" />
                  Activity Feed
              </h3>
              <p class="text-sm text-neutral-400 mt-1">A real-time log of all localization changes and system events.</p>
            </div>
          </div>
          <u-card :ui="{ body: 'p-0 sm:p-0' }">
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
              :ui="{ root: 'rounded-full' }"
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

      <div v-if="totalLogs > 0" class="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-default p-4">
        <div class="flex items-center gap-2">
          <span class="text-sm text-neutral-500">Rows per page</span>
          <u-select
            :model-value="pageSize"
            :items="[10, 20, 50, 100]"
            class="w-20"
            @update:model-value="(val) => { pageSize = Number(val); currentPage = 1; }"
          />
        </div>
        <div class="flex flex-col min-[450px]:flex-row items-center gap-3 min-[450px]:gap-4">
          <span class="text-sm text-neutral-500">
            {{ totalLogs > 0 ? ((currentPage - 1) * pageSize + 1) : 0 }}-{{ Math.min(currentPage * pageSize, totalLogs) }} of {{ totalLogs }}
          </span>
          <u-pagination
            v-model:page="currentPage"
            :total="totalLogs"
            :items-per-page="pageSize"
          />
        </div>
      </div>
        </u-card>
        </div>
      </template>

      <template #leaderboard>
        <div class="flex flex-col gap-4 mt-4">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
            <div>
              <h3 class="text-white font-medium flex items-center gap-2">
                  <u-icon name="i-lucide-users" class="w-5 h-5 text-primary-500" />
                  Member Contributions
              </h3>
              <p class="text-sm text-neutral-400 mt-1">Detailed statistics of user contributions over time.</p>
            </div>
          </div>
          <u-card :ui="{ body: 'p-0 sm:p-0' }">
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
              :ui="{ root: 'rounded-full' }"
            />
            <span class="font-medium">{{ row.original.username || 'Unknown' }}</span>
          </div>
        </template>
        <template #lastActivity-cell="{ row }">
          <div class="flex flex-col" v-if="row.original.lastActivity">
            <span class="text-sm text-neutral-200">{{ formatLocalTime(row.original.lastActivity).date }}</span>
            <span class="text-xs text-neutral-500">{{ formatLocalTime(row.original.lastActivity).time }}</span>
          </div>
          <span v-else class="text-sm text-neutral-500 italic">Never</span>
        </template>
        <template #totalActivity-cell="{ row }">
          <span class="font-semibold text-primary-400">{{ row.original.totalActivity }}</span>
        </template>
        <template #translationsUpdated-cell="{ row }">
          <span>{{ row.original.translationsUpdated }}</span>
        </template>
        <template #averageTranslationSpeedMs-cell="{ row }">
          <span class="font-medium text-neutral-300">{{ formatSpeed(row.original.averageTranslationSpeedMs) }}</span>
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
        </div>
      </template>

    <template #graphs>
      <div class="mt-4 flex flex-col gap-6">
        <automation-graph />
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
