<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, provide } from 'vue'
import { useApi } from '~/composables/useApi'
import { use, registerTheme } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { GraphChart } from 'echarts/charts'
import { TitleComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'

provide(THEME_KEY, 'glide-dark')

use([
  CanvasRenderer,
  GraphChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent
])

const { fetchApi } = useApi()

const leaderboardTimeframe = ref('all')
const isLoading = ref(true)
const rawData = ref<any[]>([])
const isFullscreen = ref(false)
const isProcessing = ref(false)
const processedGraphData = ref<{ nodes: any[], links: any[], categories: any[] }>({ nodes: [], links: [], categories: [] })

const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false
  }
}

const fetchLeaderboard = async () => {
  isLoading.value = true
  try {
    const data = await fetchApi(`/admin/activity-logs/leaderboard?timeframe=${leaderboardTimeframe.value}`) as { data: any[] }
    rawData.value = data.data
    await processData()
  } catch (e) {
    rawData.value = []
    processedGraphData.value = { nodes: [], links: [], categories: [] }
  } finally {
    isLoading.value = false
  }
}

watch(leaderboardTimeframe, () => {
  fetchLeaderboard()
})

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown)
  await fetchLeaderboard()
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})

const getFlagEmoji = (countryCode: string) => {
  let code = countryCode.toLowerCase()
  if (code === 'en') code = 'gb'
  if (code === 'ja') code = 'jp'
  if (code === 'zh') code = 'cn'
  if (code === 'cs') code = 'cz'
  if (code === 'da') code = 'dk'
  if (code === 'el') code = 'gr'
  if (code === 'he') code = 'il'
  if (code === 'ko') code = 'kr'
  if (code === 'sv') code = 'se'
  
  if (code.length !== 2) return '🏳️'
  
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0))
  return String.fromCodePoint(...codePoints)
}

const userIconSvg = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23262626' stroke='%23404040' stroke-width='4'/%3E%3Cg transform='translate(25, 25) scale(2.08)' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2'/%3E%3Ccircle cx='12' cy='7' r='4'/%3E%3C/g%3E%3C/svg%3E"
const translateIconSvg = "data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='48' fill='%23262626' stroke='%23404040' stroke-width='4'/%3E%3Cg transform='translate(25, 25) scale(2.08)' fill='none' stroke='%23a3a3a3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m5 8 6 6'/%3E%3Cpath d='m4 14 6-6 2-3'/%3E%3Cpath d='M2 5h12'/%3E%3Cpath d='M7 2h1'/%3E%3Cpath d='m22 22-5-10-5 10'/%3E%3Cpath d='M14 18h6'/%3E%3C/g%3E%3C/svg%3E"

const processData = async () => {
  isProcessing.value = true
  const nodes: any[] = []
  const links: any[] = []
  const categories = [{ name: 'User' }, { name: 'Language' }]
  const languageNodes = new Set<string>()

  for (const user of rawData.value) {
    if (!user.username) continue
    
    const size = Math.max(25, Math.min(50, 15 + (user.translationsUpdated / 5)))
    const node: any = {
      id: `user-${user.username}`,
      name: user.username,
      category: 0,
      symbolSize: size,
      value: user.translationsUpdated,
      itemStyle: { color: 'transparent', borderColor: 'transparent' },
      label: {
        show: true,
        position: 'inside',
        formatter: '{icon|}\n{name|' + user.username + '}',
        distance: 0,
        textBorderWidth: 0,
        textShadowBlur: 0,
        rich: {
          icon: {
            backgroundColor: { image: user.avatarUrl || userIconSvg },
            width: size,
            height: size,
            borderRadius: user.avatarUrl ? size / 2 : 0,
            align: 'center'
          },
          name: {
            color: '#d4d4d8',
            padding: [4, 0, 0, 0],
            align: 'center',
            fontSize: 11,
            textBorderWidth: 0,
            textShadowBlur: 0
          }
        }
      }
    }
    
    nodes.push(node)
    
    if (user.topLanguages) {
      user.topLanguages.forEach((lang: any) => {
        if (!languageNodes.has(lang.code)) {
          languageNodes.add(lang.code)
          const flag = getFlagEmoji(lang.code)
          nodes.push({
            id: `lang-${lang.code}`,
            name: `${flag} ${lang.code.toUpperCase()}`,
            category: 1,
            symbolSize: 30,
            itemStyle: { color: 'transparent', borderColor: 'transparent' },
            label: {
              show: true,
              position: 'inside',
              formatter: '{icon|}\n{name|' + flag + ' ' + lang.code.toUpperCase() + '}',
              distance: 0,
              textBorderWidth: 0,
              textShadowBlur: 0,
              rich: {
                icon: {
                  backgroundColor: { image: translateIconSvg },
                  width: 30,
                  height: 30,
                  align: 'center'
                },
                name: {
                  color: '#d4d4d8',
                  padding: [4, 0, 0, 0],
                  align: 'center',
                  fontSize: 11,
                  textBorderWidth: 0,
                  textShadowBlur: 0
                }
              }
            }
          })
        }
        
        links.push({
          source: `user-${user.username}`,
          target: `lang-${lang.code}`,
          value: lang.count,
          lineStyle: {
            width: Math.max(1, Math.min(10, Math.sqrt(lang.count))),
            opacity: 0.6
          }
        })
      })
    }
  }
  
  processedGraphData.value = { nodes, links, categories }
  isProcessing.value = false
}

