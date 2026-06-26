<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

definePageMeta({
  layout: 'default'
})

const { user } = useAuth()
const { fetchApi } = useApi()
const toast = useToast()

interface DashboardStats {
  globalStats: {
    totalProjects: number
    totalKeys: number
    totalLanguages: number
    totalTranslations: number
    overallProgress: number
  }
  projects: {
    id: number
    name: string
    keysCount: number
    languagesCount: number
    translationsCount: number
    progress: number
    lastActivity?: string | null
  }[]
  recentProjects?: {
    id: number
    name: string
    keysCount: number
    languagesCount: number
    translationsCount: number
    progress: number
    lastActivity?: string | null
  }[]
  personalStats?: {
    keysCreated: number
    translationsUpdated: number
    languagesAdded: number
    labelsCreated: number
    activityHeatmap?: { date: string; count: number }[]
    averageTranslationSpeedMs?: number
  }
}

const formatSpeed = (ms?: number) => {
  if (!ms) return '---'
  return (ms / 1000).toFixed(1) + 's'
}

const stats = ref<DashboardStats | null>(null)
const isLoading = ref(true)

const loadStats = async (silent = false) => {
  if (!silent) isLoading.value = true
  try {
    const data = await fetchApi('/localization/projects/dashboard')
    stats.value = data as DashboardStats
  } catch {
    if (!silent) toast.add({ title: 'Error', description: 'Failed to load dashboard statistics', color: 'error' })
  } finally {
    isLoading.value = false
  }
}

const tooltipData = ref({ visible: false, x: 0, y: 0, count: 0, date: '' })

