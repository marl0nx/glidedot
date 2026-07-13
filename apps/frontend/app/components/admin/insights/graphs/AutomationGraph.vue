<script setup lang="ts">
import { ref, onMounted, computed, watch, provide } from 'vue'
import { useApi } from '~/composables/useApi'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent } from 'echarts/components'
import VChart, { THEME_KEY } from 'vue-echarts'

provide(THEME_KEY, 'dark')

use([
  CanvasRenderer,
  LineChart,
  GridComponent,
  TooltipComponent,
  LegendComponent
])

const timeframes = [
  { label: 'Today', value: 'today' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 14 days', value: '14d' },
  { label: 'Last 30 days', value: '30d' },
  { label: 'Last 60 days', value: '60d' },
  { label: 'Last 90 days', value: '90d' },
  { label: 'Last 6 Months', value: '180d' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' }
]

const localTimeframe = ref('30d')

const { fetchApi } = useApi()

const rawData = ref<any>(null)
const isProcessing = ref(true)

const processData = async () => {
  isProcessing.value = true
  try {
    const data = await fetchApi(`/admin/activity-logs/automation?timeframe=${localTimeframe.value}`) as { data: any }
    rawData.value = data.data
  } catch (e) {
    console.error('Failed to load automation data', e)
  } finally {
    isProcessing.value = false
  }
}

// Industry standard AI color (Violet-500)
const aiColor = '#8b5cf6'
const aiColorRgba40 = 'rgba(139, 92, 246, 0.4)'
const aiColorRgba05 = 'rgba(139, 92, 246, 0.05)'

watch(localTimeframe, processData)

onMounted(() => {
  processData()
})

const chartOptions = computed(() => {
  if (!rawData.value || !rawData.value.timeline.length) return {}
  
  const dates = rawData.value.timeline.map((t: any) => {
    const d = new Date(t.date)
    return localTimeframe.value === 'today' 
      ? d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) 
      : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  })
  const manual = rawData.value.timeline.map((t: any) => t.manualCount)
  const auto = rawData.value.timeline.map((t: any) => t.autoCount)

  return {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: '#171717',
      borderColor: '#262626',
      textStyle: { color: '#e5e5e5' },
      axisPointer: {
        type: 'cross',
        label: {
          backgroundColor: '#262626'
        }
      }
    },
    legend: {
      data: ['Manual', 'AI Translated'],
      textStyle: { color: '#a3a3a3' },
      bottom: 0
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '12%',
      top: '5%',
      containLabel: true
    },
    xAxis: [
      {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: { lineStyle: { color: '#404040' } },
        axisLabel: { color: '#a3a3a3' }
      }
    ],
    yAxis: [
      {
        type: 'value',
        splitLine: { lineStyle: { color: '#262626', type: 'dashed' } },
        axisLabel: { color: '#a3a3a3' }
      }
    ],
    series: [
      {
        name: 'Manual',
        type: 'line',
        areaStyle: { opacity: 0.1 },
        emphasis: { focus: 'series' },
        itemStyle: { color: '#ffffff' },
        lineStyle: { width: 2, color: '#ffffff' },
        data: manual
      },
      {
        name: 'AI Translated',
        type: 'line',
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: aiColorRgba40 },
              { offset: 1, color: aiColorRgba05 }
            ]
          }
        },
        emphasis: { focus: 'series' },
        itemStyle: { color: aiColor },
        lineStyle: { width: 2, color: aiColor },
        data: auto
      }
    ]
  }
})