const chartOptions = computed(() => {
  if (!processedGraphData.value.nodes.length) return {}
  
  return {
    tooltip: {
      backgroundColor: '#171717',
      borderColor: '#262626',
      textStyle: { color: '#e5e5e5' },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          if (params.data.category === 0) return `User: <b style="color: #ffffff">${params.data.name}</b><br/>Translations: ${params.data.value}`
          return `Language: <b style="color: #ffffff">${params.data.name}</b>`
        } else if (params.dataType === 'edge') {
          return `${params.data.value} translations`
        }
      }
    },
    legend: {
      data: ['User', 'Language'],
      textStyle: { color: '#a3a3a3' }
    },
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: processedGraphData.value.nodes,
        links: processedGraphData.value.links,
        categories: processedGraphData.value.categories,
        roam: true,
        label: {
          show: true,
          position: 'right'
        },
        force: {
          repulsion: 400,
          edgeLength: 120
        },
        lineStyle: {
          color: 'source',
          curveness: 0.2
        },
        emphasis: {
          lineStyle: { width: 4 }
        }
      }
    ]
  }
})
</script>

<template>
  <div :class="isFullscreen ? 'fixed inset-0 z-[9999] bg-neutral-950 p-4 md:p-8 flex flex-col gap-4 overflow-hidden' : 'flex flex-col gap-4'">
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h3 class="text-white font-medium">Contributor Network</h3>
        <p class="text-xs text-neutral-400">Force-directed graph of relations between users and languages</p>
      </div>
      <div class="flex items-center gap-2 w-full md:w-auto">
        <span class="text-sm text-neutral-400 hidden sm:inline mr-1">Timeframe:</span>
        <u-select
          v-model="leaderboardTimeframe"
          :items="[
            { label: 'Today', value: 'today' },
            { label: 'Last 7 Days', value: '7d' },
            { label: 'Last 30 Days', value: '30d' },
            { label: 'This Year', value: 'year' },
            { label: 'All Time', value: 'all' }
          ]"
          class="w-full sm:w-40"
        />
        <u-tooltip :text="isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'">
          <u-button 
            :icon="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-maximize'" 
            color="neutral" 
            variant="ghost" 
            @click="isFullscreen = !isFullscreen" 
          />
        </u-tooltip>
      </div>
    </div>

    <u-card :ui="{ body: { padding: 'p-0 sm:p-0' } }" class="flex-1 min-h-0 flex flex-col">
      <div v-if="isLoading || isProcessing" :class="isFullscreen ? 'h-full min-h-[400px]' : 'h-[600px]'" class="flex items-center justify-center flex-1">
        <u-icon name="i-lucide-loader-2" class="w-8 h-8 text-neutral-500 animate-spin" />
      </div>
      <div v-else-if="!processedGraphData.nodes.length" :class="isFullscreen ? 'h-full min-h-[400px]' : 'h-[600px]'" class="flex flex-col items-center justify-center text-neutral-500 gap-2 flex-1">
        <u-icon name="i-lucide-network" class="w-12 h-12 text-neutral-700" />
        <p>No activity found for this timeframe.</p>
      </div>
      <div v-else :class="isFullscreen ? 'h-[calc(100vh-140px)]' : 'h-[600px]'" class="w-full p-4 overflow-hidden relative flex-1">
        <v-chart
          :option="chartOptions"
          autoresize
          class="w-full h-full"
        />
      </div>
    </u-card>
  </div>
</template>