const showTooltip = (event: MouseEvent, day: { count: number, date: string }) => {
  tooltipData.value = {
    visible: true,
    x: event.clientX,
    y: event.clientY - 15,
    count: day.count,
    date: new Date(day.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }
}

const hideTooltip = () => {
  tooltipData.value.visible = false
}



let intervalId: ReturnType<typeof setInterval>

onMounted(() => {
  loadStats()
  // Poll every 10 seconds to keep stats and activity feed updated
  intervalId = setInterval(() => {
    loadStats(true)
  }, 10000)
})

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <div class="flex flex-col gap-8 w-full py-4">
    <!-- Header -->
    <div class="flex flex-col gap-1">
      <h1 class="text-2xl font-bold">Welcome back, {{ user?.username || 'User' }}!</h1>
      <p class="text-sm text-neutral-400">Here's a quick overview of your localization progress.</p>
    </div>

    <div v-if="isLoading" class="grid grid-cols-2 md:grid-cols-4 gap-4">
      <u-skeleton v-for="i in 4" :key="i" class="h-28 w-full rounded-xl bg-neutral-900" />
    </div>

    <template v-else-if="stats">
      <!-- Personal Contributions Metrics -->
      <div class="grid grid-cols-2 md:grid-cols-5 gap-4 mb-2 mt-2">
        <!-- Average Speed -->
        <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
             <u-icon name="i-lucide-timer" class="w-24 h-24" />
          </div>
          <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10 flex items-center gap-1.5">Avg Translation Speed</span>
          <span class="text-2xl font-bold text-neutral-200 z-10">{{ formatSpeed(stats.personalStats?.averageTranslationSpeedMs) }}</span>
        </div>

        <!-- Translations -->
        <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
             <u-icon name="i-lucide-a-large-small" class="w-24 h-24" />
          </div>
          <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10 flex items-center gap-1.5">Translations</span>
          <span class="text-2xl font-bold text-neutral-200 z-10">{{ stats.personalStats?.translationsUpdated || 0 }}</span>
        </div>
        
        <!-- Keys -->
        <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
             <u-icon name="i-lucide-logs" class="w-24 h-24" />
          </div>
          <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10 flex items-center gap-1.5">Keys Created</span>
          <span class="text-2xl font-bold text-neutral-200 z-10">{{ stats.personalStats?.keysCreated || 0 }}</span>
        </div>
        
        <!-- Languages -->
        <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
             <u-icon name="i-lucide-flag" class="w-24 h-24" />
          </div>
          <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10 flex items-center gap-1.5">Languages Added</span>
          <span class="text-2xl font-bold text-neutral-200 z-10">{{ stats.personalStats?.languagesAdded || 0 }}</span>
        </div>
        
        <!-- Labels -->
        <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
          <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
             <u-icon name="i-lucide-tag" class="w-24 h-24" />
          </div>
          <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10 flex items-center gap-1.5">Labels Created</span>
          <span class="text-2xl font-bold text-neutral-200 z-10">{{ stats.personalStats?.labelsCreated || 0 }}</span>
        </div>
      </div>

      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        <!-- Productivity Chart (Takes up 1 column) -->
        <div class="flex flex-col gap-4 h-full">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <u-icon name="i-lucide-activity" class="w-5 h-5 text-neutral-400" />
            Your Activity (Last 168 Days)
          </h2>
          
          <u-card :ui="{ body: 'p-4 sm:p-6' }" class="flex-1">
            <div class="overflow-x-auto pb-2 hide-scrollbar w-full">
              <div class="flex gap-1" style="width: fit-content; min-width: 100%;">
                <template v-if="stats.personalStats?.activityHeatmap">
                  <div class="grid gap-1 mx-auto" style="grid-template-columns: repeat(24, minmax(0, 1fr));">
                    <div 
                      v-for="day in stats.personalStats.activityHeatmap" 
                      :key="day.date"
                      @mousemove="showTooltip($event, day)"
                      @mouseleave="hideTooltip"
                      class="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-[2px] transition-colors cursor-pointer hover:ring-1 hover:ring-neutral-400"
                      :class="{
                        'bg-neutral-800': day.count === 0,
                        'bg-primary-500/30': day.count > 0 && day.count < 10,
                        'bg-primary-500/50': day.count >= 10 && day.count < 25,
                        'bg-primary-500/70': day.count >= 25 && day.count < 50,
                        'bg-primary-500': day.count >= 50
                      }"
                    ></div>
                  </div>
                </template>
              </div>
            </div>
            
            <div class="flex items-center justify-end gap-2 text-xs text-neutral-500 mt-2">
              <span>Less</span>
              <div class="w-3 h-3 rounded-[2px] bg-neutral-800"></div>
              <div class="w-3 h-3 rounded-[2px] bg-primary-500/30"></div>
              <div class="w-3 h-3 rounded-[2px] bg-primary-500/50"></div>
              <div class="w-3 h-3 rounded-[2px] bg-primary-500/70"></div>
              <div class="w-3 h-3 rounded-[2px] bg-primary-500"></div>
              <span>More</span>
            </div>
          </u-card>
        </div>
        <!-- Recently Edited Projects (Takes up 1 column) -->
        <div class="flex flex-col gap-4 h-full">
          <h2 class="text-lg font-semibold flex items-center gap-2">
            <u-icon name="i-lucide-history" class="w-5 h-5 text-neutral-400" />
            Recently Edited
          </h2>
          
          <u-card :ui="{ body: 'p-0 sm:p-0 h-full flex flex-col' }" class="flex-1 flex flex-col">
            <template v-if="!stats.recentProjects || stats.recentProjects.length === 0">
              <div class="flex-1 flex flex-col items-center justify-center p-6 text-center text-sm text-neutral-500 gap-2 min-h-[160px]">
                <u-icon name="i-lucide-ghost" class="w-8 h-8 text-neutral-600" />
                No recent activity.
              </div>
            </template>
            
            <a 
              v-for="project in stats.recentProjects"
              :key="'recent-'+project.id"
              :href="`/projects/${project.id}`"
              class="block p-4 hover:bg-neutral-900 transition-colors group border-b border-neutral-800 last:border-0"
            >
              <div class="flex items-center justify-between">
                <div class="flex flex-col gap-0.5">
                  <span class="text-sm font-medium text-neutral-200 group-hover:text-primary-400 transition-colors">{{ project.name }}</span>
                  <span v-if="project.lastActivity" class="text-xs text-neutral-500">
                    {{ new Date(project.lastActivity).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }}
                  </span>
                </div>
                <div class="text-right flex items-center">
                  <u-icon name="i-lucide-chevron-right" class="w-4 h-4 text-neutral-600 group-hover:text-primary-500 transition-colors" />
                </div>
              </div>
            </a>
          </u-card>
        </div>
      </div>
    </template>
    
    <!-- Custom Heatmap Tooltip -->
    <div 
      v-if="tooltipData.visible" 
      class="fixed z-[9999] pointer-events-none bg-neutral-800/95 backdrop-blur-sm border border-neutral-700/50 text-xs px-3 py-2 rounded-lg shadow-xl text-center transform -translate-x-1/2 -translate-y-full transition-opacity duration-100"
      :style="{ left: tooltipData.x + 'px', top: tooltipData.y + 'px' }"
    >
      <div class="font-semibold mb-0.5"><span class="text-primary-400">{{ tooltipData.count }}</span> <span class="text-neutral-200">actions</span></div>
      <div class="text-neutral-400 text-[10px]">{{ tooltipData.date }}</div>
    </div>
  </div>
</template>

<style scoped>
.hide-scrollbar::-webkit-scrollbar {
  display: none;
}
.hide-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>