const formatTimeSaved = (ms: number) => {
  if (ms < 1000) return '0s'
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ${minutes % 60}m`
  const days = Math.floor(hours / 24)
  return `${days}d ${hours % 24}h`
}

const summary = computed(() => rawData.value?.summary || { totalManual: 0, totalAuto: 0, totalTimeSavedMs: 0, averageSpeedMs: 0 })

const advancedStats = computed(() => {
  const sum = summary.value
  const total = sum.totalManual + sum.totalAuto
  const automationRate = total > 0 ? Math.round((sum.totalAuto / total) * 100) : 0
  
  // Calculate efficiency boost (Time if all manual / Actual time)
  // If no manual was done but AI was used, efficiency is "MAX"
  let efficiencyBoost = '1.0'
  if (sum.totalManual > 0) {
    const boost = ((sum.totalAuto * sum.averageSpeedMs) + (sum.totalManual * sum.averageSpeedMs)) / (sum.totalManual * sum.averageSpeedMs)
    efficiencyBoost = boost.toFixed(1)
  } else if (sum.totalAuto > 0) {
    efficiencyBoost = 'MAX'
  }

  return {
    automationRate,
    efficiencyBoost: efficiencyBoost === 'MAX' ? 'MAX' : `${efficiencyBoost}x`
  }
})
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Header & Controls -->
    <div class="flex flex-col md:flex-row justify-between items-start md:items-center bg-neutral-900 border border-neutral-800 p-4 rounded-xl gap-4 shrink-0">
      <div>
        <h3 class="text-white font-medium flex items-center gap-2">
            <u-icon name="i-lucide-bot" class="w-5 h-5 text-primary-500" />
            Automation Efficiency
        </h3>
        <p class="text-sm text-neutral-400 mt-1">Measure the impact of AI suggestions on your localization workflow.</p>
      </div>
      <div class="w-full md:w-auto shrink-0">
        <u-select v-model="localTimeframe" :items="timeframes" class="w-full md:w-48" />
      </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
      <!-- Time Saved -->
      <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 opacity-5 text-primary-500 pointer-events-none">
           <u-icon name="i-lucide-clock" class="w-24 h-24" />
        </div>
        <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10">Time Saved by AI</span>
        <span class="text-2xl font-bold text-primary-500 z-10">{{ formatTimeSaved(summary.totalTimeSavedMs) }}</span>
      </div>

      <!-- Automation Rate -->
      <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
           <u-icon name="i-lucide-percent" class="w-24 h-24" />
        </div>
        <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10">Automation Rate</span>
        <span class="text-2xl font-bold text-neutral-200 z-10">{{ advancedStats.automationRate }}%</span>
      </div>

      <!-- Efficiency Boost -->
      <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
           <u-icon name="i-lucide-zap" class="w-24 h-24" />
        </div>
        <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10">Efficiency Boost</span>
        <span class="text-2xl font-bold text-neutral-200 z-10">{{ advancedStats.efficiencyBoost }}</span>
      </div>

      <!-- Total AI Actions -->
      <div class="flex flex-col bg-neutral-900 border border-neutral-800 p-4 rounded-xl items-start gap-1 relative overflow-hidden">
        <div class="absolute -right-4 -bottom-4 opacity-5 text-neutral-400 pointer-events-none">
           <u-icon name="i-lucide-sparkles" class="w-24 h-24" />
        </div>
        <span class="text-[10px] uppercase tracking-wider font-bold text-neutral-500 z-10">AI Translations</span>
        <span class="text-2xl font-bold text-neutral-200 z-10">{{ summary.totalAuto }}</span>
      </div>
    </div>
    
    <div class="h-[400px] w-full border border-neutral-800 bg-neutral-900 rounded-xl relative p-4 flex flex-col justify-center items-center">
      <div v-if="isProcessing" class="absolute inset-0 flex items-center justify-center bg-neutral-950/50 backdrop-blur-sm z-10 rounded-xl">
        <div class="flex flex-col items-center gap-3">
          <u-icon name="i-lucide-loader-2" class="w-8 h-8 text-primary-500 animate-spin" />
          <span class="text-sm font-medium text-primary-500/80">Calculating Automation Stats...</span>
        </div>
      </div>
      
      <v-chart 
        v-if="!isProcessing && rawData?.timeline?.length"
        class="w-full h-full" 
        :option="chartOptions" 
        autoresize 
      />

      <div v-else-if="!isProcessing" class="flex flex-col items-center gap-2 text-neutral-500">
        <u-icon name="i-lucide-bar-chart-2" class="w-8 h-8" />
        <span class="text-sm font-medium">No translation data found for this timeframe</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.echarts {
  width: 100%;
  height: 100%;
}
</style>
